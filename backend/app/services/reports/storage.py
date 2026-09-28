from typing import Dict
from app.services.reports.models import EarthObservationReport

# Minimal in-memory store for reports to allow PDF generation without re-running analysis
_report_store: Dict[str, EarthObservationReport] = {}

def save_report(report: EarthObservationReport):
    _report_store[report.metadata.report_id] = report

def get_report(report_id: str) -> EarthObservationReport | None:
    return _report_store.get(report_id)
