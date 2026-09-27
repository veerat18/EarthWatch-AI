from pydantic import BaseModel
from typing import List, Optional

class AIAnalystResponse(BaseModel):
    summary: str
    key_findings: List[str]
    vegetation_assessment: str
    water_signal_assessment: Optional[str] = None
    change_assessment: str
    confidence_note: str
    limitations: List[str]
