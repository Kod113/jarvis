# Jarvis — istruzioni per Claude

Hub personale di David (task, spunti da smistare, spese, calendario, dati Garmin).
David chiede modifiche in linguaggio naturale: implementale, provale e pubblicale da solo, senza chiedere conferma,
tranne prima di cancellare dati dal database (avvisa sempre prima).

## Architettura
- **Frontend senza build**: `index.html`, `styles.css`, `app.js` (modulo ES). Servito da GitHub Pages dal branch `main`, cartella root.
  Ogni push su `main` = deploy in 1–2 minuti. Niente bundler, niente npm nel sito.
- **Backend**: Supabase, progetto `jarvis` (id `ywebxcgltxvxgqptjuxk`, regione eu-central-1, org "Mind").
  Tabelle `public.tasks`, `public.captures`, `public.expenses`, `public.health_daily`, tutte con RLS `user_id = auth.uid()`.
  Trigger `private.only_owner_signup` su `auth.users`: solo `davsorm@gmail.com` può registrarsi (e viene confermato subito).
- Edge Functions (sorgenti in `supabase/functions/`, deploy con `deploy_edge_function` includendo `../_shared/google.ts`):
  - `google-oauth` (verify_jwt **false**): ritorno OAuth da Google, salva i token in `google_tokens` (solo service role).
  - `gcal` (verify_jwt true): azioni `status`, `authUrl`, `events`, `syncTask`, `setCalendar`, `refreshCalendars`, `disconnect`.
  - Segreti su Supabase: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (li inserisce David). Calendari mostrati: tabella `calendars` (Personale + Famiglia).
  - Le task con data+ora diventano eventi sul calendario principale (`tasks.gcal_event_id`, `extendedProperties.private.jarvisTaskId`).
  - Notion Calendar legge Google Calendar: nessuna integrazione separata.
- Modifiche allo schema: sempre con una migration (`apply_migration`), poi `get_advisors` (security).
- Integrazioni (Notion, Garmin, Comandi Rapidi/Siri, Google Calendar, AI per "Decide Jarvis"): vanno come **Supabase Edge Functions**
  o **GitHub Actions** (cron). Le chiavi solo nei secret, mai nel codice. Il repo è pubblico.

## Stile
- Palette "Grafite e blu", token CSS in `:root` e `:root[data-theme="dark"]`. Tema scuro automatico da tramonto ad alba (Roma), `applyTheme()`.
- Layout Bento su telefono (barra in basso: Oggi · Settimana · Spese · Mente), su computer barra laterale + Calendario a pagina intera (≥1000px).
- Icona: D corsiva bianca tagliata su blu (giorno), stessa D su grafite (sera).
- Testi in italiano. Font Geist / Geist Mono.

## Come lavorare
1. Modifica i file.
2. Prova l'interfaccia con dati finti: `python3 tools/preview/run.py` (Playwright, intercetta supabase-js con `tools/preview/mock.js`,
   salva screenshot in `/tmp/jarvis-preview`). Guarda gli screenshot e controlla che non ci siano errori JS.
3. Commit con messaggio chiaro in italiano e push su `main`.
4. Rispondi a David con una riga su cosa è cambiato.

## Idee/roadmap (chieste da David)
- Spese: tasto "Invia a Notion" che ogni settimana manda le voci al database spese Notion già alimentato da Trade Republic.
- Comandi Rapidi iOS: automazione Wallet (pagamento NFC → nome, categoria, importo) e "Ehi Siri, Jarvis" per catturare a voce.
- Garmin: sync notturno di sonno, FC a riposo, HRV, allenamento del giorno in `health_daily`.
- Google Calendar: eventi e turni nel calendario; "Metti in calendario" crea l'evento.
- "Decide Jarvis": oggi smistamento a parole chiave (`classify()` in app.js); in futuro AI.
- Mente: da approfondire più avanti (libri sincronizzati con Notion, argomenti da studiare).
