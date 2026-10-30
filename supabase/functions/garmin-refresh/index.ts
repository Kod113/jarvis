// Avvia su richiesta la sincronizzazione Garmin (workflow GitHub "garmin.yml").
// verify_jwt = false: autenticazione interna con il JWT dell'utente (solo il proprietario).
// Segreto: JARVIS_GITHUB_TOKEN = token GitHub "fine-grained" con permesso Actions: Read and write sul solo repo Kod113/jarvis.
import { admin, env } from '../_shared/google.ts';

const REPO = 'Kod113/jarvis';
const WORKFLOW = 'garmin.yml';
const cors = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
  'access-control-allow-methods': 'POST, OPTIONS'
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'content-type': 'application/json' } });

async function gh(path: string, init: RequestInit = {}) {
  const res = await fetch(`https://api.github.com/repos/${REPO}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${env('JARVIS_GITHUB_TOKEN')}`,
      accept: 'application/vnd.github+json',
      'x-github-api-version': '2022-11-28',
      'user-agent': 'jarvis',
      ...(init.headers || {})
    }
  });
  const body = res.status === 204 ? null : await res.json().catch(() => null);
  return { ok: res.ok, status: res.status, body };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const jwt = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
    const { data: { user } } = await admin().auth.getUser(jwt);
    if (!user || (user.email || '').toLowerCase() !== 'davsorm@gmail.com') return json({ error: 'Non autenticato' }, 401);
    if (!env('JARVIS_GITHUB_TOKEN')) return json({ status: 'not_configured' });

    const runs = await gh(`/actions/workflows/${WORKFLOW}/runs?per_page=5`);
    if (!runs.ok) return json({ status: 'error', error: `GitHub ${runs.status}` }, 502);
    const list = (runs.body?.workflow_runs || []) as { status: string; created_at: string; updated_at: string }[];
    const active = list.find((r) => r.status !== 'completed');
    if (active) return json({ status: 'running', since: active.created_at });
    const last = list[0];
    if (last && Date.now() - new Date(last.updated_at).getTime() < 3 * 60 * 1000) return json({ status: 'recent', at: last.updated_at });

    const body = await req.json().catch(() => ({}));
    const days = String(Math.min(7, Math.max(1, Number(body.days) || 2)));
    const d = await gh(`/actions/workflows/${WORKFLOW}/dispatches`, { method: 'POST', body: JSON.stringify({ ref: 'main', inputs: { days } }) });
    if (!d.ok) return json({ status: 'error', error: `GitHub ${d.status}` }, 502);
    return json({ status: 'started' });
  } catch (e) {
    console.error(e);
    return json({ status: 'error', error: (e as Error).message }, 500);
  }
});
