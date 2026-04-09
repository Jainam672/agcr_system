"""
Audit Logs Routes
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from database import get_db
from auth_utils import get_current_user, require_admin
from schemas import AuditLogOut
import models, math

router = APIRouter()


@router.get("/my")
def my_logs(
    page:     int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    q = db.query(models.AuditLog).filter(models.AuditLog.user_id == current_user.id)
    total = q.count()
    items = q.order_by(models.AuditLog.ts.desc()).offset((page-1)*per_page).limit(per_page).all()
    return {
        "items":    [_fmt(l) for l in items],
        "total":    total,
        "page":     page,
        "per_page": per_page,
        "pages":    max(1, math.ceil(total/per_page)),
    }


@router.get("/all")
def all_logs(
    page:     int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    user_id:  Optional[str] = None,
    action:   Optional[str] = None,
    db: Session = Depends(get_db),
    _=Depends(require_admin)
):
    q = db.query(models.AuditLog)
    if user_id:
        q = q.filter(models.AuditLog.user_id == user_id)
    if action:
        q = q.filter(models.AuditLog.action == action)
    total = q.count()
    items = q.order_by(models.AuditLog.ts.desc()).offset((page-1)*per_page).limit(per_page).all()
    return {
        "items":    [_fmt(l) for l in items],
        "total":    total,
        "page":     page,
        "per_page": per_page,
        "pages":    max(1, math.ceil(total/per_page)),
    }


@router.get("/user/{uid}")
def user_logs(
    uid:  str,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db:   Session = Depends(get_db),
    _=Depends(require_admin)
):
    q = db.query(models.AuditLog).filter(models.AuditLog.user_id == uid)
    total = q.count()
    items = q.order_by(models.AuditLog.ts.desc()).offset((page-1)*per_page).limit(per_page).all()
    return {
        "items":    [_fmt(l) for l in items],
        "total":    total,
        "page":     page,
        "per_page": per_page,
        "pages":    max(1, math.ceil(total/per_page)),
    }


def _fmt(l: models.AuditLog) -> dict:
    return {
        "id":            l.id,
        "user_id":       l.user_id,
        "user_name":     l.user_name,
        "user_email":    l.user_email,
        "action":        l.action.value if l.action else None,
        "hospital_id":   l.hospital_id,
        "hospital_name": l.hospital_name,
        "detail":        l.detail,
        "ip_address":    l.ip_address,
        "ts":            l.ts.isoformat() if l.ts else None,
    }
