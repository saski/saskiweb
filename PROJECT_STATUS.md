# saskiweb - Project Status

**Last Updated**: 2026-03-01  
**Overall Status**: 🟢 **96% Complete** - Scene refresh now user-controlled with dedicated bottom controls

---

## Executive Summary

| Component | Status | Progress | Blocking |
| --- | --- | --- | --- |
| Static site content | ✅ Complete | 100% | - |
| Deployment automation | ✅ Complete | 100% | - |
| Production connectivity validation | 🟡 In Progress | 80% | Needs FTPS endpoint hostname from hosting panel and real credential validation |
| Operational documentation | ✅ Complete | 100% | - |

**Current Readiness**: 🟢 Ready - Script and docs are in place; final production check requires account-specific credentials.

---

## ✅ Completed Components

### Site5 deploy automation (2026-03-01)

- Added `deploy.sh` with SSH/rsync as primary deploy strategy.
- Added FTPS/lftp fallback when SSH is unavailable.
- Added support for safe targeted deploys (`--target-file index.htm`).
- Added dry-run mode to validate deploy behavior before upload.
- Added SSH check mode (`--check`) for capability verification.

### Deployment documentation (2026-03-01)

- Updated `README.md` with setup, verification, single-file deploy, full deploy, and rollback instructions.
- Added `.env.deploy.example` for secure, env-based credential configuration.
- Added `.gitignore` entry for `.env.deploy`.

### FTPS certificate mismatch hardening (2026-03-01)

- Added `SITE5_FTPS_HOST` support so FTPS can target a certificate-valid host while keeping `SITE5_HOST` for SSH/rsync.
- Added opt-in `SITE5_FTPS_INSECURE=1` emergency bypass with explicit warning output.
- Updated README guidance for `subjectAltName does not match` failures and safe remediation flow.
- Updated `.env.deploy.example` with FTPS host and emergency override variables.

### XP simple-design refactor for score controls (2026-03-01)

- Added `syncScoreToggleUi(isPlaying)` to centralize score button text and ARIA-label updates.
- Made `startScore()` idempotent to avoid creating duplicate scheduling intervals.
- Made `stopScore()` idempotent for safer repeated calls (including unload and future call sites).

### XP simple-design refactor for accent color selection (2026-03-01)

- Added `randomAccentColor(alphaSuffix = '')` helper to remove repeated random color picking expressions.
- Replaced 4 duplicated inline expressions across harmonic lines, musician accents, stitches, and figure sparks.
- Kept rendering behavior unchanged while making intent clearer and reducing future edit surface.

### XP simple-design separation of concerns (2026-03-01)

- Extracted inline page styles into `css/index.css` and referenced it from `index.htm`.
- Extracted inline animation/audio logic into `js/index.js` and referenced it from `index.htm`.
- Reduced `index.htm` to structure + resource wiring only, improving readability and maintainability.

### Manual scene refresh control (2026-03-01)

- Removed automatic scene reinitialization timer so the scene no longer refreshes by itself.
- Added `Reload scene` button next to score control at the bottom of the page.
- Wired reload action to rebuild the whole scene state (`init()`) and redraw immediately.

---

## 🚧 In Progress

### Production validation on Site5

- Verified dry-run output for secure and insecure FTPS paths with `SITE5_FTPS_HOST`.
- Real FTPS upload attempted with overridden host; deployment path execution works but final success depends on correct provider FTPS hostname.
- Validate `index.htm` deployment first, then full-site sync once correct FTPS endpoint is confirmed.

---

## 📋 Next Steps

1. Confirm exact Site5 FTPS endpoint hostname from hosting panel and set `SITE5_FTPS_HOST` in local `.env.deploy`.
2. Run `./deploy.sh --check` and then dry-run + real deploy for `index.htm`.
3. Run dry-run + real deploy for full site.

---

## 🐛 Known Issues

- FTPS certificate mismatch occurs if FTPS connects to a host not present in certificate SAN; must use provider FTPS endpoint hostname.
- FTPS fallback requires `lftp` to be installed locally.

---

## 📝 Notes

- SSH access in Site5 may require enabling shell access from cPanel.
- Script intentionally avoids storing secrets in the repository.
