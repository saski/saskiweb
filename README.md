# saskiweb

## Public pages

- `/` — generative audiovisual home page
- `/cv/` — responsive, print-friendly professional CV

The CV page offers a direct PDF download in addition to printing. The reviewed
October 2, 2026 PDF includes the newly approved professional portrait and is
stored alongside the page as `Nacho_Viejo_Engineering_Manager_CV_2026-10-02_v2.pdf`.
The deployed copies at the previous October 2 and September 21 public URLs
contain the same updated PDF for compatibility; cached responses may temporarily
retain the previous portrait. The page links to the versioned download above.
Run `node --test`
before publishing; the CV tests verify the download target and the reviewed file's
SHA-256 hash. Replace the PDF and its test reference together when a new revision
is approved.

The canonical portrait approved on October 2, 2026 is published as
`cv/nacho-viejo-2026-10-02.png`; `cv/nacho-viejo.png` also contains the same image.
The website displays `cv/nacho-viejo-2026-10-02-bw.png`, a wider monochrome
derivative with more headroom and soft photographic contrast. The circular frame
remains 210 px on desktop and 112 px on mobile. The downloadable CV uses the
approved color source.

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

## GitHub Actions CI/CD

Pushes to `master` or `main` now auto-deploy via `.github/workflows/deploy.yml`.
The workflow runs `./deploy.sh --full-site` from GitHub Actions.

Configure these repository secrets in GitHub (`Settings > Secrets and variables > Actions`):

- `SITE5_HOST` (required)
- `SITE5_USER` (required)
- `SITE5_REMOTE_PATH` (required)
- `SITE5_SSH_PORT` (optional)
- `SITE5_PASSWORD` (required when FTPS fallback is used)
- `SITE5_FTPS_PORT` (optional)
- `SITE5_FTPS_HOST` (optional)
- `SITE5_FTPS_INSECURE` (optional; set to `1` only as temporary emergency bypass)

## Rollback

Rollback uses Git history plus the same deploy script:

```bash
git log --oneline
git checkout <commit-hash> -- index.htm
./deploy.sh --target-file index.htm
```
