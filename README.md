# A2 English Master V6 Gemini Vercel

Questa versione usa **Google Gemini** invece di OpenAI.

## Come attivare Teacher AI gratis

1. Carica questi file su GitHub.
2. Vai su Vercel.
3. Importa / aggiorna la repository.
4. Vai su **Settings → Environment Variables**.
5. Aggiungi:

```text
GEMINI_API_KEY = la tua chiave Google AI Studio
```

6. Fai **Redeploy**.
7. Apri il link Vercel.
8. Premi **Teacher AI** dentro l'app.

## Importante

- Non inserire mai la chiave in `index.html` o `js/app.js`.
- La chiave deve stare solo su Vercel come Environment Variable.
- GitHub Pages può mostrare l'app, ma la Teacher AI funziona solo dal link Vercel.
