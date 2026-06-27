# A2 English Master V25 AI First Archive

Questa versione rende il Fill the Gap AI first e archivia tutto.

## Novità

- Eliminato database/cache/offline per Fill the Gap.
- Un solo flusso: Gemini genera il brano.
- Ogni esercizio generato viene salvato nell'archivio Supabase.
- Nuova sezione `📚 Archivio esercizi`.
- Puoi rivedere gli esercizi.
- Puoi rifarli.
- Puoi salvarli come preferiti.
- Dopo la correzione vengono salvati punteggio, risposte e tempo.

## Prima del deploy

Esegui in Supabase SQL Editor:

`SUPABASE_V25_SETUP.sql`

## Deploy

1. Carica tutto su GitHub.
2. Fai Redeploy su Vercel.
3. Fai hard refresh: `⌘ + Shift + R`.
4. Vai su Fill the Gap AI e premi `✨ Genera nuovo esercizio`.
5. Controlla `📚 Archivio esercizi`.
