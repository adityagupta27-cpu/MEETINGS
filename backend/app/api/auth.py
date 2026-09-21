from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.database import get_db
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user
)
from app.models.user import User
from app.schemas.auth import RegisterRequest, LoginRequest, UserResponse

router = APIRouter(prefix="/auth", tags=["Authentication"])

def set_auth_cookie(response: Response, token: str):
    response.set_cookie(
        key=settings.COOKIE_NAME,
        value=token,
        httponly=True,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        expires=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        path="/"
    )

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(req: RegisterRequest, response: Response, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.email == req.email.lower().strip()).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists."
        )

    user = User(
        email=req.email.lower().strip(),
        hashed_password=hash_password(req.password),
        full_name=req.full_name.strip()
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token({"sub": user.id, "email": user.email})
    set_auth_cookie(response, token)
    return user

@router.post("/login", response_model=UserResponse)
def login(req: LoginRequest, response: Response, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email.lower().strip()).first()
    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email address or password."
        )

    token = create_access_token({"sub": user.id, "email": user.email})
    set_auth_cookie(response, token)
    return user

@router.post("/logout")
def logout(response: Response):
    response.delete_cookie(
        key=settings.COOKIE_NAME,
        path="/",
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE
    )
    return {"message": "Successfully logged out."}

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user
