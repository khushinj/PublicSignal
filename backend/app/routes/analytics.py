from collections import Counter
from datetime import datetime
from math import radians, sin, cos, sqrt, atan2
from app.services.infrastructure_matching import find_nearest_infrastructure
from app.services.infrastructure_score import calculate_infrastructure_score
from app.services.priority_explanation import generate_priority_explanation
from fastapi import APIRouter, Depends

from app.auth import get_current_admin
from app.database import complaints_collection


router = APIRouter(
    prefix="/api/analytics",
    tags=["Analytics"]
)


CATEGORY_MAP = {
    "road": "Roads",
    "roads": "Roads",
    "roadIssues": "Roads",

    "water": "Water",
    "waterSupply": "Water",

    "drainage": "Drainage",

    "waste": "Waste",
    "garbage": "Waste",

    "streetlight": "Streetlights",
    "streetlights": "Streetlights",

    "electricity": "Electricity",

    "transport": "Public Transport",
    "publicTransport": "Public Transport",

    "healthcare": "Healthcare",
    "health": "Healthcare",

    "education": "Education",

    "environment": "Environment",

    "publicBuildings": "Public Buildings",

    "other": "Other",
}


def normalize_category(category):
    if not category:
        return None

    category = str(category).strip()

    # Direct mapping
    if category in CATEGORY_MAP:
        return CATEGORY_MAP[category]

    # Case-insensitive matching
    category_lower = category.lower()

    for key, value in CATEGORY_MAP.items():
        if key.lower() == category_lower:
            return value

    # Keep unknown categories instead of deleting information
    return category


def calculate_distance_km(lat1, lon1, lat2, lon2):
    """
    Calculate approximate distance between two coordinates
    using the Haversine formula.
    """

    earth_radius_km = 6371

    lat1 = radians(lat1)
    lon1 = radians(lon1)
    lat2 = radians(lat2)
    lon2 = radians(lon2)

    dlat = lat2 - lat1
    dlon = lon2 - lon1

    a = (
        sin(dlat / 2) ** 2
        + cos(lat1)
        * cos(lat2)
        * sin(dlon / 2) ** 2
    )

    c = 2 * atan2(sqrt(a), sqrt(1 - a))

    return earth_radius_km * c

@router.get("/overview")
def get_analytics_overview(
    current_admin: dict = Depends(get_current_admin)
):
    try:
        complaints = list(
            complaints_collection.find(
                {},
                {
                    "_id": 0,
                    "category": 1,
                    "ai_analysis": 1,
                    "status": 1,
                    "timestamp": 1,
                }
            )
        )

        category_counts = Counter()
        severity_counts = Counter()
        problem_type_counts = Counter()
        status_counts = Counter()
        daily_counts = Counter()

        for complaint in complaints:

            # -------------------------
            # CATEGORY
            # -------------------------

            ai_analysis = complaint.get("ai_analysis")

            if isinstance(ai_analysis, dict):
                ai_category = ai_analysis.get("category")

                if ai_category:
                    category = normalize_category(ai_category)
                else:
                    category = normalize_category(
                        complaint.get("category")
                    )

                severity = ai_analysis.get("severity")
                problem_type = ai_analysis.get("problem_type")

                if severity:
                    severity_counts[str(severity)] += 1

                if problem_type:
                    problem_type_counts[str(problem_type)] += 1

            else:
                category = normalize_category(
                    complaint.get("category")
                )

            if category:
                category_counts[category] += 1

            # -------------------------
            # STATUS
            # -------------------------

            status = complaint.get("status")

            if status:
                status_counts[str(status)] += 1

            # -------------------------
            # DAILY TREND
            # -------------------------

            timestamp = complaint.get("timestamp")

            if timestamp:
                try:
                    date = datetime.fromisoformat(
                        str(timestamp).replace("Z", "+00:00")
                    ).date().isoformat()

                    daily_counts[date] += 1

                except (ValueError, TypeError):
                    pass

        return {
            "total_complaints": len(complaints),

            "categories": dict(
                sorted(
                    category_counts.items(),
                    key=lambda item: item[1],
                    reverse=True
                )
            ),

            "severity": dict(
                sorted(
                    severity_counts.items(),
                    key=lambda item: item[1],
                    reverse=True
                )
            ),

            "problem_types": dict(
                sorted(
                    problem_type_counts.items(),
                    key=lambda item: item[1],
                    reverse=True
                )
            ),

            "statuses": dict(
                sorted(
                    status_counts.items(),
                    key=lambda item: item[1],
                    reverse=True
                )
            ),

            "daily_trends": dict(
                sorted(daily_counts.items())
            ),
        }

    except Exception as e:
        print("Analytics error:", str(e))

        return {
            "total_complaints": 0,
            "categories": {},
            "severity": {},
            "problem_types": {},
            "statuses": {},
            "daily_trends": {},
        }

@router.get("/hotspots")
def get_hotspots(
    current_admin: dict = Depends(get_current_admin)
):
    try:
        complaints = list(
            complaints_collection.find(
                {},
                {
                    "_id": 0,
                    "latitude": 1,
                    "longitude": 1,
                    "category": 1,
                    "ai_analysis": 1,
                }
            )
        )

        # -------------------------
        # COLLECT VALID COMPLAINTS
        # -------------------------

        geo_complaints = []

        for complaint in complaints:
            latitude = complaint.get("latitude")
            longitude = complaint.get("longitude")

            if latitude is None or longitude is None:
                continue

            try:
                latitude = float(latitude)
                longitude = float(longitude)
            except (TypeError, ValueError):
                continue

            geo_complaints.append({
                **complaint,
                "latitude": latitude,
                "longitude": longitude,
            })

        # -------------------------
        # CREATE HOTSPOT CLUSTERS
        # -------------------------

        clusters = []

        HOTSPOT_RADIUS_KM = 1.0

        for complaint in geo_complaints:

            assigned_cluster = None

            for cluster in clusters:

                distance = calculate_distance_km(
                    complaint["latitude"],
                    complaint["longitude"],
                    cluster["latitude"],
                    cluster["longitude"],
                )

                if distance <= HOTSPOT_RADIUS_KM:
                    assigned_cluster = cluster
                    break

            if assigned_cluster is None:

                assigned_cluster = {
                    "latitude": complaint["latitude"],
                    "longitude": complaint["longitude"],
                    "complaints": [],
                }

                clusters.append(assigned_cluster)

            assigned_cluster["complaints"].append(
                complaint
            )

        # -------------------------
        # BUILD HOTSPOTS
        # -------------------------

        hotspots = []

        for cluster in clusters:

            complaints_in_cluster = cluster["complaints"]

            # A hotspot needs at least 2 complaints.
            if len(complaints_in_cluster) < 2:
                continue

            categories = Counter()
            high_severity = 0

            total_latitude = 0
            total_longitude = 0

            for complaint in complaints_in_cluster:

                total_latitude += complaint["latitude"]
                total_longitude += complaint["longitude"]

                ai_analysis = complaint.get("ai_analysis")

                if isinstance(ai_analysis, dict):

                    category = ai_analysis.get("category")
                    severity = ai_analysis.get("severity")

                    if severity:
                        if str(severity).lower() == "high":
                            high_severity += 1

                else:
                    category = None

                # Fall back to citizen-selected category
                if not category:
                    category = complaint.get("category")

                category = normalize_category(category)

                if category:
                    categories[category] += 1

            center_latitude = (
                total_latitude / len(complaints_in_cluster)
            )

            center_longitude = (
                total_longitude / len(complaints_in_cluster)
            )

            hotspots.append({
                "latitude": round(center_latitude, 6),
                "longitude": round(center_longitude, 6),
                "complaint_count": len(complaints_in_cluster),
                "categories": dict(categories),
                "high_severity": high_severity,
            })

        # -------------------------
        # CALCULATE MAX COMPLAINTS
        # -------------------------

        max_hotspot_complaints = max(
            (
                hotspot["complaint_count"]
                for hotspot in hotspots
            ),
            default=1
        )

        # -------------------------
        # CALCULATE PRIORITY SCORES
        # -------------------------

        for hotspot in hotspots:

            complaint_count = hotspot["complaint_count"]
            high_severity = hotspot["high_severity"]

            # Complaint volume component
            volume_score = (
                complaint_count / max_hotspot_complaints
            ) * 60

            # Severity component
            severity_ratio = (
                high_severity / complaint_count
                if complaint_count > 0
                else 0
            )

            severity_score = severity_ratio * 40

            # Existing complaint-based score
            complaint_score = (
                volume_score + severity_score
            )

            # -------------------------
            # INFRASTRUCTURE MATCH
            # -------------------------

            infrastructure_data = (
                find_nearest_infrastructure(
                    hotspot["latitude"],
                    hotspot["longitude"]
                )
            )

            if infrastructure_data:

                infrastructure_score = (
                    calculate_infrastructure_score(
                        infrastructure_data
                    )
                )

            else:

                infrastructure_score = 0

            # -------------------------
            # FINAL PRIORITY SCORE
            # -------------------------

            priority_score = (
                complaint_score * 0.60
                + infrastructure_score * 0.40
            )

            explanation_data = {
                "complaint_count": hotspot.get("complaint_count", 0),
                "high_severity": hotspot.get("high_severity", 0),
                "categories": hotspot.get("categories", {}),
                "complaint_score": complaint_score,
                "infrastructure_score": infrastructure_score,
                "priority_score": priority_score,
                "infrastructure_data": infrastructure_data,
            }

            explanation = generate_priority_explanation(
                explanation_data
            )

            # Add scores to hotspot
            hotspot["complaint_score"] = round(
                complaint_score,
                2
            )

            hotspot["infrastructure_score"] = round(
                infrastructure_score,
                2
            )

            hotspot["priority_score"] = round(
                priority_score,
                2
            )

            hotspot["infrastructure_data"] = (
                infrastructure_data
            )

            hotspot["priority_explanation"] = explanation

        # -------------------------
        # SORT BY PRIORITY
        # -------------------------

        hotspots.sort(
            key=lambda hotspot: hotspot["priority_score"],
            reverse=True
        )

        return {
            "total_hotspots": len(hotspots),
            "hotspots": hotspots,
        }

    except Exception as e:

        print(
            "Hotspot analytics error:",
            str(e)
        )

        return {
            "total_hotspots": 0,
            "hotspots": [],
        }
    try:
        complaints = list(
            complaints_collection.find(
                {},
                {
                    "_id": 0,
                    "latitude": 1,
                    "longitude": 1,
                    "category": 1,
                    "ai_analysis": 1,
                }
            )
        )

        # Only complaints with valid coordinates
        geo_complaints = []

        for complaint in complaints:
            latitude = complaint.get("latitude")
            longitude = complaint.get("longitude")

            if latitude is None or longitude is None:
                continue

            try:
                latitude = float(latitude)
                longitude = float(longitude)
            except (TypeError, ValueError):
                continue

            geo_complaints.append({
                **complaint,
                "latitude": latitude,
                "longitude": longitude,
            })

        clusters = []

        # Complaints within this distance are considered
        # part of the same local hotspot.
        HOTSPOT_RADIUS_KM = 1.0

        for complaint in geo_complaints:

            assigned_cluster = None

            for cluster in clusters:

                distance = calculate_distance_km(
                    complaint["latitude"],
                    complaint["longitude"],
                    cluster["latitude"],
                    cluster["longitude"],
                )

                if distance <= HOTSPOT_RADIUS_KM:
                    assigned_cluster = cluster
                    break

            if assigned_cluster is None:

                assigned_cluster = {
                    "latitude": complaint["latitude"],
                    "longitude": complaint["longitude"],
                    "complaints": [],
                }

                clusters.append(assigned_cluster)

            assigned_cluster["complaints"].append(
                complaint
            )

        hotspots = []

        for cluster in clusters:

            complaints_in_cluster = cluster["complaints"]

            # A hotspot needs at least 2 complaints.
            if len(complaints_in_cluster) < 2:
                continue

            categories = Counter()
            high_severity = 0

            total_latitude = 0
            total_longitude = 0

            for complaint in complaints_in_cluster:

                total_latitude += complaint["latitude"]
                total_longitude += complaint["longitude"]

                ai_analysis = complaint.get("ai_analysis")

                if isinstance(ai_analysis, dict):

                    category = ai_analysis.get("category")
                    severity = ai_analysis.get("severity")

                    if severity:
                        if str(severity).lower() == "high":
                            high_severity += 1

                else:
                    category = None

                # Fall back to citizen-selected category
                if not category:
                    category = complaint.get("category")

                category = normalize_category(category)

                if category:
                    categories[category] += 1

            center_latitude = (
                total_latitude / len(complaints_in_cluster)
            )

            center_longitude = (
                total_longitude / len(complaints_in_cluster)
            )
            

            hotspots.append({
                "latitude": round(center_latitude, 6),
                "longitude": round(center_longitude, 6),
                "complaint_count": len(complaints_in_cluster),
                "categories": dict(categories),
                "high_severity": high_severity,
            })

        # Largest hotspots first
        hotspots.sort(
            key=lambda hotspot: hotspot["complaint_count"],
            reverse=True
        )

        return {
            "total_hotspots": len(hotspots),
            "hotspots": hotspots,
        }

    except Exception as e:
        print("Hotspot analytics error:", str(e))

        return {
            "total_hotspots": 0,
            "hotspots": [],
        }