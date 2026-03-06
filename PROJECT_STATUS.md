# saskiweb - Project Status

**Last Updated**: 2026-03-06  
**Overall Status**: 🟢 **99% Complete** - Custom site favicon linked in HTML and local mobile audio autoplay fallback implemented

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

### Mobile audio playback research (2026-03-06)

- Documented the current `Play score` audio path in `js/index.js` and `js/score-note-selection.js`.
- Recorded the current playback lifecycle, event bindings, and browser-audio surface in `thoughts/shared/research/2026-03-06-saskiweb-mobile-audio-playback-research.md`.
- Captured that the current runtime exposes one click-based audio entry point and no separate mobile-specific audio handling code in the local codebase.

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

### XP simple-design refactor for score note selection (2026-03-01)

- Added `js/score-note-selection.js` with `getScheduledMidiNotes(...)` to centralize ascending/descending note picking logic.
- Updated `scheduleScore()` in `js/index.js` to call the shared helper instead of duplicating index math.
- Added one focused Node test in `tests/score-note-selection.test.js` and validated it with `node --test`.
- Loaded the new helper in `index.htm` before `js/index.js` to preserve runtime behavior.
- Added one additional wrap-around test case to verify modulo cycling behavior when `beat` exceeds `scale`/`arp` lengths.

### XP simple-design separation of concerns (2026-03-01)

- Extracted inline page styles into `css/index.css` and referenced it from `index.htm`.
- Extracted inline animation/audio logic into `js/index.js` and referenced it from `index.htm`.
- Reduced `index.htm` to structure + resource wiring only, improving readability and maintainability.

### Manual scene refresh control (2026-03-01)

- Removed automatic scene reinitialization timer so the scene no longer refreshes by itself.
- Added `Reload scene` button next to score control at the bottom of the page.
- Wired reload action to rebuild the whole scene state (`init()`) and redraw immediately.

### Site favicon added (2026-03-06)

- Added `favicon.ico` at repository root using a custom face-focused icon.
- Prepared favicon file for deployment with the existing site publish flow.
- Added an explicit `<link rel="icon" href="favicon.ico">` entry in `index.htm` so browsers load the favicon from HTML, not only by root-file convention.
- Deployed `index.htm` and `favicon.ico` to the hosting remote using the existing `deploy.sh` flow.

---

## 🚧 In Progress

### Production validation on Site5

- Verified dry-run output for insecure FTPS fallback against `ftp.saski.com`.
- Successfully uploaded `index.htm` and `favicon.ico` with the existing `deploy.sh` flow.
- Full-site deploy and live browser verification remain pending.

### Mobile browser audio issue investigation

- Researched the current local implementation and saved findings in `thoughts/shared/research/2026-03-06-saskiweb-mobile-audio-playback-research.md`.
- Updated the smallest-step implementation plan to include a startup autoplay attempt plus a `pointerdown` fallback for browsers that block Web Audio autoplay.
- Implemented a local startup autoplay attempt plus `pointerdown` fallback in `saskiweb/js/index.js`.
- Verified the existing Node test suite still passes with `node --test saskiweb/tests/score-note-selection.test.js`.
- Browser and device verification remain pending.

---

## 📋 Next Steps

1. Open the live site in a browser and confirm the favicon renders in the tab and loads without a 404.
2. Manually verify desktop and mobile browser behavior for the new autoplay-plus-fallback audio flow.
3. Decide whether to keep `SITE5_FTPS_INSECURE=1` temporarily or replace it with a certificate-valid FTPS hostname.

---

## 🐛 Known Issues

- FTPS certificate mismatch occurs if FTPS connects to a host not present in certificate SAN; must use provider FTPS endpoint hostname.
- FTPS fallback requires `lftp` to be installed locally.

---

## 📝 Notes

- SSH access in Site5 may require enabling shell access from cPanel.
- Script intentionally avoids storing secrets in the repository.
