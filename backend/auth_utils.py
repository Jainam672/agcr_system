"""
Auth Utilities — JWT tokens + password hashing
"""

from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from database import get_db
import models
import os

SECRET_KEY  = os.getenv("SECRET_KEY", "agcr-super-secret-key-2024-clinical-trials")
ALGORITHM   = "HS256"
ACCESS_TTL  = 60 * 24  # 24 hours in minutes

pwd_ctx = None # removed passlib
oauth2     = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode('utf-8'), hashed.encode('utf-8'))
    except Exception:
        return False

def create_token(data: dict, expires_minutes: int = ACCESS_TTL) -> str:
    payload = data.copy()
    payload["exp"] = datetime.utcnow() + timedelta(minutes=expires_minutes)
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def decode_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        return None


def get_current_user(token: str = Depends(oauth2), db: Session = Depends(get_db)):
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")
    user = db.query(models.User).filter(
        models.User.id == user_id,
        models.User.status != models.UserStatus.deleted
    ).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    user_status_str = str(user.status.value) if hasattr(user.status, 'value') else str(user.status)
    if user_status_str == models.UserStatus.hold.value:
        raise HTTPException(status_code=403, detail="Account is on hold. Please contact admin.")
    return user


def require_admin(current_user: models.User = Depends(get_current_user)):
    user_role_str = str(current_user.role.value) if hasattr(current_user.role, 'value') else str(current_user.role)
    if user_role_str != models.UserRole.admin.value:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


def optional_user(token: str = Depends(oauth2), db: Session = Depends(get_db)):
    if not token:
        return None
    payload = decode_token(token)
    if not payload:
        return None
    user_id = payload.get("sub")
    return db.query(models.User).filter(models.User.id == user_id).first()
