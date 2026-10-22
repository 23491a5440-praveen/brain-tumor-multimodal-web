import os
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Tuple, Optional

logger = logging.getLogger("neuroscan.auth.email")

def get_smtp_config():
    host = os.getenv("SMTP_HOST", "").strip()
    port = int(os.getenv("SMTP_PORT", "587"))
    user = os.getenv("SMTP_USER", "").strip()
    password = os.getenv("SMTP_PASSWORD", "").strip()
    from_addr = os.getenv("SMTP_FROM", user or "noreply@neuroscan.ai").strip()
    use_tls = os.getenv("SMTP_USE_TLS", "true").lower() in ("true", "1", "yes")
    use_ssl = os.getenv("SMTP_USE_SSL", "false").lower() in ("true", "1", "yes")
    
    missing = []
    if not host:
        missing.append("SMTP_HOST")
    if not user:
        missing.append("SMTP_USER")
    if not password:
        missing.append("SMTP_PASSWORD")

    is_configured = (len(missing) == 0)
    return {
        "is_configured": is_configured,
        "missing": missing,
        "host": host,
        "port": port,
        "user": user,
        "password": password,
        "from_addr": from_addr,
        "use_tls": use_tls,
        "use_ssl": use_ssl
    }

def send_password_reset_otp_email(recipient_email: str, otp_code: str) -> Tuple[bool, bool, str, Optional[str]]:
    """
    Sends an OTP verification email to recipient_email.
    Returns:
        (success: bool, is_configured: bool, status_message: str, dev_otp: Optional[str])
    """
    config = get_smtp_config()
    
    if not config["is_configured"]:
        missing_str = ", ".join(config["missing"])
        logger.warning(
            "[AUTH EMAIL NOTICE] SMTP server not configured (Missing: %s). "
            "Development OTP code for %s is: [%s]. "
            "To send actual emails, provide SMTP_HOST, SMTP_USER, and SMTP_PASSWORD.",
            missing_str, recipient_email, otp_code
        )
        # In non-production or unconfigured setups, supply informative detail
        is_dev = os.getenv("ENVIRONMENT", "development").lower() != "production"
        dev_code = otp_code if is_dev else None
        return (
            True,
            False,
            f"SMTP not configured ({missing_str}). Verification code logged to server console.",
            dev_code
        )

    # Prepare Email Content
    msg = MIMEMultipart("alternative")
    msg["Subject"] = "NeuroScan AI — Password Reset Verification Code"
    msg["From"] = f"NeuroScan AI Security <{config['from_addr']}>"
    msg["To"] = recipient_email

    text_body = f"""NeuroScan AI — Password Reset Request

We received a request to reset your password for your NeuroScan AI account.
Your 6-digit verification code is:

    {otp_code}

This code will expire in 10 minutes.
If you did not request a password reset, please ignore this email. Your account remains secure.

NeuroScan AI Medical Intelligence & Neuroimaging Platform
(Educational & Research Portal)
"""

    html_body = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f19; color: #e2e8f0; margin: 0; padding: 24px; }}
    .container {{ max-width: 540px; margin: 0 auto; background: #131b2e; border: 1px solid #1e293b; border-radius: 16px; padding: 32px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }}
    .brand {{ display: flex; align-items: center; gap: 12px; margin-bottom: 24px; border-bottom: 1px solid #1e293b; padding-bottom: 16px; }}
    .brand-title {{ font-size: 20px; font-weight: 700; color: #38bdf8; letter-spacing: -0.5px; }}
    .otp-box {{ background: #0f172a; border: 2px dashed #0284c7; border-radius: 12px; padding: 20px; text-align: center; margin: 28px 0; }}
    .otp-code {{ font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #38bdf8; font-family: monospace; }}
    .notice {{ font-size: 13px; color: #94a3b8; line-height: 1.5; margin-top: 20px; }}
    .footer {{ font-size: 11px; color: #64748b; margin-top: 32px; border-top: 1px solid #1e293b; padding-top: 16px; text-align: center; }}
  </style>
</head>
<body>
  <div class="container">
    <div class="brand">
      <div class="brand-title">🧠 NeuroScan AI</div>
    </div>
    <h2 style="color: #f8fafc; font-size: 18px; margin-top: 0;">Password Reset Verification</h2>
    <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6;">
      We received a request to reset the password for your NeuroScan AI account (<strong>{recipient_email}</strong>).
      Use the following single-use verification code to complete your reset:
    </p>
    <div class="otp-box">
      <div style="font-size: 11px; text-transform: uppercase; color: #94a3b8; margin-bottom: 6px; letter-spacing: 1px;">One-Time Security Code</div>
      <div class="otp-code">{otp_code}</div>
      <div style="font-size: 12px; color: #38bdf8; margin-top: 6px;">Valid for 10 minutes</div>
    </div>
    <div class="notice">
      ⚠️ <strong>Security Notice:</strong> Never share this verification code with anyone. NeuroScan AI staff will never ask for your code or password. If you did not make this request, you can safely disregard this message.
    </div>
    <div class="footer">
      NeuroScan AI Multimodal Deep Learning Platform • Educational & Research Access
    </div>
  </div>
</body>
</html>
"""

    msg.attach(MIMEText(text_body, "plain"))
    msg.attach(MIMEText(html_body, "html"))

    try:
        if config["use_ssl"]:
            server = smtplib.SMTP_SSL(config["host"], config["port"], timeout=15)
        else:
            server = smtplib.SMTP(config["host"], config["port"], timeout=15)
            if config["use_tls"]:
                server.starttls()
                
        server.login(config["user"], config["password"])
        server.sendmail(config["from_addr"], [recipient_email], msg.as_string())
        server.quit()
        logger.info("Password reset OTP email sent successfully to %s", recipient_email)
        return (True, True, "Verification email sent successfully via SMTP.", None)
    except Exception as e:
        logger.error("Failed to deliver OTP email to %s via SMTP: %s", recipient_email, e, exc_info=True)
        return (False, True, f"Failed to deliver email through SMTP server: {str(e)}", None)
