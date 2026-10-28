// Codice condiviso tra le funzioni Google (copiato in ogni funzione al deploy).
import { createClient } from 'npm:@supabase/supabase-js@2.117.2';

export const SUPABASE_URL = 'https://ywebxcgltxvxgqptjuxk.supabase.co';
export const APP_URL = 'https://kod113.github.io/jarvis/';
export const REDIRECT_URI = `${SUPABASE_URL}/functions/v1/google-oauth`;
export const SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.calendarlist.readonly'
];

export const env = (k: string) => Deno.env.get(k) ?? '';
export const admin = () => createClient(env('SUPABASE_URL') || SUPABASE_URL, env('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } });

const enc = new TextEncoder();
const b64url = (buf: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const fromB64url = (s: string) => atob(s.replace(/-/g, '+').replace(/_/g, '/'));

async function hmac(data: string) {
  const key = await crypto.subtle.importKey('raw', enc.encode(env('SUPABASE_SERVICE_ROLE_KEY')), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64url(await crypto.subtle.sign('HMAC', key, enc.encode(data)));
}

// "state" firmato: lega il ritorno da Google all'utente che ha avviato il collegamento.
export async function makeState(userId: string) {
  const payload = b64url(enc.encode(JSON.stringify({ u: userId, exp: Date.now() + 10 * 60 * 1000 })));
  return `${payload}.${await hmac(payload)}`;
}
export async function readState(state: string): Promise<string | null> {
  const [payload, sig] = (state || '').split('.');
  if (!payload || !sig || (await hmac(payload)) !== sig) return null;
  const { u, exp } = JSON.parse(fromB64url(payload));
  return Date.now() < exp ? u : null;
}

export async function tokenRequest(params: Record<string, string>) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: env('GOOGLE_CLIENT_ID'), client_secret: env('GOOGLE_CLIENT_SECRET'), ...params })
  });
  const json = await res.json();
  if (!res.ok) throw Object.assign(new Error(json.error_description || json.error || 'token error'), { code: json.error });
  return json as { access_token: string; expires_in: number; refresh_token?: string; scope?: string };
}

// Restituisce un access token valido, rinnovandolo se scaduto.
export async function accessToken(userId: string): Promise<string> {
  const db = admin();
  const { data: row } = await db.from('google_tokens').select('*').eq('user_id', userId).maybeSingle();
  if (!row) throw Object.assign(new Error('Google Calendar non collegato'), { code: 'not_connected' });
  if (row.access_token && row.expires_at && new Date(row.expires_at).getTime() > Date.now() + 60_000) return row.access_token;
  try {
    const t = await tokenRequest({ grant_type: 'refresh_token', refresh_token: row.refresh_token });
    await db.from('google_tokens').update({
      access_token: t.access_token,
      expires_at: new Date(Date.now() + t.expires_in * 1000).toISOString(),
      updated_at: new Date().toISOString()
    }).eq('user_id', userId);
    return t.access_token;
  } catch (e) {
    if ((e as { code?: string }).code === 'invalid_grant') {
      await db.from('google_tokens').delete().eq('user_id', userId);
      throw Object.assign(new Error('Collegamento scaduto: ricollega Google Calendar'), { code: 'not_connected' });
    }
    throw e;
  }
}

export async function gfetch(token: string, path: string, init: RequestInit = {}) {
  const res = await fetch(`https://www.googleapis.com/calendar/v3${path}`, {
    ...init,
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', ...(init.headers || {}) }
  });
  if (res.status === 204) return { ok: true, status: 204, json: null };
  const json = await res.json().catch(() => null);
  return { ok: res.ok, status: res.status, json };
}

// Aggiorna l'elenco dei calendari dell'utente (mantiene le scelte già fatte).
export async function refreshCalendars(userId: string, token: string) {
  const db = admin();
  const r = await gfetch(token, '/users/me/calendarList?minAccessRole=reader&maxResults=250');
  if (!r.ok) throw new Error('Impossibile leggere i calendari');
  const { data: existing } = await db.from('calendars').select('calendar_id, enabled').eq('user_id', userId);
  const known = new Map((existing || []).map((c: { calendar_id: string; enabled: boolean }) => [c.calendar_id, c.enabled]));
  const rows = (r.json.items || []).map((c: { id: string; summary: string; summaryOverride?: string; backgroundColor?: string; primary?: boolean }) => ({
    user_id: userId,
    calendar_id: c.id,
    summary: c.summaryOverride || c.summary,
    color: c.backgroundColor || null,
    is_primary: !!c.primary,
    enabled: known.has(c.id) ? known.get(c.id) : (!!c.primary || (c.summaryOverride || c.summary) === 'Famiglia')
  }));
  if (rows.length) await db.from('calendars').upsert(rows, { onConflict: 'user_id,calendar_id' });
  return rows;
}
