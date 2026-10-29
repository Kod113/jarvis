// Riceve i dati Garmin dallo script notturno (GitHub Actions) e li salva.
// verify_jwt = false: autenticazione con l'header x-ingest-token (segreto JARVIS_INGEST_TOKEN).
import { admin, env } from '../_shared/google.ts';

const OWNER_EMAIL = 'davsorm@gmail.com';
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

function safeEqual(a: string, b: string) {
  if (!a || !b || a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

const HEALTH_COLS = ['day', 'sleep_minutes', 'sleep_score', 'deep_min', 'light_min', 'rem_min', 'awake_min', 'resting_hr', 'hrv', 'hrv_status',
  'body_battery_wake', 'body_battery_high', 'body_battery_low', 'stress_avg', 'steps', 'readiness', 'readiness_level'];
const ACT_COLS = ['id', 'start_time', 'day', 'type', 'name', 'duration_s', 'distance_m', 'avg_hr', 'max_hr', 'calories', 'aerobic_te', 'training_load', 'zones_s'];
const pick = (o: Record<string, unknown>, cols: string[]) => Object.fromEntries(cols.filter((c) => o[c] !== undefined).map((c) => [c, o[c]]));

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);
  if (!safeEqual(req.headers.get('x-ingest-token') || '', env('JARVIS_INGEST_TOKEN'))) return json({ error: 'unauthorized' }, 401);
  try {
    const db = admin();
    const { data: list, error: uErr } = await db.auth.admin.listUsers({ page: 1, perPage: 50 });
    if (uErr) throw uErr;
    const owner = list.users.find((u) => (u.email || '').toLowerCase() === OWNER_EMAIL);
    if (!owner) return json({ error: 'owner not found' }, 404);
    const body = await req.json();
    const days = (body.days || []).map((d: Record<string, unknown>) => ({ ...pick(d, HEALTH_COLS), user_id: owner.id, source: 'garmin', updated_at: new Date().toISOString() }));
    const acts = (body.activities || []).map((a: Record<string, unknown>) => ({ ...pick(a, ACT_COLS), user_id: owner.id, updated_at: new Date().toISOString() }));
    if (days.length) {
      const { error } = await db.from('health_daily').upsert(days, { onConflict: 'user_id,day' });
      if (error) throw error;
    }
    if (acts.length) {
      const { error } = await db.from('activities').upsert(acts, { onConflict: 'id' });
      if (error) throw error;
    }
    return json({ ok: true, days: days.length, activities: acts.length });
  } catch (e) {
    console.error(e);
    return json({ error: (e as Error).message }, 500);
  }
});
