# Granny Square — Combinazioni Colori

Webapp (singolo file HTML, nessun build) per generare tutte le combinazioni possibili di colori per i giri di un granny square all'uncinetto, con un colore diverso per ogni giro.

## Funzioni
- Gestione colori RGB: aggiunta, modifica (picker colore + nome), eliminazione
- Attivazione/disattivazione temporanea di un colore: i giri si riducono di uno e le combinazioni si ricalcolano, ma i granny square già completati restano salvati
- Visualizzazione di tutte le permutazioni dei colori attivi come granny square con anelli concentrici
- Segnazione dei granny square completati
- Elenco dei completati anche con colori disattivati/eliminati
- Filtri (Tutte / Da fare / Completate), paginazione con numero di combinazioni per pagina scelto
- Tipografia Fraunces, interfaccia elegante
- **Memoria cloud opzionale** con Supabase: dati permanenti e sincronizzati tra dispositivi

## Uso (locale)
Apri `index.html` nel browser. I dati restano salvati nel browser (`localStorage`).

## Pubblicazione online con GitHub Pages
1. Questo repo è già su GitHub.
2. Apri <https://github.com/its-tweety/granny-square/settings/pages>
3. **Source → Deploy from a branch → branch `main` / root → Save**.
4. Dopo ~1 minuto la webapp sarà online su:
   <https://its-tweety.github.io/granny-square/>

## Memoria permanente con Supabase (opzionale)
Di default i dati sono salvati nel browser (`localStorage`): permanenti tra i refresh, ma non condivisi tra dispositivi e persi se svuoti i dati di navigazione. Per renderli permanenti e sincronizzati, usa Supabase (gratis).

### 1) Crea il progetto
1. Vai su <https://supabase.com>, registrati e crea un nuovo progetto (free).
2. Dal dashboard del progetto: **Project Settings → API**. Prendi nota di:
   - **Project URL** (es. `https://xxxxxxxx.supabase.co`)
   - **anon public key** (`eyJhbGciOi...`)

### 2) Crea la tabella
Apri **SQL Editor** nel progetto e incolla + esegui questo script:

```sql
create table if not exists granny_state (
  id text primary key,
  data jsonb,
  updated_at timestamptz default now()
);

-- Permette all'anon key di leggere/scrivere la riga (uso personale)
alter table granny_state enable row level security;
create policy "public read" on granny_state for select using (true);
create policy "public write" on granny_state for all using (true) with check (true);
```

### 3) Collega l'app
1. Apri la webapp, clicca sul pulsante **Cloud** in alto.
2. Inserisci **Project URL** e **anon / public key**.
3. Clicca **Connetti e sincronizza**. Il pallino diventa verde = connesso.

Da quel momento i tuoi colori e i completati sono salvati su Supabase. Le modifiche si sincronizzano automaticamente (con un piccolo debounce). Le credenziali restano **solo nel tuo browser** (non nel repo).

### Nota sulla sicurezza
La tabella sopra è pubblica in lettura/scrittura (semplice per uso personale). Se vuoi impedire ad altri di leggere/scrivere, sostituisci le policy con restrizioni più stringenti. Per un repo pubblico, in ogni caso l'anon key è considerata "pubblica" dal design di Supabase: la sicurezza dipende dalle **Row Level Security policies**, non dalla segretezza della chiave.
