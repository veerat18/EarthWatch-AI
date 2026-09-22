import os
from typing import Optional
from pydantic import BaseModel


class Settings(BaseModel):
    PROJECT_NAME: str = "EarthWatch AI"
    API_V1_STR: str = "/api/v1"
    VERSION: str = "0.1.0"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    BACKEND_CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]

    # Satellite Provider Settings
    SATELLITE_PROVIDER: Optional[str] = os.getenv("SATELLITE_PROVIDER", "")
    SATELLITE_CLIENT_ID: Optional[str] = os.getenv("SATELLITE_CLIENT_ID", "")
    SATELLITE_CLIENT_SECRET: Optional[str] = os.getenv("SATELLITE_CLIENT_SECRET", "")

    @property
    def is_satellite_provider_configured(self) -> bool:
        """Returns True if provider credentials are fully configured."""
        return bool(
            self.SATELLITE_PROVIDER
            and self.SATELLITE_CLIENT_ID
            and self.SATELLITE_CLIENT_SECRET
        )


settings = Settings()
