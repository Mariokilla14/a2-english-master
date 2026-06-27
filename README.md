# A2 English Master V22 Hybrid Database + AI

Motore ibrido Fill the Gap:

1. Cerca prima nel database cloud Supabase.
2. Se non trova nulla, usa il database offline locale da 3000 esercizi.
3. Se premi “🌱 Cresci database AI”, genera un nuovo esercizio con Gemini e lo salva nel database cloud.
4. Da quel momento l’esercizio resta disponibile per sempre senza consumare più Gemini.

Prima del deploy:
- in Supabase SQL Editor esegui `SUPABASE_V22_SETUP.sql`;
- carica tutto su GitHub;
- fai Redeploy su Vercel.
