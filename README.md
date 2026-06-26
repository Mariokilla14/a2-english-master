# A2 English Master V18 Gemini Stable

Questa versione stabilizza definitivamente la parte AI.

Novità:
- Nuovo helper unico `api/_gemini.js`
- Niente SDK Gemini vecchio
- Chiamate REST dirette alle API Gemini attuali
- Teacher AI stabile
- Fill the Gap AI stabile
- Email Library AI stabile
- Endpoint test: `/api/ai-health`
- Login Supabase, Admin Panel e Cloud mantenuti

## Prima del deploy

Controlla su Vercel:

- `GEMINI_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

Poi fai Redeploy con cache disattivata se possibile.

## Test rapido

Dopo il deploy apri:

`https://tuo-sito.vercel.app/api/ai-health`

Deve rispondere:

```json
{"ok":true,"modelUsed":"...","text":"OK"}
```

## Login iniziali

- `enjoy14` / `Carolina05!` → admin
- `quellistretti` / `Riccimerda!` → premium
- `utente` / `Smam` → basic
