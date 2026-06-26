# A2 English Master V19 Gemini 3 Preview Fix

Questa versione aggiorna la parte AI per usare il modello indicato da Google AI Studio:

- `gemini-3-flash-preview`

Include:
- Login Supabase
- Admin Panel
- Cloud
- Teacher AI
- Fill the Gap AI
- AI Email Library
- API Gemini tramite SDK `@google/genai`

## Variabili Vercel richieste

- `GEMINI_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

## Dopo il deploy

Apri:

`https://a2-english-master.vercel.app/api/ai-health`

Se tutto è corretto deve rispondere con `OK`.
