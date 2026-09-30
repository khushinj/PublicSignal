from math import radians, sin, cos, sqrt, atan2

from app.services.infrastructure_data import load_infrastructure_data


EARTH_RADIUS_KM = 6371.0


def haversine_distance_km(lat1, lon1, lat2, lon2):
    lat1, lon1, lat2, lon2 = map(
        radians,
        [lat1, lon1, lat2, lon2]
    )

    dlat = lat2 - lat1
    dlon = lon2 - lon1

    a = (
        sin(dlat / 2) ** 2
        + cos(lat1)
        * cos(lat2)
        * sin(dlon / 2) ** 2
    )

    return EARTH_RADIUS_KM * 2 * atan2(
        sqrt(a),
        sqrt(1 - a)
    )


def find_nearest_infrastructure(latitude, longitude):
    data = load_infrastructure_data()

    nearest = None
    nearest_distance = float("inf")

    for row in data:
        row_lat = float(row["latitude"])
        row_lon = float(row["longitude"])

        distance = haversine_distance_km(
            latitude,
            longitude,
            row_lat,
            row_lon
        )

        if distance < nearest_distance:
            nearest_distance = distance
            nearest = row

    if nearest is None:
        return None

    return {
        "record_id": nearest["record_id"],
        "district": nearest["district"],
        "distance_km": round(nearest_distance, 3),
        "population": int(nearest["population"]),
        "population_density": float(
            nearest["population_density"]
        ),
        "road_condition_score": float(
            nearest["road_condition_score"]
        ),
        "water_coverage_pct": float(
            nearest["water_coverage_pct"]
        ),
        "drainage_coverage_pct": float(
            nearest["drainage_coverage_pct"]
        ),
        "electricity_coverage_pct": float(
            nearest["electricity_coverage_pct"]
        ),
        "sanitation_coverage_pct": float(
            nearest["sanitation_coverage_pct"]
        ),
        "healthcare_access_score": float(
            nearest["healthcare_access_score"]
        ),
        "public_facility_access_score": float(
            nearest["public_facility_access_score"]
        ),
    }