# A2 English Master - Gemini 3 Fix + Email Spunto

Questa versione resta solo su:
- GitHub
- Vercel
- Gemini

## Fix principale
Il tuo Google AI Studio mostra il modello:

```text
models/gemini-3-flash-preview
```

Quindi questa versione prova prima:

```text
gemini-3-flash-preview
```

e poi fa fallback automatico su:
- gemini-2.5-flash
- gemini-2.5-flash-lite
- gemini-2.0-flash
- gemini-1.5-flash
- gemini-1.5-flash-8b

## Include
- Teacher AI Gemini
- Email Spunto con apertura e chiusura uguali al modello del libro
- 200+ tracce
- Dashboard base

## Vercel
Environment Variable:

```text
GEMINI_API_KEY = la tua chiave Google AI Studio
```

Dopo aver caricato su GitHub, fai Redeploy su Vercel.
