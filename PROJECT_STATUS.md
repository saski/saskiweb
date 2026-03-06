# saskiweb - Project Status

**Last Updated**: 2026-03-06  
**Overall Status**: 🟢 **100% Complete** - Audio playback fixed and debug instrumentation removed

---

## Executive Summary

| Component | Status | Progress | Blocking |
| --- | --- | --- | --- |
| Static site content | ✅ Complete | 100% | - |
| Deployment automation | ✅ Complete | 100% | - |
| Production connectivity validation | 🟡 In Progress | 95% | Live smoke check of the latest upstream audio fix still pending |
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

### Mobile audio autoplay fallback deployed (2026-03-06)

- Implemented a startup `startScore()` attempt plus user-gesture fallback in `saskiweb/js/index.js`.
- Verified the note-selection Node test still passes with `node --test saskiweb/tests/score-note-selection.test.js`.
- Completed manual verification locally before release.
- Deployed `js/index.js` upstream with the existing `deploy.sh` flow using FTPS fallback.

### Blocked-autoplay false-state follow-up fix (2026-03-06)

- Reproduced that Chromium/Firefox can show `Stop score` even when no audio starts because autoplay stays blocked.
- Added `js/score-start-state.js` so `startScore()` only enters the playing state when the `AudioContext` actually reaches `running`.
- Added one focused Node test in `tests/score-start-state.test.js` for the blocked-autoplay case.
- Wired `index.htm` to load the new helper before `js/index.js`.
- Local tests now pass for both score start state and note selection.
- Deployed the follow-up runtime set upstream by uploading `index.htm`, `js/score-start-state.js`, and `js/index.js`.
- Updated the local `urchin.js` script URL in `index.htm` from `http` to `https` so the local source matches the remote page invocation.

### Click-first activation follow-up fix (2026-03-06)

- Removed the `pointerdown`/grace-window toggle path and simplified score start/stop to the click handler.
- Kept startup autoplay as best effort, but now user-triggered start runs directly on click to preserve browser gesture trust.
- Verified local tests still pass with `node --test tests/score-note-selection.test.js tests/score-start-state.test.js`.
- Re-deployed runtime files upstream: `index.htm`, `js/index.js`, and `js/score-start-state.js`.

### Canonical host and JS cache-busting fix (2026-03-06)

- Added an `.htaccess` canonical-host redirect from `saski.com` to `www.saski.com` to avoid host-specific cache divergence.
- Added explicit version query params to runtime script URLs in `index.htm` so browsers/CDN request a fresh JS URL after deploy.
- Prepared the smallest safe deployment surface for this fix: `.htaccess` and `index.htm`.

### Runtime fallback for missing score helper scripts (2026-03-06)

- Added in-file fallback implementations in `js/index.js` for score start-state and note-selection logic.
- Removed hard runtime dependency on `window.ScoreStartState` and `window.ScoreNoteSelection`.
- Simplified script loading in `index.htm` to only load `js/index.js` and bumped query version to `20260306-hostfix2`.
- Verified Node score tests still pass locally after the runtime fallback change.

### Runtime-confirmed autoplay lock fix and instrumentation cleanup (2026-03-06)

- Confirmed with runtime logs that startup autoplay could leave `startScore()` pending and block user-triggered start.
- Removed startup autoplay invocation and kept click-triggered score start only.
- Validated live behavior, then removed all debug instrumentation from `js/index.js`.
- Bumped script version to `20260306-fixv6` and deployed clean runtime files.

---

## 🚧 In Progress

### Production validation on Site5

- Verified dry-run output for insecure FTPS fallback against `ftp.saski.com`.
- Successfully uploaded `index.htm`, `favicon.ico`, and `js/index.js` with the existing `deploy.sh` flow.
- Live runtime check confirmed score playback starts from user gesture.

### Mobile browser audio issue investigation

- Researched the current local implementation and saved findings in `thoughts/shared/research/2026-03-06-saskiweb-mobile-audio-playback-research.md`.
- Runtime logs confirmed the blocked path and validated the final click-only start fix.
- Investigation is complete; no further follow-up is currently required.

---

## 📋 Next Steps

1. Replace `SITE5_FTPS_INSECURE=1` with certificate-valid FTPS settings once hosting credentials/endpoint are confirmed.
2. Add one lightweight browser smoke checklist to release notes for future audio regressions.
3. Keep script version bumps in sync with deploy updates to avoid cache confusion.

---

## 🐛 Known Issues

- FTPS certificate mismatch occurs if FTPS connects to a host not present in certificate SAN; must use provider FTPS endpoint hostname.
- FTPS fallback requires `lftp` to be installed locally.

---

## 📝 Notes

- SSH access in Site5 may require enabling shell access from cPanel.
- Script intentionally avoids storing secrets in the repository.
