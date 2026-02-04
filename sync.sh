#!/bin/bash

# Two-way sync script between template and projects
# Usage:
#   ./sync.sh from /path/to/foundation   # pull from template
#   ./sync.sh to /path/to/foundation     # push to template
#   ./sync.sh from /path/to/foundation --dry-run  # preview
#   ./sync.sh from /path/to/foundation --force    # no prompts

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Global variables
SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
SYNCFILES="$SCRIPT_DIR/.syncfiles"
DRY_RUN=false
FORCE=false
VERBOSE=false
APPLY_ALL=false

usage() {
  echo "Sync files between template and projects"
  echo ""
  echo "Usage: $0 <from|to> <path> [options]"
  echo ""
  echo "Commands:"
  echo "  from <path>   Pull changes FROM the specified repo into current"
  echo "  to <path>     Push changes TO the specified repo from current"
  echo ""
  echo "Options:"
  echo "  --dry-run     Show what would change without applying"
  echo "  --force       Apply all without prompts"
  echo "  --verbose     Verbose output"
  echo ""
  echo "Examples:"
  echo "  ./sync.sh from ../nestjs-foundation           # pull from template"
  echo "  ./sync.sh to ../nestjs-foundation             # push to template"
  echo "  ./sync.sh from ../nestjs-foundation --dry-run # preview"
  exit 1
}

log_info() { echo -e "${BLUE}→${NC} $1"; }
log_success() { echo -e "${GREEN}✓${NC} $1"; }
log_warning() { echo -e "${YELLOW}!${NC} $1"; }
log_error() { echo -e "${RED}✗${NC} $1"; }

# Read .syncfiles
read_syncfiles() {
  if [[ ! -f "$SYNCFILES" ]]; then
    log_error ".syncfiles not found in $SCRIPT_DIR"
    exit 1
  fi

  # Read file, remove comments and empty lines
  grep -v '^#' "$SYNCFILES" | grep -v '^$' | sed 's/[[:space:]]*$//'
}

# Show diff for file
show_diff() {
  local src="$1"
  local dst="$2"

  if [[ -d "$src" ]]; then
    # For directories use diff -rq for brief list
    diff -rq "$src" "$dst" 2>/dev/null || true
  else
    # For files show full diff
    diff --color=always -u "$dst" "$src" 2>/dev/null || true
  fi
}

# Sync a single path
sync_path() {
  local path="$1"
  local src="$2"
  local dst="$3"
  local src_path="$src/$path"
  local dst_path="$dst/$path"

  # Remove trailing slash for existence check
  local src_check="${src_path%/}"
  local dst_check="${dst_path%/}"

  echo ""
  echo -e "${CYAN}━━━ $path ━━━${NC}"

  # Check existence
  local src_exists=false
  local dst_exists=false
  [[ -e "$src_check" ]] && src_exists=true
  [[ -e "$dst_check" ]] && dst_exists=true

  if [[ "$src_exists" == false ]]; then
    log_warning "Not found in source: $src_check"
    return
  fi

  if [[ "$dst_exists" == false ]]; then
    log_info "New (does not exist in target)"
    if [[ "$DRY_RUN" == true ]]; then
      echo "  [DRY RUN] Would copy: $path"
      return
    fi
    if [[ "$FORCE" == true ]] || [[ "$APPLY_ALL" == true ]]; then
      copy_path "$src_check" "$dst_check"
      log_success "Copied"
      return
    fi
    read -p "  Copy? [y/n/a/q] " -n 1 -r
    echo
    case $REPLY in
      y|Y) copy_path "$src_check" "$dst_check"; log_success "Copied" ;;
      a|A) APPLY_ALL=true; copy_path "$src_check" "$dst_check"; log_success "Copied" ;;
      q|Q) echo "Exit"; exit 0 ;;
      *) log_info "Skipped" ;;
    esac
    return
  fi

  # Both exist - compare
  if [[ -d "$src_check" ]]; then
    # Directory - use diff -rq
    local diff_output
    diff_output=$(diff -rq "$src_check" "$dst_check" 2>/dev/null) || true

    if [[ -z "$diff_output" ]]; then
      log_success "No changes"
      return
    fi

    echo "$diff_output" | head -20
    local diff_count
    diff_count=$(echo "$diff_output" | wc -l | tr -d ' ')
    if [[ "$diff_count" -gt 20 ]]; then
      echo "  ... and $((diff_count - 20)) more differences"
    fi
  else
    # File - show diff
    local diff_output
    diff_output=$(diff -u "$dst_check" "$src_check" 2>/dev/null) || true

    if [[ -z "$diff_output" ]]; then
      log_success "No changes"
      return
    fi

    echo "$diff_output" | head -30
    local diff_lines
    diff_lines=$(echo "$diff_output" | wc -l | tr -d ' ')
    if [[ "$diff_lines" -gt 30 ]]; then
      echo "  ... $((diff_lines - 30)) more lines"
    fi
  fi

  if [[ "$DRY_RUN" == true ]]; then
    echo "  [DRY RUN] Would update"
    return
  fi

  if [[ "$FORCE" == true ]] || [[ "$APPLY_ALL" == true ]]; then
    copy_path "$src_check" "$dst_check"
    log_success "Updated"
    return
  fi

  read -p "  Apply? [y/n/d/a/q] (d=full diff) " -n 1 -r
  echo
  case $REPLY in
    y|Y) copy_path "$src_check" "$dst_check"; log_success "Updated" ;;
    d|D)
      if [[ -d "$src_check" ]]; then
        diff -r "$src_check" "$dst_check" 2>/dev/null | less || true
      else
        diff --color=always -u "$dst_check" "$src_check" | less
      fi
      # Ask again
      read -p "  Apply? [y/n/a/q] " -n 1 -r
      echo
      case $REPLY in
        y|Y) copy_path "$src_check" "$dst_check"; log_success "Updated" ;;
        a|A) APPLY_ALL=true; copy_path "$src_check" "$dst_check"; log_success "Updated" ;;
        q|Q) echo "Exit"; exit 0 ;;
        *) log_info "Skipped" ;;
      esac
      ;;
    a|A) APPLY_ALL=true; copy_path "$src_check" "$dst_check"; log_success "Updated" ;;
    q|Q) echo "Exit"; exit 0 ;;
    *) log_info "Skipped" ;;
  esac
}

# Copy file or directory
copy_path() {
  local src="$1"
  local dst="$2"

  if [[ -d "$src" ]]; then
    # Directory - use rsync WITHOUT --delete to preserve local files (migrations etc.)
    mkdir -p "$dst"
    rsync -av \
      --exclude='node_modules' \
      --exclude='dist' \
      --exclude='.git' \
      --exclude='*.log' \
      --exclude='.DS_Store' \
      "$src/" "$dst/" > /dev/null
  else
    # File - simple cp
    mkdir -p "$(dirname "$dst")"
    cp "$src" "$dst"
  fi
}

# Parse arguments
parse_args() {
  if [[ $# -lt 2 ]]; then
    usage
  fi

  DIRECTION="$1"
  TARGET_PATH="$2"
  shift 2

  if [[ "$DIRECTION" != "from" && "$DIRECTION" != "to" ]]; then
    log_error "Unknown command: $DIRECTION"
    usage
  fi

  if [[ ! -d "$TARGET_PATH" ]]; then
    log_error "Path does not exist: $TARGET_PATH"
    exit 1
  fi

  TARGET_PATH=$(cd "$TARGET_PATH" && pwd)

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --dry-run) DRY_RUN=true ;;
      --force) FORCE=true ;;
      --verbose) VERBOSE=true ;;
      *) log_error "Unknown option: $1"; usage ;;
    esac
    shift
  done
}

main() {
  parse_args "$@"

  echo ""
  echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${BLUE}║                    Template Sync                           ║${NC}"
  echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
  echo ""

  if [[ "$DIRECTION" == "from" ]]; then
    echo -e "${GREEN}Direction:${NC} $TARGET_PATH → $SCRIPT_DIR"
    SRC="$TARGET_PATH"
    DST="$SCRIPT_DIR"
  else
    echo -e "${GREEN}Direction:${NC} $SCRIPT_DIR → $TARGET_PATH"
    SRC="$SCRIPT_DIR"
    DST="$TARGET_PATH"
  fi

  if [[ "$DRY_RUN" == true ]]; then
    echo -e "${YELLOW}Mode:${NC} preview (--dry-run)"
  elif [[ "$FORCE" == true ]]; then
    echo -e "${YELLOW}Mode:${NC} no prompts (--force)"
  else
    echo -e "${YELLOW}Mode:${NC} interactive"
  fi

  echo ""
  echo "Files to sync (from .syncfiles):"

  # Read and process each path
  while IFS= read -r path; do
    [[ -z "$path" ]] && continue
    sync_path "$path" "$SRC" "$DST"
  done < <(read_syncfiles)

  echo ""
  echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${GREEN}║                        Done!                               ║${NC}"
  echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
  echo ""
}

main "$@"
