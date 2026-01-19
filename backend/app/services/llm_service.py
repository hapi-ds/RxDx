"""
Local LLM Service for intelligent text processing.

This service integrates with LM-Studio compatible API for:
- Extracting structured work instruction data from emails
- Extracting entities and relationships from meeting minutes
- Suggesting requirement improvements for clarity

Implements Requirement 12 (Local LLM Integration) with graceful degradation
when LLM is unavailable.
"""

import json
import logging
from typing import Optional, List, Dict, Any

import aiohttp

from app.core.config import settings


logger = logging.getLogger(__name__)


class LLMServiceError(Exception):
    """Base exception for LLM service errors."""
    pass


class LLMConnectionError(LLMServiceError):
    """Raised when connection to LLM service fails."""
    pass


class LLMResponseError(LLMServiceError):
    """Raised when LLM returns an invalid response."""
    pass


class LLMService:
    """
    Service for interacting with local LLM via LM-Studio compatible API.
    
    This service provides intelligent text processing capabilities while
    maintaining data privacy by using only local LLM services.
    
    Attributes:
        base_url: The LM-Studio API base URL
        model: The model name to use for completions
        enabled: Whether LLM integration is enabled
        timeout: Request timeout in seconds
    """
    
    def __init__(
        self,
        base_url: Optional[str] = None,
        model: Optional[str] = None,
        enabled: Optional[bool] = None,
        timeout: int = 30,
    ):
        """
        Initialize the LLM service.
        
        Args:
            base_url: LM-Studio API URL (defaults to settings.LLM_STUDIO_URL)
            model: Model name (defaults to settings.LLM_MODEL_NAME)
            enabled: Whether LLM is enabled (defaults to settings.LLM_ENABLED)
            timeout: Request timeout in seconds (default: 30)
        """
        self.base_url = base_url or settings.LLM_STUDIO_URL
        self.model = model or settings.LLM_MODEL_NAME
        self.enabled = enabled if enabled is not None else settings.LLM_ENABLED
        self.timeout = timeout
        
    async def _call_llm(self, prompt: str, system_prompt: Optional[str] = None) -> Optional[str]:
        """
        Make a call to the LM-Studio compatible API.
        
        Args:
            prompt: The user prompt to send
            system_prompt: Optional system prompt for context
            
        Returns:
            The LLM response content, or None if unavailable
            
        Raises:
            LLMConnectionError: If connection to LLM fails
            LLMResponseError: If LLM returns invalid response
        """
        if not self.enabled:
            logger.debug("LLM service is disabled, returning None")
            return None
            
        default_system = (
            "You are a helpful assistant that extracts structured data from text. "
            "Always respond with valid JSON only, no additional text or explanation."
        )
        
        messages = [
            {"role": "system", "content": system_prompt or default_system},
            {"role": "user", "content": prompt}
        ]
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.base_url}/chat/completions",
                    json={
                        "model": self.model,
                        "messages": messages,
                        "temperature": 0.1,  # Low temperature for consistent structured output
                        "max_tokens": 2000,
                    },
                    timeout=aiohttp.ClientTimeout(total=self.timeout),
                ) as response:
                    if response.status != 200:
                        error_text = await response.text()
                        logger.error(f"LLM API error: {response.status} - {error_text}")
                        raise LLMResponseError(f"LLM API returned status {response.status}")
                        
                    result = await response.json()
                    
                    # Extract content from OpenAI-compatible response format
                    choices = result.get("choices", [])
                    if not choices:
                        logger.error("LLM response has no choices")
                        raise LLMResponseError("LLM response has no choices")
                        
                    content = choices[0].get("message", {}).get("content", "")
                    if not content:
                        logger.error("LLM response has no content")
                        raise LLMResponseError("LLM response has no content")
                        
                    return content.strip()
                    
        except aiohttp.ClientError as e:
            logger.error(f"LLM connection error: {e}")
            raise LLMConnectionError(f"Failed to connect to LLM service: {e}")
        except asyncio.TimeoutError:
            logger.error("LLM request timed out")
            raise LLMConnectionError("LLM request timed out")
    
    def _parse_json_response(self, response: str) -> Optional[Any]:
        """
        Parse JSON from LLM response, handling common formatting issues.
        
        Args:
            response: The raw LLM response string
            
        Returns:
            Parsed JSON data, or None if parsing fails
        """
        if not response:
            return None
            
        # Try direct parsing first
        try:
            return json.loads(response)
        except json.JSONDecodeError:
            pass
            
        # Try to extract JSON from markdown code blocks
        if "```json" in response:
            try:
                start = response.index("```json") + 7
                end = response.index("```", start)
                json_str = response[start:end].strip()
                return json.loads(json_str)
            except (ValueError, json.JSONDecodeError):
                pass
                
        # Try to extract JSON from generic code blocks
        if "```" in response:
            try:
                start = response.index("```") + 3
                # Skip language identifier if present
                if response[start:start+1].isalpha():
                    start = response.index("\n", start) + 1
                end = response.index("```", start)
                json_str = response[start:end].strip()
                return json.loads(json_str)
            except (ValueError, json.JSONDecodeError):
                pass
        
        # Try to find JSON object or array in response
        for start_char, end_char in [("{", "}"), ("[", "]")]:
            try:
                start = response.index(start_char)
                # Find matching closing bracket
                depth = 0
                for i, char in enumerate(response[start:], start):
                    if char == start_char:
                        depth += 1
                    elif char == end_char:
                        depth -= 1
                        if depth == 0:
                            json_str = response[start:i+1]
                            return json.loads(json_str)
            except (ValueError, json.JSONDecodeError):
                continue
                
        logger.warning(f"Failed to parse JSON from LLM response: {response[:200]}...")
        return None

    async def extract_work_instruction(self, email_body: str) -> Optional[Dict[str, Any]]:
        """
        Extract structured work instruction data from email content.
        
        Uses LLM to parse natural language email content and extract:
        - status: Current status (draft/active/completed)
        - comment: Any comments or updates
        - time_spent: Hours worked (as number)
        - next_steps: Planned next actions
        
        Args:
            email_body: The raw email body text
            
        Returns:
            Dictionary with extracted fields, or None if extraction fails
            or LLM is disabled
        """
        if not self.enabled:
            logger.debug("LLM disabled, skipping work instruction extraction")
            return None
            
        if not email_body or not email_body.strip():
            logger.warning("Empty email body provided for extraction")
            return None
            
        prompt = f"""Extract work instruction information from this email:

{email_body}

Return JSON with these fields (include only fields that are present in the email):
- status: current status (must be one of: draft, active, completed)
- comment: any comments or updates from the sender
- time_spent: hours worked (as a number, e.g., 2.5)
- next_steps: planned next actions or tasks

Return only valid JSON, no other text. Example format:
{{"status": "active", "comment": "Made progress on the task", "time_spent": 2.5, "next_steps": "Will continue tomorrow"}}

If a field is not mentioned in the email, omit it from the response."""

        try:
            response = await self._call_llm(prompt)
            if not response:
                return None
                
            result = self._parse_json_response(response)
            if not result:
                logger.warning("Failed to parse work instruction from LLM response")
                return None
                
            # Validate and normalize the result
            validated = {}
            
            if "status" in result:
                status = str(result["status"]).lower()
                if status in ("draft", "active", "completed"):
                    validated["status"] = status
                    
            if "comment" in result and result["comment"]:
                validated["comment"] = str(result["comment"]).strip()
                
            if "time_spent" in result:
                try:
                    time_spent = float(result["time_spent"])
                    if time_spent >= 0:
                        validated["time_spent"] = time_spent
                except (ValueError, TypeError):
                    pass
                    
            if "next_steps" in result and result["next_steps"]:
                validated["next_steps"] = str(result["next_steps"]).strip()
                
            return validated if validated else None
            
        except LLMServiceError as e:
            logger.error(f"LLM service error during work instruction extraction: {e}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error during work instruction extraction: {e}")
            return None

    async def extract_meeting_knowledge(
        self, 
        meeting_text: str
    ) -> Dict[str, List[Dict[str, Any]]]:
        """
        Extract entities and relationships from meeting minutes.
        
        Uses LLM to analyze meeting content and extract:
        - entities: People, components, systems mentioned
        - decisions: Decisions made during the meeting
        - actions: Action items with assignees and deadlines
        - relationships: Relationships between entities
        
        Args:
            meeting_text: The meeting minutes text
            
        Returns:
            Dictionary with entities, decisions, actions, and relationships.
            Returns empty lists for all fields if LLM is disabled or extraction fails.
        """
        empty_result = {
            "entities": [],
            "relationships": [],
            "decisions": [],
            "actions": []
        }
        
        if not self.enabled:
            logger.debug("LLM disabled, returning empty meeting knowledge")
            return empty_result
            
        if not meeting_text or not meeting_text.strip():
            logger.warning("Empty meeting text provided for extraction")
            return empty_result
            
        prompt = f"""Analyze these meeting minutes and extract structured information:

{meeting_text}

Return JSON with this exact structure:
{{
    "entities": [
        {{"name": "entity name", "type": "person|component|system|project|team"}}
    ],
    "decisions": [
        {{"description": "what was decided", "owner": "person responsible (if mentioned)"}}
    ],
    "actions": [
        {{"description": "action item", "assignee": "person assigned", "deadline": "deadline if mentioned"}}
    ],
    "relationships": [
        {{"from": "entity1", "to": "entity2", "type": "relationship type (e.g., owns, manages, depends_on, works_with)"}}
    ]
}}

Extract all relevant information. If a category has no items, use an empty array.
Return only valid JSON, no other text."""

        try:
            response = await self._call_llm(prompt)
            if not response:
                return empty_result
                
            result = self._parse_json_response(response)
            if not result or not isinstance(result, dict):
                logger.warning("Failed to parse meeting knowledge from LLM response")
                return empty_result
                
            # Validate and normalize the result
            validated = {
                "entities": [],
                "relationships": [],
                "decisions": [],
                "actions": []
            }
            
            # Validate entities
            for entity in result.get("entities", []):
                if isinstance(entity, dict) and "name" in entity:
                    validated["entities"].append({
                        "name": str(entity["name"]).strip(),
                        "type": str(entity.get("type", "unknown")).lower()
                    })
                    
            # Validate decisions
            for decision in result.get("decisions", []):
                if isinstance(decision, dict) and "description" in decision:
                    validated["decisions"].append({
                        "description": str(decision["description"]).strip(),
                        "owner": str(decision.get("owner", "")).strip() or None
                    })
                    
            # Validate actions
            for action in result.get("actions", []):
                if isinstance(action, dict) and "description" in action:
                    validated["actions"].append({
                        "description": str(action["description"]).strip(),
                        "assignee": str(action.get("assignee", "")).strip() or None,
                        "deadline": str(action.get("deadline", "")).strip() or None
                    })
                    
            # Validate relationships
            for rel in result.get("relationships", []):
                if isinstance(rel, dict) and "from" in rel and "to" in rel:
                    validated["relationships"].append({
                        "from": str(rel["from"]).strip(),
                        "to": str(rel["to"]).strip(),
                        "type": str(rel.get("type", "relates_to")).lower()
                    })
                    
            return validated
            
        except LLMServiceError as e:
            logger.error(f"LLM service error during meeting knowledge extraction: {e}")
            return empty_result
        except Exception as e:
            logger.error(f"Unexpected error during meeting knowledge extraction: {e}")
            return empty_result

    async def suggest_requirement_improvements(
        self, 
        requirement_text: str
    ) -> List[str]:
        """
        Analyze requirement quality and suggest improvements.
        
        Uses LLM to evaluate requirement text for:
        - Clarity and unambiguity
        - Testability
        - Completeness
        - Consistency
        
        Args:
            requirement_text: The requirement text to analyze
            
        Returns:
            List of improvement suggestions, or empty list if LLM is disabled
            or analysis fails
        """
        if not self.enabled:
            logger.debug("LLM disabled, returning empty suggestions")
            return []
            
        if not requirement_text or not requirement_text.strip():
            logger.warning("Empty requirement text provided for analysis")
            return []
            
        prompt = f"""Analyze this requirement for quality and suggest specific improvements:

{requirement_text}

Evaluate the requirement based on these criteria:
1. Clarity - Is it unambiguous and easy to understand?
2. Testability - Can it be verified through testing?
3. Completeness - Does it include all necessary information?
4. Consistency - Is it free from contradictions?
5. Atomicity - Does it describe a single, focused requirement?

Return a JSON array of specific, actionable improvement suggestions.
Each suggestion should be a clear, concise string.
If the requirement is well-written, return an empty array.

Example format:
["Add specific acceptance criteria for testability", "Clarify the term 'fast' with measurable metrics"]

Return only the JSON array, no other text."""

        try:
            response = await self._call_llm(prompt)
            if not response:
                return []
                
            result = self._parse_json_response(response)
            
            # Handle case where result is a list
            if isinstance(result, list):
                return [str(item).strip() for item in result if item and str(item).strip()]
                
            # Handle case where result is a dict with suggestions key
            if isinstance(result, dict) and "suggestions" in result:
                suggestions = result["suggestions"]
                if isinstance(suggestions, list):
                    return [str(item).strip() for item in suggestions if item and str(item).strip()]
                    
            logger.warning("Unexpected format in requirement improvement response")
            return []
            
        except LLMServiceError as e:
            logger.error(f"LLM service error during requirement analysis: {e}")
            return []
        except Exception as e:
            logger.error(f"Unexpected error during requirement analysis: {e}")
            return []

    async def is_available(self) -> bool:
        """
        Check if the LLM service is available and responding.
        
        Returns:
            True if LLM service is enabled and responding, False otherwise
        """
        if not self.enabled:
            return False
            
        try:
            # Try a simple completion to verify connectivity
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{self.base_url}/models",
                    timeout=aiohttp.ClientTimeout(total=5),
                ) as response:
                    return response.status == 200
        except Exception as e:
            logger.debug(f"LLM availability check failed: {e}")
            return False


# Import asyncio for timeout handling
import asyncio


# Dependency injection helper
_llm_service_instance: Optional[LLMService] = None


async def get_llm_service() -> LLMService:
    """
    Get or create the LLM service instance.
    
    Returns:
        LLMService instance
    """
    global _llm_service_instance
    if _llm_service_instance is None:
        _llm_service_instance = LLMService()
    return _llm_service_instance


def reset_llm_service() -> None:
    """Reset the LLM service instance (useful for testing)."""
    global _llm_service_instance
    _llm_service_instance = None
