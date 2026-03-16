"""
Celery worker — alternative to FastAPI BackgroundTasks for heavier deployments.
Consumes the receipt-jobs queue, runs OCR + GPT-4o-mini, updates Redis job hash.

Run with:
  celery -A worker worker --loglevel=info --concurrency=2

The ai-service container uses FastAPI BackgroundTasks (no separate process needed
for small scale). Use this worker when you need multiple GPU/CPU workers scaling
independently from the web API.
"""
import os
import json
from pathlib import Path

from celery import Celery
from dotenv import load_dotenv
import redis as redis_lib

load_dotenv()

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
NVIDIA_API_KEY = os.getenv("NVIDIA_API_KEY")

celery_app = Celery(
    "ai_worker",
    broker=REDIS_URL,
    backend=REDIS_URL,
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    task_track_started=True,
    worker_prefetch_multiplier=1,  # one job at a time per worker = predictable CPU usage
)

redis_client = redis_lib.from_url(REDIS_URL, decode_responses=True)

CATEGORIES = [
    "Food & Dining", "Transportation", "Entertainment", "Healthcare",
    "Shopping", "Utilities", "Housing", "Education", "Travel",
    "Fitness", "Beauty", "Pets", "Electronics", "Subscriptions", "Other"
]


def _ocr_pipeline(image_path: str) -> str:
    import cv2
    import numpy as np
    import pytesseract

    img = cv2.imread(image_path)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    denoised = cv2.fastNlMeansDenoising(gray, h=10)
    thresh = cv2.adaptiveThreshold(
        denoised, 255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY, 11, 2
    )
    # Deskew
    coords = np.column_stack(np.where(thresh > 0))
    if len(coords) > 0:
        angle = cv2.minAreaRect(coords)[-1]
        if angle < -45:
            angle = 90 + angle
        if abs(angle) > 0.5:
            (h, w) = thresh.shape
            M = cv2.getRotationMatrix2D((w // 2, h // 2), angle, 1.0)
            thresh = cv2.warpAffine(thresh, M, (w, h), flags=cv2.INTER_CUBIC,
                                    borderMode=cv2.BORDER_REPLICATE)
    return pytesseract.image_to_string(thresh, config="--psm 6")


def _gpt_classify_receipt(ocr_text: str) -> dict:
    from openai import OpenAI
    client = OpenAI(
        base_url="https://integrate.api.nvidia.com/v1",
        api_key=NVIDIA_API_KEY,
    )
    prompt = (
        f"Extract structured data from this receipt OCR text and classify it.\n\n"
        f"OCR text:\n{ocr_text[:3000]}\n\n"
        f"Available categories: {', '.join(CATEGORIES)}\n\n"
        "Respond with JSON ONLY — no markdown, no explanation:\n"
        '{"merchant_name": "<name>", "total_amount": <float>, "date": "<YYYY-MM-DD or null>", '
        '"category": "<category>", "confidence": <0.0-1.0>, '
        '"line_items": [{"name": "<item>", "price": <float>}]}'
    )
    result_chunks = []
    stream = client.chat.completions.create(
        model="minimaxai/minimax-m2.7",
        messages=[{"role": "user", "content": prompt}],
        temperature=1,
        top_p=0.95,
        max_tokens=1024,
        stream=True,
    )
    for chunk in stream:
        if not getattr(chunk, "choices", None):
            continue
        delta = chunk.choices[0].delta.content
        if delta is not None:
            result_chunks.append(delta)

    raw = "".join(result_chunks).strip()
    raw = raw.lstrip("```json").lstrip("```").rstrip("```").strip()
    return json.loads(raw)


@celery_app.task(name="process_receipt", bind=True, max_retries=2)
def process_receipt_task(self, job_id: str, image_path: str):
    """
    Celery task: only job_id (string) and image_path are passed — never image bytes.
    Both ai-service and ai-worker containers share the same /tmp/uploads volume.
    """
    try:
        redis_client.hset(f"job:{job_id}", "status", "processing")

        ocr_text = _ocr_pipeline(image_path)
        result = _gpt_classify_receipt(ocr_text)

        redis_client.hset(f"job:{job_id}", mapping={
            "status": "done",
            "result": json.dumps(result),
        })
    except Exception as exc:
        if self.request.retries < self.max_retries:
            raise self.retry(exc=exc, countdown=5)

        redis_client.hset(f"job:{job_id}", mapping={
            "status": "failed",
            "error": str(exc),
        })
    finally:
        try:
            Path(image_path).unlink(missing_ok=True)
        except Exception:
            pass

    redis_client.expire(f"job:{job_id}", 3600)
    return {"job_id": job_id, "status": "done"}
