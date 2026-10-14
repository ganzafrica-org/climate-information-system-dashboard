# Agronomist chat resources

Drop files in this folder (or in subfolders). The chat reads them when someone asks a question.

**Use:** `.md`, `.txt`, `.csv`, `.json`  
Paste bulletin text or notes from Meteo Rwanda, MINAGRI, or your own agronomy sheets. PDFs are not read yet — copy the text into a `.md` file.

**Talking well:** add `GEMINI_API_KEY` to `.env` (free key from Google AI Studio). The key stays on the server. Without a key, the chat still uses these files plus the live Musanze forecast.

Restart `npm run dev` after the first time you add the key. New files here are picked up automatically.
