# A2 English Master V13 Solid FillGap

Questa versione rifà la logica del Fill the Gap in modo solido.

## Correzione senza bug

Prima il sito confrontava stringhe tipo:
- `A. for`
- `for`
- `A`

e poteva segnare sbagliata una risposta corretta.

Ora ogni domanda usa:

```json
{
  "options": ["for","to","at","with"],
  "correctIndex": 0
}
```

Il menu salva solo un numero: 0, 1, 2 o 3.

Quindi la correzione è:
`selectedIndex === correctIndex`

## Include

- generazione Gemini di brani Cambridge coerenti;
- 30 gap;
- 4 opzioni;
- correctIndex numerico;
- spiegazioni;
- archivio locale;
- tentativo di archivio cloud Supabase;
- rifai esercizio dall'archivio;
- progress bar.

## Deploy

1. Carica tutto su GitHub.
2. Se non lo hai già fatto, esegui in Supabase `SUPABASE_V13_SETUP.sql`.
3. Fai Redeploy su Vercel.
4. Apri in finestra privata oppure svuota cache.
