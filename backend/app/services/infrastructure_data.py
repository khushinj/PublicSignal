import csv
from pathlib import Path


DATASET_PATH = (
    Path(__file__).resolve().parent.parent
    / "data"
    / "publicsignal_synthetic_infrastructure_6000.csv"
)


def load_infrastructure_data():
    with open(DATASET_PATH, "r", encoding="utf-8") as file:
        return list(csv.DictReader(file))


def get_infrastructure_summary():
    data = load_infrastructure_data()

    return {
        "total_records": len(data),
        "districts": sorted(
            set(row["district"] for row in data)
        ),
    }