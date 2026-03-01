# saskiweb

## Site5 deployment

This project now deploys with `deploy.sh` instead of manual FTP uploads.

### 1) Configure deploy environment

Create a local env file (do not commit it):

```bash
cp .env.deploy.example .env.deploy
```

Then set your real values:

- `SITE5_HOST` (example: `yourdomain.com`)
- `SITE5_USER` (your Site5/cPanel username)
- `SITE5_REMOTE_PATH` (example: `public_html`)
- `SITE5_SSH_PORT` (default `22`)
- `SITE5_PASSWORD` (only required for FTPS fallback)
- `SITE5_FTPS_PORT` (default `21`)
- `SITE5_FTPS_HOST` (optional FTPS endpoint host, defaults to `SITE5_HOST`)
- `SITE5_FTPS_INSECURE` (optional, set to `1` only for emergency bypass of TLS hostname/cert checks)

Load it before running deploy commands:

```bash
set -a && source .env.deploy && set +a
```

### 2) Verify SSH/SFTP path (recommended)

```bash
./deploy.sh --check
```

If this passes, deploys run via `rsync` over SSH.
If it fails, script falls back to FTPS (`lftp`) when `SITE5_PASSWORD` is set.

### FTPS certificate mismatch fix

If FTPS fails with a hostname/certificate error (for example: `subjectAltName does not match`), set `SITE5_FTPS_HOST` to the FTPS server hostname provided by your hosting panel (often a server hostname, not your public domain):

```bash
set -a && source .env.deploy && set +a
export SITE5_FTPS_HOST=serverXX.site5.com
./deploy.sh --dry-run --target-file index.htm
./deploy.sh --target-file index.htm
```

Keep certificate verification enabled (default). Only if you must unblock urgently, you can opt in to insecure mode temporarily:

```bash
export SITE5_FTPS_INSECURE=1
./deploy.sh --target-file index.htm
unset SITE5_FTPS_INSECURE
```

### 3) Deploy only `index.htm` (safe first deploy)

```bash
./deploy.sh --dry-run --target-file index.htm
./deploy.sh --target-file index.htm
```

### 4) Deploy full site

```bash
./deploy.sh --dry-run
./deploy.sh
```

### 5) Force FTPS fallback (if needed)

```bash
./deploy.sh --force-ftps --dry-run --target-file index.htm
./deploy.sh --force-ftps --target-file index.htm
```

## Rollback

Rollback uses Git history plus the same deploy script:

```bash
git log --oneline
git checkout <commit-hash> -- index.htm
./deploy.sh --target-file index.htm
```
