# Granny Square — Combinazioni Colori

Webapp per generare tutte le combinazioni cromatiche dei giri di un granny square all'uncinetto, con un colore per giro e gestione dei completati.

## Caratteristiche

- Colori RGB: aggiunta, modifica, eliminazione
- Attivazione/disattivazione temporanea dei colori: i giri si ricalcolano sui colori attivi, i completati restano salvati
- Combinazioni come permutazioni dei colori attivi, visualizzate a quadrati concentrici
- Registrazione dei granny square completati, anche con colori disattivati
- Filtri (tutte / da fare / completate) e paginazione configurabile
- Sincronizzazione cloud opzionale via Supabase

## Sincronizzazione cloud (Supabase)

Per dati permanenti e condivisi tra dispositivi.

### 1. Progetto

Crea un progetto su [supabase.com](https://supabase.com), quindi in **Project Settings → API** copia **Project URL** e **Publishable key** (l'anon key).

### 2. Tabella

In **SQL Editor**, esegui:

```sql
create table if not exists granny_state (
  id text primary key,
  data jsonb,
  updated_at timestamptz default now()
);

alter table granny_state enable row level security;
create policy "public read"  on granny_state for select using (true);
create policy "public write" on granny_state for all    using (true) with check (true);
```

### 3. Connessione

Nell'app, pulsante **Cloud**: inserisci Project URL e Publishable key, quindi **Connetti**. Le modifiche si sincronizzano automaticamente; le credenziali restano nel browser.
