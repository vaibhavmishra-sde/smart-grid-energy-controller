# Contributing

## Development checks

- Run `npm test` in `backend/` after changing validation or processing logic.
- Run `npm run build` in `frontend/` after changing dashboard components.
- Keep commits focused on one behavior or documentation change.
- Never commit `.env`, credentials, or generated build output.

For end-to-end checks, start the stack with `docker compose up --build` and verify
`/health`, `/api/system/status`, and the dashboard before opening a pull request.
