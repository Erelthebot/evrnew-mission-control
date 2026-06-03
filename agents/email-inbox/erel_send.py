#!/usr/bin/env python3
"""
Quick email send utility for Erel.
Usage: python3 erel_send.py to@email.com "Subject" "Body"
"""
import smtplib
import sys
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart


def send(to: str, subject: str, body: str) -> bool:
    pw = os.environ.get("EREL_GMAIL_APP_PASSWORD", os.environ.get("EREL_GMAIL_PASSWORD"))
    if not pw:
        print("ERROR: Set EREL_GMAIL_APP_PASSWORD in ~/.zshrc")
        return False
    msg = MIMEMultipart()
    msg["From"] = "Erel - Evrnew Marketing <erel@evrnew.com>"
    msg["To"] = to
    msg["Subject"] = subject
    msg.attach(MIMEText(body, "plain"))
    try:
        with smtplib.SMTP("smtp.gmail.com", 587) as s:
            s.starttls()
            s.login("erel@evrnew.com", pw)
            s.send_message(msg)
        print(f"Sent to {to}: {subject}")
        return True
    except Exception as e:
        print(f"Failed: {e}")
        return False


if __name__ == "__main__":
    if len(sys.argv) < 4:
        print('Usage: python3 erel_send.py to@email.com "Subject" "Body"')
        sys.exit(1)
    send(sys.argv[1], sys.argv[2], sys.argv[3])
