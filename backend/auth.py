from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel
from sqlalchemy import text
from pwdlib import PasswordHash
from database import engine
from otp_db import create_otp, verify_user_otp
from jwt_auth import create_access_token, verify_token

router = APIRouter(tags=["Authentication"])

password_hash_context = PasswordHash.recommended()

class LoginRequest(BaseModel):
    email: str
    password: str

class VerifyOTPRequest(BaseModel):
    user_id: int
    otp: str

@router.post("/auth/login")
def login(request: LoginRequest):
    with engine.begin() as conn:
        user = conn.execute(
            text("SELECT id, name, email, role, password_hash FROM users WHERE email = :email"),
            {"email": request.email}
        ).mappings().first()

    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    if not password_hash_context.verify(request.password, user["password_hash"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    otp = create_otp(user["id"])

    return {
        "message": "Password verified. OTP generated successfully.",
        "user_id": user["id"],
        "email": user["email"],
        "dev_otp": otp
    }

@router.post("/auth/verify-otp")
def verify_otp_endpoint(request: VerifyOTPRequest):
    success, message = verify_user_otp(request.user_id, request.otp)

    if not success:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=message)

    with engine.begin() as conn:
        user = conn.execute(
            text("SELECT id, name, email, role FROM users WHERE id = :id"),
            {"id": request.user_id}
        ).mappings().first()

    token = create_access_token({
        "sub": str(user["id"]),
        "name": user["name"],
        "email": user["email"],
        "role": user["role"]
    })

    return {
        "message": "OTP verified successfully. Login complete!",
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "name": user["name"],
            "email": user["email"],
            "role": user["role"]
        }
    }

@router.get("/auth/me")
def get_current_user(payload: dict = Depends(verify_token)):
    return {
        "authenticated_user": payload
    }