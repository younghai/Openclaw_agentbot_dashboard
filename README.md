# OpenClaw Agent Dashboard

Custom web dashboard for OpenClaw session / channel / usage monitoring.

<img width="1469" height="1111" alt="Screenshot 2026-02-26 at 5 21 30 PM" src="https://github.com/user-attachments/assets/9596d08c-bcf7-4c82-81f1-88b8b9f074ac" />


## Structure
- `server.js`: Express API server (port 3456)
- `public/`: Frontend app (HTML, CSS, JS)
  - `index.html`
  - `app.js`
  - `style.css`
- `package.json`: Node runtime dependencies and start script

## Prerequisites
- Node.js 18+ (or 20+)
- OpenClaw CLI installed
- OpenClaw configuration and secrets configured in `~/.openclaw/.secrets` or `~/.openclaw/.env`

## Environment
`server.js` reads OpenClaw environment through:
- `~/.openclaw/.secrets`
- `~/.openclaw/.env`

Make sure required values for your OpenClaw setup exist there, including Telegram tokens and model keys.

## Install
```bash
npm install
```

## Run
```bash
npm start
```

The dashboard serves at:
- `http://localhost:3456/`
- API endpoints: `/api/health`, `/api/agents`, `/api/usage`, `/api/sessions`, `/api/logs`

If you need port 3456 exposed safely from remote host, use SSH tunnel.

## Notes
- This project intentionally excludes `node_modules` and local secret files.
- For production, run with process manager / reverse proxy as needed.
