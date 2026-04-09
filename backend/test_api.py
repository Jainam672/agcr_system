from fastapi.testclient import TestClient
from main import app

client = TestClient(app)
response = client.post("/api/auth/login", json={
    "email": "adminagcr2024@gmail.com",
    "password": "admin@2024",
    "role": "admin"
})
print("STATUS:", response.status_code)
print("BODY:", response.json())
