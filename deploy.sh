#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

DRY_RUN=0
CHECK_ONLY=0
FORCE_FTPS=0
TARGET_FILE=""
FULL_DEPLOY=0
CHANGED_FILES=()

usage() {
  cat <<'USAGE'
Usage: ./deploy.sh [options]

Deploy saskiweb to Site5 with SSH/rsync (preferred) and FTPS/lftp fallback.

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
  --target-file <path>         Deploy a single file (example: index.htm)
  --full-site                  Deploy the full site mirror (previous behavior)
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

validate_target_file() {
  local file_path="$1"
  if [[ ! -f "$file_path" ]]; then
    echo "Target file not found: $file_path" >&2
    exit 1
  fi
}

collect_changed_files() {
  if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    echo "Changed-file deploy requires a git repository. Use --full-site instead." >&2
    exit 1
  fi

  local -a files=()
  local changed_file

  while IFS= read -r changed_file; do
    if [[ -n "$changed_file" ]] && ! is_excluded_file "$changed_file"; then
      files+=("$changed_file")
    fi
  done < <(git diff --name-only --diff-filter=ACMRTUXB)

  while IFS= read -r changed_file; do
    if [[ -n "$changed_file" ]] && ! is_excluded_file "$changed_file"; then
      files+=("$changed_file")
    fi
  done < <(git diff --cached --name-only --diff-filter=ACMRTUXB)

  while IFS= read -r changed_file; do
    if [[ -n "$changed_file" ]] && ! is_excluded_file "$changed_file"; then
      files+=("$changed_file")
    fi
  done < <(git ls-files --others --exclude-standard)

  if [[ "${#files[@]}" -eq 0 ]]; then
    CHANGED_FILES=()
    return
  fi

  mapfile -t CHANGED_FILES < <(printf '%s\n' "${files[@]}" | awk '!seen[$0]++')
}

is_excluded_file() {
  local file_path="$1"
  case "$file_path" in
    .git/*|.git|.DS_Store|deploy.sh|.env*)
      return 0
      ;;
    *)
      return 1
      ;;
  esac
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
  local ssh_rsh
  ssh_rsh="ssh -p ${SITE5_SSH_PORT} -o StrictHostKeyChecking=accept-new"
  local -a base_args=(
    -avz
    --exclude=.git/
    --exclude=.gitignore
    --exclude=.DS_Store
    --exclude=.env*
    --exclude=deploy.sh
    -e "$ssh_rsh"
  )

  if [[ "$DRY_RUN" -eq 1 ]]; then
    base_args+=(--dry-run)
  fi

  if [[ -n "$TARGET_FILE" ]]; then
    echo "Deploying single file with rsync over SSH: $TARGET_FILE"
    rsync "${base_args[@]}" --relative "./${TARGET_FILE#./}" "${SITE5_USER}@${SITE5_HOST}:${SITE5_REMOTE_PATH}/"
    return
  fi

  if [[ "$FULL_DEPLOY" -eq 1 ]]; then
    echo "Deploying full site with rsync over SSH"
    rsync "${base_args[@]}" --delete ./ "${SITE5_USER}@${SITE5_HOST}:${SITE5_REMOTE_PATH}/"
    return
  fi

  if [[ "${#CHANGED_FILES[@]}" -eq 0 ]]; then
    echo "No changed files detected. Nothing to deploy."
    return
  fi

  local changed_file_list
  changed_file_list="$(mktemp)"
  printf '%s\n' "${CHANGED_FILES[@]}" > "$changed_file_list"
  trap 'rm -f "$changed_file_list"' RETURN

  echo "Deploying ${#CHANGED_FILES[@]} changed file(s) with rsync over SSH"
  rsync "${base_args[@]}" --files-from="$changed_file_list" ./ "${SITE5_USER}@${SITE5_HOST}:${SITE5_REMOTE_PATH}/"
}

run_ftps() {
  local ftps_port
  ftps_port="${SITE5_FTPS_PORT:-21}"
  local ftps_host
  ftps_host="${SITE5_FTPS_HOST:-$SITE5_HOST}"
  local ftps_insecure
  ftps_insecure="${SITE5_FTPS_INSECURE:-0}"
  local ssl_verify_value
  ssl_verify_value="true"
  if [[ "$ftps_insecure" == "1" ]]; then
    ssl_verify_value="false"
    echo "WARNING: FTPS certificate verification is disabled (SITE5_FTPS_INSECURE=1)." >&2
  fi

  local lftp_cmds
  if [[ -n "$TARGET_FILE" ]]; then
    local target_dir
    local remote_target_dir
    target_dir="$(dirname "$TARGET_FILE")"
    if [[ "$target_dir" == "." ]]; then
      remote_target_dir="${SITE5_REMOTE_PATH}"
      lftp_cmds="set ftp:ssl-force true; set ftp:ssl-protect-data true; set ssl:verify-certificate ${ssl_verify_value}; put -O ${remote_target_dir} ${TARGET_FILE}; bye"
    else
      remote_target_dir="${SITE5_REMOTE_PATH}/${target_dir}"
      lftp_cmds="set ftp:ssl-force true; set ftp:ssl-protect-data true; set ssl:verify-certificate ${ssl_verify_value}; mkdir -p ${remote_target_dir}; put -O ${remote_target_dir} ${TARGET_FILE}; bye"
    fi
  elif [[ "$FULL_DEPLOY" -eq 1 ]]; then
    lftp_cmds="set ftp:ssl-force true; set ftp:ssl-protect-data true; set ssl:verify-certificate ${ssl_verify_value}; mirror --reverse --delete --verbose --exclude-glob .git/ --exclude-glob .env* --exclude-glob .DS_Store --exclude-glob deploy.sh ./ ${SITE5_REMOTE_PATH}; bye"
  else
    if [[ "${#CHANGED_FILES[@]}" -eq 0 ]]; then
      echo "No changed files detected. Nothing to deploy."
      return
    fi

    lftp_cmds="set ftp:ssl-force true; set ftp:ssl-protect-data true; set ssl:verify-certificate ${ssl_verify_value};"
    local changed_file
    local changed_dir
    local remote_changed_dir
    for changed_file in "${CHANGED_FILES[@]}"; do
      changed_dir="$(dirname "$changed_file")"
      if [[ "$changed_dir" == "." ]]; then
        remote_changed_dir="${SITE5_REMOTE_PATH}"
      else
        remote_changed_dir="${SITE5_REMOTE_PATH}/${changed_dir}"
        lftp_cmds+=" mkdir -p ${remote_changed_dir};"
      fi
      lftp_cmds+=" put -O ${remote_changed_dir} ${changed_file};"
    done
    lftp_cmds+=" bye"
  fi

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

  echo "Deploying with FTPS fallback"
  lftp -u "${SITE5_USER},${SITE5_PASSWORD}" -p "$ftps_port" "$ftps_host" -e "$lftp_cmds"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --check)
      CHECK_ONLY=1
      shift
      ;;
    --dry-run)
      DRY_RUN=1
      shift
      ;;
    --target-file)
      TARGET_FILE="${2:-}"
      if [[ -z "$TARGET_FILE" ]]; then
        echo "--target-file requires a file path" >&2
        exit 1
      fi
      shift 2
      ;;
    --full-site)
      FULL_DEPLOY=1
      shift
      ;;
    --force-ftps)
      FORCE_FTPS=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage
      exit 1
      ;;
  esac
done

require_env SITE5_HOST
require_env SITE5_USER
require_env SITE5_REMOTE_PATH
SITE5_SSH_PORT="${SITE5_SSH_PORT:-22}"

if [[ -n "$TARGET_FILE" ]]; then
  validate_target_file "$TARGET_FILE"
fi

if [[ "$CHECK_ONLY" -eq 0 && -z "$TARGET_FILE" && "$FULL_DEPLOY" -eq 0 ]]; then
  collect_changed_files
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
