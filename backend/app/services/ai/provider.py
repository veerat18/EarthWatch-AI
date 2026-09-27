import os
import json
import logging
from typing import Dict, Any
from google import genai
from google.genai import types
from app.services.ai.models import AIAnalystResponse
from app.services.analysis.models import AnalysisEvidence

logger = logging.getLogger(__name__)

SYSTEM_INSTRUCTION = """
You are EarthWatch AI, a geospatial analysis assistant.

You interpret only verified measurements supplied in the EarthWatch Analysis Evidence object.

You must:
- distinguish measurements from interpretation
- never invent data
- never invent locations, objects, causes, or events
- never claim certainty beyond the evidence
- use the supplied dates and statistics exactly
- explain NDVI vegetation-index change and NDWI spectral water-signal change in plain language
- clearly state analytical limitations
- distinguish vegetation-index and spectral water-signal change from confirmed real-world land-cover change
- treat NDWI as an analytical spectral water-signal index and NDWI change as spectral water-signal difference
- do not describe NDWI thresholds as machine-learning predictions
- do not assert that positive NDWI confirms open water or that negative change proves drought or water disappearance
- do not assert that positive change proves flooding or inundation
- acknowledge that cloud contamination, atmospheric variations, soil moisture, shadows, and seasonal conditions affect spectral reflectance
- prefer phrasing such as: "NDWI indicates a predominantly low spectral water signal in the analyzed window", "Approximately X% of analyzed pixels fall within the moderate water-signal gain category", "The observed NDWI change indicates a spectral difference between acquisitions"
- avoid unsupported causal claims like "Flooding occurred", "The river expanded", "The lake dried up", "Drought occurred", "Water disappeared"
- avoid unsupported causal explanations

If the evidence does not support an observation, say that it cannot be determined from the available evidence.
"""

class EarthAnalystProvider:
    def __init__(self):
        try:
            self.client = genai.Client()
        except Exception:
            self.client = None

    async def generate_analysis(self, evidence: AnalysisEvidence) -> Dict[str, Any]:
        if not self.client:
            try:
                self.client = genai.Client()
            except Exception:
                self.client = None

        if not self.client:
            return {"status": "error", "message": "AI ANALYST UNAVAILABLE (Missing API Key)"}
            
        prompt = f"Analyze the following EarthWatch Analysis Evidence:\n\n{evidence.model_dump_json()}"
        
        last_exc = None
        for attempt in range(3):
            try:
                response = self.client.models.generate_content(
                    model='gemini-3.8-flash',
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        system_instruction=SYSTEM_INSTRUCTION,
                        response_mime_type="application/json",
                        response_schema=AIAnalystResponse,
                    ),
                )
                
                # The response text will be a JSON string conforming to AIAnalystResponse
                data = json.loads(response.text)
                return {"status": "success", "analysis": data}
            except Exception as exc:
                last_exc = exc
                logger.warning(f"Gemini generation attempt {attempt + 1} failed: {exc}")
                if "503" in str(exc) or "UNAVAILABLE" in str(exc):
                    import asyncio
                    await asyncio.sleep(2 * (attempt + 1))
                    continue
                break
                
        logger.error(f"Error generating AI analysis: {last_exc}")
        return {"status": "error", "message": "AI ANALYST UNAVAILABLE (Provider Error)"}
