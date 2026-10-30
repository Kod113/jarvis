// Riceve una spesa dai Comandi Rapidi di iPhone (automazione "Transazione" del Wallet o "Ehi Siri, spesa").
// verify_jwt = false. Autenticazione: header x-jarvis-token (token creato da Jarvis, salvato in device_tokens solo come hash).
// Body JSON: { amount, merchant?, description?, category?, method? ("nfc" | "manual" | "online"), direction? ("in" | "out") }
import { admin, env, SUPABASE_URL } from '../_shared/google.ts';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
// Ogni risposta ha "message": è la frase che il Comando Rapido mostra nella notifica, anche in caso di errore.
const fail = (message: string, status: number, reason?: string) => { if (reason) console.warn('expense-ingest:', reason); return json({ ok: false, error: message, message }, status); };

async function sha256(s: string) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
}

// "€3,20", "3,20 €", "EUR 1.234,50", "1234.5", 3.2 → numero
export function parseAmount(v: unknown): number | null {
  if (typeof v === 'number') return isFinite(v) ? Math.abs(v) : null;
  let s = String(v ?? '').replace(/[^\d.,-]/g, '');
  if (!s) return null;
  const lastComma = s.lastIndexOf(','), lastDot = s.lastIndexOf('.');
  if (lastComma >= 0 && lastDot >= 0) {
    const dec = lastComma > lastDot ? ',' : '.';
    s = s.replace(dec === ',' ? /\./g : /,/g, '').replace(dec, '.');
  } else if (lastComma >= 0) {
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
    s = s.replace(/\./g, '');
  }
  const n = Math.abs(parseFloat(s));
  return isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null;
}

const clean = (v: unknown, max = 120) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

Deno.serve(async (req) => {
  if (req.method !== 'POST') return fail('Metodo sbagliato: nel comando imposta Metodo = POST', 405, 'metodo ' + req.method);
  try {
    // Toglie spazi, a capo e virgolette incollati per sbaglio insieme al codice.
    const token = (req.headers.get('x-jarvis-token') || '').replace(/[\s"'“”‘’]/g, '');
    if (!token) return fail('Manca il codice: aggiungi l\'intestazione x-jarvis-token', 401, 'intestazione assente');
    if (!token.startsWith('jv_')) return fail('Codice non valido: ricopialo da Jarvis → Spese → Spese dall\'iPhone', 401, `formato errato (lunghezza ${token.length})`);
    const db = admin();
    const { data: dev } = await db.from('device_tokens').select('id, user_id').eq('token_hash', await sha256(token)).maybeSingle();
    if (!dev) return fail('Codice non riconosciuto: creane uno nuovo in Jarvis e incollalo nel comando', 401, `codice sconosciuto (lunghezza ${token.length})`);

    const body = await req.json().catch(() => ({}));
    const amount = parseAmount(body.amount);
    if (!amount) return fail('Importo non valido: controlla il campo amount', 400, 'importo non valido');
    const merchant = clean(body.merchant);
    const description = clean(body.description) || merchant || 'Spesa';
    const category = clean(body.category, 40) || 'Da categorizzare';
    // Senza metodo è una spesa inserita a mano (l'automazione del POS manda sempre method = nfc).
    const method = ['nfc', 'manual', 'online'].includes(body.method) ? body.method : 'manual';
    // Entrata se lo dice il comando rapido o se la categoria è "Entrate" (es. bonifico ricevuto).
    const direction = body.direction === 'in' || category === 'Entrate' ? 'in' : 'out';

    const { data, error } = await db.from('expenses').insert({
      user_id: dev.user_id, amount, description, merchant: merchant || null, category, method, direction, source: 'jarvis'
    }).select('id').single();
    if (error) throw error;
    await db.from('device_tokens').update({ last_used_at: new Date().toISOString() }).eq('id', dev.id);

    // Manda subito la spesa anche su Notion (se configurato). Non blocca la risposta oltre pochi secondi.
    if (env('JARVIS_INGEST_TOKEN')) {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 8000);
      await fetch(`${SUPABASE_URL}/functions/v1/notion-sync`, {
        method: 'POST', signal: ctrl.signal,
        headers: { 'content-type': 'application/json', 'x-ingest-token': env('JARVIS_INGEST_TOKEN') },
        body: JSON.stringify({ action: 'sync' })
      }).catch(() => null);
      clearTimeout(timer);
    }
    return json({ ok: true, id: data.id, message: `${direction === 'in' ? 'Entrata salvata' : 'Salvata'}: €${amount.toFixed(2).replace('.', ',')} · ${category}` });
  } catch (e) {
    console.error(e);
    return json({ ok: false, error: (e as Error).message, message: 'Errore di Jarvis: ' + (e as Error).message }, 500);
  }
});
