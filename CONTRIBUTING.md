# Contributing to CampusZen

Thanks for your interest in contributing. This guide covers how to set up the project, the conventions we follow, and how to submit changes.

By participating, you agree to follow our [Code of Conduct](CODE_OF_CONDUCT.md). To report a security issue, see [SECURITY.md](SECURITY.md) and do not open a public issue.

## Ways to contribute

- Report bugs and suggest features through [issues](../../issues)
- Improve documentation
- Pick up an open issue and submit a pull request

For larger changes, open an issue first so the approach can be discussed before you invest time.

## Local setup

Prerequisites: Bun >= 1.4.2, Node.js LTS, MongoDB (local or Atlas), an Appwrite project (avatar/cover storage), Gmail SMTP (OTP emails).

```bash
git clone https://github.com/user-synax/campus-zen.git
cd campus-zen
```

**Backend** (`http://localhost:4000`)

```bash
cd backend
bun install
cp .env.example .env   # fill in the values
bun run dev
```

**Frontend** (`http://localhost:3000`)

```bash
cd frontend
bun install
echo "NEXT_PUBLIC_API_URL=http://localhost:4000" > .env
bun run dev
```

Verify the backend with `GET /health` on `:4000`. Full setup, architecture, and schema details are in [`docs.md`](docs.md).

## Workflow

1. Fork the repository and branch off `main` using `feat/<name>` or `fix/<name>`.
2. Make your changes in small, focused commits.
3. Test the affected user flow manually (for example signup, post, interact).
4. Open a pull request against `main` and fill in the PR template.

## Conventions

- Frontend and backend dependencies stay separate (no root workspace).
- Run `bun run lint` (Biome) before pushing frontend changes.
- Backend: business logic goes in `services/`, controllers stay thin, validate input with Zod, and use `AppError` with `asyncHandler`.
- API responses follow `{ success, data }` and `{ success: false, message, code, details }`.
- Follow the design tokens in [`DESIGN.md`](DESIGN.md) for UI work.
- Never commit `.env` or secrets. If you add an environment variable, update `backend/.env.example`.
- Keep changes within the MVP scope described in [`PRD.md`](PRD.md).

## Commit messages

Use short, imperative messages, optionally prefixed: `feat: add poll expiry`, `fix: handle empty reply body`, `docs: update setup steps`.

## License

CampusZen is licensed under the [GNU AGPL-3.0](LICENSE). By submitting a contribution, you agree that it is licensed under the same license. The CampusZen name and logo are not covered by the license.
