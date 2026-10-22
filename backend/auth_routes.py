import logging
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException, Depends, Header, Request, status
from pydantic import BaseModel, Field

try:
    from backend.database import get_db, init_db
    from backend.auth_utils import (
        generate_user_id,
        validate_password_strength,
        validate_recovery_pin,
        hash_credential,
        verify_credential,
        generate_session_token,
    )
except ImportError:
    from database import get_db, init_db
    from auth_utils import (
        generate_user_id,
        validate_password_strength,
        validate_recovery_pin,
        hash_credential,
        verify_credential,
        generate_session_token,
    )

logger = logging.getLogger("neuroscan.auth.routes")
auth_router = APIRouter(prefix="/api/auth", tags=["Authentication"])

# Initialize schema
init_db()

ROLE_LABELS = {
    "hospital": "Hospital",
    "clinic": "Clinic / Diagnostic Centre",
    "student": "Student",
    "researcher": "Researcher"
}

class RegisterRequest(BaseModel):
    role: str = Field(..., description="Role: 'hospital', 'clinic', 'student', or 'researcher'")
    full_name: str = Field(..., description="Full name or authorized contact name")
    organization: str = Field(..., description="Institution, hospital, clinic, or university name")
    password: str = Field(..., description="Password (min 8 chars, 1 letter, 1 number)")
    confirm_password: str = Field(..., description="Password confirmation")
    recovery_pin: str = Field(..., description="4-16 char Recovery PIN chosen by user")
    confirm_recovery_pin: str = Field(..., description="Recovery PIN confirmation")

class LoginRequest(BaseModel):
    user_id: str = Field(..., description="Permanent NeuroScan User ID (e.g. NS-STU-123456)")
    password: str = Field(..., description="Account password")

class ResetPasswordRequest(BaseModel):
    user_id: str = Field(..., description="Permanent NeuroScan User ID")
    recovery_pin: str = Field(..., description="Recovery PIN chosen during registration")
    new_password: str = Field(..., description="New password")
    confirm_password: str = Field(..., description="Confirmation of new password")

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
            SELECT s.token, s.expires_at, u.user_id, u.role, u.full_name, u.organization, u.created_at
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
            "role": row["role"],
            "full_name": row["full_name"],
            "organization": row["organization"],
            "created_at": row["created_at"],
            "session_token": token
        }


@auth_router.post("/register", status_code=status.HTTP_201_CREATED)
def register(req: RegisterRequest):
    """Registers a new user and generates a permanent User ID with recovery PIN."""
    role = req.role.strip().lower()
    if role not in ROLE_LABELS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Role must be one of: 'hospital', 'clinic', 'student', or 'researcher'."
        )

    full_name = req.full_name.strip()
    if not full_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Full name is required."
        )

    organization = req.organization.strip()
    if not organization:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Institution / Hospital / College name is required."
        )

    if req.password != req.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Passwords do not match."
        )

    is_strong, strength_err = validate_password_strength(req.password)
    if not is_strong:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=strength_err
        )

    if req.recovery_pin != req.confirm_recovery_pin:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Recovery PINs do not match."
        )

    is_pin_valid, pin_err = validate_recovery_pin(req.recovery_pin)
    if not is_pin_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=pin_err
        )

    # Hash password and recovery PIN
    pwd_hash, pwd_salt = hash_credential(req.password)
    pin_hash, pin_salt = hash_credential(req.recovery_pin.strip())

    with get_db() as conn:
        cursor = conn.cursor()
        
        # Generate unique user_id
        for _ in range(10):
            candidate_id = generate_user_id(role)
            cursor.execute("SELECT 1 FROM users WHERE user_id = ?", (candidate_id,))
            if not cursor.fetchone():
                user_id = candidate_id
                break
        else:
            user_id = f"{generate_user_id(role)}-{secrets.token_hex(2)}"

        cursor.execute("""
            INSERT INTO users (
                user_id, role, full_name, organization, 
                password_hash, salt, recovery_pin_hash, recovery_pin_salt
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            user_id, role, full_name, organization,
            pwd_hash, pwd_salt, pin_hash, pin_salt
        ))

    logger.info("New %s account registered: user_id=%s", role, user_id)
    role_label = ROLE_LABELS.get(role, role.capitalize())
    return {
        "status": "success",
        "user_id": user_id,
        "role": role,
        "full_name": full_name,
        "organization": organization,
        "message": f"{role_label} account created successfully! Save your User ID: {user_id}"
    }


@auth_router.post("/login")
def login(req: LoginRequest, request: Request):
    """Authenticates using User ID and password, returns session token."""
    user_id = req.user_id.strip().upper()
    if not user_id or not req.password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User ID and password are required."
        )

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT user_id, role, full_name, organization, password_hash, salt
            FROM users
            WHERE user_id = ?
        """, (user_id,))
        user = cursor.fetchone()

        if not user or not verify_credential(req.password, user["password_hash"], user["salt"]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid User ID or password."
            )

        # Create session
        token = generate_session_token()
        expires_at = datetime.now(timezone.utc) + timedelta(days=7)
        user_agent = request.headers.get("user-agent", "")[:250]

        cursor.execute("""
            INSERT INTO sessions (token, user_id, expires_at, user_agent)
            VALUES (?, ?, ?, ?)
        """, (token, user["user_id"], expires_at.isoformat(), user_agent))

    logger.info("User logged in successfully: user_id=%s", user["user_id"])
    return {
        "status": "success",
        "message": "Login successful.",
        "token": token,
        "user": {
            "user_id": user["user_id"],
            "role": user["role"],
            "full_name": user["full_name"],
            "organization": user["organization"]
        }
    }


@auth_router.get("/me")
def get_profile(current_user: dict = Depends(get_current_user)):
    """Returns currently authenticated user profile."""
    return {
        "status": "success",
        "user": {
            "user_id": current_user["user_id"],
            "role": current_user["role"],
            "full_name": current_user["full_name"],
            "organization": current_user["organization"]
        }
    }


@auth_router.post("/logout")
def logout(current_user: dict = Depends(get_current_user)):
    """Logs out by invalidating active session."""
    with get_db() as conn:
        conn.cursor().execute("DELETE FROM sessions WHERE token = ?", (current_user["session_token"],))
    return {"status": "success", "message": "Logged out successfully."}


@auth_router.post("/reset-password")
def reset_password(req: ResetPasswordRequest):
    """Resets password using User ID and Recovery PIN with rate-limiting."""
    user_id = req.user_id.strip().upper()
    pin = req.recovery_pin.strip()

    if not user_id or not pin:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User ID and Recovery PIN are required."
        )

    if req.new_password != req.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New passwords do not match."
        )

    is_strong, strength_err = validate_password_strength(req.new_password)
    if not is_strong:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=strength_err
        )

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT user_id, recovery_pin_hash, recovery_pin_salt, failed_reset_attempts, last_failed_attempt
            FROM users
            WHERE user_id = ?
        """, (user_id,))
        user = cursor.fetchone()

        if not user:
            # Generic error to prevent enumeration
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid User ID or Recovery PIN."
            )

        # Rate limiting: max 5 failed attempts within 15 minutes
        failed_count = user["failed_reset_attempts"] or 0
        last_failed = user["last_failed_attempt"]
        if failed_count >= 5 and last_failed:
            try:
                last_dt = datetime.fromisoformat(last_failed)
                if last_dt.tzinfo is None:
                    last_dt = last_dt.replace(tzinfo=timezone.utc)
                if (datetime.now(timezone.utc) - last_dt).total_seconds() < 900:
                    raise HTTPException(
                        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                        detail="Too many failed recovery attempts. Please wait 15 minutes before trying again."
                    )
            except HTTPException:
                raise
            except Exception:
                pass

        if not verify_credential(pin, user["recovery_pin_hash"], user["recovery_pin_salt"]):
            now_iso = datetime.now(timezone.utc).isoformat()
            cursor.execute("""
                UPDATE users
                SET failed_reset_attempts = failed_reset_attempts + 1, last_failed_attempt = ?
                WHERE user_id = ?
            """, (now_iso, user_id))
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid User ID or Recovery PIN."
            )

        # PIN verified! Update password and clear sessions
        pwd_hash, pwd_salt = hash_credential(req.new_password)
        now_iso = datetime.now(timezone.utc).isoformat()
        cursor.execute("""
            UPDATE users
            SET password_hash = ?, salt = ?, failed_reset_attempts = 0, last_failed_attempt = NULL, updated_at = ?
            WHERE user_id = ?
        """, (pwd_hash, pwd_salt, now_iso, user_id))

        cursor.execute("DELETE FROM sessions WHERE user_id = ?", (user_id,))

    logger.info("Password successfully reset via recovery PIN for user_id=%s", user_id)
    return {
        "status": "success",
        "message": "Password reset successfully. You can now sign in with your User ID and new password."
    }
