# EarthWatch AI 🌍🛰️

**EarthWatch AI** is an AI-powered geospatial intelligence platform designed to ingest and analyze multi-temporal satellite imagery to detect, quantify, and visualize terrestrial changes across the planet (such as deforestation, urban expansion, water body shrinkage, and disaster impact).

---

## 📌 Status & Feature Matrix

To maintain production standards and disciplined development, this project is built incrementally step-by-step.

### ✅ Implemented (Foundation Phase)
- **Project Structure**: Clean modular repository layout for backend, frontend, models, datasets, notebooks, and scripts.
- **Backend Core**: FastAPI service with CORS middleware, configuration management, and health check endpoint.
- **Health Check Endpoint**: `GET /health` responding with service status and project identity.
- **Python Virtual Environment**: Dedicated isolated backend virtual environment (`backend/venv`).
- **Frontend Scaffolding**: React + Vite foundation for geospatial dashboard interfaces.
- **Git & Version Control**: Git repository initialized with comprehensive `.gitignore` for data, model weights, dependencies, and environments.

### ⏳ Planned Features (Future Phases)
- **Satellite Data Ingestion Pipeline**: Ingestion of Sentinel-2, Landsat, and Planet imagery APIs, STAC API integration.
- **Geospatial Processing Engine**: Cloud-Optimized GeoTIFF (COG) tiling, coordinate reference system (CRS) reprojecting, radiometric calibration, and band indices calculation (NDVI, NDWI, NBR).
- **Computer Vision & Preprocessing**: Coregistration, cloud masking, atmospheric correction, and patch extraction.
- **Change Detection Models**: Deep learning change detection models (e.g., Siamese U-Net, BIT / Bitemporal Image Transformer, ChangeFormer) to identify structural differences across bitemporal captures.
- **Interactive Geospatial Dashboard**: Interactive split-screen / slider map viewer (Mapbox GL JS / Deck.gl / Leaflet), layer toggles, and time-series animation.
- **Analytics & Reporting**: Automated change metric calculations (hectares affected, land cover transition matrices) and exportable PDF/GeoJSON reports.

---

## 🏗️ Architecture Overview

```
EarthWatch-AI/
├── backend/                # Python + FastAPI backend service
│   ├── app/
│   │   ├── api/            # API endpoints & routing (v1)
│   │   ├── core/           # Configuration, security, logging
│   │   ├── schemas/        # Pydantic data schemas
│   │   ├── services/       # Future: Geospatial, CV, & ML inference services
│   │   └── main.py         # Application entry point & health check
│   ├── requirements.txt    # Python dependencies
│   └── .env.example        # Environment variable template
├── frontend/               # React + Vite frontend client
│   ├── src/                # React source code & components
│   ├── package.json        # Frontend dependencies & scripts
│   └── vite.config.js      # Vite configuration
├── models/                 # Model architectures, weights, and export artifacts
├── datasets/               # Raw and processed satellite imagery and geo-annotations
├── notebooks/              # Jupyter notebooks for prototyping and research
├── scripts/                # Data pipelines, batch jobs, and evaluation scripts
├── reports/                # Generated analysis reports and verification outputs
├── .gitignore              # Production-grade gitignore rules
└── README.md               # Project documentation
```

### Planned Technical Architecture
1. **Frontend**: React, Vite, TailwindCSS (future), Deck.gl / MapLibre GL for high-performance WebGL tile rendering.
2. **Backend**: FastAPI, Uvicorn, Pydantic, Rasterio/GDAL (future), PyTorch (future).
3. **Data Layer**: Cloud-Optimized GeoTIFFs (COG), SpatioTemporal Asset Catalogs (STAC), GeoJSON.

---

## 💻 Technology Stack

| Layer | Technologies |
|---|---|
| **Backend** | Python 3.12, FastAPI, Uvicorn, Pydantic |
| **Frontend** | React, Vite, JavaScript / HTML5 / CSS3 |
| **Tooling & Env** | Git, Python venv, npm |
| **Future CV / Geospatial** | Rasterio, GDAL, Shapely, PyTorch, torchvision |
| **Future Mapping** | MapLibre GL / Deck.gl / Leaflet |

---

## 🚀 Setup & Getting Started

### Prerequisites
- Python 3.10+
- Node.js (v18+) & npm
- Git

---

### 1. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create Python virtual environment (if not already created)
python -m venv venv

# Activate virtual environment
# Windows (PowerShell):
.\venv\Scripts\Activate.ps1
# Windows (Command Prompt):
.\venv\Scripts\activate.bat
# Linux / macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start FastAPI development server
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Backend API will be accessible at:
- **Health Check**: `http://127.0.0.1:8000/health`
- **Interactive Swagger Docs**: `http://127.0.0.1:8000/docs`
- **Alternative ReDoc**: `http://127.0.0.1:8000/redoc`

#### Expected Health Check Response:
```json
{
  "status": "ok",
  "project": "EarthWatch AI"
}
```

---

### 2. Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install Node dependencies
npm install

# Start Vite development server
npm run dev
```

Frontend application will be accessible at `http://localhost:5173`.

---

## 📜 Development Guidelines

- Never commit satellite datasets, GeoTIFFs, or binary model weights to git (`.gitignore` is preconfigured).
- Keep all geospatial, computer vision, and machine learning components modular in `backend/app/services/`.
- Ensure tests and health checks pass before pushing new code.
