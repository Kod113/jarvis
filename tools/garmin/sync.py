"""Scarica da Garmin Connect sonno, parametri vitali e allenamenti e li manda a Jarvis.

Gira su GitHub Actions (vedi .github/workflows/garmin.yml). Variabili d'ambiente:
  GARMIN_PERSONAL_API_KEY          chiave dell'API ufficiale Garmin (sola lettura): sonno, HRV, FC, Body Battery, passi, allenamenti
  GARMIN_EMAIL, GARMIN_PASSWORD   credenziali Garmin per il metodo vecchio (libreria non ufficiale): solo Prontezza,
                                  e riserva completa se l'API ufficiale non risponde o non ha il sonno di un giorno
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


def iso_gmt(v):
    """Orario GMT di Garmin (stringa o millisecondi) → ISO con Z, oppure None."""
    if isinstance(v, (int, float)):
        from datetime import datetime, timezone
        return datetime.fromtimestamp(v / 1000, tz=timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    if isinstance(v, str) and v:
        v = v.replace(" ", "T").split(".")[0]
        return v if v.endswith("Z") else v + "Z"
    return None


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
    # Sonno durante il giorno (riposini): Garmin li dà a parte, in dailyNapDTOS (o come totale napTimeSeconds).
    naps = []
    for n in sleep.get("dailyNapDTOS") or s.get("dailyNapDTOS") or []:
        secs = n.get("napTimeSec") or n.get("napTimeSeconds")
        if not secs:
            continue
        st, en = n.get("napStartTimestampGMT"), n.get("napEndTimestampGMT")
        naps.append({"start": iso_gmt(st), "end": iso_gmt(en), "min": mins(secs)})
    nap_total = sum(n["min"] for n in naps) if naps else mins(s.get("napTimeSeconds"))
    if s:  # con i dati del sonno presenti, 0 = nessun riposino (così un riposino cancellato su Garmin sparisce)
        row["nap_minutes"] = nap_total or 0
        row["naps"] = naps
    for k in ("resting_hr", "hrv", "body_battery_wake", "body_battery_high", "body_battery_low", "steps", "readiness", "sleep_score"):
        if isinstance(row[k], float):
            row[k] = round(row[k])
    return {k: v for k, v in row.items() if v is not None or k == "day"}


def readiness_row(api, day):
    """Solo la Prontezza (Training Readiness), che l'API ufficiale non fornisce."""
    ready = safe(api.get_training_readiness, day.isoformat()) or []
    ready = ready[0] if isinstance(ready, list) and ready else (ready if isinstance(ready, dict) else {})
    row = {"day": day.isoformat(), "readiness": ready.get("score"), "readiness_level": ready.get("level")}
    if isinstance(row["readiness"], float):
        row["readiness"] = round(row["readiness"])
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


# ---------------------------------------------------------------------------------------------
# API ufficiale Garmin ("Personal API", sola lettura, chiave GARMIN_PERSONAL_API_KEY).
# I formati non sono documentati: i valori si cercano per nome del campo ovunque nel JSON.

def walk(obj):
    """Tutti i dizionari annidati in obj."""
    if isinstance(obj, dict):
        yield obj
        for v in obj.values():
            yield from walk(v)
    elif isinstance(obj, list):
        for v in obj:
            yield from walk(v)


def find(d, *names):
    """Primo valore numerico/stringa trovato tra i nomi indicati (anche a percorso 'a.b.c'), cercando in profondità."""
    for name in names:
        if "." in name:
            v = g(d, *name.split("."))
            if v is not None and not isinstance(v, (dict, list)):
                return v
            continue
        for x in walk(d):
            v = x.get(name)
            if v is not None and not isinstance(v, (dict, list, bool)):
                return v
    return None


def by_day(payload):
    """{giorno: record} dai riepiloghi giornalieri (il record più ricco vince)."""
    out = {}
    for x in walk(payload):
        day = x.get("calendarDate") or x.get("summaryDate")
        if isinstance(day, str) and len(day) >= 10:
            day = day[:10]
            if len(json.dumps(x, default=str)) > len(json.dumps(out.get(day, {}), default=str)):
                out[day] = x
    return out


def keys_of(payload, limit=60):
    """Solo i NOMI dei campi (mai i valori: il repo è pubblico), per capire i formati nei log."""
    ks = set()
    for x in walk(payload):
        ks.update(k for k, v in x.items() if not isinstance(v, (dict, list)))
    return ", ".join(sorted(ks)[:limit])


def official_data(key, start, end):
    """Giorni e allenamenti dall'API ufficiale. Ritorna ({giorno: riga}, [allenamenti]) oppure None."""
    try:
        from garmin_personal_api import GarminPersonalApiClient, PersonalApiAuthenticator
        auth = PersonalApiAuthenticator(bearer_token_cache_file=os.path.expanduser("~/.garmin-personal-token.json"))
        api = GarminPersonalApiClient(auth.obtain_token(key).access_token)
    except Exception as e:
        print(f"API ufficiale non disponibile ({type(e).__name__}): uso solo il metodo vecchio.")
        return None

    s, e_ = start.isoformat(), end.isoformat()
    daily = safe(api.get_daily_summaries, s, e_) or {}
    sleep = safe(api.get_daily_sleep_summaries, s, e_) or {}
    hrv = safe(api.get_daily_hrv_summaries, s, e_) or {}
    if os.environ.get("GARMIN_DEBUG_KEYS"):
        print("  campi sonno:", keys_of(sleep))
        print("  campi HRV:", keys_of(hrv))
    D, SL, H = by_day(daily), by_day(sleep), by_day(hrv)

    rows = {}
    for i in range((end - start).days + 1):
        day = (start + timedelta(days=i)).isoformat()
        d, sl, h = D.get(day) or {}, SL.get(day) or {}, H.get(day) or {}
        stress = find(d, "stress.avgLevel", "averageStressLevel")
        row = {
            "sleep_minutes": mins(find(sl, "sleepTimeSeconds", "durationInSeconds", "totalSleepSeconds")),
            "sleep_score": find(sl, "sleepScores.overall.value", "overallSleepScore", "sleepScore"),
            "deep_min": mins(find(sl, "deepSleepSeconds", "deepSleepDurationInSeconds")),
            "light_min": mins(find(sl, "lightSleepSeconds", "lightSleepDurationInSeconds")),
            "rem_min": mins(find(sl, "remSleepSeconds", "remSleepInSeconds")),
            "awake_min": mins(find(sl, "awakeSleepSeconds", "awakeDurationInSeconds")),
            "resting_hr": find(d, "heartRate.restingValue", "restingHeartRate", "restingHeartRateInBeatsPerMinute"),
            "hrv": find(h, "hrvSummary.lastNightAvg", "lastNightAvg", "lastNightAverage") or find(sl, "avgOvernightHrv"),
            "hrv_status": find(h, "hrvSummary.status", "status") or find(sl, "hrvStatus"),
            "body_battery_wake": find(d, "bodyBattery.atWakeValue", "bodyBatteryAtWakeTime"),
            "body_battery_high": find(d, "bodyBattery.maxValue", "bodyBatteryHighestValue"),
            "body_battery_low": find(d, "bodyBattery.minValue", "bodyBatteryLowestValue"),
            "stress_avg": stress if isinstance(stress, (int, float)) and stress >= 0 else None,
            "steps": find(d, "movement.steps.value", "totalSteps"),
        }
        rows[day] = {k: v for k, v in row.items() if v is not None}

    acts = []
    raw = safe(lambda: api.search_activities(start=0, limit=100, start_date=s, end_date=e_)) or []
    raw = raw if isinstance(raw, list) else (raw.get("activityList") or [])
    for a in raw:
        if a.get("activityId") and (a.get("startTimeLocal") or "")[:10] >= s:
            acts.append(activity_row(a))
    return rows, acts


def merge(old, new):
    """Riga del metodo vecchio + valori dell'API ufficiale (l'ufficiale vince dove c'è)."""
    out = dict(old)
    for k, v in new.items():
        if v is not None:
            out[k] = round(v) if isinstance(v, float) and k not in ("hrv_status",) else v
    return out


def legacy_api(email, password):
    """Accesso col metodo vecchio (libreria non ufficiale): serve per la Prontezza. None se non riesce."""
    if not (email and password):
        return None
    store = os.path.expanduser(os.environ.get("GARMINTOKENS", "~/.garminconnect"))
    os.makedirs(store, exist_ok=True)
    try:
        api = Garmin(email, password)
        status, _ = api.login(store)
        if status == "needs_mfa":
            print("Metodo vecchio: Garmin chiede la verifica a due fattori, salto la Prontezza.")
            return None
        try:
            api.client.dump(store)
        except Exception:
            pass
        return api
    except Exception as e:
        print(f"Metodo vecchio non disponibile ({type(e).__name__}): salto la Prontezza.")
        return None


def main():
    email, password = os.environ.get("GARMIN_EMAIL"), os.environ.get("GARMIN_PASSWORD")
    key = os.environ.get("GARMIN_PERSONAL_API_KEY")
    token = os.environ.get("JARVIS_INGEST_TOKEN")
    if not token or not (key or (email and password)):
        print("Mancano JARVIS_INGEST_TOKEN o le credenziali Garmin nei segreti del repo: salto.")
        return

    n = max(1, int(os.environ.get("GARMIN_DAYS") or 3))
    today = date.today()
    start = today - timedelta(days=n - 1)

    official = official_data(key, start, today) if key else None
    legacy = legacy_api(email, password)
    if official is None and legacy is None:
        sys.exit("Né l'API ufficiale né il metodo vecchio funzionano: controlla i segreti Garmin.")

    days, activities = [], []
    for i in range(n):
        day = today - timedelta(days=i)
        new = official[0].get(day.isoformat(), {}) if official else {}
        if legacy:
            # Con l'API ufficiale il metodo vecchio serve solo per la Prontezza; se all'ufficiale manca il sonno, fa da riserva completa.
            old = readiness_row(legacy, day) if new.get("sleep_minutes") else day_row(legacy, day)
        else:
            old = {"day": day.isoformat()}
        days.append(merge(old, new))

    if official:
        activities = official[1]
    if legacy and not activities:
        acts_raw = safe(legacy.get_activities_by_date, start.isoformat(), today.isoformat()) or []
        activities = [activity_row(a) for a in acts_raw if a.get("activityId")]

    src = " + ".join(x for x, ok in (("API ufficiale", official), ("metodo vecchio (Prontezza)", legacy)) if ok)
    filled = sum(1 for d in days if d.get("sleep_minutes"))
    ready = sum(1 for d in days if d.get("readiness") is not None)
    print(f"Fonti: {src}. Giorni con sonno: {filled}/{n}, con Prontezza: {ready}/{n}.")

    payload = json.dumps({"days": days, "activities": activities}).encode()
    req = urllib.request.Request(INGEST_URL, data=payload, method="POST",
                                 headers={"content-type": "application/json", "x-ingest-token": token})
    with urllib.request.urlopen(req, timeout=60) as r:
        res = json.loads(r.read())
    print(f"Inviati a Jarvis: {res.get('days')} giorni, {res.get('activities')} allenamenti.")


if __name__ == "__main__":
    main()
