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
  - `gcal` (verify_jwt false, autenticazione interna con getUser): azioni `status`, `authUrl`, `events`, `syncTask`, `setCalendar`, `refreshCalendars`, `disconnect`.
  - Segreti su Supabase: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (li inserisce David). Calendari mostrati: tabella `calendars` (Personale + Famiglia).
  - Le task con data+ora diventano eventi sul calendario principale (`tasks.gcal_event_id`, `extendedProperties.private.jarvisTaskId`).
  - Notion Calendar legge Google Calendar: nessuna integrazione separata.
- Garmin: `.github/workflows/garmin.yml` (5 volte al giorno + manuale + push su `tools/garmin/**`, al push sincronizza 30 giorni) esegue
  `tools/garmin/sync.py` (libreria non ufficiale `garminconnect`), che invia a `garmin-ingest` (verify_jwt false, header `x-ingest-token` =
  segreto `JARVIS_INGEST_TOKEN`). Tabelle `health_daily` (sonno, FC, HRV, Body Battery, prontezza, passi) e `activities`.
  Segreti GitHub: `GARMIN_EMAIL`, `GARMIN_PASSWORD`, `JARVIS_INGEST_TOKEN`. Token Garmin in cache cifrati (repo pubblico: mai stampare dati).
  Per rilanciare la sync senza token gh: aggiorna `tools/garmin/LAST_TRIGGER` e fai push.
  Sync su richiesta: funzione `garmin-refresh` (verify_jwt false, solo il proprietario) avvia `workflow_dispatch` con il segreto Supabase
  `JARVIS_GITHUB_TOKEN` (PAT fine-grained, Actions read/write sul solo repo). L'app la chiama da sola al mattino (4–14) se manca il sonno
  di oggi (max ogni 20 min) e con il pulsante ↻ nella scheda Corpo. I cron di GitHub possono ritardare di ore: non fidarsi solo di quelli.
- Spese ↔ Notion: funzione `notion-sync` (verify_jwt false; JWT del proprietario o `x-ingest-token`). Segreto Supabase `NOTION_TOKEN`
  (integrazione interna con accesso a Soldi / Budgeting, id `91d155375a2c4515870b57efc3256b72`). Struttura Notion: Budgeting / <anno> / <Mese> con
  database inline "<Mese> <anno>" (Motivo title, Date, euro: negativo = uscita, Category multi_select). Mese finanziario dal 27 al 26, chiamato col
  mese in cui finisce (`expenses.month_key` 'YYYY-MM', trigger `financial_month`). La sync crea il database del mese se manca, invia le spese Jarvis
  (`source='jarvis'`, `notion_page_id` null), importa/aggiorna mese corrente e precedente e lo storico (`notion_months.imported_at`).
  Righe cancellate su Notion spariscono da Jarvis. Per lanciarla senza token gh: aggiorna `tools/notion/LAST_TRIGGER` e fai push. Workflow `.github/workflows/notion.yml` 2 volte al giorno; l'app sincronizza aprendo Spese.
- Spese da iPhone: funzione `expense-ingest` (verify_jwt false, header `x-jarvis-token`; i token stanno in `device_tokens` solo come sha256,
  creati con RPC `create_device_token`; la scheda "Spese dall'iPhone" per crearli è stata tolta su richiesta di David: se serve un codice nuovo, rimetterla). Body: amount (accetta "€3,20"), merchant,
  description, category, method (nfc/manual/online). Dopo l'inserimento chiama `notion-sync`. Due Comandi Rapidi costruiti a mano da David:
  automazione Wallet "Transazione" (Per cosa? → Categoria?) e scorciatoia "Spesa manuale" (Quanto? → Per cosa? → Categoria?).
  Su iPhone/iPad il pulsante "Aggiungi spesa" apre il comando "Spesa manuale" (`shortcuts://run-shortcut?name=Spesa%20manuale`); sul computer apre il modulo nell'app.
  Tetti mensili per categoria: `CAT_CAP` in app.js (solo Benza, Cibo, Spesa, Shopping, Fun, Yugi, Abbonamenti, Formazione; le altre senza tetto).
  Budget del mese = somma dei tetti, modificabile per singolo mese (localStorage `budget:YYYY-MM`). Categorie Università, Svapo, Giorgia tolte (restano nello storico).
  Movimenti: icona della categoria (`CAT_PATHS` in app.js), riquadro blu = Apple Pay, verde = entrata.
  Entrate: categoria "Entrate" (o `direction: "in"`). Ogni risposta di `expense-ingest` ha `message`, mostrato nella notifica del comando.
- Modifiche allo schema: sempre con una migration (`apply_migration`), poi `get_advisors` (security).
- Integrazioni (Notion, Garmin, Comandi Rapidi/Siri, Google Calendar, AI per "Decide Jarvis"): vanno come **Supabase Edge Functions**
  o **GitHub Actions** (cron). Le chiavi solo nei secret, mai nel codice. Il repo è pubblico.

## Stile
- Palette "Grafite e blu", token CSS in `:root` e `:root[data-theme="dark"]`. Tema scuro automatico da tramonto ad alba (Roma), `applyTheme()`.
  Pulsante sole/luna (`themeBtnHtml`, azione `toggleTheme`): sempre per primo in alto a destra (telefono e computer); forza il tema
  fino al prossimo tramonto/alba (`themeOverride` in localStorage), transizione a cerchio con View Transitions.
- Layout Bento su telefono (barra in basso: Oggi · Settimana · Spese · Mente), su computer barra laterale + Calendario a pagina intera (≥1000px).
- Icona: J corsiva bianca tagliata (stile "J1") su blu di giorno, su grafite di sera.
- Allenamenti: corsa = icona omino (azzurro), tutto il resto = "Forza" con icona bilanciere (scelta di David).
- Barra in basso (telefono): pillola arrotondata come la cattura, indicatore che scivola (`--i`), si può trascinare col dito tra le sezioni;
  la sezione entra con un'animazione laterale. Con la tastiera aperta la cattura sale sopra la tastiera (`visualViewport`, classe `kb-open`);
  toccando fuori dalla barra mentre scrivi salva e chiude la tastiera (tag, invio e microfono non salvano).
- Spunti: tag Task, Frase, Idea; senza tag decide Jarvis (nessun pulsante, i tag si deselezionano). Nella Mente ogni voce ha "To-do"
  (azione `toTodo`) che la trasforma in task di oggi. ("Da studiare" tolto su richiesta di David: confluisce in Idea; `studio` resta solo per dati vecchi).
- Zoom disattivato su telefono (viewport, `touch-action: manipulation`, blocco gesture iOS, campi a 16px) per non rompere le animazioni.
- Cache: `index.html` carica `styles.css?v=…` e `app.js?v=…`: aggiorna la versione a ogni modifica del frontend, sennò l'iPhone resta sulla vecchia.
- Testi in italiano. Font Geist / Geist Mono.

## Come lavorare
1. Modifica i file.
2. Prova l'interfaccia con dati finti: `python3 tools/preview/run.py` (Playwright, intercetta supabase-js con `tools/preview/mock.js`,
   salva screenshot in `/tmp/jarvis-preview`). Guarda gli screenshot e controlla che non ci siano errori JS.
3. Commit con messaggio chiaro in italiano e push su `main`.
4. Rispondi a David con una riga su cosa è cambiato.

## Idee/roadmap (chieste da David)
- Comandi Rapidi iOS: "Ehi Siri, Jarvis" per catturare spunti/task a voce (le spese sono già fatte).
- Google Calendar: eventi e turni nel calendario; "Metti in calendario" crea l'evento.
- "Decide Jarvis": oggi smistamento a parole chiave (`classify()` in app.js; nel dubbio è una task); in futuro AI.
- Settimana: al posto del contatore task fatte (tolto) un blocco utile da decidere: idee proposte turni della settimana, allenamenti, sonno medio.
- Mente: da approfondire più avanti (libri sincronizzati con Notion, argomenti da studiare).
