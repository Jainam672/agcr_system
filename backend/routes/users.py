"""
User Routes — Profile / Settings / Photo Upload
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from auth_utils import get_current_user, hash_password
from schemas import UserUpdate, UserOut
import models

router = APIRouter()

def _log(db, user, action, detail):
    db.add(models.AuditLog(
        user_id=user.id, user_name=user.name, user_email=user.email,
        action=action, detail=detail
    ))
    db.commit()


@router.get("/me", response_model=UserOut)
def get_profile(current_user=Depends(get_current_user)):
    return current_user


@router.put("/me", response_model=UserOut)
def update_profile(payload: UserUpdate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    changed = []
    if payload.name is not None:
        current_user.name = payload.name; changed.append("name")
    if payload.phone is not None:
        current_user.phone = payload.phone; changed.append("phone")
    if payload.bio is not None:
        current_user.bio = payload.bio; changed.append("bio")
    if payload.photo_url is not None:
        current_user.photo_url = payload.photo_url; changed.append("photo")
    db.commit(); db.refresh(current_user)
    if changed:
        _log(db, current_user, models.ActionType.PROFILE_UPDATE, f"Updated profile fields: {', '.join(changed)}")
    return current_user


@router.post("/me/photo")
async def upload_photo(photo_data: dict, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    """Accept base64 photo data"""
    base64_data = photo_data.get("photo_url")
    if not base64_data:
        raise HTTPException(status_code=400, detail="No photo data provided")
    current_user.photo_url = base64_data
    db.commit()
    _log(db, current_user, models.ActionType.PROFILE_UPDATE, "Profile photo updated")
    return {"message": "Photo updated", "photo_url": base64_data}
