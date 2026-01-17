"""Application configuration using Pydantic Settings"""

from typing import Literal

from pydantic import Field, PostgresDsn, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )
    
    # Application
    PROJECT_NAME: str = "RxDx"
    VERSION: str = "0.1.0"
    ENVIRONMENT: Literal["development", "staging", "production"] = "development"
    DEBUG: bool = True
    
    # API
    API_V1_PREFIX: str = "/api/v1"
    
    # Security
    SECRET_KEY: str = Field(
        default="CHANGE_ME_IN_PRODUCTION_USE_STRONG_SECRET_KEY",
        description="Secret key for JWT token generation"
    )
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # CORS
    CORS_ORIGINS: list[str] = Field(
        default=["http://localhost:3000", "http://localhost:5173"],
        description="Allowed CORS origins"
    )
    
    # Database
    POSTGRES_SERVER: str = Field(default="localhost", description="PostgreSQL server host")
    POSTGRES_PORT: int = Field(default=5432, description="PostgreSQL server port")
    POSTGRES_USER: str = Field(default="rxdx", description="PostgreSQL username")
    POSTGRES_PASSWORD: str = Field(default="rxdx_password", description="PostgreSQL password")
    POSTGRES_DB: str = Field(default="rxdx", description="PostgreSQL database name")
    DATABASE_URL: PostgresDsn | None = None
    
    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def assemble_db_connection(cls, v: str | None, info) -> str:
        """Construct database URL from components if not provided"""
        if v is not None:
            return v
        
        values = info.data
        return str(
            PostgresDsn.build(
                scheme="postgresql+asyncpg",
                username=values.get("POSTGRES_USER"),
                password=values.get("POSTGRES_PASSWORD"),
                host=values.get("POSTGRES_SERVER"),
                port=values.get("POSTGRES_PORT"),
                path=f"{values.get('POSTGRES_DB') or ''}",
            )
        )
    
    # Graph Database (Apache AGE)
    AGE_GRAPH_NAME: str = Field(default="project_graph", description="Apache AGE graph name")
    
    # Email
    SMTP_HOST: str = Field(default="localhost", description="SMTP server host")
    SMTP_PORT: int = Field(default=587, description="SMTP server port")
    SMTP_USER: str = Field(default="", description="SMTP username")
    SMTP_PASSWORD: str = Field(default="", description="SMTP password")
    SMTP_TLS: bool = Field(default=True, description="Use TLS for SMTP")
    EMAIL_FROM: str = Field(default="noreply@rxdx.local", description="From email address")
    EMAIL_REPLY_TO: str = Field(default="support@rxdx.local", description="Reply-to email address")
    
    # Local LLM
    LLM_ENABLED: bool = Field(default=False, description="Enable local LLM integration")
    LLM_STUDIO_URL: str = Field(
        default="http://localhost:1234/v1",
        description="LM-Studio API URL"
    )
    LLM_MODEL_NAME: str = Field(
        default="local-model",
        description="LLM model name"
    )
    
    # File Storage
    UPLOAD_DIR: str = Field(default="./uploads", description="Directory for file uploads")
    MAX_UPLOAD_SIZE: int = Field(default=10 * 1024 * 1024, description="Max upload size in bytes (10MB)")
    
    # Audit
    AUDIT_LOG_RETENTION_DAYS: int = Field(
        default=3650,
        description="Audit log retention period in days (10 years)"
    )
    
    # Account Security
    MAX_LOGIN_ATTEMPTS: int = Field(default=3, description="Max failed login attempts before lock")
    ACCOUNT_LOCK_DURATION_HOURS: int = Field(default=1, description="Account lock duration in hours")


# Global settings instance
settings = Settings()
