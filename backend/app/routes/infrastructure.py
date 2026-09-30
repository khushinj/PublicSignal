from fastapi import APIRouter

from app.services.infrastructure_data import get_infrastructure_summary


router = APIRouter(
    prefix="/api/infrastructure",
    tags=["Infrastructure"],
)


@router.get("/summary")
def infrastructure_summary():
    return get_infrastructure_summary()