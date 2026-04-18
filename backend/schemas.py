"""
Pydantic Schemas — AGCR Platform
"""

from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional, List
from datetime import datetime
from enum import Enum


class UserRole(str, Enum):
    admin = "admin"
    user  = "user"

class UserStatus(str, Enum):
    active  = "active"
    hold    = "hold"
    deleted = "deleted"


# ── Auth ───────────────────────────────────────────────────────────────────
class LoginRequest(BaseModel):
    email:    EmailStr
    password: str
    role:     UserRole

class TokenResponse(BaseModel):
    access_token:  str
    token_type:    str = "bearer"
    user_id:       str
    name:          str
    email:         str
    role:          str
    status:        str
    photo_url:     Optional[str] = None
    can_add_hospitals: bool = False

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password:     str = Field(min_length=6)


# ── User ───────────────────────────────────────────────────────────────────
class UserCreate(BaseModel):
    email:    EmailStr
    password: str = Field(min_length=6)
    name:     str = Field(min_length=2)
    phone:    Optional[str] = None
    bio:      Optional[str] = None
    role:     UserRole = UserRole.user

class UserUpdate(BaseModel):
    name:     Optional[str] = None
    phone:    Optional[str] = None
    bio:      Optional[str] = None
    photo_url:Optional[str] = None

class UserOut(BaseModel):
    id:         str
    email:      str
    name:       str
    role:       str
    status:     str
    phone:      Optional[str]
    bio:        Optional[str]
    photo_url:  Optional[str]
    can_add_hospitals: bool = False
    created_at: Optional[datetime]
    updated_at: Optional[datetime]
    last_login: Optional[datetime]
    created_by: Optional[str]

    class Config:
        from_attributes = True

class AdminUserCreate(BaseModel):
    email:    EmailStr
    password: str = Field(min_length=6)
    name:     str = Field(min_length=2)
    phone:    Optional[str] = None
    role:     UserRole = UserRole.user
    can_add_hospitals: bool = False

class AdminUserUpdate(BaseModel):
    name:     Optional[str] = None
    email:    Optional[EmailStr] = None
    phone:    Optional[str] = None
    status:   Optional[UserStatus] = None
    role:     Optional[UserRole] = None
    can_add_hospitals: Optional[bool] = None
    password: Optional[str] = None


# ── Hospital ───────────────────────────────────────────────────────────────
class HospitalCreate(BaseModel):
    dr_name:        str = Field(min_length=2)
    hospital_name:  str = Field(min_length=2)
    specialty:      str
    contact_number: str
    email:          EmailStr
    smo:            bool = False
    smo_name:       Optional[str] = None
    smo_contact:    Optional[str] = None
    smo_phone:      Optional[str] = None

class HospitalUpdate(BaseModel):
    dr_name:        Optional[str] = None
    hospital_name:  Optional[str] = None
    specialty:      Optional[str] = None
    contact_number: Optional[str] = None
    email:          Optional[EmailStr] = None
    smo:            Optional[bool] = None
    smo_name:       Optional[str] = None
    smo_contact:    Optional[str] = None
    smo_phone:      Optional[str] = None

class HospitalOut(BaseModel):
    id:             str
    dr_name:        str
    hospital_name:  str
    specialty:      str
    contact_number: str
    email:          str
    smo:            bool
    smo_name:       Optional[str]
    smo_contact:    Optional[str]
    smo_phone:      Optional[str]
    created_by:     Optional[str]
    updated_by:     Optional[str]
    created_at:     Optional[datetime]
    updated_at:     Optional[datetime]
    creator_name:   Optional[str] = None
    creator_email:  Optional[str] = None

    class Config:
        from_attributes = True


# ── Audit Log ──────────────────────────────────────────────────────────────
class AuditLogOut(BaseModel):
    id:            str
    user_id:       Optional[str]
    user_name:     Optional[str]
    user_email:    Optional[str]
    action:        str
    hospital_id:   Optional[str]
    hospital_name: Optional[str]
    detail:        Optional[str]
    ip_address:    Optional[str]
    ts:            Optional[datetime]

    class Config:
        from_attributes = True


# ── Common ─────────────────────────────────────────────────────────────────
class MessageResponse(BaseModel):
    message: str

class PaginatedResponse(BaseModel):
    items:   list
    total:   int
    page:    int
    per_page:int
    pages:   int
