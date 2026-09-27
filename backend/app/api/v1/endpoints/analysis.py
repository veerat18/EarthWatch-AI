from fastapi import APIRouter, HTTPException, status
from app.services.analysis.models import (
    NDVIRequest,
    NDVIResponse,
    NDWIRequest,
    NDWIResponse,
    NDWIChangeRequest,
    NDWIChangeDetectionResponse,
    ChangeDetectionRequest,
    ChangeDetectionResponse,
    AnalysisEvidence,
)
from app.services.analysis.ndvi import calculate_ndvi
from app.services.analysis.ndwi import calculate_ndwi
from app.services.analysis.ndwi_change import calculate_ndwi_change_detection
from app.services.analysis.change_detection import calculate_change_detection
from app.services.analysis.evidence import generate_analysis_evidence

router = APIRouter()

@router.post(
    "/analysis/ndvi",
    response_model=NDVIResponse,
    status_code=status.HTTP_200_OK,
    summary="Calculate NDVI",
    description="Calculate NDVI for a specific window of a Sentinel-2 scene.",
)
async def process_ndvi(request: NDVIRequest):
    """
    Returns NDVI statistics and classification for the requested raster window.
    """
    try:
        response = await calculate_ndvi(
            scene_id=request.scene_id,
            x=request.x,
            y=request.y,
            width=request.width,
            height=request.height
        )
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
                status_code=status.HTTP_404_NOT_FOUND if "unavailable" in response.get("message", "") else status.HTTP_400_BAD_REQUEST,
                detail=response.get("message")
            )
        return NDVIResponse(**response)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while calculating NDVI."
        )

@router.post(
    "/analysis/ndwi",
    response_model=NDWIResponse,
    status_code=status.HTTP_200_OK,
    summary="Calculate NDWI",
    description="Calculate NDWI (Normalized Difference Water Index) for a specific window of a Sentinel-2 scene.",
)
async def process_ndwi(request: NDWIRequest):
    """
    Returns NDWI statistics and water classifications for the requested raster window.
    """
    try:
        response = await calculate_ndwi(
            scene_id=request.scene_id,
            x=request.x,
            y=request.y,
            width=request.width,
            height=request.height
        )
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
                status_code=status.HTTP_404_NOT_FOUND if "unavailable" in response.get("message", "") or "not found" in response.get("message", "").lower() else status.HTTP_400_BAD_REQUEST,
                detail=response.get("message")
            )
        return NDWIResponse(**response)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while calculating NDWI: {exc}"
        )

@router.post(
    "/analysis/change-detection",
    response_model=ChangeDetectionResponse,
    status_code=status.HTTP_200_OK,
    summary="Calculate NDVI Change Detection"
)
async def process_change_detection(request: ChangeDetectionRequest):
    try:
        response = await calculate_change_detection(
            before_scene_id=request.before_scene_id,
            after_scene_id=request.after_scene_id,
            x=request.x,
            y=request.y,
            width=request.width,
            height=request.height
        )
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
                detail=response.get("message")
            )
        return ChangeDetectionResponse(**response)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while calculating change detection."
        )

@router.post(
    "/analysis/ndwi-change",
    response_model=NDWIChangeDetectionResponse,
    status_code=status.HTTP_200_OK,
    summary="Calculate NDWI Change Detection"
)
async def process_ndwi_change_detection(request: NDWIChangeRequest):
    try:
        response = await calculate_ndwi_change_detection(
            before_scene_id=request.before_scene_id,
            after_scene_id=request.after_scene_id,
            x=request.x,
            y=request.y,
            width=request.width,
            height=request.height
        )
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
                detail=response.get("message")
            )
        return NDWIChangeDetectionResponse(**response)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while calculating NDWI change detection: {exc}"
        )

@router.post(
    "/analysis/evidence",
    response_model=AnalysisEvidence,
    status_code=status.HTTP_200_OK,
    summary="Generate Verified Analysis Evidence"
)
async def process_analysis_evidence(request: ChangeDetectionRequest):
    try:
        response = await generate_analysis_evidence(request.dict())
        
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
                detail=response.get("message")
            )
        return AnalysisEvidence(**response)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while generating analysis evidence: {exc}"
        )

from app.services.ai.models import AIAnalystResponse
from app.services.ai.provider import EarthAnalystProvider

ai_provider = EarthAnalystProvider()

@router.post(
    "/analysis/ai-analyst",
    response_model=AIAnalystResponse,
    status_code=status.HTTP_200_OK,
    summary="Generate AI Earth Analyst interpretation"
)
async def process_ai_analyst(request: ChangeDetectionRequest):
    try:
        evidence_resp = await generate_analysis_evidence(request.dict())
        
        if evidence_resp.get("status") != "success":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="VERIFIED EVIDENCE COULD NOT BE GENERATED"
            )
            
        evidence_obj = AnalysisEvidence(**evidence_resp)
        ai_resp = await ai_provider.generate_analysis(evidence_obj)
        
        if ai_resp.get("status") != "success":
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=ai_resp.get("message", "AI ANALYST UNAVAILABLE")
            )
            
        return AIAnalystResponse(**ai_resp["analysis"])
        
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI ANALYST UNAVAILABLE"
        )
