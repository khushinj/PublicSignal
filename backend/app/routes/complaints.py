
from app.database import complaints_collection
from datetime import datetime, timezone
from uuid import uuid4
from fastapi import APIRouter, HTTPException, Depends
from app.auth import get_current_admin
from pydantic import BaseModel, Field
from bson import ObjectId
from bson.errors import InvalidId



class ComplaintStatusUpdate(BaseModel):
    status: str



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
        "status": "Pending"
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
        "status": "Pending"
    }

    complaints.append(complaint)

    return {
        "message": "Complaint submitted successfully",
        "complaint": complaint
    }


@router.get("/complaints")
def get_complaints(
    current_admin: dict = Depends(get_current_admin),
):
    complaints = list(
        complaints_collection.find({}, {"_id": 0})
    )
    return complaints
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


@router.patch("/complaints/{complaint_id}/status")
def update_complaint_status(
    complaint_id: str,
    request: ComplaintStatusUpdate,
    current_admin: dict = Depends(get_current_admin),
):
    allowed_statuses = [
    "Pending",
    "In Progress",
    "Resolved",
    "Rejected",
]

    if request.status not in allowed_statuses:
        raise HTTPException(
            status_code=400,
            detail="Invalid complaint status",
        )

    try:
        object_id = ObjectId(complaint_id)
    except InvalidId:
        raise HTTPException(
            status_code=400,
            detail="Invalid complaint ID",
        )

    result = complaints_collection.update_one(
        {"_id": object_id},
        {"$set": {"status": request.status}},
    )

    if result.matched_count == 0:
        raise HTTPException(
            status_code=404,
            detail="Complaint not found",
        )

    return {
        "message": "Complaint status updated successfully",
        "status": request.status,
    }