# Development and publishing

## Notes authoring

Use Node.js 24 or newer. Run `npm ci`, then `npm run build` and `npm test`. Preview the repository through a local static HTTP server.

Editable web editions live in `content/notes/<slug>.md`; the catalog is `content/notes.json`. The build uses pinned Marked to produce static HTML, the index, full-text RSS and sitemap. Markdown is trusted, reviewed author input and may contain HTML; never feed unreviewed external text directly into this build. There is no runtime framework or social-network request.

Each catalog entry records a stable source ID, slug, title, language, topic, kind, summary, source URL, original publication timestamp, import date and `web_updated_at`. The latter is the date of the last significant change to the web edition: it drives sitemap `lastmod`, visible web update dates and `dateModified` metadata. Advance it when content, author information or useful links change, not on every build or deploy. Add `updated_at` and an editorial note for material editorial changes; retain the original LinkedIn timestamp in the page and RSS. Dates in this migration were checked against each original post’s public `SocialMediaPosting.datePublished` metadata on 6 October 2026. Relative date labels from LinkedIn were not used to calculate dates.

`content/pages.json` records the last significant update to the home, CV and Notes index. Update the relevant date when changing one of those pages, including the Notes index when its entries or summaries change. Their initial values reflect the Notes navigation and index published on 6 October 2026. These dates are stored explicitly so unchanged pages do not appear fresh after a rebuild.

A new entry with `status: draft` is excluded from the index, article output, feed and sitemap. Keep all drafts under `content/`; put only public assets in `notes/assets/`. A previously published entry cannot silently become a draft: the build stops when an existing article would remain. Withdrawals require an explicit redirect/removal plan for both the generated page and the host. Similarly, keep slugs stable; changing a slug needs a redirect.

Generated pages are checked into Git so a deploy remains inspectable. Run the build after editing content and include its outputs in the same commit. Do not edit generated article HTML directly. The image for the bookshelf note is the photo attached to that original post, with descriptive Spanish alt text. The other six notes have no forced hero image. The shared social preview is a local typographic PNG.

The home and Notes use `css/site-header.css` for the same navigation treatment, using the Notes serif mark and light sans-serif links. Both expose Notes, CV, GitHub and LinkedIn, with keyboard focus and touch targets. The Notes introduction is a single heading; its word “Notes” uses a locally served, 500-weight Caveat WOFF2 subset from Google Fonts. The font license is distributed alongside it at `notes/assets/caveat-license.html`. This is a handwritten typeface, not the author's personal handwriting. The source is https://github.com/google/fonts/tree/main/ofl/caveat.

## Migration editorial decisions

- Import seven authored pieces, including the author’s substantial commentary on a Rich Holmes repost; do not reproduce the third-party post itself.
- Retain the source URL on every page and in RSS. Do not import likes, comments, analytics or follower counts.
- Expand LinkedIn short links to their verified destinations and preserve named credits.
- Revise the AI learning note to state the study population, task and immediate assessment; 50% versus 67% is 17 percentage points. Separate the author’s takeaway from the findings.
- Identify Eventbrite’s Make It Happen Spirit Award from the original image. This January note is a gratitude post, not an employment departure announcement.
- Keep December’s context experiments in their historical voice and link to the later Arnesto note.
- Arnesto and Agent Systems Lab are expanded web references. Preserve their original LinkedIn dates and stable routes; identify the expansion in the editorial note. Pin implementation links to the public revisions inspected. Review-capacity results are deterministic logical ticks, not observations of human or model performance; include all unfinished tasks and distinguish horizon counts from the full workload.
- The untouched source packet and verification evidence are retained outside the checkout in the local proposal folder.

## Publishing boundaries

The deploy script selects public root files and permitted assets in `css/`, `js/`, `cv/` and `notes/`. It excludes content sources, drafts, source packets, tests, scripts, dependencies, internal documentation, credentials and Git configuration. All modes share the selection rules. `--full-site` uploads all selected files without deleting remote files; the default uploads changed public files plus CSS/JS.

No LinkedIn/X cross-publishing or scheduled automation is configured.

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

### 4) Deploy changed public files

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
The workflow installs pinned dependencies, generates Notes, runs all tests, and then uploads the selected public files with `./deploy.sh --full-site`. This is an additive upload: files are not deleted from the host.

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
