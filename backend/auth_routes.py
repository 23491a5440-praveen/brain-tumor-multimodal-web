import logging
import secrets
import time
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, List

from fastapi import APIRouter, HTTPException, Depends, Header, Request, status
from pydantic import BaseModel, Field

try:
    from backend.database import get_db, init_db, AUTHORIZED_ACCOUNTS
    from backend.auth_utils import verify_credential, generate_session_token
except ImportError:
    from database import get_db, init_db, AUTHORIZED_ACCOUNTS
    from auth_utils import verify_credential, generate_session_token

logger = logging.getLogger("neuroscan.auth.routes")
auth_router = APIRouter(prefix="/api/auth", tags=["Authentication"])

# Initialize schema and seed accounts
init_db()

# Rate limiting for login attempts: user_or_ip -> list of failure timestamps
FAILED_ATTEMPTS: Dict[str, List[float]] = {}
MAX_FAILED_ATTEMPTS = 5
LOCKOUT_WINDOW_SECONDS = 15 * 60  # 15 minutes

def is_rate_limited(key: str) -> bool:
    now = time.time()
    attempts = FAILED_ATTEMPTS.get(key, [])
    # Filter attempts within the window
    recent_attempts = [t for t in attempts if now - t < LOCKOUT_WINDOW_SECONDS]
    FAILED_ATTEMPTS[key] = recent_attempts
    return len(recent_attempts) >= MAX_FAILED_ATTEMPTS

def record_failed_attempt(key: str):
    now = time.time()
    attempts = FAILED_ATTEMPTS.get(key, [])
    attempts.append(now)
    FAILED_ATTEMPTS[key] = [t for t in attempts if now - t < LOCKOUT_WINDOW_SECONDS]

def clear_failed_attempts(key: str):
    if key in FAILED_ATTEMPTS:
        del FAILED_ATTEMPTS[key]

class LoginRequest(BaseModel):
    user_id: str = Field(..., description="Authorized NeuroScan User ID (e.g. 23491a5440)")
    password: str = Field(..., description="Account password")

def get_current_user(authorization: Optional[str] = Header(default=None)):
    """FastAPI dependency to extract and validate the authenticated session."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please sign in to continue."
        )
    
    token = authorization.split(" ", 1)[1].strip()
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token format."
        )

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT s.token, s.expires_at, u.user_id, u.full_name, u.role, u.created_at
            FROM sessions s
            JOIN users u ON s.user_id = u.user_id
            WHERE s.token = ?
        """, (token,))
        row = cursor.fetchone()

        if not row:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Session has expired or is invalid. Please sign in again."
            )

        # Parse expiry
        expires_at_str = row["expires_at"]
        try:
            expires_at = datetime.fromisoformat(expires_at_str)
            if expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)
            if datetime.now(timezone.utc) > expires_at:
                cursor.execute("DELETE FROM sessions WHERE token = ?", (token,))
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Your session has expired. Please log in again."
                )
        except HTTPException:
            raise
        except Exception:
            pass

        return {
            "user_id": row["user_id"],
            "full_name": row["full_name"],
            "role": row["role"],
            "created_at": row["created_at"],
            "session_token": token
        }


@auth_router.post("/login")
def login(req: LoginRequest, request: Request):
    """Authenticates one of the 5 authorized User IDs and passwords with rate limiting."""
    user_id = req.user_id.strip().lower()
    client_ip = request.client.host if request.client else "unknown"
    rate_key = f"{user_id}:{client_ip}"

    if is_rate_limited(rate_key) or is_rate_limited(client_ip):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many failed login attempts. Please wait 15 minutes before trying again."
        )

    if not user_id or not req.password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User ID and password are required."
        )

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT user_id, full_name, role, password_hash, salt
            FROM users
            WHERE user_id = ?
        """, (user_id,))
        user = cursor.fetchone()

        if not user or not verify_credential(req.password, user["password_hash"], user["salt"]):
            record_failed_attempt(rate_key)
            record_failed_attempt(client_ip)
            logger.warning("Failed login attempt for user_id=%s from IP=%s", user_id, client_ip)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid User ID or password. Access is restricted to authorized accounts."
            )

        # Successful login: clear failure tracking
        clear_failed_attempts(rate_key)
        clear_failed_attempts(client_ip)

        # Create session
        token = generate_session_token()
        expires_at = datetime.now(timezone.utc) + timedelta(days=7)
        user_agent = request.headers.get("user-agent", "")[:250]

        cursor.execute("""
            INSERT INTO sessions (token, user_id, expires_at, user_agent)
            VALUES (?, ?, ?, ?)
        """, (token, user["user_id"], expires_at.isoformat(), user_agent))

    logger.info("Authorized user logged in successfully: user_id=%s", user["user_id"])
    return {
        "status": "success",
        "message": "Login successful.",
        "token": token,
        "session_token": token,
        "user": {
            "user_id": user["user_id"],
            "full_name": user["full_name"],
            "role": user["role"]
        }
    }


@auth_router.get("/me")
def get_profile(current_user: dict = Depends(get_current_user)):
    """Returns currently authenticated user profile."""
    return {
        "status": "success",
        "user": {
            "user_id": current_user["user_id"],
            "full_name": current_user["full_name"],
            "role": current_user["role"]
        }
    }


@auth_router.post("/logout")
def logout(current_user: dict = Depends(get_current_user)):
    """Logs out by invalidating active session."""
    with get_db() as conn:
        conn.cursor().execute("DELETE FROM sessions WHERE token = ?", (current_user["session_token"],))
    return {"status": "success", "message": "Logged out successfully."}


@auth_router.post("/register", status_code=status.HTTP_403_FORBIDDEN)
def register_disabled():
    """Explicitly disables public self-service registration."""
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Self-service registration is disabled. Access is restricted. Contact dharmavarapraaveenkumarreddy@gmail.com to request an account."
    )


@auth_router.post("/reset-password", status_code=status.HTTP_403_FORBIDDEN)
def reset_password_disabled():
    """Explicitly disables self-service password reset."""
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Self-service password reset is disabled. Contact the developer at dharmavarapraaveenkumarreddy@gmail.com."
    )
