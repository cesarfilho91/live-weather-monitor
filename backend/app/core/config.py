from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Live Weather Monitor API"
    environment: str = "production"
    frontend_origin: str = "http://localhost:5173"
    refresh_interval_seconds: int = 60
    request_timeout_seconds: float = 8.0

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


settings = Settings()
