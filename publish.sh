#!/usr/bin/env bash

set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PACKAGE_JSON="$ROOT_DIR/package.json"

PUBLISH_TAG="latest"
DRY_RUN=0
ALLOW_DIRTY=0
SKIP_VERSION_CHECK=0
TMP_NPMRC=""
TMP_CACHE=""
NPM_TOKEN=""

usage() {
  cat <<'EOF'
Usage: ./publish.sh [options]

Options:
  --dry-run             Run all checks and packaging, but skip npm publish
  --tag <tag>           Publish with a custom dist-tag (default: latest)
  --allow-dirty         Continue even if the git worktree has local changes
  --skip-version-check  Skip checking whether this version already exists on npm
  --help                Show this help
EOF
}

log() {
  printf '[publish] %s\n' "$*"
}

warn() {
  printf '[publish] warning: %s\n' "$*" >&2
}

die() {
  printf '[publish] error: %s\n' "$*" >&2
  exit 1
}

cleanup() {
  if [[ -n "$TMP_NPMRC" && -f "$TMP_NPMRC" ]]; then
    rm -f "$TMP_NPMRC"
  fi
  if [[ -n "$TMP_CACHE" && -d "$TMP_CACHE" ]]; then
    rm -rf "$TMP_CACHE"
  fi
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || die "Missing required command: $1"
}

load_node_environment() {
  if command -v node >/dev/null 2>&1 && command -v npm >/dev/null 2>&1; then
    return
  fi

  if [[ -x "/usr/local/bin/node" && -x "/usr/local/bin/npm" ]]; then
    export PATH="/usr/local/bin:$PATH"
  fi

  if command -v node >/dev/null 2>&1 && command -v npm >/dev/null 2>&1; then
    return
  fi

  local nvm_candidates=()
  if [[ -n "${NVM_DIR:-}" ]]; then
    nvm_candidates+=("$NVM_DIR/nvm.sh")
  fi
  nvm_candidates+=(
    "$HOME/.nvm/nvm.sh"
    "$HOME/.local/share/nvm/nvm.sh"
  )

  local nvm_script
  for nvm_script in "${nvm_candidates[@]}"; do
    if [[ -s "$nvm_script" ]]; then
      # shellcheck disable=SC1090
      source "$nvm_script"
      break
    fi
  done
}

load_token() {
  if [[ -f "$ROOT_DIR/publish.local.sh" ]]; then
    # shellcheck disable=SC1091
    source "$ROOT_DIR/publish.local.sh"
  fi

  NPM_TOKEN="${NPM_TOKEN:-}"
  [[ -n "${NPM_TOKEN// }" ]] || die "NPM_TOKEN is empty. Export it or define it in publish.local.sh."
}

package_field() {
  node -e "const pkg=require('$PACKAGE_JSON'); const value=pkg$1; if (value === undefined || value === null) process.exit(2); process.stdout.write(typeof value === 'object' ? JSON.stringify(value) : String(value));"
}

version_exists() {
  npm view "${PACKAGE_NAME}@${PACKAGE_VERSION}" version >/dev/null 2>&1
}

ensure_git_state() {
  if [[ ! -d "$ROOT_DIR/.git" ]]; then
    warn "No .git directory found. Skipping git checks."
    return
  fi

  local branch
  branch="$(git branch --show-current 2>/dev/null || true)"
  if [[ -n "$branch" && "$branch" != "main" && "$branch" != "master" ]]; then
    warn "Current branch is '$branch', not main/master."
  fi

  if ! git diff --quiet --ignore-submodules -- || ! git diff --cached --quiet --ignore-submodules --; then
    if [[ "$ALLOW_DIRTY" -eq 1 ]]; then
      warn "Publishing from a dirty worktree because --allow-dirty was set."
    else
      die "Git worktree has uncommitted changes. Commit/stash them or use --allow-dirty."
    fi
  fi
}

setup_npm_auth() {
  TMP_NPMRC="$(mktemp "${TMPDIR:-/tmp}/x2s-npmrc.XXXXXX")"
  TMP_CACHE="$(mktemp -d "${TMPDIR:-/tmp}/x2s-npm-cache.XXXXXX")"

  cat > "$TMP_NPMRC" <<EOF
//registry.npmjs.org/:_authToken=${NPM_TOKEN}
always-auth=true
EOF

  export NPM_CONFIG_USERCONFIG="$TMP_NPMRC"
  export NPM_CONFIG_CACHE="$TMP_CACHE"
}

parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --dry-run)
        DRY_RUN=1
        shift
        ;;
      --tag)
        [[ $# -gt 1 ]] || die "--tag requires a value"
        PUBLISH_TAG="$2"
        shift 2
        ;;
      --allow-dirty)
        ALLOW_DIRTY=1
        shift
        ;;
      --skip-version-check)
        SKIP_VERSION_CHECK=1
        shift
        ;;
      --help|-h)
        usage
        exit 0
        ;;
      *)
        die "Unknown option: $1"
        ;;
    esac
  done
}

run_publish() {
  [[ -f "$PACKAGE_JSON" ]] || die "package.json not found at $PACKAGE_JSON"
  [[ -f "$ROOT_DIR/README.md" ]] || die "README.md is required for publishing"
  [[ -f "$ROOT_DIR/LICENSE" ]] || die "LICENSE is required for publishing"
  [[ -f "$ROOT_DIR/tsconfig.json" ]] || die "tsconfig.json is required for building"

  PACKAGE_NAME="$(package_field '.name')" || die "Unable to read package.json name"
  PACKAGE_VERSION="$(package_field '.version')" || die "Unable to read package.json version"
  PACKAGE_LICENSE="$(package_field '.license')" || die "Unable to read package.json license"
  PACKAGE_REPOSITORY="$(package_field '.repository.url')" || die "Unable to read package.json repository.url"
  PACKAGE_TYPES="$(package_field '.types')" || die "Unable to read package.json types"

  [[ "$PACKAGE_NAME" != "undefined" && -n "$PACKAGE_NAME" ]] || die "package.json name is empty"
  [[ "$PACKAGE_VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+([-+][0-9A-Za-z.-]+)?$ ]] || die "Version '$PACKAGE_VERSION' is not publishable semver"
  [[ -n "$PACKAGE_REPOSITORY" ]] || die "repository.url is empty"
  [[ -f "$ROOT_DIR/$PACKAGE_TYPES" ]] || warn "Type declarations are missing at $PACKAGE_TYPES; build should generate them."

  log "Package: $PACKAGE_NAME@$PACKAGE_VERSION"
  log "Repository: $PACKAGE_REPOSITORY"
  log "License: $PACKAGE_LICENSE"

  ensure_git_state
  setup_npm_auth

  log "Checking npm authentication"
  NPM_USER="$(npm whoami 2>/dev/null)" || die "npm authentication failed for the supplied token"
  log "Authenticated as $NPM_USER"

  if [[ "$SKIP_VERSION_CHECK" -eq 0 ]]; then
    log "Checking whether $PACKAGE_NAME@$PACKAGE_VERSION already exists on npm"
    if version_exists; then
      die "Version $PACKAGE_NAME@$PACKAGE_VERSION is already published. Bump package.json version first."
    fi
  fi

  if [[ ! -d "$ROOT_DIR/node_modules" ]]; then
    log "node_modules is missing. Running npm ci"
    npm ci
  fi

  log "Running build"
  npm run build

  log "Running tests"
  npm test

  log "Running tarball dry-run"
  npm pack --dry-run

  if [[ "$DRY_RUN" -eq 1 ]]; then
    log "Dry-run completed successfully. Skipping npm publish."
    return
  fi

  log "Publishing $PACKAGE_NAME@$PACKAGE_VERSION with tag '$PUBLISH_TAG'"
  npm publish --access public --tag "$PUBLISH_TAG"

  log "Verifying published version"
  PUBLISHED_VERSION="$(npm view "$PACKAGE_NAME" version)"
  log "npm now reports $PACKAGE_NAME@$PUBLISHED_VERSION"
}

main() {
  trap cleanup EXIT

  cd "$ROOT_DIR"
  parse_args "$@"
  load_node_environment
  require_command node
  require_command npm
  require_command git
  load_token
  run_publish
}

main "$@"
