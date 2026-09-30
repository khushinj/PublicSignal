def normalize(value, minimum, maximum):
    if maximum == minimum:
        return 0

    score = (value - minimum) / (maximum - minimum)

    return max(0, min(1, score))


def calculate_infrastructure_score(data):
    density_score = normalize(
        data["population_density"],
        0,
        10000
    )

    road_score = 1 - (
        data["road_condition_score"] / 100
    )

    water_gap = 1 - (
        data["water_coverage_pct"] / 100
    )

    drainage_gap = 1 - (
        data["drainage_coverage_pct"] / 100
    )

    sanitation_gap = 1 - (
        data["sanitation_coverage_pct"] / 100
    )

    healthcare_gap = 1 - (
        data["healthcare_access_score"] / 100
    )

    public_facility_gap = 1 - (
        data["public_facility_access_score"] / 100
    )

    score = (
        density_score * 0.25
        + road_score * 0.20
        + water_gap * 0.15
        + drainage_gap * 0.15
        + sanitation_gap * 0.10
        + healthcare_gap * 0.10
        + public_facility_gap * 0.05
    )

    return round(score * 100, 2)