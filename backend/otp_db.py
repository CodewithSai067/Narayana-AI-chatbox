from datetime import datetime, timedelta
from sqlalchemy import text
from database import engine
from otp_service import generate_otp, hash_otp, verify_otp

def create_otp(user_id: int, purpose: str = "login"):
    otp = generate_otp()
    otp_hash = hash_otp(otp)
    expires_at = datetime.utcnow() + timedelta(minutes=5)

    with engine.begin() as conn:
        conn.execute(
            text("""
                INSERT INTO otp_verifications
                (user_id, otp_hash, purpose, expires_at)
                VALUES (:user_id, :otp_hash, :purpose, :expires_at)
            """),
            {
                "user_id": user_id,
                "otp_hash": otp_hash,
                "purpose": purpose,
                "expires_at": expires_at,
            }
        )

    return otp

def verify_user_otp(user_id: int, otp: str, purpose: str = "login"):
    with engine.begin() as conn:
        result = conn.execute(
            text("""
                SELECT id, otp_hash, expires_at, attempts, max_attempts
                FROM otp_verifications
                WHERE user_id = :user_id
                  AND purpose = :purpose
                  AND is_used = FALSE
                ORDER BY id DESC
                LIMIT 1
            """),
            {
                "user_id": user_id,
                "purpose": purpose
            }
        ).mappings().first()

        if not result:
            return False, "No active OTP found"

        if datetime.utcnow() > result["expires_at"]:
            return False, "OTP has expired"

        if result["attempts"] >= result["max_attempts"]:
            return False, "Maximum OTP attempts exceeded"

        if not verify_otp(otp, result["otp_hash"]):
            conn.execute(
                text("""
                    UPDATE otp_verifications
                    SET attempts = attempts + 1
                    WHERE id = :id
                """),
                {"id": result["id"]}
            )
            return False, "Invalid OTP"

        conn.execute(
            text("""
                UPDATE otp_verifications
                SET is_used = TRUE
                WHERE id = :id
            """),
            {"id": result["id"]}
        )

        return True, "OTP verified successfully"