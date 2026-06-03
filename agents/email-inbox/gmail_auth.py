#!/usr/bin/env python3
"""
One-time Gmail OAuth2 authorization for erel@evrnew.com.
Run this once to generate token.json, then never again.

Usage: python3 gmail_auth.py
"""
import os
import json
from pathlib import Path
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build

SCOPES = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/gmail.modify',
]

CONFIG_DIR = Path.home() / 'evrnew-marketing' / 'config' / 'gmail'
CREDENTIALS_FILE = CONFIG_DIR / 'credentials.json'
TOKEN_FILE = CONFIG_DIR / 'token.json'


def authorize():
    CONFIG_DIR.mkdir(parents=True, exist_ok=True)

    if not CREDENTIALS_FILE.exists():
        print(f"\nERROR: credentials.json not found at {CREDENTIALS_FILE}")
        print("Download it from Google Cloud Console first (see instructions).")
        return None

    creds = None
    if TOKEN_FILE.exists():
        creds = Credentials.from_authorized_user_file(str(TOKEN_FILE), SCOPES)

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(str(CREDENTIALS_FILE), SCOPES)
            creds = flow.run_local_server(port=0)
        with open(TOKEN_FILE, 'w') as f:
            f.write(creds.to_json())
        print(f"\nToken saved to {TOKEN_FILE}")

    # Test the connection
    service = build('gmail', 'v1', credentials=creds)
    profile = service.users().getProfile(userId='me').execute()
    print(f"\nConnected as: {profile['emailAddress']}")
    print(f"Total messages: {profile['messagesTotal']}")
    print("\nAuthorization complete. The inbox monitor will now work.")
    return creds


if __name__ == '__main__':
    authorize()
