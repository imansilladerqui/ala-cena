#!/usr/bin/env bash
# Basic secret scan for CI and local use.
# Fails if sensitive files are tracked or common secret patterns appear in source.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'
ERRORS=0

echo "==> Checking sensitive files are not tracked by git..."

SENSITIVE_FILES=(
  "backend/.env"
  "mobile/.env"
  "backend/google-vision-key.json"
)

if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  for f in "${SENSITIVE_FILES[@]}"; do
    if git ls-files --error-unmatch "$f" >/dev/null 2>&1; then
      echo -e "${RED}FAIL${NC}: $f is tracked by git — remove it and add to .gitignore"
      ERRORS=$((ERRORS + 1))
    fi
  done

  # Block any .env file except .env.example
  while IFS= read -r tracked; do
    case "$tracked" in
      *.env.example) ;;
      *)
        echo -e "${RED}FAIL${NC}: $tracked is tracked — env files must not be committed"
        ERRORS=$((ERRORS + 1))
        ;;
    esac
  done < <(git ls-files '**/.env' '**/.env.*' 2>/dev/null || true)

  # Block credential JSON files
  while IFS= read -r tracked; do
    echo -e "${RED}FAIL${NC}: $tracked looks like a credential file — must not be committed"
    ERRORS=$((ERRORS + 1))
  done < <(git ls-files '*credentials*.json' '*-key.json' 'service-account*.json' 'google-vision-key.json' 2>/dev/null || true)
else
  echo "Not a git repo — skipping tracked-file checks"
fi

echo "==> Scanning source for hardcoded secret patterns..."

SCAN_PATHS=(
  "backend/src"
  "mobile/src"
  "mobile/app"
)

# Patterns: Anthropic sk-, Google AIza, AWS AKIA, private key blocks, postgres URLs with password
PATTERN='(sk-ant-[a-zA-Z0-9_-]{20,}|AIza[0-9A-Za-z_-]{35}|AKIA[0-9A-Z]{16}|-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----|postgresql://[^:]+:[^@\s]{3,}@)'

MATCHES=0
for dir in "${SCAN_PATHS[@]}"; do
  if [ -d "$dir" ]; then
    if grep -rEn "$PATTERN" "$dir" \
      --include='*.ts' --include='*.tsx' --include='*.js' --include='*.json' \
      2>/dev/null; then
      MATCHES=1
    fi
  fi
done

if [ "$MATCHES" -eq 1 ]; then
  echo -e "${RED}FAIL${NC}: Possible hardcoded secrets found in source (see above)"
  ERRORS=$((ERRORS + 1))
fi

echo "==> Verifying .env files exist only as examples in repo..."

for env_file in backend/.env mobile/.env; do
  if [ -f "$env_file" ]; then
    echo "  OK: $env_file exists locally (should be gitignored)"
  fi
done

if [ "$ERRORS" -eq 0 ]; then
  echo -e "${GREEN}Secret scan passed${NC}"
  exit 0
else
  echo -e "${RED}Secret scan failed with $ERRORS error(s)${NC}"
  exit 1
fi
