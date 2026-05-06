"""SMTP email utility — sends password-reset emails via Gmail (or any SMTP)."""
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.core.config import settings


def send_reset_email(to_email: str, reset_link: str, full_name: str = "") -> None:
    greeting = f"Hi {full_name}," if full_name else "Hi,"
    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#f8fafc;border-radius:12px;">
      <div style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:24px;border-radius:10px;text-align:center;margin-bottom:28px;">
        <h1 style="color:white;margin:0;font-size:22px;font-weight:800;letter-spacing:0.04em;">AI-LMS</h1>
      </div>
      <h2 style="color:#0f172a;font-size:20px;font-weight:700;margin:0 0 8px;">{greeting}</h2>
      <p style="color:#475569;font-size:15px;line-height:1.65;margin:0 0 24px;">
        We received a request to reset your password. Click the button below to choose a new one.
        This link is valid for <strong>1 hour</strong>.
      </p>
      <a href="{reset_link}"
         style="display:inline-block;padding:13px 32px;background:linear-gradient(135deg,#4f46e5,#7c3aed);
                color:white;text-decoration:none;border-radius:8px;font-weight:700;font-size:15px;
                letter-spacing:0.01em;">
        Reset Password
      </a>
      <p style="color:#94a3b8;font-size:12px;margin:28px 0 0;line-height:1.6;">
        If you did not request this, you can safely ignore this email — your password will not change.<br/>
        Or copy this link: <span style="color:#6366f1;">{reset_link}</span>
      </p>
    </div>
    """
    text = f"{greeting}\n\nReset your AI-LMS password by visiting:\n{reset_link}\n\nThis link expires in 1 hour.\n\nIf you did not request this, ignore this email."

    msg = MIMEMultipart("alternative")
    msg["Subject"] = "Reset your AI-LMS password"
    msg["From"] = settings.SMTP_FROM or settings.SMTP_USER
    msg["To"] = to_email
    msg.attach(MIMEText(text, "plain"))
    msg.attach(MIMEText(html, "html"))

    password = settings.SMTP_PASSWORD.replace(" ", "")  # strip spaces from app password
    if settings.SMTP_PORT == 465:
        with smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.login(settings.SMTP_USER, password)
            server.sendmail(msg["From"], [to_email], msg.as_string())
    else:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.ehlo()
            server.starttls()
            server.login(settings.SMTP_USER, password)
            server.sendmail(msg["From"], [to_email], msg.as_string())
