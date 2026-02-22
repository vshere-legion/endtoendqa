#!/usr/bin/env bash
set -euo pipefail

# ─── Defaults ───────────────────────────────────────────
TEAM="ALL"
ENV="dev"
BROWSER=""
TAGS=""
WORKERS="4"

# ─── Parse Arguments ────────────────────────────────────
for arg in "$@"; do
  case $arg in
    --team=*)    TEAM="${arg#*=}" ;;
    --env=*)     ENV="${arg#*=}" ;;
    --browser=*) BROWSER="${arg#*=}" ;;
    --tags=*)    TAGS="${arg#*=}" ;;
    --workers=*) WORKERS="${arg#*=}" ;;
    --help)
      echo "Usage: ./run-tests.sh [options]"
      echo "  --team=TEAM        Team name (default: ALL)"
      echo "  --env=ENV          Environment: dev|staging|uat|prod (default: dev)"
      echo "  --browser=BROWSER  Browser: chromium|firefox|webkit (default: all)"
      echo "  --tags=TAGS        Tag expression (e.g., '@P1-Critical and @Regression')"
      echo "  --workers=N        Parallel workers (default: 4)"
      exit 0
      ;;
    *) echo "Unknown arg: $arg. Use --help for usage." && exit 1 ;;
  esac
done

export TEST_ENV="$ENV"
export TEST_TEAM="$TEAM"
export TEST_TAGS="$TAGS"
export WORKERS="$WORKERS"

echo "============================================"
echo " Team:        $TEAM"
echo " Environment: $ENV"
echo " Browser:     ${BROWSER:-all}"
echo " Tags:        ${TAGS:-none}"
echo " Workers:     $WORKERS"
echo "============================================"

npm run bddgen

CMD="npx playwright test --workers=$WORKERS"
[[ -n "$BROWSER" && "$BROWSER" != "all" ]] && CMD="$CMD --project=$BROWSER"

eval "$CMD"
