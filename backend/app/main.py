
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import check_database_connection
from app.routes.complaints import router as complaints_router

app = FastAPI(title="PublicSignal API")

# CORS configuration for GitHub Codespaces development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(complaints_router)


@app.get("/")
def home():
    return {"message": "PublicSignal backend is running"}


@app.get("/health")
def health_check():
    return {"status": "healthy"}



@app.get("/health/db")
def database_health():
    try:
        check_database_connection()
        return {"database": "connected"}
    except Exception as e:
        return {
            "database": "disconnected",
            "error": str(e)
        }