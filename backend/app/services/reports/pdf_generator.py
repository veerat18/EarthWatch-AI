import io
from app.services.reports.models import EarthObservationReport
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib import colors

def generate_pdf_from_report(report: EarthObservationReport) -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=72, leftMargin=72, topMargin=72, bottomMargin=18)
    
    styles = getSampleStyleSheet()
    title_style = styles['Heading1']
    h2_style = styles['Heading2']
    h3_style = styles['Heading3']
    normal_style = styles['Normal']
    
    # Custom styles
    title_style.alignment = 1 # Center
    
    Story = []
    
    # Title
    Story.append(Paragraph("EARTHWATCH AI", title_style))
    Story.append(Paragraph("Earth Observation Report", title_style))
    Story.append(Spacer(1, 12))
    
    # Metadata
    Story.append(Paragraph(f"<b>Report ID:</b> {report.metadata.report_id}", normal_style))
    Story.append(Paragraph(f"<b>Generated At:</b> {report.metadata.generated_at}", normal_style))
    Story.append(Spacer(1, 12))
    
    # Section 1 - Executive Summary
    Story.append(Paragraph("1. Executive Summary", h2_style))
    Story.append(Paragraph(report.executive_summary.summary_text.replace('\n', '<br/>'), normal_style))
    Story.append(Spacer(1, 12))
    
    # Section 2 - Acquisition
    Story.append(Paragraph("2. Acquisition", h2_style))
    acq = report.acquisition
    data = [
        ["Before Scene ID", acq.before_scene_id],
        ["After Scene ID", acq.after_scene_id],
        ["Before Acquisition", acq.before_acquisition],
        ["After Acquisition", acq.after_acquisition],
        ["Observation Interval (Days)", str(acq.temporal_interval_days)],
        ["Tile ID", acq.tile],
        ["Spatial Window", f"X: {acq.analysis_window.get('x')} Y: {acq.analysis_window.get('y')} W: {acq.analysis_window.get('width')} H: {acq.analysis_window.get('height')}"],
        ["Resolution", f"{acq.resolution}m"],
        ["CRS", acq.crs],
        ["Before Cloud Cover", f"{acq.before_cloud_cover}%"],
        ["After Cloud Cover", f"{acq.after_cloud_cover}%"],
    ]
    t = Table(data, colWidths=[150, 300])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.white),
        ('GRID', (0,0), (-1,-1), 1, colors.black),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('FONTNAME', (0,0), (0,-1), 'Helvetica-Bold'),
    ]))
    Story.append(t)
    Story.append(Spacer(1, 12))
    
    # Section 3 - Methodology
    Story.append(Paragraph("3. Methodology", h2_style))
    Story.append(Paragraph("<b>NDVI Formula:</b> (B08 - B04) / (B08 + B04)", normal_style))
    Story.append(Paragraph("<b>NDWI Formula:</b> (B03 - B08) / (B03 + B08)", normal_style))
    Story.append(Paragraph("<b>Change Calculation:</b> After - Before", normal_style))
    Story.append(Paragraph("Classification thresholds are analytical rules and are not machine-learning predictions.", normal_style))
    Story.append(Spacer(1, 12))
    
    # Section 4 - Vegetation / NDVI
    Story.append(Paragraph("4. Vegetation / NDVI", h2_style))
    v = report.vegetation
    v_data = [
        ["Metric", "Before", "After", "Change"],
        ["Mean", f"{v.before_ndvi.mean:.4f}", f"{v.after_ndvi.mean:.4f}", f"{v.ndvi_change.mean:.4f}"],
        ["Median", f"{v.before_ndvi.median:.4f}", f"{v.after_ndvi.median:.4f}", f"{v.ndvi_change.median:.4f}"],
    ]
    vt = Table(v_data)
    vt.setStyle(TableStyle([('GRID', (0,0), (-1,-1), 1, colors.black)]))
    Story.append(vt)
    Story.append(Spacer(1, 6))
    for k, item in v.classifications.items():
        Story.append(Paragraph(f"<b>{k.replace('_', ' ').title()}:</b> {item.count} pixels ({item.percentage:.2f}%)", normal_style))
    Story.append(Spacer(1, 12))
    
    # Section 5 - Water Signal / NDWI
    Story.append(Paragraph("5. Water Signal / NDWI", h2_style))
    w = report.water_signal
    if w.available:
        w_data = [
            ["Metric", "Before", "After", "Change"],
            ["Mean", "N/A", f"{w.ndwi.mean:.4f}" if w.ndwi else "N/A", f"{w.ndwi_change.mean:.4f}" if w.ndwi_change else "N/A"],
        ]
        wt = Table(w_data)
        wt.setStyle(TableStyle([('GRID', (0,0), (-1,-1), 1, colors.black)]))
        Story.append(wt)
        Story.append(Spacer(1, 6))
        if w.change_classifications:
            for k, item in w.change_classifications.items():
                Story.append(Paragraph(f"<b>{k.replace('_', ' ').title()}:</b> {item.count} pixels ({item.percentage:.2f}%)", normal_style))
    else:
        Story.append(Paragraph(w.note or "NDWI analysis not available.", normal_style))
    Story.append(Paragraph("<i>Note: NDWI is a spectral water-signal indicator, not confirmed physical water detection.</i>", normal_style))
    Story.append(Spacer(1, 12))
    
    # Section 6 - Change Detection
    Story.append(Paragraph("6. Change Detection Summary", h2_style))
    cd = report.change_detection
    Story.append(Paragraph(cd.dynamics_summary, normal_style))
    Story.append(Spacer(1, 12))
    
    # Section 7 - AI Earth Analyst
    Story.append(Paragraph("7. AI Earth Analyst", h2_style))
    ai = report.ai_analysis
    Story.append(Paragraph(ai.summary if ai.summary else "AI Analyst unavailable.", normal_style))
    if ai.key_findings:
        for finding in ai.key_findings:
            Story.append(Paragraph(f"- {finding}", normal_style))
    Story.append(Spacer(1, 12))
    
    # Section 8 - Data Quality
    Story.append(Paragraph("8. Data Quality", h2_style))
    dq = report.data_quality
    Story.append(Paragraph(f"<b>Valid Pixels:</b> {dq.valid_pixels}", normal_style))
    Story.append(Paragraph(f"<b>NoData Pixels:</b> {dq.nodata_pixels}", normal_style))
    Story.append(Paragraph(f"<b>Cloud Cover Before:</b> {dq.cloud_cover_before}%", normal_style))
    Story.append(Paragraph(f"<b>Cloud Cover After:</b> {dq.cloud_cover_after}%", normal_style))
    Story.append(Spacer(1, 12))
    
    # Section 9 - Analytical Limitations
    Story.append(Paragraph("9. Analytical Limitations", h2_style))
    for lim in dq.limitations:
        Story.append(Paragraph(f"- {lim}", normal_style))
    Story.append(Spacer(1, 12))
    
    # Section 10 - Technical Metadata
    Story.append(Paragraph("10. Technical Metadata", h2_style))
    tm = report.technical_metadata
    Story.append(Paragraph(f"<b>Sensor:</b> {tm.sensor}", normal_style))
    Story.append(Paragraph(f"<b>Analysis Engine:</b> {tm.analysis_engine}", normal_style))
    Story.append(Paragraph(f"<b>STAC Catalog:</b> {tm.stac_catalog}", normal_style))
    
    doc.build(Story)
    pdf = buffer.getvalue()
    buffer.close()
    return pdf
