"""
BudgetMe AI Prediction Service - Routes Package
Contains API endpoint definitions for predictions and admin functions
"""

from routes.predictions import get_predictions_router
from routes.admin import get_admin_router

__all__ = [
    'get_predictions_router',
    'get_admin_router'
]