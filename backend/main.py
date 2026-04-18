"""
AGCR – Akshar Global Clinical Research
FastAPI Backend — Complete System
"""

from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import uvicorn
import os

from database import engine, Base
from routes import auth, users, hospitals, logs, admin
from auth_utils import hash_password
from models import User, UserRole, UserStatus
from sqlalchemy import inspect, text

# ── Create tables ──────────────────────────────────────────────────────────
Base.metadata.create_all(bind=engine)

# ── Ensure database schema updates for legacy installs
def ensure_user_permission_column():
    inspector = inspect(engine)
    if 'users' in inspector.get_table_names():
        columns = [col['name'] for col in inspector.get_columns('users')]
        if 'can_add_hospitals' not in columns:
            with engine.connect() as conn:
                conn.execute(text('ALTER TABLE users ADD COLUMN can_add_hospitals INTEGER NOT NULL DEFAULT 0'))
                conn.commit()

ensure_user_permission_column()

# ── Initialize default admin user ──────────────────────────────────────────
def init_admin():
    from sqlalchemy.orm import sessionmaker
    Session = sessionmaker(bind=engine)
    db = Session()
    try:
        admin_email = "adminagcr2024@gmail.com"
        existing = db.query(User.id).filter(User.email == admin_email).first()
        if not existing:
            admin_user = User(
                email=admin_email,
                password_hash=hash_password("admin@2024"),
                name="System Administrator",
                role=UserRole.admin,
                status=UserStatus.active,
            )
            db.add(admin_user)
            db.commit()
            print("Default admin user created.")
        else:
            print("Admin user already exists.")
    except Exception as e:
        print(f"Error initializing admin: {e}")
    finally:
        db.close()

init_admin()

# ── App ────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="AGCR Clinical Trial Platform API",
    description="Complete backend for AGCR Clinical Trial Site Management",
    version="2.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── API Routes ─────────────────────────────────────────────────────────────
app.include_router(auth.router,      prefix="/api/auth",      tags=["Authentication"])
app.include_router(users.router,     prefix="/api/users",     tags=["Users"])
app.include_router(hospitals.router, prefix="/api/hospitals", tags=["Hospitals"])
app.include_router(logs.router,      prefix="/api/logs",      tags=["Audit Logs"])
app.include_router(admin.router,     prefix="/api/admin",     tags=["Admin"])

# ── Serve Frontend ─────────────────────────────────────────────────────────
FRONTEND = os.path.join(os.path.dirname(__file__), "..", "frontend")
if os.path.exists(os.path.join(FRONTEND, "static")):
    app.mount("/static", StaticFiles(directory=os.path.join(FRONTEND, "static")), name="static")

@app.get("/", response_class=HTMLResponse)
@app.get("/{full_path:path}")
async def serve_frontend(full_path: str = ""):
    if full_path:
        requested = os.path.join(FRONTEND, full_path)
        if os.path.exists(requested) and os.path.isfile(requested):
            return FileResponse(requested)

    index = os.path.join(FRONTEND, "index.html")
    if os.path.exists(index):
        with open(index, encoding="utf-8") as f:
            return HTMLResponse(content=f.read())
    return HTMLResponse(content="<h1>Frontend not found</h1>", status_code=404)

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
