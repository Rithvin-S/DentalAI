import logging
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.routes import screenings

# Configure structured logging (ensures no image content or secrets are logged per FR-20, AT-14)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("dental_ai")

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="DentalAI Visual Screening Prototype API",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc"
)

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(screenings.router, prefix=f"{settings.API_V1_STR}/screenings", tags=["Screenings"])


@app.get(f"{settings.API_V1_STR}/health")
async def health_check():
    """Healthcheck endpoint for monitoring and testing"""
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": "1.0.0"
    }


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """
    Catch-all exception handler to ensure raw traceback or internal secrets
    are never leaked to client responses (per FR-16, NFR-01).
    """
    logger.error(f"Unhandled exception on {request.method} {request.url.path}: {str(exc)}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "status": "failed",
            "message": "An unexpected error occurred while processing your request. Please try again later."
        }
    )
