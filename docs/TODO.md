# Follow-ups

## Host the SDK docs online

The docs currently live in the repo (`llms.txt` + `docs/sdk/*.md`) and are reachable via GitHub.
Publish them under a dedicated docs domain so they resolve as real URLs, e.g.
`https://llm.persistica.io/docs` (and serve `llms.txt` at the domain root:
`https://llm.persistica.io/llms.txt`).

- Pick a host/generator (Astro Starlight fits the stack; GitHub Pages / Vercel for hosting).
- Serve `llms.txt` at the root and the linked markdown under `/docs/sdk/...` so its relative links resolve online.
- Once hosted, switch `llms.txt` links from relative paths to absolute `https://` URLs, and consider adding `llms-full.txt` (concatenated content) for single-file LLM ingestion.
