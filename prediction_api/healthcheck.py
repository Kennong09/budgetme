#!/usr/bin/env python3
"""
Health check script for BudgetMe Prediction API
Can be used by Render.com or other monitoring services
"""

import requests
import sys
import os
from datetime import datetime

def check_health():
    """Check if the service is healthy"""
    try:
        # Get the port from environment or use default
        port = os.getenv('PORT', '8000')
        base_url = f"http://localhost:{port}"
        
        # Check basic health endpoint
        health_response = requests.get(f"{base_url}/health", timeout=10)
        
        if health_response.status_code != 200:
            print(f"❌ Health check failed with status {health_response.status_code}")
            return False
        
        health_data = health_response.json()
        
        # Check if Prophet is available
        if not health_data.get('prophet_available', False):
            print("❌ Prophet model not available")
            return False
        
        # Check database connection
        if not health_data.get('database_connected', False):
            print("❌ Database connection failed")
            return False
        
        print("✅ Service is healthy")
        print(f"📊 Status: {health_data.get('status', 'unknown')}")
        print(f"🕐 Checked at: {datetime.now().isoformat()}")
        
        return True
        
    except requests.exceptions.Timeout:
        print("❌ Health check timed out")
        return False
    except requests.exceptions.ConnectionError:
        print("❌ Could not connect to service")
        return False
    except Exception as e:
        print(f"❌ Health check failed: {str(e)}")
        return False

if __name__ == "__main__":
    if check_health():
        sys.exit(0)  # Success
    else:
        sys.exit(1)  # Failure