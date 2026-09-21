from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, ConfigDict

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6, description="Password must be at least 6 characters")
    full_name: str = Field(..., min_length=2, max_length=120)

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
