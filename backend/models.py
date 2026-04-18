"""
SQLAlchemy ORM Models — AGCR Platform
"""

from sqlalchemy import (
    Column, String, Boolean, DateTime, Text, ForeignKey,
    Integer, Enum as SAEnum, LargeBinary
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid, enum
from database import Base


def gen_id():
    return str(uuid.uuid4())


# ── Enums ──────────────────────────────────────────────────────────────────
class UserRole(str, enum.Enum):
    admin = "admin"
    user  = "user"

class UserStatus(str, enum.Enum):
    active = "active"
    hold   = "hold"
    deleted = "deleted"

class ActionType(str, enum.Enum):
    LOGIN    = "LOGIN"
    LOGOUT   = "LOGOUT"
    CREATE   = "CREATE"
    UPDATE   = "UPDATE"
    DELETE   = "DELETE"
    USER_CREATE = "USER_CREATE"
    USER_UPDATE = "USER_UPDATE"
    USER_DELETE = "USER_DELETE"
    USER_HOLD   = "USER_HOLD"
    USER_ACTIVATE = "USER_ACTIVATE"
    PASSWORD_CHANGE = "PASSWORD_CHANGE"
    PROFILE_UPDATE  = "PROFILE_UPDATE"


# ── User ───────────────────────────────────────────────────────────────────
class User(Base):
    __tablename__ = "users"

    id           = Column(String(36), primary_key=True, default=gen_id)
    email        = Column(String(255), unique=True, nullable=False, index=True)
    password_hash= Column(String(255), nullable=False)
    name         = Column(String(255), nullable=False)
    role         = Column(SAEnum(UserRole), default=UserRole.user, nullable=False)
    status       = Column(SAEnum(UserStatus), default=UserStatus.active, nullable=False)
    phone        = Column(String(30), nullable=True)
    bio          = Column(Text, nullable=True)
    photo_url    = Column(Text, nullable=True)        # base64 or URL
    can_add_hospitals = Column(Boolean, default=False, nullable=False)
    created_at   = Column(DateTime(timezone=True), server_default=func.now())
    updated_at   = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    created_by   = Column(String(36), ForeignKey("users.id"), nullable=True)
    last_login   = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    hospitals    = relationship("Hospital", back_populates="creator", foreign_keys="Hospital.created_by")
    audit_logs   = relationship("AuditLog", back_populates="user", foreign_keys="AuditLog.user_id")


# ── Hospital ───────────────────────────────────────────────────────────────
class Hospital(Base):
    __tablename__ = "hospitals"

    id             = Column(String(36), primary_key=True, default=gen_id)
    dr_name        = Column(String(255), nullable=False)
    hospital_name  = Column(String(255), nullable=False, index=True)
    specialty      = Column(String(100), nullable=False)
    contact_number = Column(String(30), nullable=False)
    email          = Column(String(255), nullable=False)

    smo            = Column(Boolean, default=False)
    smo_name       = Column(String(255), nullable=True)
    smo_contact    = Column(String(255), nullable=True)
    smo_phone      = Column(String(30), nullable=True)

    created_by     = Column(String(36), ForeignKey("users.id"), nullable=False)
    updated_by     = Column(String(36), ForeignKey("users.id"), nullable=True)
    created_at     = Column(DateTime(timezone=True), server_default=func.now())
    updated_at     = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    is_deleted     = Column(Boolean, default=False)

    creator        = relationship("User", back_populates="hospitals", foreign_keys=[created_by])
    audit_logs     = relationship("AuditLog", back_populates="hospital", foreign_keys="AuditLog.hospital_id")


# ── Audit Log ──────────────────────────────────────────────────────────────
class AuditLog(Base):
    __tablename__ = "audit_logs"

    id          = Column(String(36), primary_key=True, default=gen_id)
    user_id     = Column(String(36), ForeignKey("users.id"), nullable=True)
    user_name   = Column(String(255), nullable=True)   # snapshot
    user_email  = Column(String(255), nullable=True)   # snapshot
    action      = Column(SAEnum(ActionType), nullable=False)
    hospital_id = Column(String(36), ForeignKey("hospitals.id"), nullable=True)
    hospital_name = Column(String(255), nullable=True) # snapshot
    detail      = Column(Text, nullable=True)
    ip_address  = Column(String(50), nullable=True)
    extra       = Column(Text, nullable=True)           # JSON metadata
    ts          = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    user        = relationship("User", back_populates="audit_logs", foreign_keys=[user_id])
    hospital    = relationship("Hospital", back_populates="audit_logs", foreign_keys=[hospital_id])
