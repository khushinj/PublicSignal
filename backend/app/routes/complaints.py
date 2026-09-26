
from app.database import complaints_collection
from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api", tags=["Complaints"])



class ComplaintRequest(BaseModel):
    text: str = Field(..., min_length=5, max_length=2000)
    language: str
    location_raw: str = Field(..., min_length=2, max_length=200)
    source: str = "web-text"


@router.post("/submit-complaint")
def submit_complaint(request: ComplaintRequest):
    supported_languages = ["hindi", "marathi"]

    if request.language.lower() not in supported_languages:
        raise HTTPException(
            status_code=400,
            detail="Only Hindi and Marathi are currently supported"
        )

    complaint = {
        "id": str(uuid4()),
        "text": request.text,
        "language": request.language.lower(),
        "location_raw": request.location_raw,
        "source": request.source,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "status": "pending_processing"
    }

    try:
        complaints_collection.insert_one(complaint.copy())

        return {
            "message": "Complaint submitted successfully",
            "complaint": complaint
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail="Failed to save complaint to database"
        )
    supported_languages = ["hindi", "marathi"]

    if request.language.lower() not in supported_languages:
        raise HTTPException(
            status_code=400,
            detail="Only Hindi and Marathi are currently supported"
        )

    complaint = {
        "id": str(uuid4()),
        "text": request.text,
        "language": request.language.lower(),
        "location_raw": request.location_raw,
        "source": request.source,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "status": "pending_processing"
    }

    complaints.append(complaint)

    return {
        "message": "Complaint submitted successfully",
        "complaint": complaint
    }


@router.get("/complaints")
def get_complaints():
    try:
        complaints = list(
            complaints_collection.find(
                {},
                {"_id": 0}
            ).sort("timestamp", -1)
        )

        return {
            "total": len(complaints),
            "complaints": complaints
        }

    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve complaints"
        )