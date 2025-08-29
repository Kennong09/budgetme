"""
Authentication middleware for BudgetMe AI Prediction Service
Validates Supabase JWT tokens and extracts user information
"""

import jwt
import logging
from typing import Optional, Dict, Any
from fastapi import HTTPException, Depends, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import requests
import os
from datetime import datetime
import json

logger = logging.getLogger(__name__)

# Security scheme for JWT token
security = HTTPBearer()

class SupabaseAuthMiddleware:
    """
    Middleware for validating Supabase JWT tokens
    """
    
    def __init__(self, supabase_url: str, supabase_anon_key: str):
        """
        Initialize authentication middleware
        
        Args:
            supabase_url: Supabase project URL
            supabase_anon_key: Supabase anonymous key
        """
        self.supabase_url = supabase_url
        self.supabase_anon_key = supabase_anon_key
        self.jwt_secret = None
        self._fetch_jwt_secret()
    
    def _fetch_jwt_secret(self):
        """
        Fetch JWT secret from Supabase project settings
        """
        try:
            # For Supabase, the JWT secret is typically the same as the service key
            # In production, you should fetch this from Supabase API or store securely
            self.jwt_secret = os.getenv('SUPABASE_SERVICE_KEY')
            
            if not self.jwt_secret:
                logger.warning("JWT secret not found in environment variables")
                
        except Exception as e:
            logger.error(f"Error fetching JWT secret: {str(e)}")
    
    async def verify_token(self, token: str) -> Dict[str, Any]:
        """
        Verify and decode JWT token
        
        Args:
            token: JWT token string
            
        Returns:
            Decoded token payload
            
        Raises:
            HTTPException: If token is invalid
        """
        try:
            # Remove 'Bearer ' prefix if present
            if token.startswith('Bearer '):
                token = token[7:]
            
            # For development/testing, we'll use a simplified validation
            # In production, implement proper JWT validation with Supabase's public key
            
            # Decode without verification for development (NOT for production!)
            if os.getenv('DEBUG', 'False').lower() == 'true':
                # Development mode - minimal validation
                try:
                    payload = jwt.decode(token, options={"verify_signature": False})
                    return payload
                except jwt.DecodeError:
                    raise HTTPException(
                        status_code=401,
                        detail="Invalid token format"
                    )
            
            # Production validation
            if not self.jwt_secret:
                raise HTTPException(
                    status_code=500,
                    detail="JWT secret not configured"
                )
            
            try:
                payload = jwt.decode(
                    token,
                    self.jwt_secret,
                    algorithms=["HS256"],
                    audience="authenticated"
                )
                
                # Check token expiration
                if 'exp' in payload:
                    exp_timestamp = payload['exp']
                    if datetime.now().timestamp() > exp_timestamp:
                        raise HTTPException(
                            status_code=401,
                            detail="Token has expired"
                        )
                
                return payload
                
            except jwt.ExpiredSignatureError:
                raise HTTPException(
                    status_code=401,
                    detail="Token has expired"
                )
            except jwt.InvalidTokenError as e:
                raise HTTPException(
                    status_code=401,
                    detail=f"Invalid token: {str(e)}"
                )
                
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error verifying token: {str(e)}")
            raise HTTPException(
                status_code=401,
                detail="Token verification failed"
            )
    
    async def get_user_from_token(self, token: str) -> Dict[str, Any]:
        """
        Extract user information from validated token
        
        Args:
            token: JWT token string
            
        Returns:
            User information dictionary
        """
        try:
            payload = await self.verify_token(token)
            
            # Extract user information from token payload
            user_info = {
                'id': payload.get('sub'),  # User ID
                'email': payload.get('email'),
                'role': payload.get('role', 'authenticated'),
                'aud': payload.get('aud'),
                'exp': payload.get('exp'),
                'iat': payload.get('iat'),
                'iss': payload.get('iss')
            }
            
            if not user_info['id']:
                raise HTTPException(
                    status_code=401,
                    detail="Invalid token: missing user ID"
                )
            
            return user_info
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error extracting user from token: {str(e)}")
            raise HTTPException(
                status_code=401,
                detail="Failed to extract user information"
            )

# Global auth middleware instance
auth_middleware = None

def get_auth_middleware() -> SupabaseAuthMiddleware:
    """
    Get configured authentication middleware instance
    
    Returns:
        SupabaseAuthMiddleware instance
    """
    global auth_middleware
    
    if auth_middleware is None:
        supabase_url = os.getenv('SUPABASE_URL')
        supabase_anon_key = os.getenv('SUPABASE_ANON_KEY')
        
        if not supabase_url or not supabase_anon_key:
            raise ValueError("SUPABASE_URL and SUPABASE_ANON_KEY must be set")
        
        auth_middleware = SupabaseAuthMiddleware(supabase_url, supabase_anon_key)
    
    return auth_middleware

# Dependency functions for FastAPI

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> Dict[str, Any]:
    """
    FastAPI dependency to get current authenticated user
    
    Args:
        credentials: HTTP Authorization credentials
        
    Returns:
        User information dictionary
    """
    try:
        auth = get_auth_middleware()
        user_info = await auth.get_user_from_token(credentials.credentials)
        return user_info
        
    except Exception as e:
        logger.error(f"Authentication failed: {str(e)}")
        raise HTTPException(
            status_code=401,
            detail="Authentication required"
        )

async def get_current_user_id(
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> str:
    """
    FastAPI dependency to get current user ID
    
    Args:
        current_user: Current user information
        
    Returns:
        User ID string
    """
    return current_user['id']

async def verify_admin_user(
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    FastAPI dependency to verify admin privileges
    
    Args:
        current_user: Current user information
        
    Returns:
        User information if admin
        
    Raises:
        HTTPException: If user is not admin
    """
    if current_user.get('role') not in ['admin', 'service_role']:
        raise HTTPException(
            status_code=403,
            detail="Admin privileges required"
        )
    
    return current_user

# Optional: API Key authentication for service-to-service communication
async def verify_api_key(x_api_key: Optional[str] = Header(None)) -> bool:
    """
    Verify API key for service-to-service authentication
    
    Args:
        x_api_key: API key from header
        
    Returns:
        True if valid API key
        
    Raises:
        HTTPException: If API key is invalid
    """
    expected_api_key = os.getenv('PREDICTION_API_KEY')
    
    if not expected_api_key:
        # If no API key is configured, skip this check
        return True
    
    if not x_api_key or x_api_key != expected_api_key:
        raise HTTPException(
            status_code=401,
            detail="Invalid API key"
        )
    
    return True