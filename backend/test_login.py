import sys
sys.path.append(".")
from database import SessionLocal
from models import User

db = SessionLocal()
u = db.query(User).filter(User.email == "adminagcr2024@gmail.com").first()
if u:
    from auth_utils import verify_password
    print("User found:", u.email)
    try:
        ok = verify_password("admin@2024", u.password_hash)
        print("Password check:", ok)
    except Exception as e:
        print("Password check error:", repr(e))
else:
    print("User not found.")
