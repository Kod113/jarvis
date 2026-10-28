// API Google Calendar per l'app. Chiamata con supabase.functions.invoke('gcal', { body: { action, ... } }).
// Azioni: status, authUrl, events, syncTask, setCalendar, disconnect.
import { createClient } from 'npm:@supabase/supabase-js@2.117.2';
import { accessToken, admin, env, gfetch, makeState, REDIRECT_URI, refreshCalendars, SCOPES, SUPABASE_URL } from '../_shared/google.ts';

const cors = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
  'access-control-allow-methods': 'POST, OPTIONS'
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'content-type': 'application/json' } });

type Task = { id: string; title: string; due_date: string | null; due_time: string | null; gcal_event_id: string | null };

function plusMinutes(date: string, time: string, mins: number) {
  const [h, m] = time.split(':').map(Number);
  const total = Math.min(h * 60 + m + mins, 23 * 60 + 59);
  return `${date}T${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}:00`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const auth = req.headers.get('authorization') || '';
    const userDb = createClient(env('SUPABASE_URL') || SUPABASE_URL, env('SUPABASE_ANON_KEY'), { global: { headers: { authorization: auth } }, auth: { persistSession: false } });
    const { data: { user } } = await userDb.auth.getUser(auth.replace(/^Bearer\s+/i, ''));
    if (!user) return json({ error: 'Non autenticato' }, 401);
    const body = await req.json().catch(() => ({}));
    const db = admin();

    switch (body.action) {
      case 'status': {
        const configured = !!(env('GOOGLE_CLIENT_ID') && env('GOOGLE_CLIENT_SECRET'));
        const { data: tok } = await db.from('google_tokens').select('user_id').eq('user_id', user.id).maybeSingle();
        const { data: cals } = await db.from('calendars').select('calendar_id, summary, color, enabled, is_primary').eq('user_id', user.id).order('is_primary', { ascending: false });
        return json({ configured, connected: !!tok, calendars: cals || [] });
      }
      case 'authUrl': {
        if (!env('GOOGLE_CLIENT_ID')) return json({ error: 'Credenziali Google mancanti su Supabase' }, 400);
        const p = new URLSearchParams({
          client_id: env('GOOGLE_CLIENT_ID'),
          redirect_uri: REDIRECT_URI,
          response_type: 'code',
          scope: SCOPES.join(' '),
          access_type: 'offline',
          prompt: 'consent',
          include_granted_scopes: 'true',
          state: await makeState(user.id)
        });
        return json({ url: `https://accounts.google.com/o/oauth2/v2/auth?${p}` });
      }
      case 'events': {
        const token = await accessToken(user.id);
        const { data: cals } = await db.from('calendars').select('*').eq('user_id', user.id).eq('enabled', true);
        const out: unknown[] = [];
        await Promise.all((cals || []).map(async (c: { calendar_id: string; summary: string; color: string | null; is_primary: boolean }) => {
          const q = new URLSearchParams({ timeMin: body.from, timeMax: body.to, singleEvents: 'true', orderBy: 'startTime', maxResults: '500' });
          const r = await gfetch(token, `/calendars/${encodeURIComponent(c.calendar_id)}/events?${q}`);
          if (!r.ok) return;
          for (const e of r.json.items || []) {
            if (e.status === 'cancelled') continue;
            out.push({
              id: e.id,
              cal: c.calendar_id,
              calName: c.summary,
              color: c.color,
              primary: c.is_primary,
              title: e.summary || '(senza titolo)',
              start: e.start?.dateTime || e.start?.date,
              end: e.end?.dateTime || e.end?.date,
              allDay: !!e.start?.date,
              location: e.location || null,
              taskId: e.extendedProperties?.private?.jarvisTaskId || null
            });
          }
        }));
        return json({ events: out });
      }
      case 'syncTask': {
        // Crea / aggiorna / rimuove l'evento su Google per una task con data e ora.
        const { data: task } = await userDb.from('tasks').select('id, title, due_date, due_time, gcal_event_id').eq('id', body.taskId).maybeSingle() as { data: Task | null };
        if (!task) return json({ error: 'Task non trovata' }, 404);
        const token = await accessToken(user.id);
        const { data: prim } = await db.from('calendars').select('calendar_id').eq('user_id', user.id).eq('is_primary', true).maybeSingle();
        const calId = encodeURIComponent(prim?.calendar_id || 'primary');
        if (!task.due_date || !task.due_time) {
          if (task.gcal_event_id) {
            await gfetch(token, `/calendars/${calId}/events/${encodeURIComponent(task.gcal_event_id)}`, { method: 'DELETE' });
            await db.from('tasks').update({ gcal_event_id: null }).eq('id', task.id);
          }
          return json({ eventId: null });
        }
        const time = task.due_time.slice(0, 5);
        const event = {
          summary: task.title,
          start: { dateTime: `${task.due_date}T${time}:00`, timeZone: 'Europe/Rome' },
          end: { dateTime: plusMinutes(task.due_date, time, 30), timeZone: 'Europe/Rome' },
          extendedProperties: { private: { jarvisTaskId: task.id } }
        };
        let r = task.gcal_event_id
          ? await gfetch(token, `/calendars/${calId}/events/${encodeURIComponent(task.gcal_event_id)}`, { method: 'PATCH', body: JSON.stringify(event) })
          : null;
        if (!r || !r.ok) r = await gfetch(token, `/calendars/${calId}/events`, { method: 'POST', body: JSON.stringify(event) });
        if (!r.ok) return json({ error: 'Google ha rifiutato l\'evento' }, 502);
        await db.from('tasks').update({ gcal_event_id: r.json.id }).eq('id', task.id);
        return json({ eventId: r.json.id });
      }
      case 'setCalendar': {
        await db.from('calendars').update({ enabled: !!body.enabled }).eq('user_id', user.id).eq('calendar_id', body.calendarId);
        return json({ ok: true });
      }
      case 'refreshCalendars': {
        const token = await accessToken(user.id);
        return json({ calendars: await refreshCalendars(user.id, token) });
      }
      case 'disconnect': {
        await db.from('google_tokens').delete().eq('user_id', user.id);
        return json({ ok: true });
      }
      default:
        return json({ error: 'Azione sconosciuta' }, 400);
    }
  } catch (e) {
    const err = e as { message?: string; code?: string };
    console.error(e);
    return json({ error: err.message || 'Errore', code: err.code || null }, err.code === 'not_connected' ? 409 : 500);
  }
});
