import os
import uuid
import json
import numpy as np
from datetime import datetime, timedelta
from pathlib import Path
from typing import List, Optional, Dict, Any

from fastapi import FastAPI, HTTPException, Depends, UploadFile, File, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from dotenv import load_dotenv
import redis

load_dotenv()

UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", "/tmp/uploads"))
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
NVIDIA_API_KEY = os.getenv("NVIDIA_API_KEY")

redis_client = redis.from_url(REDIS_URL, decode_responses=True)

app = FastAPI(
    title="ControlSpending AI Service",
    description="AI-powered expense analysis with real OCR and GPT-4o-mini classification",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

security = HTTPBearer()

CATEGORIES = [
    "Food & Dining", "Transportation", "Entertainment", "Healthcare",
    "Shopping", "Utilities", "Housing", "Education", "Travel",
    "Fitness", "Beauty", "Pets", "Electronics", "Subscriptions", "Other"
]

# ── Pydantic models ──────────────────────────────────────────────────────────

class ExpenseAnalysisRequest(BaseModel):
    description: str
    amount: float
    category: Optional[str] = None
    location: Optional[Dict[str, Any]] = None
    date: Optional[str] = None

class ExpenseAnalysisResponse(BaseModel):
    suggested_category: str
    confidence: float
    insights: List[str]
    recommendations: List[str]
    risk_level: str

class SpendingPredictionRequest(BaseModel):
    user_id: str
    historical_data: List[Dict[str, Any]]
    prediction_days: int = 30

class SpendingPredictionResponse(BaseModel):
    predictions: List[Dict[str, Any]]
    confidence: float
    factors: List[str]

class JobStatusResponse(BaseModel):
    job_id: str
    status: str
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None

# ── AI helpers ────────────────────────────────────────────────────────────────

def _nvidia_client():
    from openai import AsyncOpenAI
    return AsyncOpenAI(
        base_url="https://integrate.api.nvidia.com/v1",
        api_key=NVIDIA_API_KEY,
    )


MODEL = "meta/llama-3.1-8b-instruct"


def _strip_fences(raw: str) -> str:
    """Remove markdown code fences the model sometimes wraps JSON in."""
    raw = raw.strip()
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[-1]
    if raw.endswith("```"):
        raw = raw.rsplit("```", 1)[0]
    return raw.strip()


SYSTEM_MSG = {"role": "system", "content": "You are a financial data extractor. Always respond with valid JSON only — no markdown, no explanation, no extra text."}


async def _call_llm(user_content: str, max_tokens: int = 512) -> str:
    """Async stream from NVIDIA API — works correctly inside FastAPI's async context."""
    client = _nvidia_client()
    chunks = []
    async with await client.chat.completions.create(
        model=MODEL,
        messages=[SYSTEM_MSG, {"role": "user", "content": user_content}],
        temperature=0.1,
        top_p=0.95,
        max_tokens=max_tokens,
        stream=True,
    ) as stream:
        async for chunk in stream:
            if chunk.choices and chunk.choices[0].delta.content:
                chunks.append(chunk.choices[0].delta.content)
    result = "".join(chunks)
    print(f"[LLM] response ({len(result)} chars): {result[:200]!r}", flush=True)
    return result


async def _gpt_classify_expense(description: str, amount: float) -> Dict[str, Any]:
    prompt = (
        f"Classify this expense into exactly one of these categories: {', '.join(CATEGORIES)}.\n"
        f"Expense description: \"{description}\"\n"
        f"Amount: ${amount:.2f}\n\n"
        "Respond with JSON:\n"
        '{"category": "<category>", "confidence": <0.0-1.0>, "insights": ["<insight>"], '
        '"recommendations": ["<rec>"], "risk_level": "low|medium|high"}'
    )
    raw = _strip_fences(await _call_llm(prompt, max_tokens=512))
    return json.loads(raw)


async def _gpt_classify_receipt(ocr_text: str) -> Dict[str, Any]:
    print(f"[OCR] text length={len(ocr_text)}, preview={ocr_text[:150]!r}", flush=True)
    prompt = (
        f"Extract structured data from this receipt OCR text.\n\n"
        f"OCR text:\n{ocr_text[:3000]}\n\n"
        f"Available categories: {', '.join(CATEGORIES)}\n\n"
        "Respond with JSON:\n"
        '{"merchant_name": "<name>", "total_amount": <number>, "date": "<YYYY-MM-DD or null>", '
        '"category": "<category>", "confidence": <0.0-1.0>, '
        '"line_items": [{"name": "<item>", "price": <number>}]}'
    )
    raw = _strip_fences(await _call_llm(prompt, max_tokens=1024))
    if not raw:
        raise ValueError("AI returned empty response — check NVIDIA_API_KEY and model availability")
    return json.loads(raw)


def _ocr_pipeline(image_path: str) -> str:
    """OpenCV preprocessing + Tesseract OCR."""
    import cv2
    import pytesseract

    img = cv2.imread(image_path)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # Denoise
    denoised = cv2.fastNlMeansDenoising(gray, h=10)

    # Adaptive threshold for varied lighting
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

    return pytesseract.image_to_string(thresh, config='--psm 6')


async def _process_receipt_job(job_id: str, image_path: str):
    """Async background task: OCR → LLM → update Redis job hash."""
    try:
        print(f"[JOB {job_id[:8]}] Starting OCR on {image_path}", flush=True)
        import asyncio
        loop = asyncio.get_event_loop()
        # OCR is CPU-bound — run in thread pool so we don't block the event loop
        ocr_text = await loop.run_in_executor(None, _ocr_pipeline, image_path)
        print(f"[JOB {job_id[:8]}] OCR done, chars={len(ocr_text)}, preview={ocr_text[:100]!r}", flush=True)

        result = await _gpt_classify_receipt(ocr_text)
        print(f"[JOB {job_id[:8]}] LLM done: {result}", flush=True)

        redis_client.hset(f"job:{job_id}", mapping={
            "status": "done",
            "result": json.dumps(result),
        })
    except Exception as exc:
        import traceback
        print(f"[JOB {job_id[:8]}] FAILED: {exc}", flush=True)
        traceback.print_exc()
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


def _predict_spending(historical_data: List[Dict], days: int) -> SpendingPredictionResponse:
    """Rolling-mean trend extrapolation using numpy."""
    if not historical_data:
        return SpendingPredictionResponse(
            predictions=[], confidence=0.0,
            factors=["No historical data available"]
        )

    amounts = np.array([item.get("amount", 0) for item in historical_data], dtype=float)
    window = min(7, len(amounts))
    rolling_mean = np.convolve(amounts, np.ones(window) / window, mode="valid")

    # Linear trend over the rolling means
    x = np.arange(len(rolling_mean))
    if len(x) > 1:
        slope = np.polyfit(x, rolling_mean, 1)[0]
    else:
        slope = 0.0

    baseline = float(rolling_mean[-1]) if len(rolling_mean) else float(np.mean(amounts))
    today = datetime.utcnow().date()

    predictions = []
    for i in range(days):
        predicted = max(0.0, baseline + slope * (i + 1))
        # Confidence decays linearly: 0.85 at day 1, 0.55 at day 30
        confidence = max(0.4, 0.85 - (i * 0.01))
        predictions.append({
            "date": (today + timedelta(days=i + 1)).isoformat(),
            "predicted_amount": round(predicted, 2),
            "confidence": round(confidence, 2),
        })

    overall_confidence = round(float(0.85 - min(days * 0.005, 0.35)), 2)
    return SpendingPredictionResponse(
        predictions=predictions,
        confidence=overall_confidence,
        factors=["Historical spending patterns", "Rolling weekly average", "Linear trend extrapolation"],
    )


# ── Endpoints ─────────────────────────────────────────────────────────────────

@app.get("/")
async def root():
    return {"message": "ControlSpending AI Service v2", "status": "running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "ai-service"}

@app.get("/categories")
async def get_categories():
    return {"categories": [{"id": c.lower().replace(" & ", "_").replace(" ", "_"), "name": c} for c in CATEGORIES]}


@app.post("/analyze-expense", response_model=ExpenseAnalysisResponse)
async def analyze_expense_endpoint(
    request: ExpenseAnalysisRequest,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Classify expense description via GPT-4o-mini."""
    if not NVIDIA_API_KEY:
        raise HTTPException(status_code=503, detail="NVIDIA_API_KEY not configured")
    try:
        data = await _gpt_classify_expense(request.description, request.amount)
        return ExpenseAnalysisResponse(
            suggested_category=data.get("category", "Other"),
            confidence=data.get("confidence", 0.5),
            insights=data.get("insights", []),
            recommendations=data.get("recommendations", []),
            risk_level=data.get("risk_level", "low"),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/analyze-receipt", status_code=202)
async def analyze_receipt_endpoint(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Accept receipt image, queue OCR + GPT-4o-mini job.
    Returns 202 with job_id; poll GET /jobs/{job_id} for result.
    """
    if not NVIDIA_API_KEY:
        raise HTTPException(status_code=503, detail="NVIDIA_API_KEY not configured")

    allowed = {"image/jpeg", "image/png", "image/webp", "image/tiff"}
    if file.content_type not in allowed:
        raise HTTPException(status_code=400, detail="Unsupported image type")

    job_id = str(uuid.uuid4())
    suffix = Path(file.filename or "upload.jpg").suffix or ".jpg"
    image_path = str(UPLOAD_DIR / f"{job_id}{suffix}")

    contents = await file.read()
    with open(image_path, "wb") as f:
        f.write(contents)

    # Store initial job state in Redis (TTL 1h)
    redis_client.hset(f"job:{job_id}", mapping={"status": "processing"})
    redis_client.expire(f"job:{job_id}", 3600)

    # Enqueue to background — only pass job_id + path (never raw bytes)
    background_tasks.add_task(_process_receipt_job, job_id, image_path)

    return {"job_id": job_id, "status": "processing"}


@app.get("/jobs/{job_id}", response_model=JobStatusResponse)
async def get_job_status(
    job_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Poll receipt analysis job status."""
    data = redis_client.hgetall(f"job:{job_id}")
    if not data:
        raise HTTPException(status_code=404, detail="Job not found")

    result = None
    if data.get("result"):
        try:
            result = json.loads(data["result"])
        except Exception:
            pass

    return JobStatusResponse(
        job_id=job_id,
        status=data.get("status", "unknown"),
        result=result,
        error=data.get("error"),
    )


@app.post("/predict-spending", response_model=SpendingPredictionResponse)
async def predict_spending_endpoint(
    request: SpendingPredictionRequest,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Rolling-mean trend prediction from historical expense data."""
    try:
        return _predict_spending(request.historical_data, request.prediction_days)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
