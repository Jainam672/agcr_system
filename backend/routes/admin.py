"""
Admin Routes — Full User Management, Stats, Detailed Views
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from database import get_db
from auth_utils import require_admin, hash_password
from schemas import AdminUserCreate, AdminUserUpdate
import models, math

router = APIRouter()


def _log(db, admin, action, target_user=None, detail=""):
    db.add(models.AuditLog(
        user_id    = admin.id,
        user_name  = admin.name,
        user_email = admin.email,
        action     = action,
        detail     = detail,
    ))
    db.commit()


def _fmt_user(u: models.User, db: Session) -> dict:
    hospital_count = db.query(func.count(models.Hospital.id)).filter(
        models.Hospital.created_by == u.id,
        models.Hospital.is_deleted == False
    ).scalar()
    log_count = db.query(func.count(models.AuditLog.id)).filter(
        models.AuditLog.user_id == u.id
    ).scalar()
    creator = db.query(models.User).filter(models.User.id == u.created_by).first() if u.created_by else None
    return {
        "id":              u.id,
        "email":           u.email,
        "name":            u.name,
        "role":            u.role.value,
        "status":          u.status.value,
        "phone":           u.phone,
        "bio":             u.bio,
        "photo_url":       u.photo_url,
        "created_at":      u.created_at.isoformat() if u.created_at else None,
        "updated_at":      u.updated_at.isoformat() if u.updated_at else None,
        "last_login":      u.last_login.isoformat() if u.last_login else None,
        "created_by":      u.created_by,
        "created_by_name": creator.name if creator else None,
        "hospital_count":  hospital_count,
        "log_count":       log_count,
    }


# ── Stats ──────────────────────────────────────────────────────────────────
@router.get("/stats")
def admin_stats(db: Session = Depends(get_db), _=Depends(require_admin)):
    total_users     = db.query(func.count(models.User.id)).filter(models.User.role == models.UserRole.user).scalar()
    active_users    = db.query(func.count(models.User.id)).filter(models.User.role == models.UserRole.user, models.User.status == models.UserStatus.active).scalar()
    hold_users      = db.query(func.count(models.User.id)).filter(models.User.status == models.UserStatus.hold).scalar()
    total_hospitals = db.query(func.count(models.Hospital.id)).filter(models.Hospital.is_deleted == False).scalar()
    smo_hospitals   = db.query(func.count(models.Hospital.id)).filter(models.Hospital.is_deleted == False, models.Hospital.smo == True).scalar()
    total_logs      = db.query(func.count(models.AuditLog.id)).scalar()
    creates         = db.query(func.count(models.AuditLog.id)).filter(models.AuditLog.action == models.ActionType.CREATE).scalar()
    updates         = db.query(func.count(models.AuditLog.id)).filter(models.AuditLog.action == models.ActionType.UPDATE).scalar()
    deletes         = db.query(func.count(models.AuditLog.id)).filter(models.AuditLog.action == models.ActionType.DELETE).scalar()
    return {
        "total_users": total_users, "active_users": active_users, "hold_users": hold_users,
        "total_hospitals": total_hospitals, "smo_hospitals": smo_hospitals,
        "total_logs": total_logs, "creates": creates, "updates": updates, "deletes": deletes,
    }


# ── List Users ─────────────────────────────────────────────────────────────
@router.get("/users")
def list_users(
    page:     int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    q:        Optional[str] = None,
    status:   Optional[str] = None,
    db: Session = Depends(get_db),
    _=Depends(require_admin)
):
    query = db.query(models.User).filter(models.User.status != models.UserStatus.deleted)
    if q:
        like = f"%{q}%"
        query = query.filter(
            (models.User.name.ilike(like)) | (models.User.email.ilike(like))
        )
    if status:
        query = query.filter(models.User.status == status)
    total = query.count()
    users = query.order_by(models.User.created_at.desc()).offset((page-1)*per_page).limit(per_page).all()
    return {
        "items":    [_fmt_user(u, db) for u in users],
        "total":    total,
        "page":     page,
        "per_page": per_page,
        "pages":    max(1, math.ceil(total/per_page)),
    }


# ── Get User Detail ────────────────────────────────────────────────────────
@router.get("/users/{uid}")
def get_user(uid: str, db: Session = Depends(get_db), _=Depends(require_admin)):
    u = db.query(models.User).filter(models.User.id == uid).first()
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
    data = _fmt_user(u, db)
    # Include recent logs
    logs = db.query(models.AuditLog).filter(
        models.AuditLog.user_id == uid
    ).order_by(models.AuditLog.ts.desc()).limit(20).all()
    data["recent_logs"] = [{
        "id": l.id, "action": l.action.value, "hospital_name": l.hospital_name,
        "detail": l.detail, "ts": l.ts.isoformat() if l.ts else None,
    } for l in logs]
    # Include hospitals created by user
    hospitals = db.query(models.Hospital).filter(
        models.Hospital.created_by == uid,
        models.Hospital.is_deleted == False
    ).order_by(models.Hospital.created_at.desc()).all()
    data["hospitals"] = [{
        "id": h.id, "hospital_name": h.hospital_name, "dr_name": h.dr_name,
        "specialty": h.specialty, "smo": h.smo, "created_at": h.created_at.isoformat() if h.created_at else None,
    } for h in hospitals]
    return data


# ── Create User ────────────────────────────────────────────────────────────
@router.post("/users", status_code=201)
def create_user(payload: AdminUserCreate, db: Session = Depends(get_db), admin=Depends(require_admin)):
    existing = db.query(models.User).filter(models.User.email == payload.email.lower()).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    u = models.User(
        email         = payload.email.lower(),
        password_hash = hash_password(payload.password),
        name          = payload.name,
        phone         = payload.phone,
        role          = payload.role,
        status        = models.UserStatus.active,
        created_by    = admin.id,
    )
    db.add(u); db.commit(); db.refresh(u)
    _log(db, admin, models.ActionType.USER_CREATE, u, f"Created user: {u.name} ({u.email})")
    return _fmt_user(u, db)


# ── Update User ────────────────────────────────────────────────────────────
@router.put("/users/{uid}")
def update_user(uid: str, payload: AdminUserUpdate, db: Session = Depends(get_db), admin=Depends(require_admin)):
    u = db.query(models.User).filter(models.User.id == uid).first()
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
    changed = []
    if payload.name   is not None: u.name   = payload.name;   changed.append("name")
    if payload.phone  is not None: u.phone  = payload.phone;  changed.append("phone")
    if payload.role   is not None: u.role   = payload.role;   changed.append("role")
    if payload.status is not None: u.status = payload.status; changed.append("status")
    if payload.email  is not None:
        # Check uniqueness
        ex = db.query(models.User).filter(models.User.email == payload.email.lower(), models.User.id != uid).first()
        if ex: raise HTTPException(status_code=400, detail="Email already in use")
        u.email = payload.email.lower(); changed.append("email")
    if payload.password is not None:
        u.password_hash = hash_password(payload.password); changed.append("password")
    db.commit(); db.refresh(u)
    _log(db, admin, models.ActionType.USER_UPDATE, u, f"Updated user {u.name}: {', '.join(changed)}")
    return _fmt_user(u, db)


# ── Hold / Activate User ───────────────────────────────────────────────────
@router.post("/users/{uid}/hold")
def hold_user(uid: str, db: Session = Depends(get_db), admin=Depends(require_admin)):
    u = db.query(models.User).filter(models.User.id == uid).first()
    if not u: raise HTTPException(404, "User not found")
    u.status = models.UserStatus.hold; db.commit()
    _log(db, admin, models.ActionType.USER_HOLD, u, f"Placed user on hold: {u.name}")
    return {"message": f"User '{u.name}' is now on hold"}


@router.post("/users/{uid}/activate")
def activate_user(uid: str, db: Session = Depends(get_db), admin=Depends(require_admin)):
    u = db.query(models.User).filter(models.User.id == uid).first()
    if not u: raise HTTPException(404, "User not found")
    u.status = models.UserStatus.active; db.commit()
    _log(db, admin, models.ActionType.USER_ACTIVATE, u, f"Activated user: {u.name}")
    return {"message": f"User '{u.name}' activated"}


# ── Delete User ────────────────────────────────────────────────────────────
@router.delete("/users/{uid}")
def delete_user(uid: str, db: Session = Depends(get_db), admin=Depends(require_admin)):
    u = db.query(models.User).filter(models.User.id == uid).first()
    if not u: raise HTTPException(404, "User not found")
    name = u.name
    u.status = models.UserStatus.deleted; db.commit()
    _log(db, admin, models.ActionType.USER_DELETE, u, f"Deleted user: {name}")
    return {"message": f"User '{name}' deleted"}


# ── Reset User Password ────────────────────────────────────────────────────
@router.post("/users/{uid}/reset-password")
def reset_password(uid: str, data: dict, db: Session = Depends(get_db), admin=Depends(require_admin)):
    u = db.query(models.User).filter(models.User.id == uid).first()
    if not u: raise HTTPException(404, "User not found")
    new_pw = data.get("password")
    if not new_pw or len(new_pw) < 6:
        raise HTTPException(400, "Password must be at least 6 characters")
    u.password_hash = hash_password(new_pw)
    db.commit()
    _log(db, admin, models.ActionType.PASSWORD_CHANGE, u, f"Admin reset password for: {u.name}")
    return {"message": f"Password reset for '{u.name}'"}


# ── Seed Admin (first run) ─────────────────────────────────────────────────
@router.post("/seed", include_in_schema=False)
def seed(db: Session = Depends(get_db)):
    """Create default admin if no admin exists"""
    exists = db.query(models.User).filter(models.User.role == models.UserRole.admin).first()
    if exists:
        return {"message": "Admin already exists"}
    admin = models.User(
        email         = "adminagcr2024@gmail.com",
        password_hash = hash_password("admin@2024"),
        name          = "Admin Controller",
        role          = models.UserRole.admin,
        status        = models.UserStatus.active,
    )
    db.add(admin); db.commit()
    return {"message": "Default admin created", "email": "adminagcr2024@gmail.com", "password": "admin@2024"}
