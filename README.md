# Granny Square — Combinazioni Colori

Webapp per generare tutte le combinazioni cromatiche dei giri di un granny square all'uncinetto, con un colore per giro e gestione dei completati.

Questo branch (`public`) è la versione semplificata, senza backend: i dati restano nel browser e si possono trasferire tra dispositivi esportando/importando un file.

## Struttura del progetto

```
.
├── index.html          # markup, referenzia CSS e JS
├── assets/
│   ├── css/
│   │   └── style.css   # stili (palette, layout, responsive, componenti)
│   └── js/
│       └── app.js     # logica (stato, persistenza, permutazioni, i18n, render, import/export)
├── .gitignore
└── README.md
```

Nessun build, nessuna dipendenza locale: HTML statico + CSS + JS vanilla. Apri `index.html` nel browser o pubblica su GitHub Pages.

## Caratteristiche

- Colori RGB: aggiunta, modifica, eliminazione
- Attivazione/disattivazione temporanea dei colori: i giri si ricalcolano sui colori attivi, i completati restano salvati
- Combinazioni come permutazioni dei colori attivi, visualizzate a quadrati concentrici
- Registrazione dei granny square completati, anche con colori disattivati
- Filtri (tutti / da fare / completati) e paginazione configurabile
- Interfaccia bilingue IT/EN
- Esportazione/importazione dei dati su file (backup e trasferimento tra dispositivi)

## Memoria e trasferimento dati

I dati (colori e completati) sono salvati nel browser (`localStorage`). Per trasferirli su un altro dispositivo o farne un backup:

- **Esporta**: pulsante *Esporta* in alto a destra → scarica un file `granny-square-<data>.json`.
- **Importa**: pulsante *Importa* → seleziona un file `.json` esportato in precedenza. I dati correnti vengono sostituiti.

Il file è testo JSON leggibile; contiene colori, completati e identificativi.

## Pubblicazione (GitHub Pages)

1. <https://github.com/its-tweety/granny-square/settings/pages>
2. **Source → branch `public` / root → Save**
3. <https://its-tweety.github.io/granny-square/> (dal branch selezionato)
