# Contributing

## Development checks

Before opening a pull request, run the checks for the areas you changed:

```bash
cd backend && npm test
cd ../frontend && npm run build
```

Keep commits focused on one logical improvement. Use a short imperative subject, such as `Validate voltage safety range`, and include documentation updates when configuration or API behavior changes.

## Local configuration

Copy `.env.example` to `.env` for Docker Compose development. Never commit `.env`, credentials, or generated build output.

## Development checks

- Run `npm test` in `backend/` after changing validation or processing logic.
- Run `npm run build` in `frontend/` after changing dashboard components.
- Keep commits focused on one behavior or documentation change.
- Never commit `.env`, credentials, or generated build output.

For end-to-end checks, start the stack with `docker compose up --build` and verify
`/health`, `/api/system/status`, and the dashboard before opening a pull request.
