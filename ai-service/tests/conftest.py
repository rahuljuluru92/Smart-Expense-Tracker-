import os
import sys
from pathlib import Path

os.environ.setdefault("JWT_SECRET", "test-secret-that-is-at-least-32-characters-long")
os.environ.setdefault("NVIDIA_API_KEY", "test-key")
os.environ.setdefault("UPLOAD_DIR", str(Path(__file__).parent / ".uploads"))
os.environ.setdefault("MAX_UPLOAD_BYTES", str(1024 * 1024))
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
