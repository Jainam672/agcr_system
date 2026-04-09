@echo off
echo ══════════════════════════════════════════════════
echo   AGCR Clinical Trial Site Management Platform
echo   Windows Startup Script
echo ══════════════════════════════════════════════════
echo.
call .venv\Scripts\activate.bat
echo Installing dependencies...
cd backend
pip install -r requirements.txt -q
echo.
echo Starting AGCR Platform...
echo URL:      http://localhost:8000
echo API Docs: http://localhost:8000/api/docs
echo.
echo Default Admin:
echo Email:    adminagcr2024@gmail.com
echo Password: admin@2024
echo.
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
pause
