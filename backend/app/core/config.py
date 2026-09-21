from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "AI Meeting Notes & Action Tracker"
    DATABASE_URL: str = "sqlite:///./meetings.db"
    SECRET_KEY: str = "zignuts-super-secret-production-grade-jwt-key-2026"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    COOKIE_NAME: str = "access_token"
    COOKIE_SECURE: bool = False  # Set to True in production HTTPS
    COOKIE_SAMESITE: str = "lax"
    FRONTEND_URL: str = "http://localhost:5173"
    GEMINI_API_KEY: str = ""
    ENVIRONMENT: str = "development"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
