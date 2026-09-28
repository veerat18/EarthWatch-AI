import logging
from fastapi import APIRouter, HTTPException, status, Response
from app.services.reports.models import ReportRequest, EarthObservationReport
from app.services.reports.generator import generate_earth_observation_report
from app.services.reports.storage import save_report, get_report
from app.services.reports.pdf_generator import generate_pdf_from_report

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

        report = EarthObservationReport(**response["report"])
        save_report(report)
        return report

    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"Error compiling Earth Observation report: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while compiling the Earth Observation report: {exc}"
        )

@router.get(
    "/reports/earth-observation/{report_id}/pdf",
    status_code=status.HTTP_200_OK,
    summary="Download Earth Observation Report as PDF",
    response_class=Response
)
async def download_earth_observation_report_pdf(report_id: str):
    """
    Download a server-generated PDF for an existing Earth Observation Report.
    """
    report = get_report(report_id)
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Report {report_id} not found."
        )

    try:
        pdf_bytes = generate_pdf_from_report(report)
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=EarthWatch_Earth_Observation_Report_{report_id}.pdf"
            }
        )
    except Exception as exc:
        logger.error(f"Error generating PDF for report {report_id}: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate PDF."
        )
