import logging
from fastapi import APIRouter, HTTPException, status
from app.services.reports.models import ReportRequest, EarthObservationReport
from app.services.reports.generator import generate_earth_observation_report

logger = logging.getLogger(__name__)

router = APIRouter()

@router.post(
    "/reports/earth-observation",
    response_model=EarthObservationReport,
    status_code=status.HTTP_200_OK,
    summary="Generate Verified Earth Observation Analysis Report"
)
async def create_earth_observation_report(request: ReportRequest):
    """
    Generate a complete, structured Earth Observation analysis report
    based on verified canonical evidence and Gemini Earth Analyst findings.
    """
    try:
        response = await generate_earth_observation_report(request.model_dump())
        
        if response.get("status") == "auth_missing":
            raise HTTPException(
                status_code=status.HTTP_501_NOT_IMPLEMENTED,
                detail=response.get("message")
            )
        if response.get("status") == "auth_failure":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=response.get("message")
            )
        if response.get("status") == "error":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=response.get("message", "Failed to generate report")
            )
        if response.get("status") != "success" or "report" not in response:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Report generation encountered an unexpected state."
            )
            
        return EarthObservationReport(**response["report"])
        
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"Error compiling Earth Observation report: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while compiling the Earth Observation report: {exc}"
        )
