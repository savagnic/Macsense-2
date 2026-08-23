# Macsense Web MVP

This is a dependency-free browser surface for the first web launch: record audio locally, play it back, download it, and send a text prompt to the existing Macsense Ari gateway.

## Run locally

From the repository root, serve this directory with any static server (for example `python3 -m http.server 4173 --directory web`) and open `http://localhost:4173`. Microphone access works on localhost or HTTPS.

The Ari gateway must allow the deployed web origin in `CORS_ORIGINS`. Never commit a client token or Gemini key. This MVP intentionally does not persist recordings or expose secrets.
