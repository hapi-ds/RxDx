"""
Risk management service for FMEA (Failure Mode and Effects Analysis).

This service handles risk node management, failure chain creation,
RPN calculation, and mitigation tracking as per Requirement 10.
"""

from datetime import UTC, datetime
from typing import Any
from uuid import UUID, uuid4

from app.db.graph import GraphService
from app.models.user import User
from app.schemas.risk import (
    FailureNodeCreate,
    FailureNodeResponse,
    FailureNodeUpdate,
    LeadsToRelationshipCreate,
    LeadsToRelationshipResponse,
    MitigationActionCreate,
    MitigationActionResponse,
    MitigationActionUpdate,
    MitigationStatus,
    RiskChainEdge,
    RiskChainNode,
    RiskChainResponse,
    RiskNodeCreate,
    RiskNodeResponse,
    RiskNodeUpdate,
    RiskReassessmentRequest,
    RiskReassessmentResponse,
    RiskStatus,
    RPNAnalysisResponse,
    RPNThresholdConfig,
)
from app.services.audit_service import AuditService
from app.services.signature_service import SignatureService
from app.services.version_service import VersionService

# Default RPN thresholds
DEFAULT_RPN_THRESHOLDS = RPNThresholdConfig(
    critical_threshold=200,
    high_threshold=100,
    medium_threshold=50
)


class RiskService:
    """Service for managing risks, failures, and mitigations in FMEA analysis."""

    def __init__(
        self,
        graph_service: GraphService,
        audit_service: AuditService,
        signature_service: SignatureService,
        version_service: VersionService,
        rpn_thresholds: RPNThresholdConfig = DEFAULT_RPN_THRESHOLDS,
    ):
        self.graph_service = graph_service
        self.audit_service = audit_service
        self.signature_service = signature_service
        self.version_service = version_service
        self.rpn_thresholds = rpn_thresholds

    # ========================================================================
    # RPN Calculation
    # ========================================================================

    @staticmethod
    def calculate_rpn(severity: int, occurrence: int, detection: int) -> int:
        """
        Calculate Risk Priority Number (RPN).

        RPN = Severity × Occurrence × Detection

        Args:
            severity: Severity rating (1-10)
            occurrence: Occurrence rating (1-10)
            detection: Detection rating (1-10)

        Returns:
            RPN value (1-1000)
        """
        return severity * occurrence * detection

    def get_risk_level(self, rpn: int) -> str:
        """
        Determine risk level based on RPN and configured thresholds.

        Args:
            rpn: Risk Priority Number

        Returns:
            Risk level string (critical, high, medium, low)
        """
        if rpn >= self.rpn_thresholds.critical_threshold:
            return "critical"
        elif rpn >= self.rpn_thresholds.high_threshold:
            return "high"
        elif rpn >= self.rpn_thresholds.medium_threshold:
            return "medium"
        else:
            return "low"

    def requires_mitigation(self, rpn: int) -> bool:
        """
        Determine if a risk requires mitigation based on RPN.

        Args:
            rpn: Risk Priority Number

        Returns:
            True if mitigation is required
        """
        return rpn >= self.rpn_thresholds.high_threshold

    # ========================================================================
    # Risk Node Operations
    # ========================================================================

    async def create_risk(
        self,
        risk_data: RiskNodeCreate,
        user: User,
    ) -> RiskNodeResponse:
        """
        Create a new Risk node with severity, occurrence, and detection ratings.

        Args:
            risk_data: Risk creation data
            user: User creating the risk

        Returns:
            Created risk node

        Raises:
            ValueError: If linked WorkItems don't exist
        """
        # Validate linked design items exist
        for item_id in risk_data.linked_design_items:
            item = await self.graph_service.get_workitem(str(item_id))
            if not item:
                raise ValueError(f"Linked design item {item_id} does not exist")

        # Validate linked process items exist
        for item_id in risk_data.linked_process_items:
            item = await self.graph_service.get_workitem(str(item_id))
            if not item:
                raise ValueError(f"Linked process item {item_id} does not exist")

        # Calculate RPN
        rpn = self.calculate_rpn(
            risk_data.severity,
            risk_data.occurrence,
            risk_data.detection
        )

        # Generate risk ID and prepare data
        risk_id = uuid4()
        now = datetime.now(UTC)

        risk_dict = risk_data.model_dump()
        risk_dict.update({
            'id': str(risk_id),
            'type': 'risk',
            'version': '1.0',
            'rpn': rpn,
            'created_by': str(user.id),
            'created_at': now.isoformat(),
            'updated_at': now.isoformat(),
            'is_signed': False,
            'mitigation_count': 0,
            'has_open_mitigations': False,
        })

        # Create risk node in graph database
        await self.graph_service.create_node(
            label="Risk",
            properties={
                'id': str(risk_id),
                'type': 'risk',
                'title': risk_data.title,
                'description': risk_data.description,
                'status': risk_data.status.value,
                'severity': risk_data.severity,
                'occurrence': risk_data.occurrence,
                'detection': risk_data.detection,
                'rpn': rpn,
                'risk_category': risk_data.risk_category,
                'failure_mode': risk_data.failure_mode,
                'failure_effect': risk_data.failure_effect,
                'failure_cause': risk_data.failure_cause,
                'current_controls': risk_data.current_controls,
                'risk_owner': str(risk_data.risk_owner) if risk_data.risk_owner else None,
                'version': '1.0',
                'created_by': str(user.id),
                'created_at': now.isoformat(),
                'updated_at': now.isoformat(),
                'is_signed': False,
            }
        )

        # Create relationships to linked design items
        for item_id in risk_data.linked_design_items:
            await self.graph_service.create_relationship(
                from_id=str(item_id),
                to_id=str(risk_id),
                rel_type="MITIGATES",
                properties={'created_at': now.isoformat()}
            )

        # Create relationships to linked process items
        for item_id in risk_data.linked_process_items:
            await self.graph_service.create_relationship(
                from_id=str(item_id),
                to_id=str(risk_id),
                rel_type="MITIGATES",
                properties={'created_at': now.isoformat(), 'item_type': 'process'}
            )

        # Log audit event
        await self.audit_service.log(
            user_id=user.id,
            action="CREATE",
            entity_type="Risk",
            entity_id=risk_id,
            details={
                'title': risk_data.title,
                'severity': risk_data.severity,
                'occurrence': risk_data.occurrence,
                'detection': risk_data.detection,
                'rpn': rpn,
                'risk_level': self.get_risk_level(rpn),
            }
        )

        return RiskNodeResponse(**risk_dict)

    async def get_risk(self, risk_id: UUID) -> RiskNodeResponse | None:
        """
        Retrieve a risk node by ID.

        Args:
            risk_id: Risk node ID

        Returns:
            Risk node if found, None otherwise
        """
        risk = await self.graph_service.get_node(str(risk_id))
        if not risk or risk.get('type') != 'risk':
            return None

        # Get properties from node
        props = risk.get('properties', risk)

        # Check for valid signatures
        signatures = await self.signature_service.get_workitem_signatures(risk_id)
        props['is_signed'] = any(sig.is_valid for sig in signatures)

        # Get mitigation count
        mitigations = await self._get_risk_mitigations(risk_id)
        props['mitigation_count'] = len(mitigations)
        props['has_open_mitigations'] = any(
            m.get('status') not in ['completed', 'verified', 'cancelled']
            for m in mitigations
        )

        # Get linked items
        props['linked_design_items'] = await self._get_linked_items(risk_id, 'design')
        props['linked_process_items'] = await self._get_linked_items(risk_id, 'process')

        return RiskNodeResponse(**props)

    async def update_risk(
        self,
        risk_id: UUID,
        updates: RiskNodeUpdate,
        user: User,
        change_description: str = "Risk updated",
    ) -> RiskNodeResponse:
        """
        Update a risk node, creating a new version.

        Args:
            risk_id: Risk node ID
            updates: Update data
            user: User making the update
            change_description: Description of changes

        Returns:
            Updated risk node

        Raises:
            ValueError: If risk doesn't exist
        """
        # Get current risk
        current_risk = await self.graph_service.get_node(str(risk_id))
        if not current_risk or current_risk.get('type') != 'risk':
            raise ValueError(f"Risk {risk_id} not found")

        props = current_risk.get('properties', current_risk)

        # Prepare update data
        update_dict = {k: v for k, v in updates.model_dump().items() if v is not None}

        # Handle enum conversion
        if 'status' in update_dict and hasattr(update_dict['status'], 'value'):
            update_dict['status'] = update_dict['status'].value

        # Recalculate RPN if any rating changed
        severity = update_dict.get('severity', props.get('severity'))
        occurrence = update_dict.get('occurrence', props.get('occurrence'))
        detection = update_dict.get('detection', props.get('detection'))

        if any(field in update_dict for field in ['severity', 'occurrence', 'detection']):
            update_dict['rpn'] = self.calculate_rpn(severity, occurrence, detection)

        # Create new version
        new_version = await self.version_service.create_version(
            workitem_id=risk_id,
            updates=update_dict,
            user=user,
            change_description=change_description
        )

        # Log audit event
        await self.audit_service.log(
            user_id=user.id,
            action="UPDATE",
            entity_type="Risk",
            entity_id=risk_id,
            details={
                'version': new_version.get('version'),
                'changes': change_description,
                'updated_fields': list(update_dict.keys()),
                'new_rpn': update_dict.get('rpn'),
            }
        )

        return await self.get_risk(risk_id)

    async def delete_risk(self, risk_id: UUID, user: User) -> bool:
        """
        Delete a risk node if it has no valid signatures.

        Args:
            risk_id: Risk node ID
            user: User requesting deletion

        Returns:
            True if deleted successfully

        Raises:
            ValueError: If risk doesn't exist or has valid signatures
        """
        # Check if risk exists
        risk = await self.graph_service.get_node(str(risk_id))
        if not risk or risk.get('type') != 'risk':
            raise ValueError(f"Risk {risk_id} not found")

        # Check for valid signatures
        signatures = await self.signature_service.get_workitem_signatures(risk_id)
        if any(sig.is_valid for sig in signatures):
            raise ValueError("Cannot delete risk with valid signatures")

        # Delete risk and all relationships
        await self.graph_service.delete_node(str(risk_id))

        # Log audit event
        props = risk.get('properties', risk)
        await self.audit_service.log(
            user_id=user.id,
            action="DELETE",
            entity_type="Risk",
            entity_id=risk_id,
            details={'title': props.get('title', 'Unknown')}
        )

        return True

    # ========================================================================
    # Failure Node Operations
    # ========================================================================

    async def create_failure(
        self,
        failure_data: FailureNodeCreate,
        user: User,
    ) -> FailureNodeResponse:
        """
        Create a new Failure node.

        Args:
            failure_data: Failure creation data
            user: User creating the failure

        Returns:
            Created failure node
        """
        # Generate failure ID and prepare data
        failure_id = uuid4()
        now = datetime.now(UTC)

        failure_dict = failure_data.model_dump()
        failure_dict.update({
            'id': str(failure_id),
            'type': 'failure',
            'created_by': str(user.id),
            'created_at': now.isoformat(),
            'updated_at': now.isoformat(),
            'source_risk_id': None,
            'downstream_failure_count': 0,
        })

        # Handle enum conversion
        if 'failure_type' in failure_dict and hasattr(failure_dict['failure_type'], 'value'):
            failure_dict['failure_type'] = failure_dict['failure_type'].value

        # Create failure node in graph database
        await self.graph_service.create_node(
            label="Failure",
            properties={
                'id': str(failure_id),
                'type': 'failure',
                'description': failure_data.description,
                'impact': failure_data.impact,
                'failure_type': failure_dict['failure_type'],
                'severity_level': failure_data.severity_level,
                'affected_components': failure_data.affected_components,
                'detection_method': failure_data.detection_method,
                'created_by': str(user.id),
                'created_at': now.isoformat(),
                'updated_at': now.isoformat(),
            }
        )

        # Log audit event
        await self.audit_service.log(
            user_id=user.id,
            action="CREATE",
            entity_type="Failure",
            entity_id=failure_id,
            details={
                'description': failure_data.description[:100],
                'failure_type': failure_dict['failure_type'],
            }
        )

        return FailureNodeResponse(**failure_dict)

    async def get_failure(self, failure_id: UUID) -> FailureNodeResponse | None:
        """
        Retrieve a failure node by ID.

        Args:
            failure_id: Failure node ID

        Returns:
            Failure node if found, None otherwise
        """
        failure = await self.graph_service.get_node(str(failure_id))
        if not failure or failure.get('type') != 'failure':
            return None

        props = failure.get('properties', failure)

        # Get source risk
        source_risk = await self._get_source_risk(failure_id)
        props['source_risk_id'] = source_risk

        # Get downstream failure count
        downstream = await self._get_downstream_failures(failure_id)
        props['downstream_failure_count'] = len(downstream)

        return FailureNodeResponse(**props)

    async def update_failure(
        self,
        failure_id: UUID,
        updates: FailureNodeUpdate,
        user: User,
    ) -> FailureNodeResponse:
        """
        Update a failure node.

        Args:
            failure_id: Failure node ID
            updates: Update data
            user: User making the update

        Returns:
            Updated failure node

        Raises:
            ValueError: If failure doesn't exist
        """
        # Get current failure
        failure = await self.graph_service.get_node(str(failure_id))
        if not failure or failure.get('type') != 'failure':
            raise ValueError(f"Failure {failure_id} not found")

        # Prepare update data
        update_dict = {k: v for k, v in updates.model_dump().items() if v is not None}
        update_dict['updated_at'] = datetime.now(UTC).isoformat()

        # Handle enum conversion
        if 'failure_type' in update_dict and hasattr(update_dict['failure_type'], 'value'):
            update_dict['failure_type'] = update_dict['failure_type'].value

        # Update failure in graph database
        await self.graph_service.update_node(str(failure_id), update_dict)

        # Log audit event
        await self.audit_service.log(
            user_id=user.id,
            action="UPDATE",
            entity_type="Failure",
            entity_id=failure_id,
            details={'updated_fields': list(update_dict.keys())}
        )

        return await self.get_failure(failure_id)

    # ========================================================================
    # Failure Chain Operations (LEADS_TO relationships)
    # ========================================================================

    async def create_failure_chain(
        self,
        relationship_data: LeadsToRelationshipCreate,
        user: User,
    ) -> LeadsToRelationshipResponse:
        """
        Create a LEADS_TO relationship between Risk/Failure nodes.

        Args:
            relationship_data: Relationship creation data
            user: User creating the relationship

        Returns:
            Created relationship

        Raises:
            ValueError: If source or target nodes don't exist or are invalid types
        """
        # Validate source node exists and is Risk or Failure
        source = await self.graph_service.get_node(str(relationship_data.from_id))
        if not source:
            raise ValueError(f"Source node {relationship_data.from_id} not found")

        source_props = source.get('properties', source)
        source_type = source_props.get('type')
        if source_type not in ['risk', 'failure']:
            raise ValueError(f"Source node must be Risk or Failure, got {source_type}")

        # Validate target node exists and is Failure
        target = await self.graph_service.get_node(str(relationship_data.to_id))
        if not target:
            raise ValueError(f"Target node {relationship_data.to_id} not found")

        target_props = target.get('properties', target)
        target_type = target_props.get('type')
        if target_type != 'failure':
            raise ValueError(f"Target node must be Failure, got {target_type}")

        # Create LEADS_TO relationship
        now = datetime.now(UTC)
        rel_id = f"{relationship_data.from_id}-{relationship_data.to_id}-LEADS_TO"

        await self.graph_service.create_relationship(
            from_id=str(relationship_data.from_id),
            to_id=str(relationship_data.to_id),
            rel_type="LEADS_TO",
            properties={
                'probability': relationship_data.probability,
                'rationale': relationship_data.rationale,
                'created_at': now.isoformat(),
                'created_by': str(user.id),
            }
        )

        # Log audit event
        await self.audit_service.log(
            user_id=user.id,
            action="CREATE",
            entity_type="LeadsToRelationship",
            entity_id=UUID(str(relationship_data.from_id)),
            details={
                'from_id': str(relationship_data.from_id),
                'to_id': str(relationship_data.to_id),
                'probability': relationship_data.probability,
            }
        )

        return LeadsToRelationshipResponse(
            id=rel_id,
            from_id=relationship_data.from_id,
            to_id=relationship_data.to_id,
            from_type=source_type,
            to_type=target_type,
            probability=relationship_data.probability,
            rationale=relationship_data.rationale,
            created_at=now,
        )

    async def get_risk_chains(
        self,
        risk_id: UUID | None = None,
        max_depth: int = 5,
    ) -> list[RiskChainResponse]:
        """
        Get failure chains showing risk propagation paths.

        Args:
            risk_id: Optional starting risk ID (if None, gets all chains)
            max_depth: Maximum chain depth to traverse

        Returns:
            List of risk chains with failure paths and probabilities
        """
        # Use graph service to get chains
        raw_chains = await self.graph_service.get_risk_chains(
            risk_id=str(risk_id) if risk_id else None,
            max_depth=max_depth
        )

        chains = []
        for raw_chain in raw_chains:
            # Parse chain data
            nodes = []
            edges = []

            path = raw_chain.get('path', [])
            probabilities = raw_chain.get('probabilities', [])

            # Extract nodes from path
            for i, node in enumerate(path):
                node_props = node.get('properties', node) if isinstance(node, dict) else {}
                nodes.append(RiskChainNode(
                    id=UUID(node_props.get('id', str(uuid4()))),
                    type=node_props.get('type', 'unknown'),
                    title=node_props.get('title'),
                    description=node_props.get('description'),
                    severity=node_props.get('severity'),
                    rpn=node_props.get('rpn'),
                ))

            # Extract edges from path
            for i in range(len(path) - 1):
                from_node = path[i]
                to_node = path[i + 1]
                from_props = from_node.get('properties', from_node) if isinstance(from_node, dict) else {}
                to_props = to_node.get('properties', to_node) if isinstance(to_node, dict) else {}

                prob = probabilities[i] if i < len(probabilities) else 1.0

                edges.append(RiskChainEdge(
                    from_id=UUID(from_props.get('id', str(uuid4()))),
                    to_id=UUID(to_props.get('id', str(uuid4()))),
                    probability=prob,
                ))

            # Calculate total probability
            total_prob = raw_chain.get('total_probability', 1.0)

            # Get start risk ID
            start_risk = path[0] if path else {}
            start_props = start_risk.get('properties', start_risk) if isinstance(start_risk, dict) else {}

            chains.append(RiskChainResponse(
                start_risk_id=UUID(start_props.get('id', str(risk_id or uuid4()))),
                chain_length=raw_chain.get('chain_length', len(path) - 1),
                total_probability=total_prob,
                nodes=nodes,
                edges=edges,
            ))

        return chains

    # ========================================================================
    # Mitigation Action Operations
    # ========================================================================

    async def create_mitigation(
        self,
        mitigation_data: MitigationActionCreate,
        user: User,
    ) -> MitigationActionResponse:
        """
        Create a mitigation action for a risk.

        Args:
            mitigation_data: Mitigation creation data
            user: User creating the mitigation

        Returns:
            Created mitigation action

        Raises:
            ValueError: If risk doesn't exist
        """
        # Validate risk exists
        risk = await self.graph_service.get_node(str(mitigation_data.risk_id))
        if not risk or risk.get('type') != 'risk':
            raise ValueError(f"Risk {mitigation_data.risk_id} not found")

        # Generate mitigation ID and prepare data
        mitigation_id = uuid4()
        now = datetime.now(UTC)

        mitigation_dict = mitigation_data.model_dump()
        mitigation_dict.update({
            'id': str(mitigation_id),
            'type': 'mitigation',
            'created_by': str(user.id),
            'created_at': now.isoformat(),
            'updated_at': now.isoformat(),
        })

        # Handle enum conversion
        if 'status' in mitigation_dict and hasattr(mitigation_dict['status'], 'value'):
            mitigation_dict['status'] = mitigation_dict['status'].value

        # Create mitigation node in graph database
        await self.graph_service.create_node(
            label="Mitigation",
            properties={
                'id': str(mitigation_id),
                'type': 'mitigation',
                'title': mitigation_data.title,
                'description': mitigation_data.description,
                'action_type': mitigation_data.action_type,
                'status': mitigation_dict['status'],
                'assigned_to': str(mitigation_data.assigned_to) if mitigation_data.assigned_to else None,
                'due_date': mitigation_data.due_date.isoformat() if mitigation_data.due_date else None,
                'completed_date': mitigation_data.completed_date.isoformat() if mitigation_data.completed_date else None,
                'expected_severity_reduction': mitigation_data.expected_severity_reduction,
                'expected_occurrence_reduction': mitigation_data.expected_occurrence_reduction,
                'expected_detection_improvement': mitigation_data.expected_detection_improvement,
                'verification_method': mitigation_data.verification_method,
                'verification_result': mitigation_data.verification_result,
                'risk_id': str(mitigation_data.risk_id),
                'created_by': str(user.id),
                'created_at': now.isoformat(),
                'updated_at': now.isoformat(),
            }
        )

        # Create relationship to risk
        await self.graph_service.create_relationship(
            from_id=str(mitigation_data.risk_id),
            to_id=str(mitigation_id),
            rel_type="HAS_MITIGATION",
            properties={'created_at': now.isoformat()}
        )

        # Log audit event
        await self.audit_service.log(
            user_id=user.id,
            action="CREATE",
            entity_type="Mitigation",
            entity_id=mitigation_id,
            details={
                'title': mitigation_data.title,
                'risk_id': str(mitigation_data.risk_id),
                'action_type': mitigation_data.action_type,
            }
        )

        return MitigationActionResponse(**mitigation_dict)

    async def update_mitigation(
        self,
        mitigation_id: UUID,
        updates: MitigationActionUpdate,
        user: User,
    ) -> MitigationActionResponse:
        """
        Update a mitigation action.

        Args:
            mitigation_id: Mitigation action ID
            updates: Update data
            user: User making the update

        Returns:
            Updated mitigation action

        Raises:
            ValueError: If mitigation doesn't exist
        """
        # Get current mitigation
        mitigation = await self.graph_service.get_node(str(mitigation_id))
        if not mitigation or mitigation.get('type') != 'mitigation':
            raise ValueError(f"Mitigation {mitigation_id} not found")

        # Prepare update data
        update_dict = {k: v for k, v in updates.model_dump().items() if v is not None}
        update_dict['updated_at'] = datetime.now(UTC).isoformat()

        # Handle enum conversion
        if 'status' in update_dict and hasattr(update_dict['status'], 'value'):
            update_dict['status'] = update_dict['status'].value

        # Handle datetime conversion
        if 'due_date' in update_dict and update_dict['due_date']:
            update_dict['due_date'] = update_dict['due_date'].isoformat()
        if 'completed_date' in update_dict and update_dict['completed_date']:
            update_dict['completed_date'] = update_dict['completed_date'].isoformat()

        # Update mitigation in graph database
        await self.graph_service.update_node(str(mitigation_id), update_dict)

        # Log audit event
        await self.audit_service.log(
            user_id=user.id,
            action="UPDATE",
            entity_type="Mitigation",
            entity_id=mitigation_id,
            details={
                'updated_fields': list(update_dict.keys()),
                'new_status': update_dict.get('status'),
            }
        )

        return await self.get_mitigation(mitigation_id)

    async def get_mitigation(self, mitigation_id: UUID) -> MitigationActionResponse | None:
        """
        Retrieve a mitigation action by ID.

        Args:
            mitigation_id: Mitigation action ID

        Returns:
            Mitigation action if found, None otherwise
        """
        mitigation = await self.graph_service.get_node(str(mitigation_id))
        if not mitigation or mitigation.get('type') != 'mitigation':
            return None

        props = mitigation.get('properties', mitigation)
        return MitigationActionResponse(**props)

    async def get_risk_mitigations(
        self,
        risk_id: UUID,
        status: MitigationStatus | None = None,
    ) -> list[MitigationActionResponse]:
        """
        Get all mitigation actions for a risk.

        Args:
            risk_id: Risk node ID
            status: Optional status filter

        Returns:
            List of mitigation actions
        """
        mitigations = await self._get_risk_mitigations(risk_id)

        results = []
        for m in mitigations:
            if status and m.get('status') != status.value:
                continue
            results.append(MitigationActionResponse(**m))

        return results

    # ========================================================================
    # Risk Reassessment
    # ========================================================================

    async def reassess_risk(
        self,
        reassessment: RiskReassessmentRequest,
        user: User,
    ) -> RiskReassessmentResponse:
        """
        Reassess a risk after mitigation actions.

        Args:
            reassessment: Reassessment request data
            user: User performing the reassessment

        Returns:
            Reassessment response with RPN changes

        Raises:
            ValueError: If risk doesn't exist
        """
        # Get current risk
        risk = await self.graph_service.get_node(str(reassessment.risk_id))
        if not risk or risk.get('type') != 'risk':
            raise ValueError(f"Risk {reassessment.risk_id} not found")

        props = risk.get('properties', risk)

        # Store previous values
        previous_severity = props.get('severity', 1)
        previous_occurrence = props.get('occurrence', 1)
        previous_detection = props.get('detection', 1)
        previous_rpn = self.calculate_rpn(previous_severity, previous_occurrence, previous_detection)

        # Calculate new values
        new_severity = reassessment.new_severity or previous_severity
        new_occurrence = reassessment.new_occurrence or previous_occurrence
        new_detection = reassessment.new_detection or previous_detection
        new_rpn = self.calculate_rpn(new_severity, new_occurrence, new_detection)

        # Update risk with new values
        now = datetime.now(UTC)
        update_data = {
            'severity': new_severity,
            'occurrence': new_occurrence,
            'detection': new_detection,
            'rpn': new_rpn,
            'updated_at': now.isoformat(),
            'last_reassessment': now.isoformat(),
            'reassessment_notes': reassessment.reassessment_notes,
        }

        await self.graph_service.update_node(str(reassessment.risk_id), update_data)

        # Link reassessment to mitigations
        for mitigation_id in reassessment.mitigation_ids:
            await self.graph_service.create_relationship(
                from_id=str(mitigation_id),
                to_id=str(reassessment.risk_id),
                rel_type="LED_TO_REASSESSMENT",
                properties={
                    'reassessed_at': now.isoformat(),
                    'rpn_before': previous_rpn,
                    'rpn_after': new_rpn,
                }
            )

        # Log audit event
        await self.audit_service.log(
            user_id=user.id,
            action="REASSESS",
            entity_type="Risk",
            entity_id=reassessment.risk_id,
            details={
                'previous_rpn': previous_rpn,
                'new_rpn': new_rpn,
                'rpn_reduction': previous_rpn - new_rpn,
                'mitigation_ids': [str(m) for m in reassessment.mitigation_ids],
            }
        )

        # Calculate reduction percentage
        rpn_reduction = previous_rpn - new_rpn
        rpn_reduction_percentage = (rpn_reduction / previous_rpn * 100) if previous_rpn > 0 else 0.0

        return RiskReassessmentResponse(
            risk_id=reassessment.risk_id,
            previous_rpn=previous_rpn,
            new_rpn=new_rpn,
            rpn_reduction=rpn_reduction,
            rpn_reduction_percentage=round(rpn_reduction_percentage, 2),
            previous_severity=previous_severity,
            previous_occurrence=previous_occurrence,
            previous_detection=previous_detection,
            new_severity=new_severity,
            new_occurrence=new_occurrence,
            new_detection=new_detection,
            reassessment_notes=reassessment.reassessment_notes,
            reassessed_by=user.id,
            reassessed_at=now,
        )

    # ========================================================================
    # Query Methods
    # ========================================================================

    async def get_risks(
        self,
        status: RiskStatus | None = None,
        min_rpn: int | None = None,
        max_rpn: int | None = None,
        risk_owner: UUID | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[RiskNodeResponse]:
        """
        Get risks with optional filtering.

        Args:
            status: Filter by status
            min_rpn: Minimum RPN filter
            max_rpn: Maximum RPN filter
            risk_owner: Filter by risk owner
            limit: Maximum number of results
            offset: Number of results to skip

        Returns:
            List of risk nodes
        """
        # Search for risk nodes
        results = await self.graph_service.search_nodes(
            label="Risk",
            properties={'type': 'risk'},
            limit=limit + offset  # Get extra to handle offset
        )

        risks = []
        for result in results:
            props = result.get('properties', result)

            # Apply filters
            if status and props.get('status') != status.value:
                continue

            rpn = props.get('rpn', 0)
            if min_rpn and rpn < min_rpn:
                continue
            if max_rpn and rpn > max_rpn:
                continue

            if risk_owner and props.get('risk_owner') != str(risk_owner):
                continue

            # Get additional data
            risk_id = UUID(props.get('id'))
            signatures = await self.signature_service.get_workitem_signatures(risk_id)
            props['is_signed'] = any(sig.is_valid for sig in signatures)

            mitigations = await self._get_risk_mitigations(risk_id)
            props['mitigation_count'] = len(mitigations)
            props['has_open_mitigations'] = any(
                m.get('status') not in ['completed', 'verified', 'cancelled']
                for m in mitigations
            )

            props['linked_design_items'] = await self._get_linked_items(risk_id, 'design')
            props['linked_process_items'] = await self._get_linked_items(risk_id, 'process')

            risks.append(RiskNodeResponse(**props))

        # Apply offset and limit
        return risks[offset:offset + limit]

    async def get_high_rpn_risks(
        self,
        threshold: int | None = None,
    ) -> list[RiskNodeResponse]:
        """
        Get risks with RPN above threshold that require mitigation.

        Args:
            threshold: RPN threshold (defaults to configured high threshold)

        Returns:
            List of high-RPN risks
        """
        threshold = threshold or self.rpn_thresholds.high_threshold
        return await self.get_risks(min_rpn=threshold)

    async def analyze_risk(self, risk_id: UUID) -> RPNAnalysisResponse:
        """
        Analyze a risk and provide RPN-based recommendations.

        Args:
            risk_id: Risk node ID

        Returns:
            RPN analysis with risk level and recommendations

        Raises:
            ValueError: If risk doesn't exist
        """
        risk = await self.get_risk(risk_id)
        if not risk:
            raise ValueError(f"Risk {risk_id} not found")

        rpn = risk.rpn
        risk_level = self.get_risk_level(rpn)
        requires_mitigation = self.requires_mitigation(rpn)

        # Calculate recommended mitigation deadline based on risk level
        mitigation_deadline = None
        if requires_mitigation:
            from datetime import timedelta
            now = datetime.now(UTC)
            if risk_level == "critical":
                mitigation_deadline = now + timedelta(days=7)
            elif risk_level == "high":
                mitigation_deadline = now + timedelta(days=30)

        return RPNAnalysisResponse(
            risk_id=risk_id,
            rpn=rpn,
            severity=risk.severity,
            occurrence=risk.occurrence,
            detection=risk.detection,
            risk_level=risk_level,
            requires_mitigation=requires_mitigation,
            mitigation_deadline=mitigation_deadline,
        )

    # ========================================================================
    # Helper Methods
    # ========================================================================

    async def _get_risk_mitigations(self, risk_id: UUID) -> list[dict[str, Any]]:
        """Get all mitigations for a risk."""
        query = f"""
        MATCH (r:Risk {{id: '{risk_id}'}})-[:HAS_MITIGATION]->(m:Mitigation)
        RETURN m
        """
        try:
            results = await self.graph_service.execute_query(query)
            return [r.get('m', r) for r in results]
        except Exception:
            return []

    async def _get_linked_items(self, risk_id: UUID, item_type: str) -> list[UUID]:
        """Get linked design or process items for a risk."""
        query = f"""
        MATCH (w:WorkItem)-[:MITIGATES]->(r:Risk {{id: '{risk_id}'}})
        RETURN w.id as item_id
        """
        try:
            results = await self.graph_service.execute_query(query)
            return [UUID(r.get('item_id')) for r in results if r.get('item_id')]
        except Exception:
            return []

    async def _get_source_risk(self, failure_id: UUID) -> UUID | None:
        """Get the source risk for a failure node."""
        query = f"""
        MATCH (r:Risk)-[:LEADS_TO]->(f:Failure {{id: '{failure_id}'}})
        RETURN r.id as risk_id
        LIMIT 1
        """
        try:
            results = await self.graph_service.execute_query(query)
            if results:
                return UUID(results[0].get('risk_id'))
        except Exception:
            pass
        return None

    async def _get_downstream_failures(self, failure_id: UUID) -> list[dict[str, Any]]:
        """Get downstream failures from a failure node."""
        query = f"""
        MATCH (f:Failure {{id: '{failure_id}'}})-[:LEADS_TO]->(downstream:Failure)
        RETURN downstream
        """
        try:
            results = await self.graph_service.execute_query(query)
            return [r.get('downstream', r) for r in results]
        except Exception:
            return []


# ============================================================================
# Dependency Injection
# ============================================================================

async def get_risk_service(
    graph_service: GraphService,
    audit_service: AuditService,
    signature_service: SignatureService,
    version_service: VersionService,
) -> RiskService:
    """
    Dependency for getting RiskService instance.

    Args:
        graph_service: Graph database service
        audit_service: Audit logging service
        signature_service: Digital signature service
        version_service: Version control service

    Returns:
        Configured RiskService instance
    """
    return RiskService(
        graph_service=graph_service,
        audit_service=audit_service,
        signature_service=signature_service,
        version_service=version_service,
    )
