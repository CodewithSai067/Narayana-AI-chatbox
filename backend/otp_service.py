import secrets
from datetime import datetime, timedelta, timezone

from pwdlib import PasswordHash


# Argon2 password hashing
password_hash = PasswordHash.recommended()


OTP_LENGTH = 6
OTP_EXPIRY_MINUTES = 5
MAX_OTP_ATTEMPTS = 5


def generate_otp():
    """Generate a cryptographically secure 6-digit OTP."""
    otp = f"{secrets.randbelow(1_000_000):06d}"
    return otp


def hash_otp(otp: str):
    """Hash OTP before storing it in the database."""
    return password_hash.hash(otp)


def verify_otp(otp: str, otp_hash: str):
    """Verify user-entered OTP against the stored hash."""
    return password_hash.verify(otp, otp_hash)


def get_otp_expiry():
    """Return OTP expiry time."""
    return datetime.now(timezone.utc) + timedelta(
        minutes=OTP_EXPIRY_MINUTES
    )


def is_otp_expired(expires_at):
    """Check whether OTP has expired."""
    now = datetime.now(timezone.utc)

    # Handle PostgreSQL timestamp without timezone
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    return now >= expires_at