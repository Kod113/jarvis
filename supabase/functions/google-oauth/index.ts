// Ritorno da Google dopo il consenso: salva i token e torna all'app.
// verify_jwt = false: Google reindirizza il browser senza header di autenticazione; l'utente è identificato dallo "state" firmato.
import { admin, APP_URL, REDIRECT_URI, readState, refreshCalendars, tokenRequest } from '../_shared/google.ts';

const back = (status: string) => new Response(null, { status: 302, headers: { location: `${APP_URL}?google=${status}` } });

Deno.serve(async (req) => {
  const url = new URL(req.url);
  if (url.searchParams.get('error')) return back('denied');
  const code = url.searchParams.get('code');
  const userId = await readState(url.searchParams.get('state') || '');
  if (!code || !userId) return back('error');
  try {
    const t = await tokenRequest({ grant_type: 'authorization_code', code, redirect_uri: REDIRECT_URI });
    const db = admin();
    const { data: prev } = await db.from('google_tokens').select('refresh_token').eq('user_id', userId).maybeSingle();
    const refresh = t.refresh_token || prev?.refresh_token;
    if (!refresh) return back('error');
    await db.from('google_tokens').upsert({
      user_id: userId,
      refresh_token: refresh,
      access_token: t.access_token,
      expires_at: new Date(Date.now() + t.expires_in * 1000).toISOString(),
      scope: t.scope || null,
      updated_at: new Date().toISOString()
    });
    await refreshCalendars(userId, t.access_token);
    return back('ok');
  } catch (e) {
    console.error(e);
    return back('error');
  }
});
