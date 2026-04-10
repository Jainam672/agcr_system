# AGCR Clinical Trial Management System

A beautiful, high-performance web application designed for comprehensive management of Clinical Site details, SMO records, administrative user access, and system-wide audit logging. Built specifically with responsiveness and a sleek user interface in mind, backed by a robust FastAPI framework.

---

## 🌟 Key Features

*   **🔒 Complete Role-Based Access**: Specialized functionality and routing separated seamlessly between `admin` and `user` roles.
*   **🏥 Hospital & SMO Tracking**: Powerful data tables handling thousands of hospital configurations, doctor assignments, and precise Site Management Organization details.
*   **📜 Comprehensive Audit Trail**: The backend automatically tracks every single update, delete, or create operation with IP addresses and timestamps mapped to user accounts.
*   **💅 Premium UI/UX**: Fast, responsive, dark-mode aware, using beautiful glassmorphism and subtle animations. Hosted completely statically for blazing fast performance.
*   **🛠 Local & Cloud Ready**: Setup to run natively on your machine flawlessly utilizing `SQLite`, while perfectly compatible with scaling to `PostgreSQL` in a cloud environment.

## 🚀 Running Locally (Windows)

The system manages both the front-end interface and back-end logic natively with zero complex configurations.

1.  **Start the Server**: Simply double click or run the `start.bat` file in the root directory.
    ```bash
    ./start.bat
    ```
2.  The script will automatically activate the Python virtual environment, install necessary requirements, and start Uvicorn.
3.  **Access the Platform**: Open your browser and navigate to:
    *   **http://localhost:8000**
4.  **Default Admin Login**:
    *   **Email**: `adminagcr2024@gmail.com`
    *   **Password**: `admin@2024`


## ☁️ Deploying on Render (Live Site)

Hosting this application publicly is incredibly straight-forward using **Render's Web Services**.

### Option A: Free Tier Deployment (Important Warning)
*Note: Render's Free Tier includes an ephemeral file system. If deployed as is using the local SQLite database, your data will reset every time the server spins down or goes to sleep.*

1.  Push this entire repository to your GitHub account.
2.  Go to the [Render Dashboard](https://dashboard.render.com/) and click **New -> Web Service**.
3.  Connect your GitHub repo.
4.  Configure the build settings:
    *   **Build Command**: `pip install -r backend/requirements.txt`
    *   **Start Command**: `cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Click **Deploy**. Your app will be live and functional in minutes.

### Option B: Production Setup (PostgreSQL)
To keep your data safe from restarts on the Cloud while on free plans, modify your configuration so it uses Render's **PostgreSQL Database** instead of SQLite:

1. Create a **PostgreSQL** instance on Render.
2. In your `backend/requirements.txt`, add the postgres library by adding the line: `psycopg2-binary==2.9.9`.
3. In your `backend/database.py`, modify your connection URL back to support environment parsing:
   ```python
   import os
   DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./agcr.db")
   # Make sure your database URL starts with "postgresql://" (Note: Render provides "postgres://", which needs to be updated to "postgresql://" in your environment variables)
   ```
4. Back in your Render Web Service settings, add an **Environment Variable**:
   *   Key: `DATABASE_URL`
   *   Value: `postgresql://your_render_db_url...`

## 📁 Repository Structure
```
agcr_system/
├── backend/
│   ├── routes/              # FastAPI Routers separated by domain (users, hospitals, admin)
│   ├── models.py            # SQLAlchemy Database Table definition
│   ├── database.py          # Database Connection logic
│   ├── auth_utils.py        # JWT generation and Bcrypt password hashing
│   └── main.py              # Application entrypoint & Frontend serving mount
├── frontend/
│   ├── index.html           # Super App Frontend (SPA setup)
│   └── (static assets)
└── start.bat                # One-click boot script
```
