#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

DRY_RUN=0
CHECK_ONLY=0
FORCE_FTPS=0
TARGET_FILE=""
FULL_DEPLOY=0
SELECTED_FILES=()
PUBLIC_ROOT_FILES=(.htaccess index.htm index.htm.old.htm list.php favicon.ico robots.txt sitemap.xml styles.css)

usage() {
  cat <<'USAGE'
Usage: ./deploy.sh [options]

Deploy selected public files to Site5 with SSH/rsync (preferred) and FTPS/lftp fallback.

Required environment variables:
  SITE5_HOST         Site hostname (example: yourdomain.com)
  SITE5_USER         Site5 account username
  SITE5_REMOTE_PATH  Remote path (example: public_html)

Optional environment variables:
  SITE5_SSH_PORT     SSH port (default: 22)
  SITE5_PASSWORD     Required for FTPS fallback
  SITE5_FTPS_PORT    FTPS port (default: 21)
  SITE5_FTPS_HOST    FTPS hostname (default: SITE5_HOST)
  SITE5_FTPS_INSECURE Disable FTPS certificate verification when set to 1

Options:
  --check                      Check if non-interactive SSH is available
  --dry-run                    Print actions without transferring files
  --target-file <path>         Deploy one selected public file
  --full-site                  Deploy all selected public files additively
  --force-ftps                 Skip SSH/rsync and use FTPS fallback
  -h, --help                   Show this help
USAGE
}

require_env() {
  local key="$1"
  if [[ -z "${!key:-}" ]]; then
    echo "Missing required environment variable: $key" >&2
    exit 1
  fi
}

is_public_file() {
  local file_path="$1"
  case "$file_path" in
    .htaccess|index.htm|index.htm.old.htm|list.php|favicon.ico|robots.txt|sitemap.xml|styles.css)
      return 0
      ;;
    css/*.css|js/*.js)
      return 0
      ;;
    cv/*)
      [[ "$file_path" =~ \.(html?|pdf|css|js|png|jpe?g|webp|svg|gif|ico)$ ]]
      return
      ;;
    notes/*)
      [[ "$file_path" =~ \.(html?|xml|pdf|css|js|png|jpe?g|webp|svg|gif|ico|woff2)$ ]]
      return
      ;;
  esac
  [[ "$file_path" =~ ^[0-9]{3}\.shtml$ ]]
}

path_has_symlink_component() {
  local file_path="$1"
  local current_path=""
  local component

  while [[ "$file_path" == */* ]]; do
    component="${file_path%%/*}"
    current_path="${current_path:+$current_path/}${component}"
    [[ -L "$current_path" ]] && return 0
    file_path="${file_path#*/}"
  done
  current_path="${current_path:+$current_path/}${file_path}"
  [[ -L "$current_path" ]]
}

normalize_public_path() {
  local file_path="$1"
  file_path="${file_path#./}"
  if [[ -z "$file_path" || "$file_path" == /* || "$file_path" == *\\* || "$file_path" == *//* || "$file_path" =~ (^|/)\.\.?(/|$) ]]; then
    echo "Invalid public file path: $1" >&2
    return 1
  fi
  if ! is_public_file "$file_path" || path_has_symlink_component "$file_path" || [[ ! -f "$file_path" ]]; then
    echo "Target is not an available public file: $1" >&2
    return 1
  fi
  printf '%s\n' "$file_path"
}

append_public_file() {
  local file_path="$1"
  if is_public_file "$file_path" && ! path_has_symlink_component "$file_path" && [[ -f "$file_path" ]]; then
    SELECTED_FILES+=("$file_path")
  fi
}

collect_all_public_files() {
  local file_path
  local directory
  local -a candidates=()

  for file_path in "${PUBLIC_ROOT_FILES[@]}"; do
    append_public_file "$file_path"
  done
  for file_path in [0-9][0-9][0-9].shtml; do
    [[ -f "$file_path" ]] && append_public_file "$file_path"
  done

  for directory in css js cv notes; do
    [[ -d "$directory" ]] || continue
    while IFS= read -r file_path; do
      [[ -n "$file_path" ]] && candidates+=("$file_path")
    done < <(find "$directory" -type f -print | sort)
  done
  if [[ "${#candidates[@]}" -gt 0 ]]; then
    for file_path in "${candidates[@]}"; do
      append_public_file "$file_path"
    done
  fi

  deduplicate_selected_files
}

collect_changed_files() {
  if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    echo "Changed-file deploy requires a git repository. Use --full-site instead." >&2
    exit 1
  fi

  local file_path
  local -a changed_files=()
  while IFS= read -r file_path; do
    [[ -n "$file_path" ]] && changed_files+=("$file_path")
  done < <(
    {
      git diff --name-only --diff-filter=ACMRTUXB
      git diff --cached --name-only --diff-filter=ACMRTUXB
      git ls-files --others --exclude-standard
    } | sort -u
  )

  if [[ "${#changed_files[@]}" -gt 0 ]]; then
    for file_path in "${changed_files[@]}"; do
      append_public_file "$file_path"
    done
  fi

  local directory
  for directory in css js; do
    [[ -d "$directory" ]] || continue
    while IFS= read -r file_path; do
      [[ -n "$file_path" ]] && append_public_file "$file_path"
    done < <(find "$directory" -type f -print | sort)
  done

  deduplicate_selected_files
}

deduplicate_selected_files() {
  local file_path
  local existing
  local found
  local -a unique_files=()
  if [[ "${#SELECTED_FILES[@]}" -gt 0 ]]; then
    for file_path in "${SELECTED_FILES[@]}"; do
      found=0
      if [[ "${#unique_files[@]}" -gt 0 ]]; then
        for existing in "${unique_files[@]}"; do
          if [[ "$existing" == "$file_path" ]]; then
            found=1
            break
          fi
        done
      fi
      if [[ "$found" -eq 0 ]]; then
        unique_files+=("$file_path")
      fi
    done
  fi
  if [[ "${#unique_files[@]}" -gt 0 ]]; then
    SELECTED_FILES=("${unique_files[@]}")
  else
    SELECTED_FILES=()
  fi
}

can_use_ssh() {
  ssh \
    -o BatchMode=yes \
    -o ConnectTimeout=5 \
    -o StrictHostKeyChecking=accept-new \
    -p "${SITE5_SSH_PORT}" \
    "${SITE5_USER}@${SITE5_HOST}" \
    "echo connected" >/dev/null 2>&1
}

run_rsync() {
  if [[ "${#SELECTED_FILES[@]}" -eq 0 ]]; then
    echo "No selected public files to deploy."
    return
  fi

  local file_list
  file_list="$(mktemp)"
  printf '%s\n' "${SELECTED_FILES[@]}" > "$file_list"
  trap 'rm -f "$file_list"' RETURN

  local ssh_rsh
  ssh_rsh="ssh -p ${SITE5_SSH_PORT} -o StrictHostKeyChecking=accept-new"
  local -a rsync_args=(-avz -e "$ssh_rsh" --files-from="$file_list")
  [[ "$DRY_RUN" -eq 1 ]] && rsync_args+=(--dry-run)

  echo "Deploying ${#SELECTED_FILES[@]} selected public file(s) with rsync over SSH"
  rsync "${rsync_args[@]}" ./ "${SITE5_USER}@${SITE5_HOST}:${SITE5_REMOTE_PATH}/"
}

lftp_quote() {
  local value="$1"
  value="${value//\\/\\\\}"
  value="${value//\"/\\\"}"
  printf '"%s"' "$value"
}

run_ftps() {
  local ftps_port="${SITE5_FTPS_PORT:-21}"
  local ftps_host="${SITE5_FTPS_HOST:-$SITE5_HOST}"
  local ssl_verify_value=true
  if [[ "${SITE5_FTPS_INSECURE:-0}" == "1" ]]; then
    ssl_verify_value=false
    echo "WARNING: FTPS certificate verification is disabled (SITE5_FTPS_INSECURE=1)." >&2
  fi

  if [[ "${#SELECTED_FILES[@]}" -eq 0 ]]; then
    echo "No selected public files to deploy."
    return
  fi

  local lftp_cmds="set cmd:fail-exit true; set ftp:ssl-force true; set ftp:ssl-protect-data true; set ssl:verify-certificate ${ssl_verify_value};"
  local file_path
  local remote_dir
  for file_path in "${SELECTED_FILES[@]}"; do
    remote_dir="${SITE5_REMOTE_PATH}/$(dirname "$file_path")"
    [[ "$remote_dir" == "${SITE5_REMOTE_PATH}/." ]] && remote_dir="$SITE5_REMOTE_PATH"
    if [[ "$remote_dir" != "$SITE5_REMOTE_PATH" ]]; then
      lftp_cmds+=" mkdir -p $(lftp_quote "$remote_dir") || echo \"Directory creation skipped; upload will verify destination\";"
    fi
    lftp_cmds+=" put -O $(lftp_quote "$remote_dir") $(lftp_quote "$file_path");"
  done
  lftp_cmds+=" bye"

  if [[ "$DRY_RUN" -eq 1 ]]; then
    echo "Dry run requested. lftp command that would be executed:"
    echo "lftp -u '${SITE5_USER},***' -p '${ftps_port}' '${ftps_host}' -e \"${lftp_cmds}\""
    return
  fi
  if ! command -v lftp >/dev/null 2>&1; then
    echo "FTPS fallback requires lftp. Install it first (example: brew install lftp)." >&2
    exit 1
  fi
  require_env SITE5_PASSWORD
  echo "Deploying selected public files with FTPS fallback"
  lftp -u "${SITE5_USER},${SITE5_PASSWORD}" -p "$ftps_port" "$ftps_host" -e "$lftp_cmds"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --check) CHECK_ONLY=1; shift ;;
    --dry-run) DRY_RUN=1; shift ;;
    --target-file)
      TARGET_FILE="${2:-}"
      [[ -n "$TARGET_FILE" ]] || { echo "--target-file requires a file path" >&2; exit 1; }
      shift 2
      ;;
    --full-site) FULL_DEPLOY=1; shift ;;
    --force-ftps) FORCE_FTPS=1; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage; exit 1 ;;
  esac
done

require_env SITE5_HOST
require_env SITE5_USER
require_env SITE5_REMOTE_PATH
SITE5_SSH_PORT="${SITE5_SSH_PORT:-22}"

if [[ "$CHECK_ONLY" -eq 0 ]]; then
  if [[ -n "$TARGET_FILE" ]]; then
    SELECTED_FILES+=("$(normalize_public_path "$TARGET_FILE")")
  elif [[ "$FULL_DEPLOY" -eq 1 ]]; then
    collect_all_public_files
  else
    collect_changed_files
  fi
fi

if [[ "$CHECK_ONLY" -eq 1 ]]; then
  if can_use_ssh; then
    echo "SSH check passed. You can use rsync over SSH."
    exit 0
  fi
  echo "SSH check failed. Use FTPS fallback or configure SSH keys on Site5."
  exit 1
fi

if [[ "$FORCE_FTPS" -eq 1 ]]; then
  run_ftps
  exit 0
fi
if can_use_ssh; then
  run_rsync
else
  echo "SSH unavailable. Switching to FTPS fallback."
  run_ftps
fi
