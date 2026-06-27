# A2 English Master V24 Gemini Only FillGap

Questa versione elimina il sistema database/offline per il Fill the Gap.

Ora il bottone:
- Genera esercizio
- Brano Cambridge AI
- Genera con Gemini

chiama direttamente:

`POST /api/fillgap`

e crea un brano coerente con Gemini.

## Cosa cambia

- niente database FillGap;
- niente banca offline;
- niente bottoni che non fanno nulla;
- chiamata diretta a Gemini come nelle vecchie versioni;
- brano unico coerente stile Cambridge;
- 30 gap;
- 4 opzioni;
- spiegazioni grammaticali.

## Deploy

1. Carica tutto su GitHub sostituendo i vecchi file.
2. Fai Redeploy su Vercel.
3. Sul sito fai hard refresh: `⌘ + Shift + R`.
4. Apri Network e premi `✨ Genera con Gemini`: deve comparire `POST /api/fillgap`.
