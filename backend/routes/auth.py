"""
Auth Routes — Login / Logout / Change Password
"""

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from datetime import datetime
from database import get_db
from auth_utils import verify_password, create_token, get_current_user, hash_password
from schemas import LoginRequest, TokenResponse, ChangePasswordRequest, MessageResponse
import models

router = APIRouter()

def _log(db, user, action, detail, ip=None):
    entry = models.AuditLog(
        user_id     = user.id,
        user_name   = user.name,
        user_email  = user.email,
        action      = action,
        detail      = detail,
        ip_address  = ip,
    )
    db.add(entry); db.commit()


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, request: Request, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(
        models.User.email == payload.email.lower(),
        models.User.status != models.UserStatus.deleted
    ).first()

    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    user_role_str = str(user.role.value) if hasattr(user.role, 'value') else str(user.role)
    payload_role_str = str(payload.role.value) if hasattr(payload.role, 'value') else str(payload.role)
    if user_role_str != payload_role_str:
        raise HTTPException(status_code=401, detail=f"No {payload.role} account found with these credentials")

    user_status_str = str(user.status.value) if hasattr(user.status, 'value') else str(user.status)
    if user_status_str == models.UserStatus.hold.value:
        raise HTTPException(status_code=403, detail="Your account is on hold. Please contact the administrator.")

    # Update last login
    user.last_login = datetime.utcnow()
    db.commit()

    ip = request.client.host if request.client else None
    _log(db, user, models.ActionType.LOGIN, "User logged in", ip)

    token = create_token({"sub": user.id, "role": user.role.value, "email": user.email})
    return TokenResponse(
        access_token        = token,
        user_id             = user.id,
        name                = user.name,
        email               = user.email,
        role                = user.role.value,
        status              = user.status.value,
        photo_url           = user.photo_url,
        can_add_hospitals   = bool(user.can_add_hospitals),
    )


@router.post("/logout", response_model=MessageResponse)
def logout(request: Request, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    ip = request.client.host if request.client else None
    _log(db, current_user, models.ActionType.LOGOUT, "User logged out", ip)
    return {"message": "Logged out successfully"}


@router.post("/change-password", response_model=MessageResponse)
def change_password(payload: ChangePasswordRequest, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    if not verify_password(payload.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    current_user.password_hash = hash_password(payload.new_password)
    db.commit()
    _log(db, current_user, models.ActionType.PASSWORD_CHANGE, "Password changed")
    return {"message": "Password changed successfully"}


@router.get("/me")
def me(current_user=Depends(get_current_user)):
    return {
        "id":                current_user.id,
        "name":              current_user.name,
        "email":             current_user.email,
        "role":              current_user.role.value,
        "status":            current_user.status.value,
        "phone":             current_user.phone,
        "bio":               current_user.bio,
        "photo_url":         current_user.photo_url,
        "can_add_hospitals": bool(current_user.can_add_hospitals),
        "last_login":        current_user.last_login,
    }
