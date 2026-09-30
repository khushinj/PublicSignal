import asyncio

from app.services.ai_batch_processor import process_pending_complaints


async def ai_worker():
    print("PublicSignal AI worker started.")

    while True:
        try:
            process_pending_complaints()

        except Exception as error:
            print(
                f"AI worker error | "
                f"type={type(error).__name__} | "
                f"error={error}"
            )

        await asyncio.sleep(60)