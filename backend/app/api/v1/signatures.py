"""Digital signature API endpoints"""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_signature_service
from app.db.session import get_db
from app.models.user import User
from app.schemas.signature import (
    DigitalSignatureResponse,
    SignatureVerificationResponse,
    SignWorkItemRequest,
    VerifySignatureRequest,
)
from app.services.audit_service import AuditService, get_audit_service
from app.services.signature_service import SignatureService

router = APIRouter()


@router.post("/signatures", response_model=DigitalSignatureResponse, status_code=status.HTTP_201_CREATED)
async def create_signature(
    request: SignWorkItemRequest,
    current_user: User = Depends(get_current_user),
    signature_service: SignatureService = Depends(get_signature_service),
    audit_service: AuditService = Depends(get_audit_service),
) -> DigitalSignatureResponse:
    """
    Create a digital signature for a WorkItem.

    **Requirement 2.1**: Creates Digital_Signature with user identity, timestamp, and cryptographic hash
    **Requirement 2.2**: Stores signature immutably in the database
    **Requirement 7.3.5**: Integrates signature validation with audit logging

    Args:
        request: Sign WorkItem request containing workitem details and private key
        current_user: Current authenticated user
        signature_service: Digital signature service instance
        audit_service: Audit service for compliance logging

    Returns:
        Created digital signature details

    Raises:
        HTTPException 400: Invalid private key or signing failed
        HTTPException 401: User not authenticated
        HTTPException 403: User lacks SIGN_WORKITEM permission
    """
    try:
        # Convert base64 private key to bytes
        import base64
        private_key_bytes = base64.b64decode(request.private_key_pem.encode())

        # Create signature
        signature = await signature_service.sign_workitem(
            workitem_id=request.workitem_id,
            workitem_version=request.workitem_version,
            workitem_content=request.workitem_content,
            user=current_user,
            private_key_pem=private_key_bytes,
        )

        # Log signature creation event
        await audit_service.log_signature_event(
            event_type="SIGN",
            workitem_id=request.workitem_id,
            user_id=current_user.id,
            signature_id=signature.id,
        )

        return signature

    except ValueError as e:
        # Log failed signature attempt
        await audit_service.log_signature_event(
            event_type="SIGN_FAILED",
            workitem_id=request.workitem_id,
            user_id=current_user.id,
        )

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create signature: {str(e)}",
        )
    except Exception as e:
        # Log system error
        await audit_service.log_signature_event(
            event_type="SIGN_ERROR",
            workitem_id=request.workitem_id,
            user_id=current_user.id,
        )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}",
        )


@router.get("/signatures/{signature_id}", response_model=DigitalSignatureResponse)
async def get_signature(
    signature_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    audit_service: AuditService = Depends(get_audit_service),
) -> DigitalSignatureResponse:
    """
    Get digital signature details by ID.

    **Requirement 2.5**: Display signature with signer name and timestamp
    **Requirement 7.3.5**: Integrates signature validation with audit logging

    Args:
        signature_id: UUID of the signature to retrieve
        current_user: Current authenticated user
        db: Database session
        audit_service: Audit service for compliance logging

    Returns:
        Digital signature details

    Raises:
        HTTPException 404: Signature not found
        HTTPException 401: User not authenticated
    """
    from sqlalchemy import select

    from app.models.signature import DigitalSignature

    # Get signature from database
    result = await db.execute(
        select(DigitalSignature).where(DigitalSignature.id == signature_id)
    )
    signature = result.scalar_one_or_none()

    if not signature:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Signature not found",
        )

    # Log signature access
    await audit_service.log_crud_operation(
        operation="READ",
        entity_type="DigitalSignature",
        entity_id=signature_id,
        user_id=current_user.id,
    )

    return DigitalSignatureResponse.model_validate(signature)


@router.get("/workitems/{workitem_id}/signatures", response_model=list[DigitalSignatureResponse])
async def get_workitem_signatures(
    workitem_id: UUID,
    include_invalid: bool = False,
    current_user: User = Depends(get_current_user),
    signature_service: SignatureService = Depends(get_signature_service),
    audit_service: AuditService = Depends(get_audit_service),
) -> list[DigitalSignatureResponse]:
    """
    Get all signatures for a WorkItem.

    **Requirement 2.5**: Display all valid signatures with signer names and timestamps
    **Requirement 7.3.5**: Integrates signature validation with audit logging

    Args:
        workitem_id: UUID of the WorkItem
        include_invalid: Whether to include invalidated signatures (default: False)
        current_user: Current authenticated user
        signature_service: Digital signature service instance
        audit_service: Audit service for compliance logging

    Returns:
        List of signatures for the WorkItem

    Raises:
        HTTPException 401: User not authenticated
    """
    signatures = await signature_service.get_workitem_signatures(
        workitem_id=workitem_id,
        include_invalid=include_invalid,
    )

    # Log workitem signature access
    await audit_service.log_crud_operation(
        operation="READ",
        entity_type="WorkItemSignatures",
        entity_id=workitem_id,
        user_id=current_user.id,
        changes={"include_invalid": include_invalid, "signature_count": len(signatures)},
    )

    return signatures


@router.post("/signatures/{signature_id}/verify", response_model=SignatureVerificationResponse)
async def verify_signature(
    signature_id: UUID,
    request: VerifySignatureRequest,
    current_user: User = Depends(get_current_user),
    signature_service: SignatureService = Depends(get_signature_service),
    audit_service: AuditService = Depends(get_audit_service),
) -> SignatureVerificationResponse:
    """
    Verify the integrity and validity of a digital signature.

    **Requirement 2.4**: Verify Digital_Signature integrity on access
    **Requirement 7.3.5**: Integrates signature validation with audit logging

    Args:
        signature_id: UUID of the signature to verify
        request: Verification request containing current content and public key
        current_user: Current authenticated user
        signature_service: Digital signature service instance
        audit_service: Audit service for compliance logging

    Returns:
        Signature verification results

    Raises:
        HTTPException 400: Invalid public key
        HTTPException 401: User not authenticated
    """
    try:
        # Convert base64 public key to bytes
        import base64
        public_key_bytes = base64.b64decode(request.public_key_pem.encode())

        # Verify signature
        verification_result = await signature_service.verify_signature(
            signature_id=signature_id,
            current_workitem_content=request.current_workitem_content,
            public_key_pem=public_key_bytes,
        )

        # Log signature verification event
        await audit_service.log_signature_event(
            event_type="VERIFY",
            workitem_id=UUID("00000000-0000-0000-0000-000000000000"),  # Will be updated with actual workitem_id
            user_id=current_user.id,
            signature_id=signature_id,
            verification_result=verification_result.is_valid,
        )

        return verification_result

    except ValueError as e:
        # Log failed verification attempt
        await audit_service.log_signature_event(
            event_type="VERIFY_FAILED",
            workitem_id=UUID("00000000-0000-0000-0000-000000000000"),
            user_id=current_user.id,
            signature_id=signature_id,
        )

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to verify signature: {str(e)}",
        )
    except Exception as e:
        # Log system error
        await audit_service.log_signature_event(
            event_type="VERIFY_ERROR",
            workitem_id=UUID("00000000-0000-0000-0000-000000000000"),
            user_id=current_user.id,
            signature_id=signature_id,
        )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}",
        )
