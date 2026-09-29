
from app.database import complaints_collection
from datetime import datetime, timezone
from uuid import uuid4
from fastapi import APIRouter, HTTPException, Depends
from app.auth import get_current_admin
from pydantic import BaseModel, Field
from bson import ObjectId
from bson.errors import InvalidId
from pydantic import BaseModel, Field, field_validator
import requests
import os
import cloudinary
import cloudinary.uploader
from pydantic import ValidationError
from dotenv import load_dotenv
from fastapi import UploadFile, File, Form


load_dotenv()

cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET"),
    secure=True
)

class ComplaintStatusUpdate(BaseModel):
    status: str



router = APIRouter(prefix="/api", tags=["Complaints"])


class ComplaintRequest(BaseModel):
    text: str = Field(..., min_length=5, max_length=2000)
    language: str
    location_raw: str = Field(..., min_length=2, max_length=200)
    landmark: str = Field(..., min_length=2, max_length=200)
    source: str = "web-text"

    @field_validator("location_raw")
    @classmethod
    def validate_location(cls, value):
        value = value.strip()

        if len(value) < 3:
            raise ValueError("Please enter a valid location.")

        if not any(char.isalpha() for char in value):
            raise ValueError("Location must contain letters.")

        if value.lower() in ["hello", "hi", "test", "abc", "xyz"]:
            raise ValueError("Please enter an actual location.")

        return value


def verify_location(location: str):
    url = "https://nominatim.openstreetmap.org/search"

    params = {
        "q": location,
        "format": "jsonv2",
        "limit": 1,
        "countrycodes": "in"
    }

    headers = {
        "User-Agent": "PublicSignal/1.0 (civic infrastructure reporting app)"
    }

    try:
        response = requests.get(
            url,
            params=params,
            headers=headers,
            timeout=10
        )

        response.raise_for_status()
        results = response.json()

        if not results:
            return None

        place = results[0]

        return {
            "display_name": place.get("display_name"),
            "latitude": float(place["lat"]),
            "longitude": float(place["lon"])
        }

    except requests.RequestException:
        raise HTTPException(
            status_code=503,
            detail="Location verification is temporarily unavailable. Please try again."
        )


@router.get("/location-suggestions")
def location_suggestions(q: str):
    query = q.strip()

    if len(query) < 3:
        return []

    url = "https://nominatim.openstreetmap.org/search"

    params = {
        "q": query,
        "format": "jsonv2",
        "limit": 5,
        "countrycodes": "in",
        "addressdetails": 1
    }

    headers = {
        "User-Agent": "PublicSignal/1.0 (civic infrastructure reporting app)"
    }

    try:
        response = requests.get(
            url,
            params=params,
            headers=headers,
            timeout=10
        )

        response.raise_for_status()

        results = response.json()

        return [
            {
                "display_name": place["display_name"],
                "latitude": float(place["lat"]),
                "longitude": float(place["lon"])
            }
            for place in results
        ]

    except requests.RequestException:
        raise HTTPException(
            status_code=503,
            detail="Location suggestions are temporarily unavailable."
        )


def upload_complaint_audio(audio: UploadFile):
    MAX_AUDIO_SIZE = 20 * 1024 * 1024  # 20 MB

    content_type = (audio.content_type or "").lower()

    allowed_types = (
        "audio/webm",
        "audio/wav",
        "audio/x-wav",
        "audio/mpeg",
        "audio/mp4",
        "audio/ogg",
        "audio/x-m4a",
        "audio/aac",
        "application/octet-stream",
    )

    if not any(
        content_type == allowed
        or content_type.startswith(allowed + ";")
        for allowed in allowed_types
    ):
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported audio format: {content_type}",
        )

    audio.file.seek(0, 2)
    file_size = audio.file.tell()
    audio.file.seek(0)

    if file_size > MAX_AUDIO_SIZE:
        raise HTTPException(
            status_code=400,
            detail="Audio must be smaller than 20 MB.",
        )

    try:
        result = cloudinary.uploader.upload(
            audio.file,
            resource_type="video",
            folder="publicsignal/audio",
            timeout=60,
        )

        return result["secure_url"]

    except Exception as e:
        print("Cloudinary audio upload failed:", str(e))

        raise HTTPException(
            status_code=502,
            detail="Audio upload failed. Please try again.",
        )


@router.post("/submit-complaint")
def submit_complaint(
    text: str = Form(...),
    language: str = Form(...),
    location_raw: str = Form(...),
    landmark: str = Form(...),
    source: str = Form("web-text"),
    audio: UploadFile | None = File(None)
):
    supported_languages = ["hindi", "marathi"]

    if language.lower() not in supported_languages:
        raise HTTPException(
            status_code=400,
            detail="Only Hindi and Marathi are currently supported"
        )

    # Validate the complaint fields using your existing model
    try:
        request = ComplaintRequest(
            text=text,
            language=language,
            location_raw=location_raw,
            landmark=landmark,
            source=source
        )
    except ValidationError as e:
        raise HTTPException(
            status_code=422,
            detail=e.errors()
        )

    # Verify the complaint location
    verified_location = verify_location(request.location_raw)

    if verified_location is None:
        raise HTTPException(
            status_code=400,
            detail=(
                "Location not found. Please enter a real locality, "
                "street, or landmark in India."
            )
        )

    # Upload audio only when a recording is provided
    audio_url = None

    if audio and audio.filename:
        audio_url = upload_complaint_audio(audio)

    # Create complaint document
    complaint = {
        "id": str(uuid4()),
        "text": request.text,
        "language": request.language.lower(),
        "location_raw": request.location_raw,
        "location_verified": verified_location["display_name"],
        "latitude": verified_location["latitude"],
        "longitude": verified_location["longitude"],
        "landmark": request.landmark,
        "source": request.source,
        "audio_url": audio_url,
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
        print("Complaint database error:", str(e))

        raise HTTPException(
            status_code=500,
            detail="Failed to save complaint to database"
        )

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
        object_id = complaint_id
    except InvalidId:
        raise HTTPException(
            status_code=400,
            detail="Invalid complaint ID",
        )

    result = complaints_collection.update_one(
    {"id": complaint_id},
    {"$set": {"status": request.status}}
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