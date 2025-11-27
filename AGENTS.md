# Repository Guidelines

## Project Structure & Modules
- `index.js`: main WhatsApp bot logic (YouTube fetch, FFmpeg convert, status upload, scheduler).
- `auth_info_baileys/`: Baileys multi-file session store; delete to force re-login.
- `package.json`: scripts and dependency manifest; `node_modules/` holds installed packages.
- Media outputs are saved temporarily in repo root as `status_<timestamp>.mp4` and deleted after upload.

## Build, Run, and Test
- Install deps: `npm install`.
- Start bot locally: `npm start` (runs `node .`). Prints QR; scan with target WA account.
- Ensure `ffmpeg` is available in PATH for video trimming; verify with `ffmpeg -version`.
- No automated tests are defined yet; manual end-to-end run is the validation path.

## Coding Style & Naming
- JavaScript (CommonJS); prefer modern ES syntax (async/await, const/let).
- Indent 4 spaces; keep lines under ~100 chars for readability.
- Functions use lowerCamelCase; constants are UPPER_SNAKE_CASE (e.g., `CHECK_INTERVAL_MS`).
- Avoid global side-effects; keep helpers pure where possible and log meaningfully (`[WA]`, `[YOUTUBE]`, `[DOWNLOAD]`).

## Testing Guidelines
- Until tests exist, validate changes by running `npm start` against a test WA account and observing logs.
- For new logic, add unit tests under `__tests__/` using Jest; name files `*.test.js` and cover network error paths and FFmpeg failures.

## Commit & PR Practices
- Use clear, present-tense messages: `fix reconnect loop`, `add ffmpeg check`.
- Keep commits scoped; separate refactors from behavior changes.
- PR checklist: description of change, steps to reproduce/test, expected vs. actual behavior, screenshots or log snippets for WA/YouTube flows, and note any new env/tooling requirements.

## Security & Configuration Tips
- Never commit `auth_info_baileys/` or generated video files; add to `.gitignore` if needed.
- Run bot from a non-personal WA account; revoke sessions by deleting the auth folder and rescanning QR.
- Respect YouTube/WhatsApp terms: limit frequency via `CHECK_INTERVAL_MS`; keep `MAX_VIDEO_CHECK` modest to avoid abuse.

## Architecture Overview
- Loop: connect via Baileys → fetch latest channel videos with `ytsr` → download & 30s trim via `ytdl-core` + `ffmpeg` → upload to `status@broadcast` → repeat on interval. Central orchestrator: `botAlgorithm(sock)`.
