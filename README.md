# A2 English Master V6 AI Vercel

Questa versione contiene:
- frontend statico
- correzione offline
- progressi
- Teacher AI tramite Vercel Serverless Function `/api/correct`

## Come attivare Teacher AI

1. Carica tutto su GitHub.
2. Vai su Vercel.
3. Importa la repository.
4. In Vercel vai su Settings → Environment Variables.
5. Aggiungi:

```text
OPENAI_API_KEY = la tua chiave OpenAI
```

6. Fai Redeploy.
7. Apri il link Vercel, non GitHub Pages.

## Importante

Non mettere mai la chiave API nel frontend, in `index.html` o in `js/app.js`.
