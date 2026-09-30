"""Cliente mínimo para la WhatsApp Business Cloud API (Meta)."""
from django.conf import settings
import requests

GRAPH_BASE = "https://graph.facebook.com"


def send_text_message(to: str, body: str) -> dict:
    """Envía un mensaje de texto simple. Devuelve la respuesta de la API."""
    if not settings.WHATSAPP_TOKEN or not settings.WHATSAPP_PHONE_NUMBER_ID:
        raise RuntimeError("Faltan WHATSAPP_TOKEN o WHATSAPP_PHONE_NUMBER_ID")

    url = f"{GRAPH_BASE}/{settings.WHATSAPP_API_VERSION}/{settings.WHATSAPP_PHONE_NUMBER_ID}/messages"
    payload = {
        "messaging_product": "whatsapp",
        "to": to,
        "type": "text",
        "text": {"body": body},
    }
    response = requests.post(
        url,
        json=payload,
        headers={"Authorization": f"Bearer {settings.WHATSAPP_TOKEN}"},
        timeout=15,
    )
    response.raise_for_status()
    return response.json()
