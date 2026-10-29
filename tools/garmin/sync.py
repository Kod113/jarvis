"""Scarica da Garmin Connect sonno, parametri vitali e allenamenti e li manda a Jarvis.

Gira su GitHub Actions (vedi .github/workflows/garmin.yml). Variabili d'ambiente:
  GARMIN_EMAIL, GARMIN_PASSWORD   credenziali Garmin (segreti del repo)
  JARVIS_INGEST_TOKEN              token condiviso con la funzione Supabase garmin-ingest
  GARMIN_DAYS                      quanti giorni indietro sincronizzare (default 3)
  GARMINTOKENS                     cartella dove salvare i token di accesso (cache tra un'esecuzione e l'altra)

Il repo è pubblico: lo script NON stampa mai i dati di salute, solo conteggi.
"""
import json
import os
import sys
import urllib.request
from datetime import date, timedelta

from garminconnect import Garmin

INGEST_URL = "https://ywebxcgltxvxgqptjuxk.supabase.co/functions/v1/garmin-ingest"


def g(d, *path, default=None):
    """Legge un valore annidato senza errori (dict/list)."""
    for p in path:
        if isinstance(d, dict):
            d = d.get(p)
        elif isinstance(d, list) and isinstance(p, int) and len(d) > p:
            d = d[p]
        else:
            return default
        if d is None:
            return default
    return d


def mins(seconds):
    return round(seconds / 60) if isinstance(seconds, (int, float)) else None


def safe(fn, *args):
    try:
        return fn(*args)
    except Exception as e:  # una metrica mancante non deve fermare tutto
        print(f"  - {fn.__name__}: non disponibile ({type(e).__name__})")
        return None


def day_row(api, day):
    d = day.isoformat()
    sleep = safe(api.get_sleep_data, d) or {}
    s = sleep.get("dailySleepDTO") or {}
    summary = safe(api.get_user_summary, d) or {}
    hrv = safe(api.get_hrv_data, d) or {}
    ready = safe(api.get_training_readiness, d) or []
    ready = ready[0] if isinstance(ready, list) and ready else (ready if isinstance(ready, dict) else {})
    row = {
        "day": d,
        "sleep_minutes": mins(s.get("sleepTimeSeconds")),
        "sleep_score": g(s, "sleepScores", "overall", "value"),
        "deep_min": mins(s.get("deepSleepSeconds")),
        "light_min": mins(s.get("lightSleepSeconds")),
        "rem_min": mins(s.get("remSleepSeconds")),
        "awake_min": mins(s.get("awakeSleepSeconds")),
        "resting_hr": summary.get("restingHeartRate") or sleep.get("restingHeartRate"),
        "hrv": g(hrv, "hrvSummary", "lastNightAvg") or sleep.get("avgOvernightHrv"),
        "hrv_status": g(hrv, "hrvSummary", "status") or sleep.get("hrvStatus"),
        "body_battery_wake": summary.get("bodyBatteryAtWakeTime"),
        "body_battery_high": summary.get("bodyBatteryHighestValue"),
        "body_battery_low": summary.get("bodyBatteryLowestValue"),
        "stress_avg": summary.get("averageStressLevel") if (summary.get("averageStressLevel") or -1) >= 0 else None,
        "steps": summary.get("totalSteps"),
        "readiness": ready.get("score"),
        "readiness_level": ready.get("level"),
    }
    for k in ("resting_hr", "hrv", "body_battery_wake", "body_battery_high", "body_battery_low", "steps", "readiness", "sleep_score"):
        if isinstance(row[k], float):
            row[k] = round(row[k])
    return {k: v for k, v in row.items() if v is not None or k == "day"}


def activity_row(a):
    start_local = a.get("startTimeLocal") or ""
    zones = [a.get(f"hrTimeInZone_{i}") for i in range(1, 6)]
    return {
        "id": a.get("activityId"),
        "start_time": (a.get("startTimeGMT") or start_local).replace(" ", "T") + ("Z" if a.get("startTimeGMT") else ""),
        "day": start_local[:10],
        "type": g(a, "activityType", "typeKey"),
        "name": a.get("activityName"),
        "duration_s": round(a["duration"]) if a.get("duration") else None,
        "distance_m": round(a["distance"], 1) if a.get("distance") else None,
        "avg_hr": round(a["averageHR"]) if a.get("averageHR") else None,
        "max_hr": round(a["maxHR"]) if a.get("maxHR") else None,
        "calories": round(a["calories"]) if a.get("calories") else None,
        "aerobic_te": round(a["aerobicTrainingEffect"], 1) if a.get("aerobicTrainingEffect") else None,
        "training_load": round(a["activityTrainingLoad"], 1) if a.get("activityTrainingLoad") else None,
        "zones_s": [round(z) if z else 0 for z in zones] if any(zones) else None,
    }


def main():
    email, password = os.environ.get("GARMIN_EMAIL"), os.environ.get("GARMIN_PASSWORD")
    token = os.environ.get("JARVIS_INGEST_TOKEN")
    if not (email and password and token):
        print("Mancano GARMIN_EMAIL, GARMIN_PASSWORD o JARVIS_INGEST_TOKEN nei segreti del repo: salto.")
        return
    store = os.path.expanduser(os.environ.get("GARMINTOKENS", "~/.garminconnect"))
    os.makedirs(store, exist_ok=True)

    api = Garmin(email, password)
    status, _ = api.login(store)
    if status == "needs_mfa":
        sys.exit("Garmin chiede il codice di verifica a due fattori: serve la configurazione MFA (vedi CLAUDE.md).")
    try:
        api.client.dump(store)
    except Exception:
        pass

    n = max(1, int(os.environ.get("GARMIN_DAYS") or 3))
    today = date.today()
    days = [day_row(api, today - timedelta(days=i)) for i in range(n)]
    acts_raw = safe(api.get_activities_by_date, (today - timedelta(days=n - 1)).isoformat(), today.isoformat()) or []
    activities = [activity_row(a) for a in acts_raw if a.get("activityId")]

    payload = json.dumps({"days": days, "activities": activities}).encode()
    req = urllib.request.Request(INGEST_URL, data=payload, method="POST",
                                 headers={"content-type": "application/json", "x-ingest-token": token})
    with urllib.request.urlopen(req, timeout=60) as r:
        res = json.loads(r.read())
    print(f"Inviati a Jarvis: {res.get('days')} giorni, {res.get('activities')} allenamenti.")


if __name__ == "__main__":
    main()
