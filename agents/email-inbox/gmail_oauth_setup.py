#!/usr/bin/env python3
"""
Gmail OAuth2 Setup for Erel
Sets up OAuth2 credentials for Gmail API access
"""
import os
import pickle
from pathlib import Path
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build

# Scopes for Gmail access
SCOPES = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/gmail.modify'
]

# Paths
CREDS_DIR = Path.home() / ".config/evrnew"
TOKEN_PATH = CREDS_DIR / "gmail_token.pickle"
CREDENTIALS_PATH = CREDS_DIR / "gmail_credentials.json"


def setup_gmail_oauth():
    """
    Set up Gmail OAuth2 credentials
    
    Prerequisites:
    1. Create project in Google Cloud Console
    2. Enable Gmail API
    3. Create OAuth 2.0 credentials (Desktop app)
    4. Download credentials JSON to ~/.config/evrnew/gmail_credentials.json
    """
    print("🔐 Gmail OAuth2 Setup for Erel")
    print("=" * 50)
    print("")
    
    # Create config directory if it doesn't exist
    CREDS_DIR.mkdir(parents=True, exist_ok=True)
    
    creds = None
    
    # Load existing token if available
    if TOKEN_PATH.exists():
        print(f"📂 Found existing token: {TOKEN_PATH}")
        with open(TOKEN_PATH, 'rb') as token:
            creds = pickle.load(token)
        print("✅ Token loaded successfully")
    
    # If credentials are invalid or don't exist, authenticate
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            print("🔄 Refreshing expired token...")
            creds.refresh(Request())
            print("✅ Token refreshed")
        else:
            if not CREDENTIALS_PATH.exists():
                print(f"❌ Credentials file not found: {CREDENTIALS_PATH}")
                print("")
                print("📝 Setup Instructions:")
                print("1. Go to https://console.cloud.google.com/")
                print("2. Create a new project (or select existing)")
                print("3. Enable Gmail API")
                print("4. Go to Credentials → Create Credentials → OAuth client ID")
                print("5. Application type: Desktop app")
                print("6. Download credentials JSON")
                print(f"7. Save to: {CREDENTIALS_PATH}")
                print("")
                return False
            
            print("🌐 Starting OAuth flow...")
            print("A browser window will open for authentication")
            flow = InstalledAppFlow.from_client_secrets_file(
                str(CREDENTIALS_PATH), SCOPES
            )
            creds = flow.run_local_server(port=0)
            print("✅ Authentication successful")
        
        # Save the credentials for future use
        with open(TOKEN_PATH, 'wb') as token:
            pickle.dump(creds, token)
        print(f"💾 Token saved to: {TOKEN_PATH}")
    
    # Test the credentials
    print("")
    print("🧪 Testing Gmail API access...")
    try:
        service = build('gmail', 'v1', credentials=creds)
        
        # Get user profile
        profile = service.users().getProfile(userId='me').execute()
        email_address = profile['emailAddress']
        messages_total = profile['messagesTotal']
        
        print(f"✅ Connected to Gmail: {email_address}")
        print(f"📧 Total messages: {messages_total}")
        
        # Test fetching recent messages
        results = service.users().messages().list(
            userId='me',
            maxResults=5,
            q='is:unread'
        ).execute()
        messages = results.get('messages', [])
        
        print(f"📬 Unread messages: {len(messages)}")
        
        print("")
        print("✅ Gmail OAuth2 setup complete!")
        print("")
        print("📝 Next steps:")
        print("1. Token is stored in:", TOKEN_PATH)
        print("2. Update erel_inbox_monitor.py to use OAuth2")
        print("3. Enable HEARTBEAT.md Gmail monitoring")
        print("")
        return True
        
    except Exception as e:
        print(f"❌ Error testing Gmail API: {e}")
        return False


def test_gmail_access():
    """Test existing Gmail OAuth credentials"""
    if not TOKEN_PATH.exists():
        print("❌ No token found. Run setup first.")
        return False
    
    try:
        with open(TOKEN_PATH, 'rb') as token:
            creds = pickle.load(token)
        
        if not creds.valid:
            if creds.expired and creds.refresh_token:
                creds.refresh(Request())
                with open(TOKEN_PATH, 'wb') as token:
                    pickle.dump(creds, token)
            else:
                print("❌ Token invalid. Run setup again.")
                return False
        
        service = build('gmail', 'v1', credentials=creds)
        profile = service.users().getProfile(userId='me').execute()
        
        print(f"✅ Gmail access working: {profile['emailAddress']}")
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return False


def search_thumbtack_email():
    """
    Search for Thumbtack email thread
    Example of how to use Gmail API for HEARTBEAT monitoring
    """
    if not TOKEN_PATH.exists():
        print("❌ No OAuth token. Run setup first.")
        return None
    
    try:
        with open(TOKEN_PATH, 'rb') as token:
            creds = pickle.load(token)
        
        service = build('gmail', 'v1', credentials=creds)
        
        # Search for Thumbtack thread
        query = 'from:teampartnerships@thumbtack.com subject:"Custom Lead Integration Request" subject:"PINT-2541"'
        results = service.users().messages().list(
            userId='me',
            q=query,
            maxResults=10
        ).execute()
        
        messages = results.get('messages', [])
        
        if not messages:
            print("📭 No Thumbtack emails found matching criteria")
            return None
        
        print(f"📬 Found {len(messages)} message(s) from Thumbtack:")
        print("")
        
        for msg in messages:
            msg_data = service.users().messages().get(
                userId='me',
                id=msg['id'],
                format='metadata',
                metadataHeaders=['From', 'To', 'Cc', 'Subject', 'Date']
            ).execute()
            
            headers = {h['name']: h['value'] for h in msg_data['payload']['headers']}
            
            print(f"Date: {headers.get('Date', 'N/A')}")
            print(f"From: {headers.get('From', 'N/A')}")
            print(f"To: {headers.get('To', 'N/A')}")
            print(f"Cc: {headers.get('Cc', 'N/A')}")
            print(f"Subject: {headers.get('Subject', 'N/A')}")
            print("-" * 50)
        
        return messages
        
    except Exception as e:
        print(f"❌ Error searching emails: {e}")
        return None


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        if sys.argv[1] == "test":
            test_gmail_access()
        elif sys.argv[1] == "thumbtack":
            search_thumbtack_email()
        else:
            print("Usage: gmail_oauth_setup.py [test|thumbtack]")
    else:
        setup_gmail_oauth()
