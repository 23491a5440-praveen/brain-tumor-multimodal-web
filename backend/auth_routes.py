import logging
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException, Depends, Header, Request, status
from pydantic import BaseModel, Field

from backend.database import get_db, init_db
from backend.auth_utils import (
    is_valid_email,
    validate_password_strength,
    hash_password,
    verify_password,
    generate_session_token,
    generate_otp,
    hash_otp,
    verify_otp,
)
from backend.email_service import send_password_reset_otp_email, get_smtp_config

logger = logging.getLogger("neuroscan.auth.routes")
auth_router = APIRouter(prefix="/api/auth", tags=["Authentication"])

# Initialize schema at import
init_db()

# Pydantic Schemas
ROLE_LABELS = {
    "hospital": "Hospital",
    "clinic": "Clinic / Diagnostic Centre",
    "student": "Student",
    "researcher": "Researcher"
}

class RegisterRequest(BaseModel):
    role: str = Field(..., description="Role: 'hospital', 'clinic', 'student', or 'researcher'")
    email: str = Field(..., description="Account email address")
    password: str = Field(..., description="Password (min 8 chars, 1 letter, 1 number)")
    confirm_password: str = Field(..., description="Password confirmation")
    full_name: str = Field(..., description="Full name or authorized contact name")
    organization: str = Field(..., description="Institution, hospital, clinic, or university name")

class LoginRequest(BaseModel):
    email: str = Field(..., description="Registered email address")
    password: str = Field(..., description="Account password")

class RequestOtpRequest(BaseModel):
    email: str = Field(..., description="Registered email address for password reset")

class VerifyOtpRequest(BaseModel):
    email: str = Field(..., description="Account email address")
    otp: str = Field(..., description="6-digit verification code")

class ResetPasswordRequest(BaseModel):
    email: str = Field(..., description="Account email address")
    reset_token: str = Field(..., description="One-time password reset authorization token")
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
        now_iso = datetime.now(timezone.utc).isoformat()
        cursor.execute("""
            SELECT s.token, s.expires_at, u.id, u.email, u.role, u.full_name, u.organization, u.created_at
            FROM sessions s
            JOIN users u ON s.user_id = u.id
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
            "id": row["id"],
            "email": row["email"],
            "role": row["role"],
            "full_name": row["full_name"],
            "organization": row["organization"],
            "created_at": row["created_at"],
            "session_token": token
        }


# ==========================================
# Authentication Endpoints
# ==========================================

@auth_router.post("/register", status_code=status.HTTP_201_CREATED)
def register(req: RegisterRequest):
    """Registers a new user (Hospital, Clinic, Student, or Researcher) with scrypt password hashing."""
    role = req.role.strip().lower()
    if role not in ROLE_LABELS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Role must be one of: 'hospital', 'clinic', 'student', or 'researcher'."
        )

    email = req.email.strip().lower()
    if not is_valid_email(email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please provide a valid email address."
        )

    full_name = req.full_name.strip()
    if not full_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Full name / Authorized user name is required."
        )

    organization = req.organization.strip()
    if not organization:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Institution / Hospital name is required."
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

    with get_db() as conn:
        cursor = conn.cursor()
        # Check for existing email (case-insensitive)
        cursor.execute("SELECT id FROM users WHERE email = ?", (email,))
        existing = cursor.fetchone()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An account with this email address already exists. Please log in or use forgot password."
            )

        pwd_hash, salt = hash_password(req.password)
        cursor.execute("""
            INSERT INTO users (email, role, full_name, organization, password_hash, salt)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (email, role, full_name, organization, pwd_hash, salt))
        user_id = cursor.lastrowid

    logger.info("New %s account registered: user_id=%s, email=%s", role, user_id, email)
    role_label = ROLE_LABELS.get(role, role.capitalize())
    return {
        "status": "success",
        "message": f"{role_label} account created successfully. You can now log in.",
        "user": {
            "email": email,
            "role": role,
            "full_name": full_name,
            "organization": organization
        }
    }


@auth_router.post("/login")
def login(req: LoginRequest, request: Request):
    """Authenticates user and returns a secure session token."""
    email = req.email.strip().lower()
    if not email or not req.password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email and password are required."
        )

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, email, role, full_name, organization, password_hash, salt
            FROM users
            WHERE email = ?
        """, (email,))
        user = cursor.fetchone()

        if not user:
            # Generic response to prevent email harvesting
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password."
            )

        is_correct = verify_password(req.password, user["password_hash"], user["salt"])
        if not is_correct:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password."
            )

        # Generate 7-day session token
        session_token = generate_session_token()
        expires_at = datetime.now(timezone.utc) + timedelta(days=7)
        user_agent = request.headers.get("user-agent", "unknown")[:255]

        cursor.execute("""
            INSERT INTO sessions (token, user_id, expires_at, user_agent)
            VALUES (?, ?, ?, ?)
        """, (session_token, user["id"], expires_at.isoformat(), user_agent))

    logger.info("User logged in successfully: user_id=%s, email=%s", user["id"], email)
    return {
        "status": "success",
        "message": "Login successful.",
        "token": session_token,
        "user": {
            "id": user["id"],
            "email": user["email"],
            "role": user["role"],
            "full_name": user["full_name"],
            "organization": user["organization"]
        }
    }


@auth_router.get("/me")
def get_profile(current_user: dict = Depends(get_current_user)):
    """Returns profile for currently authenticated session."""
    return {
        "status": "success",
        "user": {
            "id": current_user["id"],
            "email": current_user["email"],
            "role": current_user["role"],
            "full_name": current_user["full_name"],
            "organization": current_user["organization"]
        }
    }


@auth_router.post("/logout")
def logout(current_user: dict = Depends(get_current_user)):
    """Terminates the user's active session."""
    token = current_user.get("session_token")
    if token:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM sessions WHERE token = ?", (token,))
    return {"status": "success", "message": "Successfully logged out."}


# ==========================================
# Forgot Password & OTP Flow
# ==========================================

@auth_router.post("/forgot-password/request-otp")
def request_password_reset_otp(req: RequestOtpRequest):
    """
    Generates and dispatches a 6-digit OTP code for password reset.
    Returns safe generic message to avoid email enumeration.
    """
    email = req.email.strip().lower()
    if not is_valid_email(email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please provide a valid email address."
        )

    with get_db() as conn:
        cursor = conn.cursor()
        
        # Cooldown check: prevent requesting more than once every 60 seconds
        cursor.execute("""
            SELECT created_at FROM password_resets
            WHERE email = ? AND used = 0
            ORDER BY id DESC LIMIT 1
        """, (email,))
        recent = cursor.fetchone()
        if recent:
            try:
                created_time = datetime.fromisoformat(recent["created_at"])
                if created_time.tzinfo is None:
                    created_time = created_time.replace(tzinfo=timezone.utc)
                if (datetime.now(timezone.utc) - created_time).total_seconds() < 60:
                    raise HTTPException(
                        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                        detail="A verification code was recently sent. Please wait 60 seconds before requesting another."
                    )
            except HTTPException:
                raise
            except Exception:
                pass

        # Check if user exists
        cursor.execute("SELECT id FROM users WHERE email = ?", (email,))
        user = cursor.fetchone()

        email_status_detail = "If this email is registered, a 6-digit verification code has been dispatched."
        dev_hint = None
        email_sent = False

        if user:
            otp_code = generate_otp()
            salt = secrets.token_hex(8)
            hashed_otp = hash_otp(otp_code, salt)
            expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)

            cursor.execute("""
                INSERT INTO password_resets (email, otp_hash, salt, attempts_left, used, expires_at)
                VALUES (?, ?, ?, 5, 0, ?)
            """, (email, hashed_otp, salt, expires_at.isoformat()))

            # Send Email
            success, is_smtp, status_msg, dev_otp = send_password_reset_otp_email(email, otp_code)
            email_sent = success
            if not is_smtp and dev_otp:
                dev_hint = {
                    "notice": "SMTP not configured in environment. Displaying dev preview code for local evaluation.",
                    "dev_otp": dev_otp
                }

    smtp_info = get_smtp_config()
    return {
        "status": "success",
        "message": email_status_detail,
        "email_service_configured": smtp_info["is_configured"],
        "dev_hint": dev_hint
    }


@auth_router.post("/forgot-password/verify-otp")
def verify_password_reset_otp(req: VerifyOtpRequest):
    """
    Verifies the 6-digit OTP code.
    If valid, marks OTP as verified and returns a short-lived reset authorization token.
    """
    email = req.email.strip().lower()
    otp = req.otp.strip()

    if not is_valid_email(email) or len(otp) != 6 or not otp.isdigit():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid email or 6-digit verification code format."
        )

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, otp_hash, salt, attempts_left, used, expires_at
            FROM password_resets
            WHERE email = ? AND used = 0
            ORDER BY id DESC LIMIT 1
        """, (email,))
        reset_record = cursor.fetchone()

        if not reset_record:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No pending verification code found. Please request a new code."
            )

        # Check attempts left
        if reset_record["attempts_left"] <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Maximum verification attempts exceeded. Please request a new code."
            )

        # Check expiration
        try:
            expires_at = datetime.fromisoformat(reset_record["expires_at"])
            if expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)
            if datetime.now(timezone.utc) > expires_at:
                cursor.execute("UPDATE password_resets SET used = 1 WHERE id = ?", (reset_record["id"],))
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Verification code has expired (10-minute limit). Please request a new code."
                )
        except HTTPException:
            raise
        except Exception:
            pass

        # Verify OTP
        is_match = verify_otp(otp, reset_record["otp_hash"], reset_record["salt"])
        if not is_match:
            new_attempts = reset_record["attempts_left"] - 1
            cursor.execute("UPDATE password_resets SET attempts_left = ? WHERE id = ?", (new_attempts, reset_record["id"]))
            if new_attempts <= 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid verification code. Maximum attempts reached. Please request a new code."
                )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Incorrect verification code. {new_attempts} attempt(s) remaining."
            )

        # Mark OTP record as used and issue single-use reset authorization token (valid 15 mins)
        reset_token = secrets.token_urlsafe(32)
        token_expiry = datetime.now(timezone.utc) + timedelta(minutes=15)
        cursor.execute("""
            UPDATE password_resets
            SET used = 1, reset_token = ?, reset_token_expires_at = ?
            WHERE id = ?
        """, (reset_token, token_expiry.isoformat(), reset_record["id"]))

    logger.info("OTP verified successfully for email %s. Reset token issued.", email)
    return {
        "status": "success",
        "message": "Verification code verified successfully. You may now set your new password.",
        "reset_token": reset_token
    }


@auth_router.post("/forgot-password/reset-password")
def reset_password(req: ResetPasswordRequest):
    """
    Changes user's password using the verified reset_token.
    Invalidates all prior active sessions for this user for security.
    """
    email = req.email.strip().lower()
    reset_token = req.reset_token.strip()

    if not email or not reset_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email and reset authorization token are required."
        )

    if req.new_password != req.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password and confirmation do not match."
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
            SELECT id, reset_token_expires_at, used
            FROM password_resets
            WHERE email = ? AND reset_token = ?
            ORDER BY id DESC LIMIT 1
        """, (email, reset_token))
        record = cursor.fetchone()

        if not record:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or unrecognized password reset token. Please restart the reset process."
            )

        # Check reset token expiry
        expires_str = record["reset_token_expires_at"]
        if expires_str:
            try:
                expires_at = datetime.fromisoformat(expires_str)
                if expires_at.tzinfo is None:
                    expires_at = expires_at.replace(tzinfo=timezone.utc)
                if datetime.now(timezone.utc) > expires_at:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Password reset session expired. Please request a new verification code."
                    )
            except HTTPException:
                raise
            except Exception:
                pass

        # Hash new password
        new_hash, new_salt = hash_password(req.new_password)
        now_iso = datetime.now(timezone.utc).isoformat()

        cursor.execute("""
            UPDATE users
            SET password_hash = ?, salt = ?, updated_at = ?
            WHERE email = ?
        """, (new_hash, new_salt, now_iso, email))

        # Invalidate reset token
        cursor.execute("UPDATE password_resets SET reset_token = NULL WHERE id = ?", (record["id"],))

        # Invalidate all active user sessions for security
        cursor.execute("""
            DELETE FROM sessions
            WHERE user_id IN (SELECT id FROM users WHERE email = ?)
        """, (email,))

    logger.info("Password successfully reset for %s. Active sessions cleared.", email)
    return {
        "status": "success",
        "message": "Your password has been successfully updated. Please sign in with your new password."
    }
