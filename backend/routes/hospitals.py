"""
Hospital Routes — Full CRUD with audit logging
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import Optional
from database import get_db
from auth_utils import get_current_user
from schemas import HospitalCreate, HospitalUpdate, HospitalOut
import models
import math

router = APIRouter()


def _log(db, user, action, hospital=None, detail=""):
    db.add(models.AuditLog(
        user_id       = user.id,
        user_name     = user.name,
        user_email    = user.email,
        action        = action,
        hospital_id   = hospital.id   if hospital else None,
        hospital_name = hospital.hospital_name if hospital else None,
        detail        = detail,
    ))
    db.commit()


def _enrich(h: models.Hospital, db: Session) -> dict:
    d = {c.name: getattr(h, c.name) for c in h.__table__.columns}
    creator = db.query(models.User).filter(models.User.id == h.created_by).first()
    d["creator_name"]  = creator.name  if creator else None
    d["creator_email"] = creator.email if creator else None
    return d


@router.get("")
def list_hospitals(
    page:     int  = Query(1, ge=1),
    per_page: int  = Query(10, ge=1, le=10000),
    q:        Optional[str] = Query(None),
    db:       Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    query = db.query(models.Hospital).filter(models.Hospital.is_deleted == False)
    if q:
        like = f"%{q}%"
        query = query.filter(or_(
            models.Hospital.hospital_name.ilike(like),
            models.Hospital.dr_name.ilike(like),
            models.Hospital.specialty.ilike(like),
            models.Hospital.email.ilike(like),
        ))
    total = query.count()
    items = query.order_by(models.Hospital.created_at.desc()).offset((page-1)*per_page).limit(per_page).all()
    return {
        "items":    [_enrich(h, db) for h in items],
        "total":    total,
        "page":     page,
        "per_page": per_page,
        "pages":    max(1, math.ceil(total / per_page)),
    }


@router.post("", response_model=dict, status_code=201)
def create_hospital(payload: HospitalCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    h = models.Hospital(
        dr_name        = payload.dr_name,
        hospital_name  = payload.hospital_name,
        specialty      = payload.specialty,
        contact_number = payload.contact_number,
        email          = payload.email.lower(),
        smo            = payload.smo,
        smo_name       = payload.smo_name or "",
        smo_contact    = payload.smo_contact or "",
        smo_phone      = payload.smo_phone or "",
        created_by     = current_user.id,
        updated_by     = current_user.id,
    )
    db.add(h); db.commit(); db.refresh(h)
    _log(db, current_user, models.ActionType.CREATE, h, f"Created hospital: {h.hospital_name}")
    return _enrich(h, db)


@router.get("/{hid}", response_model=dict)
def get_hospital(hid: str, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    h = db.query(models.Hospital).filter(
        models.Hospital.id == hid, models.Hospital.is_deleted == False
    ).first()
    if not h:
        raise HTTPException(status_code=404, detail="Hospital not found")
    return _enrich(h, db)


@router.put("/{hid}", response_model=dict)
def update_hospital(hid: str, payload: HospitalUpdate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    h = db.query(models.Hospital).filter(
        models.Hospital.id == hid, models.Hospital.is_deleted == False
    ).first()
    if not h:
        raise HTTPException(status_code=404, detail="Hospital not found")

    for field, val in payload.dict(exclude_unset=True).items():
        setattr(h, field, val)
    h.updated_by = current_user.id
    db.commit(); db.refresh(h)
    _log(db, current_user, models.ActionType.UPDATE, h, f"Updated hospital: {h.hospital_name}")
    return _enrich(h, db)


@router.delete("/{hid}", response_model=dict)
def delete_hospital(hid: str, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    h = db.query(models.Hospital).filter(
        models.Hospital.id == hid, models.Hospital.is_deleted == False
    ).first()
    if not h:
        raise HTTPException(status_code=404, detail="Hospital not found")
    name = h.hospital_name
    h.is_deleted = True
    db.commit()
    _log(db, current_user, models.ActionType.DELETE, h, f"Deleted hospital: {name}")
    return {"message": f"Hospital '{name}' deleted successfully"}
