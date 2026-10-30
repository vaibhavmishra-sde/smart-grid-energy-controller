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

For end-to-end checks, start the stack with `docker compose up --build` and verify
`/health`, `/api/system/status`, and the dashboard before opening a pull request.

## Pull request checklist

- [ ] Keep the change focused and describe the user-visible impact.
- [ ] Run the backend tests and frontend build when those areas are affected.
- [ ] Update documentation or configuration examples when behavior changes.
- [ ] Confirm that secrets, `.env` files, and generated build output are not included.
