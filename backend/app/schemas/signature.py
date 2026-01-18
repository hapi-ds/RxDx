"""Pydantic schemas for DigitalSignature model"""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class DigitalSignatureBase(BaseModel):
    """Base digital signature schema with common fields"""

    workitem_id: UUID = Field(..., description="ID of the signed WorkItem")
    workitem_version: str = Field(..., min_length=1, max_length=20, description="Version of the WorkItem that was signed")
    signature_hash: str = Field(..., min_length=1, description="Cryptographic signature (RSA with SHA-256)")
    content_hash: str = Field(..., min_length=64, max_length=64, description="SHA-256 hash of the signed content")


class DigitalSignatureCreate(DigitalSignatureBase):
    """Schema for creating a new digital signature"""

    user_id: UUID = Field(..., description="ID of the user creating the signature")


class DigitalSignatureUpdate(BaseModel):
    """Schema for updating a digital signature (limited to invalidation)"""

    is_valid: bool = Field(..., description="Whether the signature is currently valid")
    invalidation_reason: Optional[str] = Field(None, max_length=500, description="Reason for signature invalidation")


class DigitalSignatureResponse(DigitalSignatureBase):
    """Schema for digital signature response"""

    id: UUID
    user_id: UUID
    signed_at: datetime
    is_valid: bool
    invalidated_at: Optional[datetime] = None
    invalidation_reason: Optional[str] = None

    model_config = {"from_attributes": True}


class DigitalSignatureFilter(BaseModel):
    """Schema for filtering digital signatures"""

    workitem_id: Optional[UUID] = None
    user_id: Optional[UUID] = None
    workitem_version: Optional[str] = None
    is_valid: Optional[bool] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    limit: int = Field(default=100, ge=1, le=1000, description="Maximum number of results")
    offset: int = Field(default=0, ge=0, description="Number of results to skip")


class SignatureVerificationRequest(BaseModel):
    """Schema for signature verification request"""

    signature_id: UUID = Field(..., description="ID of the signature to verify")


class SignatureVerificationResponse(BaseModel):
    """Schema for signature verification response"""

    signature_id: UUID
    is_valid: bool
    verification_timestamp: datetime
    content_matches: bool
    signature_intact: bool
    error_message: Optional[str] = None


class SignWorkItemRequest(BaseModel):
    """Schema for signing a WorkItem"""

    workitem_id: UUID = Field(..., description="ID of the WorkItem to sign")
    workitem_version: str = Field(..., min_length=1, max_length=20, description="Version of the WorkItem to sign")
    workitem_content: dict = Field(..., description="Complete WorkItem content as dictionary")
    private_key_pem: str = Field(..., description="RSA private key in PEM format (base64 encoded)")


class VerifySignatureRequest(BaseModel):
    """Schema for verifying a signature"""

    current_workitem_content: dict = Field(..., description="Current WorkItem content for comparison")
    public_key_pem: str = Field(..., description="RSA public key in PEM format (base64 encoded)")