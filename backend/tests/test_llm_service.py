"""
Unit tests for LLM service.

Tests cover:
- LLMService initialization and configuration
- Work instruction extraction from emails
- Meeting knowledge extraction
- Requirement improvement suggestions
- Graceful degradation when LLM is unavailable
- JSON parsing from various response formats
"""

import json
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
import aiohttp

from app.services.llm_service import (
    LLMService,
    LLMServiceError,
    LLMConnectionError,
    LLMResponseError,
    get_llm_service,
    reset_llm_service,
)


class TestLLMServiceInitialization:
    """Tests for LLMService initialization and configuration."""
    
    def test_default_initialization(self):
        """Test LLMService initializes with default settings."""
        service = LLMService()
        
        assert service.base_url is not None
        assert service.model is not None
        assert service.timeout == 30
    
    def test_custom_initialization(self):
        """Test LLMService initializes with custom settings."""
        service = LLMService(
            base_url="http://custom:8080/v1",
            model="custom-model",
            enabled=True,
            timeout=60,
        )
        
        assert service.base_url == "http://custom:8080/v1"
        assert service.model == "custom-model"
        assert service.enabled is True
        assert service.timeout == 60
    
    def test_disabled_service(self):
        """Test LLMService can be explicitly disabled."""
        service = LLMService(enabled=False)
        
        assert service.enabled is False


class TestLLMServiceGracefulDegradation:
    """Tests for graceful degradation when LLM is unavailable."""
    
    @pytest.mark.asyncio
    async def test_extract_work_instruction_when_disabled(self):
        """Test extract_work_instruction returns None when disabled."""
        service = LLMService(enabled=False)
        
        result = await service.extract_work_instruction("Test email body")
        
        assert result is None
    
    @pytest.mark.asyncio
    async def test_extract_meeting_knowledge_when_disabled(self):
        """Test extract_meeting_knowledge returns empty dict when disabled."""
        service = LLMService(enabled=False)
        
        result = await service.extract_meeting_knowledge("Test meeting text")
        
        assert result == {
            "entities": [],
            "relationships": [],
            "decisions": [],
            "actions": []
        }
    
    @pytest.mark.asyncio
    async def test_suggest_requirement_improvements_when_disabled(self):
        """Test suggest_requirement_improvements returns empty list when disabled."""
        service = LLMService(enabled=False)
        
        result = await service.suggest_requirement_improvements("Test requirement")
        
        assert result == []
    
    @pytest.mark.asyncio
    async def test_is_available_when_disabled(self):
        """Test is_available returns False when disabled."""
        service = LLMService(enabled=False)
        
        result = await service.is_available()
        
        assert result is False


class TestLLMServiceEmptyInput:
    """Tests for handling empty or invalid input."""
    
    @pytest.mark.asyncio
    async def test_extract_work_instruction_empty_body(self):
        """Test extract_work_instruction handles empty email body."""
        service = LLMService(enabled=True)
        
        result = await service.extract_work_instruction("")
        
        assert result is None
    
    @pytest.mark.asyncio
    async def test_extract_work_instruction_whitespace_only(self):
        """Test extract_work_instruction handles whitespace-only body."""
        service = LLMService(enabled=True)
        
        result = await service.extract_work_instruction("   \n\t  ")
        
        assert result is None
    
    @pytest.mark.asyncio
    async def test_extract_meeting_knowledge_empty_text(self):
        """Test extract_meeting_knowledge handles empty text."""
        service = LLMService(enabled=True)
        
        result = await service.extract_meeting_knowledge("")
        
        assert result == {
            "entities": [],
            "relationships": [],
            "decisions": [],
            "actions": []
        }
    
    @pytest.mark.asyncio
    async def test_suggest_requirement_improvements_empty_text(self):
        """Test suggest_requirement_improvements handles empty text."""
        service = LLMService(enabled=True)
        
        result = await service.suggest_requirement_improvements("")
        
        assert result == []


class TestJSONParsing:
    """Tests for JSON parsing from LLM responses."""
    
    def test_parse_direct_json(self):
        """Test parsing direct JSON response."""
        service = LLMService()
        
        response = '{"status": "active", "comment": "Test"}'
        result = service._parse_json_response(response)
        
        assert result == {"status": "active", "comment": "Test"}
    
    def test_parse_json_in_markdown_code_block(self):
        """Test parsing JSON from markdown code block."""
        service = LLMService()
        
        response = '''Here is the result:
```json
{"status": "completed", "time_spent": 2.5}
```
'''
        result = service._parse_json_response(response)
        
        assert result == {"status": "completed", "time_spent": 2.5}
    
    def test_parse_json_in_generic_code_block(self):
        """Test parsing JSON from generic code block."""
        service = LLMService()
        
        response = '''```
{"entities": [{"name": "John", "type": "person"}]}
```'''
        result = service._parse_json_response(response)
        
        assert result == {"entities": [{"name": "John", "type": "person"}]}
    
    def test_parse_json_with_surrounding_text(self):
        """Test parsing JSON embedded in text."""
        service = LLMService()
        
        response = 'The extracted data is: {"status": "draft"} as requested.'
        result = service._parse_json_response(response)
        
        assert result == {"status": "draft"}
    
    def test_parse_json_array(self):
        """Test parsing JSON array response."""
        service = LLMService()
        
        response = '["suggestion 1", "suggestion 2"]'
        result = service._parse_json_response(response)
        
        assert result == ["suggestion 1", "suggestion 2"]
    
    def test_parse_empty_response(self):
        """Test parsing empty response returns None."""
        service = LLMService()
        
        result = service._parse_json_response("")
        
        assert result is None
    
    def test_parse_invalid_json(self):
        """Test parsing invalid JSON returns None."""
        service = LLMService()
        
        result = service._parse_json_response("This is not JSON at all")
        
        assert result is None


class TestExtractWorkInstruction:
    """Tests for work instruction extraction."""
    
    @pytest.mark.asyncio
    async def test_extract_work_instruction_success(self):
        """Test successful work instruction extraction."""
        service = LLMService(enabled=True)
        
        mock_response = {
            "choices": [{
                "message": {
                    "content": '{"status": "active", "comment": "Made progress", "time_spent": 3.5}'
                }
            }]
        }
        
        with patch.object(service, '_call_llm', new_callable=AsyncMock) as mock_call:
            mock_call.return_value = '{"status": "active", "comment": "Made progress", "time_spent": 3.5}'
            
            result = await service.extract_work_instruction(
                "I've been working on the task. Status is active. Spent 3.5 hours."
            )
        
        assert result is not None
        assert result["status"] == "active"
        assert result["comment"] == "Made progress"
        assert result["time_spent"] == 3.5
    
    @pytest.mark.asyncio
    async def test_extract_work_instruction_validates_status(self):
        """Test that invalid status values are filtered out."""
        service = LLMService(enabled=True)
        
        with patch.object(service, '_call_llm', new_callable=AsyncMock) as mock_call:
            mock_call.return_value = '{"status": "invalid_status", "comment": "Test"}'
            
            result = await service.extract_work_instruction("Test email")
        
        assert result is not None
        assert "status" not in result
        assert result["comment"] == "Test"
    
    @pytest.mark.asyncio
    async def test_extract_work_instruction_validates_time_spent(self):
        """Test that negative time_spent values are filtered out."""
        service = LLMService(enabled=True)
        
        with patch.object(service, '_call_llm', new_callable=AsyncMock) as mock_call:
            mock_call.return_value = '{"status": "active", "time_spent": -5}'
            
            result = await service.extract_work_instruction("Test email")
        
        assert result is not None
        assert result["status"] == "active"
        assert "time_spent" not in result
    
    @pytest.mark.asyncio
    async def test_extract_work_instruction_handles_llm_error(self):
        """Test graceful handling of LLM errors."""
        service = LLMService(enabled=True)
        
        with patch.object(service, '_call_llm', new_callable=AsyncMock) as mock_call:
            mock_call.side_effect = LLMConnectionError("Connection failed")
            
            result = await service.extract_work_instruction("Test email")
        
        assert result is None


class TestExtractMeetingKnowledge:
    """Tests for meeting knowledge extraction."""
    
    @pytest.mark.asyncio
    async def test_extract_meeting_knowledge_success(self):
        """Test successful meeting knowledge extraction."""
        service = LLMService(enabled=True)
        
        mock_response = json.dumps({
            "entities": [
                {"name": "John Smith", "type": "person"},
                {"name": "Auth Module", "type": "component"}
            ],
            "decisions": [
                {"description": "Use OAuth2 for authentication", "owner": "John"}
            ],
            "actions": [
                {"description": "Implement login flow", "assignee": "John", "deadline": "Friday"}
            ],
            "relationships": [
                {"from": "John Smith", "to": "Auth Module", "type": "owns"}
            ]
        })
        
        with patch.object(service, '_call_llm', new_callable=AsyncMock) as mock_call:
            mock_call.return_value = mock_response
            
            result = await service.extract_meeting_knowledge(
                "Meeting notes: John discussed the Auth Module..."
            )
        
        assert len(result["entities"]) == 2
        assert result["entities"][0]["name"] == "John Smith"
        assert len(result["decisions"]) == 1
        assert len(result["actions"]) == 1
        assert len(result["relationships"]) == 1
    
    @pytest.mark.asyncio
    async def test_extract_meeting_knowledge_handles_missing_fields(self):
        """Test handling of partial LLM response."""
        service = LLMService(enabled=True)
        
        mock_response = json.dumps({
            "entities": [{"name": "Test Entity"}]
            # Missing decisions, actions, relationships
        })
        
        with patch.object(service, '_call_llm', new_callable=AsyncMock) as mock_call:
            mock_call.return_value = mock_response
            
            result = await service.extract_meeting_knowledge("Test meeting")
        
        assert len(result["entities"]) == 1
        assert result["decisions"] == []
        assert result["actions"] == []
        assert result["relationships"] == []
    
    @pytest.mark.asyncio
    async def test_extract_meeting_knowledge_handles_llm_error(self):
        """Test graceful handling of LLM errors."""
        service = LLMService(enabled=True)
        
        with patch.object(service, '_call_llm', new_callable=AsyncMock) as mock_call:
            mock_call.side_effect = LLMConnectionError("Connection failed")
            
            result = await service.extract_meeting_knowledge("Test meeting")
        
        assert result == {
            "entities": [],
            "relationships": [],
            "decisions": [],
            "actions": []
        }


class TestSuggestRequirementImprovements:
    """Tests for requirement improvement suggestions."""
    
    @pytest.mark.asyncio
    async def test_suggest_improvements_success(self):
        """Test successful requirement improvement suggestions."""
        service = LLMService(enabled=True)
        
        mock_response = '["Add specific acceptance criteria", "Define measurable metrics"]'
        
        with patch.object(service, '_call_llm', new_callable=AsyncMock) as mock_call:
            mock_call.return_value = mock_response
            
            result = await service.suggest_requirement_improvements(
                "The system should be fast"
            )
        
        assert len(result) == 2
        assert "acceptance criteria" in result[0].lower()
        assert "metrics" in result[1].lower()
    
    @pytest.mark.asyncio
    async def test_suggest_improvements_handles_dict_response(self):
        """Test handling of dict response with suggestions key."""
        service = LLMService(enabled=True)
        
        mock_response = '{"suggestions": ["Suggestion 1", "Suggestion 2"]}'
        
        with patch.object(service, '_call_llm', new_callable=AsyncMock) as mock_call:
            mock_call.return_value = mock_response
            
            result = await service.suggest_requirement_improvements("Test requirement")
        
        assert len(result) == 2
    
    @pytest.mark.asyncio
    async def test_suggest_improvements_filters_empty_strings(self):
        """Test that empty suggestions are filtered out."""
        service = LLMService(enabled=True)
        
        mock_response = '["Valid suggestion", "", "  ", "Another valid"]'
        
        with patch.object(service, '_call_llm', new_callable=AsyncMock) as mock_call:
            mock_call.return_value = mock_response
            
            result = await service.suggest_requirement_improvements("Test requirement")
        
        assert len(result) == 2
        assert "Valid suggestion" in result
        assert "Another valid" in result
    
    @pytest.mark.asyncio
    async def test_suggest_improvements_handles_llm_error(self):
        """Test graceful handling of LLM errors."""
        service = LLMService(enabled=True)
        
        with patch.object(service, '_call_llm', new_callable=AsyncMock) as mock_call:
            mock_call.side_effect = LLMConnectionError("Connection failed")
            
            result = await service.suggest_requirement_improvements("Test requirement")
        
        assert result == []


class TestLLMServiceAvailability:
    """Tests for LLM service availability checking."""
    
    @pytest.mark.asyncio
    async def test_is_available_success(self):
        """Test is_available returns True when service responds."""
        service = LLMService(enabled=True)
        
        mock_response = MagicMock()
        mock_response.status = 200
        
        with patch('aiohttp.ClientSession') as mock_session_class:
            mock_session = MagicMock()
            mock_session.__aenter__ = AsyncMock(return_value=mock_session)
            mock_session.__aexit__ = AsyncMock(return_value=None)
            
            mock_get = MagicMock()
            mock_get.__aenter__ = AsyncMock(return_value=mock_response)
            mock_get.__aexit__ = AsyncMock(return_value=None)
            mock_session.get.return_value = mock_get
            
            mock_session_class.return_value = mock_session
            
            result = await service.is_available()
        
        assert result is True
    
    @pytest.mark.asyncio
    async def test_is_available_connection_error(self):
        """Test is_available returns False on connection error."""
        service = LLMService(enabled=True)
        
        with patch('aiohttp.ClientSession') as mock_session_class:
            mock_session = MagicMock()
            mock_session.__aenter__ = AsyncMock(return_value=mock_session)
            mock_session.__aexit__ = AsyncMock(return_value=None)
            mock_session.get.side_effect = aiohttp.ClientError("Connection failed")
            
            mock_session_class.return_value = mock_session
            
            result = await service.is_available()
        
        assert result is False


class TestDependencyInjection:
    """Tests for dependency injection helpers."""
    
    @pytest.mark.asyncio
    async def test_get_llm_service_returns_instance(self):
        """Test get_llm_service returns an LLMService instance."""
        reset_llm_service()
        
        service = await get_llm_service()
        
        assert isinstance(service, LLMService)
    
    @pytest.mark.asyncio
    async def test_get_llm_service_returns_same_instance(self):
        """Test get_llm_service returns the same instance on subsequent calls."""
        reset_llm_service()
        
        service1 = await get_llm_service()
        service2 = await get_llm_service()
        
        assert service1 is service2
    
    def test_reset_llm_service(self):
        """Test reset_llm_service clears the cached instance."""
        reset_llm_service()
        
        # This should not raise any errors
        reset_llm_service()
