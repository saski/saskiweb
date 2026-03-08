---
name: saskiweb-deploy
description: Deploy saskiweb to Site5. Use when the user asks to deploy saskiweb, deploy last changes, or push saskiweb to production. Documents deploy.sh (SSH/rsync or FTPS fallback), env setup, and rollback.
---

# saskiweb Deploy

Deploy saskiweb to Site5 from the project root (`saskiweb/`) using `deploy.sh`. SSH/rsync is preferred; FTPS (lftp) is used when SSH is unavailable.

## Prerequisites

- **Env file**: Create and maintain `.env.deploy` (do not commit). Copy from `.env.deploy.example` and set:
  - `SITE5_HOST` — Site hostname (e.g. yourdomain.com)
  - `SITE5_USER` — Site5/cPanel username
  - `SITE5_REMOTE_PATH` — Remote path (e.g. public_html)
  - Optional: `SITE5_SSH_PORT` (default 22), `SITE5_PASSWORD` (for FTPS), `SITE5_FTPS_*`, `SITE5_FTPS_INSECURE`

- **Load env before deploy**:
  ```bash
  set -a && source .env.deploy && set +a
  ```

## Commands

Run from `saskiweb/` (or ensure `deploy.sh` is in cwd).

| Intent | Command |
|--------|--------|
| Check SSH (recommended first) | `./deploy.sh --check` |
| Dry-run (see what would deploy) | `./deploy.sh --dry-run` |
| Deploy changed files only (default) | `./deploy.sh` |
| Deploy single file | `./deploy.sh --target-file index.htm` |
| Deploy full site | `./deploy.sh --full-site` |
| Force FTPS instead of SSH | `./deploy.sh --force-ftps` |

**Default behavior (no flags):** Deploys git-changed files (working tree + staged + untracked) and always includes every file under `js/` and `css/`. Requires a git repo; use `--full-site` if not in a repo.

## Full deploy sequence (with env loaded)

```bash
cd /path/to/saskiweb
set -a && source .env.deploy && set +a
./deploy.sh --check
./deploy.sh --dry-run
./deploy.sh
```

## Rollback

```bash
git log --oneline
git checkout <commit-hash> -- path/to/file
set -a && source .env.deploy && set +a
./deploy.sh --target-file path/to/file
```

## Notes

- `mkdir: Access failed: 550 Can't create directory: File exists` during FTPS is benign (dirs already exist); transfers still succeed.
- For FTPS cert issues: set `SITE5_FTPS_HOST` to the server hostname from the hosting panel, or temporarily `SITE5_FTPS_INSECURE=1` only if necessary.
- More detail: `saskiweb/README.md` (deploy section).
