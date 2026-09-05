import os
from pathlib import Path

from dotenv import load_dotenv

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware


from app.db.database import Base, engine
from app.db import models
from app.api import auth, medicines, batches, verify, admin,lifecycle


# ============================================================
# DATABASE
# ============================================================

Base.metadata.create_all(bind=engine)


# ============================================================
# FASTAPI APP
# ============================================================

BASE_DIR = Path(__file__).resolve().parents[1]
load_dotenv(BASE_DIR / ".env")

FRONTEND_URL = os.getenv(
    "FRONTEND_URL",
    "https://medverify-web.onrender.com"
    "http://127.0.0.1:5500"
)

app = FastAPI(
    title="MediVerify API",
    description="QR-Based Drug Authenticity & Lifecycle Traceability Platform",
    version="1.0.0"
)


# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        FRONTEND_URL,
        "https://medverify-web.onrender.com",
        "http://127.0.0.1:5500",
        "http://localhost:5500"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# QR CODE STATIC FILES
# ============================================================




# ============================================================
# API ROUTERS
# ============================================================

app.include_router(auth.router)
app.include_router(medicines.router)
app.include_router(batches.router)
app.include_router(verify.router)
app.include_router(admin.router)
app.include_router(lifecycle.router)


# ============================================================
# ROOT
# ============================================================

@app.get("/")
def root():
    return {
        "message": "MediVerify API is running",
        "status": "online"
    }


# ============================================================
# HEALTH CHECK
# ============================================================

@app.get("/health")
def health():
    return {
        "status": "healthy"
    }