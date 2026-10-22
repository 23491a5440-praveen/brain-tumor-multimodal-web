import secrets
import hashlib
import hmac
import re
from typing import Tuple

PBKDF2_ITERATIONS = 100_000

ROLE_PREFIXES = {
    "hospital": "NS-HOSP",
    "clinic": "NS-CLIN",
    "student": "NS-STU",
    "researcher": "NS-RES"
}

def generate_user_id(role: str) -> str:
    """Generates a permanent, unique clinical User ID for an account role."""
    prefix = ROLE_PREFIXES.get(role.lower().strip(), "NS-USER")
    numeric_suffix = secrets.randbelow(900000) + 100000
    return f"{prefix}-{numeric_suffix}"

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

def validate_recovery_pin(pin: str) -> Tuple[bool, str]:
    """Validates recovery PIN format (min 4 characters, max 16 characters)."""
    if not pin or not pin.strip():
        return False, "Recovery PIN cannot be empty."
    pin_str = pin.strip()
    if len(pin_str) < 4:
        return False, "Recovery PIN must be at least 4 characters long."
    if len(pin_str) > 16:
        return False, "Recovery PIN cannot exceed 16 characters."
    return True, ""

def hash_credential(secret: str) -> Tuple[str, str]:
    """Hashes a secret (password or recovery PIN) using PBKDF2-HMAC-SHA256 with 100k rounds and a 16-byte salt."""
    salt_bytes = secrets.token_bytes(16)
    key = hashlib.pbkdf2_hmac(
        "sha256",
        secret.encode("utf-8"),
        salt_bytes,
        PBKDF2_ITERATIONS
    )
    return key.hex(), salt_bytes.hex()

def verify_credential(secret: str, expected_hash_hex: str, salt_hex: str) -> bool:
    """Constant-time verification of secret against expected hash."""
    try:
        salt_bytes = bytes.fromhex(salt_hex)
        key = hashlib.pbkdf2_hmac(
            "sha256",
            secret.encode("utf-8"),
            salt_bytes,
            PBKDF2_ITERATIONS
        )
        return hmac.compare_digest(key.hex(), expected_hash_hex)
    except Exception:
        return False

def generate_session_token() -> str:
    """Generates a secure 32-byte URL-safe session token."""
    return secrets.token_urlsafe(32)
