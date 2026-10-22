import os
import re
import secrets
import hashlib
import hmac
from typing import Tuple

# Scrypt configuration recommended by OWASP
SCRYPT_N = 16384
SCRYPT_R = 8
SCRYPT_P = 1
SCRYPT_DKLEN = 64

EMAIL_REGEX = re.compile(
    r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$"
)

def is_valid_email(email: str) -> bool:
    """Validates basic email format."""
    if not email or len(email) > 254:
        return False
    return bool(EMAIL_REGEX.match(email.strip()))

def validate_password_strength(password: str) -> Tuple[bool, str]:
    """
    Validates password strength:
    - Minimum 8 characters
    - At least one letter
    - At least one digit
    """
    if not password:
        return False, "Password cannot be empty."
    if len(password) < 8:
        return False, "Password must be at least 8 characters long."
    if len(password) > 128:
        return False, "Password cannot exceed 128 characters."
    if not re.search(r"[A-Za-z]", password):
        return False, "Password must contain at least one letter."
    if not re.search(r"\d", password):
        return False, "Password must contain at least one numeric digit."
    return True, ""

def hash_password(password: str) -> Tuple[str, str]:
    """Hashes a password with a fresh random 16-byte salt using scrypt."""
    salt_bytes = secrets.token_bytes(16)
    salt_hex = salt_bytes.hex()
    key = hashlib.scrypt(
        password.encode("utf-8"),
        salt=salt_bytes,
        n=SCRYPT_N,
        r=SCRYPT_R,
        p=SCRYPT_P,
        dklen=SCRYPT_DKLEN
    )
    return key.hex(), salt_hex

def verify_password(password: str, expected_hash_hex: str, salt_hex: str) -> bool:
    """Safely verifies a password against expected hash using constant-time comparison."""
    try:
        salt_bytes = bytes.fromhex(salt_hex)
        key = hashlib.scrypt(
            password.encode("utf-8"),
            salt=salt_bytes,
            n=SCRYPT_N,
            r=SCRYPT_R,
            p=SCRYPT_P,
            dklen=SCRYPT_DKLEN
        )
        return hmac.compare_digest(key.hex(), expected_hash_hex)
    except Exception:
        return False

def generate_session_token() -> str:
    """Generates a cryptographically strong URL-safe session token."""
    return secrets.token_urlsafe(32)

def generate_otp() -> str:
    """Generates a secure 6-digit numeric OTP code."""
    return f"{secrets.randbelow(900000) + 100000}"

def hash_otp(otp: str, salt: str) -> str:
    """Hashes a 6-digit OTP with salt to prevent storing plaintext OTPs in the database."""
    return hashlib.sha256(f"{otp.strip()}:{salt}".encode("utf-8")).hexdigest()

def verify_otp(otp: str, expected_hash: str, salt: str) -> bool:
    """Timing-safe verification of 6-digit OTP."""
    candidate_hash = hash_otp(otp, salt)
    return hmac.compare_digest(candidate_hash, expected_hash)
