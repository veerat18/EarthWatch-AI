import os
import httpx
from pydantic import BaseModel

CDSE_TOKEN_URL = "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token"

class CDSECredentials(BaseModel):
    client_id: str
    client_secret: str

def get_cdse_credentials() -> CDSECredentials | None:
    client_id = os.getenv("CDSE_CLIENT_ID")
    client_secret = os.getenv("CDSE_CLIENT_SECRET")
    if not client_id or not client_secret:
        return None
    return CDSECredentials(client_id=client_id, client_secret=client_secret)

async def get_cdse_token() -> str | None:
    creds = get_cdse_credentials()
    if not creds:
        return None

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                CDSE_TOKEN_URL,
                data={
                    "client_id": creds.client_id,
                    "client_secret": creds.client_secret,
                    "grant_type": "client_credentials"
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"}
            )
            if response.status_code == 200:
                data = response.json()
                return data.get("access_token")
            else:
                return None
    except Exception:
        return None
