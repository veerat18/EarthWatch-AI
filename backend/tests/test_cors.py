from app.core.config import settings

def test_cors_origins_include_production():
    """Verify that the production frontend origin is included in CORS allowed origins."""
    production_url = "https://earthwatch-ai.onrender.com"
    assert production_url in settings.BACKEND_CORS_ORIGINS, "Production URL is missing from CORS origins."

def test_cors_origins_include_localhost():
    """Verify that local development origins are still preserved."""
    assert "http://localhost:3000" in settings.BACKEND_CORS_ORIGINS
    assert "http://localhost:5173" in settings.BACKEND_CORS_ORIGINS
    assert "http://127.0.0.1:5173" in settings.BACKEND_CORS_ORIGINS
