from datetime import datetime, timezone

from app.database import complaints_collection
from app.services.gemini_service import analyze_complaint


BATCH_SIZE = 5


def process_pending_complaints():

    complaints = list(
        complaints_collection.find(
            {
                "ai_analysis_status": "pending"
            }
        ).limit(BATCH_SIZE)
    )

    print(
        f"Found {len(complaints)} pending complaint(s)."
    )

    completed = 0
    failed = 0

    for complaint in complaints:

        complaint_id = complaint["id"]

        print(
            f"Processing complaint: {complaint_id}"
        )

        # Lock this complaint while Gemini is processing it
        complaints_collection.update_one(
            {"id": complaint_id},
            {
                "$set": {
                    "ai_analysis_status": "processing",
                    "ai_analysis_started_at": (
                        datetime.now(timezone.utc).isoformat()
                    )
                }
            }
        )

        try:

            # Send complaint data to Gemini
            result = analyze_complaint(
                text=complaint["text"],
                language=complaint["language"]
            )

            # Convert Gemini response into normal dictionary
            ai_analysis = result.model_dump()

            print(
                f"Gemini response received for {complaint_id}:"
            )

            print(ai_analysis)

            # UPDATE THE SAME MONGODB DOCUMENT
            update_result = complaints_collection.update_one(
                {"id": complaint_id},
                {
                    "$set": {
                        "ai_analysis": ai_analysis,
                        "ai_analysis_status": "completed",
                        "ai_analysis_completed_at": (
                            datetime.now(timezone.utc).isoformat()
                        )
                    }
                }
            )

            if update_result.modified_count == 1:

                completed += 1

                print(
                    f"MongoDB updated successfully: {complaint_id}"
                )

            else:

                print(
                    f"MongoDB document was not updated: {complaint_id}"
                )

        except Exception as error:

            failed += 1

            print(
                f"Gemini processing failed for {complaint_id}"
            )

            print(
                f"Error type: {type(error).__name__}"
            )

            print(
                f"Error: {error}"
            )

            # Put it back into pending so it can be processed later
            complaints_collection.update_one(
                {"id": complaint_id},
                {
                    "$set": {
                        "ai_analysis_status": "pending",
                        "ai_analysis_error": str(error),
                        "ai_analysis_failed_at": (
                            datetime.now(timezone.utc).isoformat()
                        )
                    }
                }
            )

    print(
        f"Batch finished | "
        f"processed={len(complaints)} | "
        f"completed={completed} | "
        f"failed={failed}"
    )

    return {
        "processed": len(complaints),
        "completed": completed,
        "failed": failed
    }