import io
import time

import jwt
import pytest
from fastapi.testclient import TestClient
from PIL import Image

import main

SECRET = main.JWT_SECRET


class FakeRedis:
    """Minimal in-memory stand-in for the redis hash commands main.py uses."""

    def __init__(self):
        self.store = {}

    def hset(self, key, field=None, value=None, mapping=None):
        self.store.setdefault(key, {})
        if mapping:
            self.store[key].update(mapping)
        if field is not None:
            self.store[key][field] = value

    def hgetall(self, key):
        return dict(self.store.get(key, {}))

    def expire(self, key, ttl):
        return True


@pytest.fixture
def client(monkeypatch):
    fake = FakeRedis()
    monkeypatch.setattr(main, "redis_client", fake)

    async def noop_job(job_id, image_path):
        return None

    monkeypatch.setattr(main, "_process_receipt_job", noop_job)
    c = TestClient(main.app)
    c.fake_redis = fake
    return c


def token(user_id="user_a", **extra):
    return jwt.encode({"userId": user_id, "exp": int(time.time()) + 60, **extra}, SECRET, algorithm="HS256")


def auth(user_id="user_a"):
    return {"Authorization": f"Bearer {token(user_id)}"}


def png_bytes():
    buf = io.BytesIO()
    Image.new("RGB", (10, 10), "white").save(buf, format="PNG")
    return buf.getvalue()


def test_health_is_public(client):
    assert client.get("/health").status_code == 200


def test_missing_token_rejected(client):
    r = client.post("/analyze-receipt", files={"file": ("r.png", png_bytes(), "image/png")})
    assert r.status_code in (401, 403)


def test_forged_token_rejected(client):
    forged = jwt.encode({"userId": "user_a"}, "fallback-secret", algorithm="HS256")
    r = client.get("/jobs/abc", headers={"Authorization": f"Bearer {forged}"})
    assert r.status_code == 401


def test_expired_token_rejected(client):
    expired = jwt.encode({"userId": "user_a", "exp": int(time.time()) - 5}, SECRET, algorithm="HS256")
    r = client.get("/jobs/abc", headers={"Authorization": f"Bearer {expired}"})
    assert r.status_code == 401


def test_upload_and_owner_can_read_job(client):
    r = client.post("/analyze-receipt", headers=auth(), files={"file": ("r.png", png_bytes(), "image/png")})
    assert r.status_code == 202
    job_id = r.json()["job_id"]
    assert client.get(f"/jobs/{job_id}", headers=auth()).status_code == 200


def test_other_user_cannot_read_job(client):
    r = client.post("/analyze-receipt", headers=auth("user_a"), files={"file": ("r.png", png_bytes(), "image/png")})
    job_id = r.json()["job_id"]
    assert client.get(f"/jobs/{job_id}", headers=auth("user_b")).status_code == 404


def test_non_image_rejected_even_with_image_content_type(client):
    r = client.post("/analyze-receipt", headers=auth(), files={"file": ("r.png", b"<?php evil ?>", "image/png")})
    assert r.status_code == 400


def test_oversized_upload_rejected(client):
    big = b"\x89PNG" + b"0" * (main.MAX_UPLOAD_BYTES + 10)
    r = client.post("/analyze-receipt", headers=auth(), files={"file": ("r.png", big, "image/png")})
    assert r.status_code == 413


def test_prediction_days_bounded(client):
    r = client.post("/predict-spending", headers=auth(), json={"user_id": "x", "historical_data": [], "prediction_days": 10000})
    assert r.status_code == 422
