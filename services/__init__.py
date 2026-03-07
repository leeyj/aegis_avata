# AEGIS Services Package
# Centralized imports for backend routes

from . import ai_service
from . import briefing_manager
from . import data_service
from . import gemini_service
from . import voice_service
from . import google_auth
from .plugin_security_service import require_permission

__all__ = [
    "require_permission",
    "ai_service",
    "briefing_manager",
    "data_service",
    "gemini_service",
    "voice_service",
    "google_auth",
]
