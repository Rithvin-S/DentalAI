import os
from typing import List, Set
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "DentalAI"
    API_V1_STR: str = "/api"
    
    # CORS settings
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "*"
    ]
    
    # File upload rules (per SRS FR-05)
    MAX_FILE_SIZE_BYTES: int = 10 * 1024 * 1024  # 10 MB per image
    ALLOWED_EXTENSIONS: Set[str] = {".jpg", ".jpeg", ".png", ".webp"}
    ALLOWED_MIME_TYPES: Set[str] = {"image/jpeg", "image/png", "image/webp"}
    
    # AI Vision Model Settings (per SRS FR-10, FR-16)
    AI_PROVIDER: str = "auto"  # "auto", "gemini", "openai", "mock"
    GEMINI_API_KEY: str | None = None
    GEMINI_MODEL: str = "gemini-1.5-flash"
    OPENAI_API_KEY: str | None = None
    OPENAI_MODEL: str = "gpt-4o"
    REQUEST_TIMEOUT_SECONDS: int = 45
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()
