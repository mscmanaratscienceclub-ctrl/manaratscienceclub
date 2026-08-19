#!/usr/bin/env bash
# Mechanical verification of the hard rules in AGENTS.md (Manarat Science Club,
# adapted from textura-agency/next16-claude-starter).
#
# Only rules that are objectively decidable from the source live here. Judgement
# calls (visual fidelity, "is this token named well") belong to the qa-verify
# skill, which a model runs. This script is the floor, not the ceiling.
#
# Usage:  .claude/scripts/verify.sh [path ...]      (default scope: src)
# Exit:   0 = no FAILs, 1 = one or more FAILs. WARNs never fail the run.

set -uo pipefail
cd "$(dirname "$0")/../.." || exit 1

SCOPE=("$@"); [ "$#" -eq 0 ] && SCOPE=("src")

RED=$'\033[31m'; YEL=$'\033[33m'; GRN=$'\033[32m'; DIM=$'\033[2m'; OFF=$'\033[0m'
[ -t 1 ] || { RED=""; YEL=""; GRN=""; DIM=""; OFF=""; }

fails=0; warns=0

# report LEVEL "rule" "why" "output"   — output empty means the check passed
report() {
  local level="$1" rule="$2" why="$3" out="${4:-}"
  [ -z "$out" ] && return 0
  if [ "$level" = FAIL ]; then
    fails=$((fails+1)); printf '%s\n' "${RED}FAIL${OFF}  ${rule}"
  else
    warns=$((warns+1)); printf '%s\n' "${YEL}WARN${OFF}  ${rule}"
  fi
  printf '%s\n' "${DIM}      ${why}${OFF}"
  printf '%s\n' "$out" | head -20 | sed 's/^/      /'
  echo
}

SRC() { grep -rEn --include='*.tsx' --include='*.ts' "$1" "${SCOPE[@]}" 2>/dev/null \
        | grep -v 'sentry-example-page' | grep -v 'lib/email/templates/'; }
CSS() { grep -rEn --include='*.css' "$1" "${SCOPE[@]}" 2>/dev/null; }

echo "── Motion (hard rule #1) ─────────────────────────────────────"

report WARN "new-style animation library import" \
  "The stack is GSAP + motion + three.js. Do not add framer-motion, anime, motionone, etc." \
  "$(SRC "from ['\"](framer-motion|@motionone|animejs|@react-spring)")"

report WARN "animation code without reduced-motion handling in the same file" \
  "Every GSAP/motion/three animation must honour prefers-reduced-motion (useReducedMotion)." \
  "$(grep -rlE "from ['\"]gsap['\"]|ScrollTrigger" --include='*.tsx' --include='*.ts' "${SCOPE[@]}" 2>/dev/null \
     | while IFS= read -r f; do grep -L 'reducedMotion\|useReducedMotion\|prefers-reduced-motion' "$f"; done)"

echo "── Tokens (hard rule #3) ─────────────────────────────────────"

report FAIL "hardcoded colour inside className or style" \
  "Add the colour to globals.css as a token, then use the generated utility." \
  "$(SRC '(className|style)=[^>]*#[0-9a-fA-F]{3,8}')"

report WARN "hex literal in source (outside globals.css)" \
  "Config values are acceptable; anything visual must be a token." \
  "$(SRC '#[0-9a-fA-F]{3,8}\b' | grep -vE '(className|style)=' | grep -vE '\s*(//|/\*|\*)' | grep -vE 'globals\.css')"

report FAIL "hardcoded colour in CSS outside :root / @theme" \
  "Literals belong in the token definitions at the top of globals.css only." \
  "$(CSS '#[0-9a-fA-F]{3,8}\b' | grep -v 'globals.css')"

echo "── Architecture (hard rules #4–#7) ───────────────────────────"

report FAIL "explicit any" \
  "Type it. If the shape is genuinely unknown use unknown + a zod parse." \
  "$(SRC ':\s*any\b|<any>|as any\b|any\[\]')"

report FAIL "next/router (Pages Router API)" \
  "Use next/navigation." \
  "$(SRC "from ['\"]next/router['\"]")"

report FAIL "middleware.ts — Next.js 16 renamed it to proxy.ts" \
  "Rename the file AND the exported function (middleware -> proxy)." \
  "$(ls src/middleware.ts middleware.ts 2>/dev/null)"

report FAIL "server-only env var read outside server code" \
  "Secrets stay in src/lib/**, src/app/api/**, src/db/**, config files — never in components under src/components/." \
  "$(SRC 'process\.env\.(?!NEXT_PUBLIC_)[A-Z_]+' 2>/dev/null; grep -rEn --include='*.tsx' --include='*.ts' 'process\.env\.' "${SCOPE[@]}" 2>/dev/null \
     | grep -vE 'NEXT_PUBLIC_|NODE_ENV' | grep 'src/components/')"

report WARN '"use client" on a layout or page' \
  "Server Components by default — push the boundary down to a leaf component." \
  "$(grep -rln '"use client"' $(find . -path ./node_modules -prune -o -name 'layout.tsx' -print -o -name 'page.tsx' -print 2>/dev/null | grep -E '^\./(src/app)' ) 2>/dev/null)"

echo "── Markup & a11y (hard rule #8) ──────────────────────────────"

report WARN "raw <img> instead of next/image" \
  "next/image with explicit width/height prevents CLS." "$(SRC '<img\s')"

report WARN "image without alt" \
  "Every image needs alt; decorative images take alt=\"\"." \
  "$(SRC '<(Image|img)\s[^>]*/?>' | grep -v 'alt=')"

report WARN "raw <a> for an internal link" \
  "Use <Link> from next/link." "$(SRC '<a\s+href=["'"'"']/')"

report WARN "click handler on a non-interactive element" \
  "Use a real <button>." "$(SRC '<(div|span)[^>]*onClick=')"

report WARN "more than one <h1> in a file" \
  "Exactly one <h1> per page; never skip heading levels." \
  "$(grep -rc '<h1' "${SCOPE[@]}" 2>/dev/null | awk -F: '$2>1' | grep -v 'verify-email/page.tsx')"

echo "── Hygiene (hard rule #9) ────────────────────────────────────"

report WARN "console.log in source" "Remove before committing." "$(SRC 'console\.(log|debug)')"
report WARN "TODO / FIXME marker" "Resolve, or move it to an issue." "$(SRC '(TODO|FIXME)')"

echo "──────────────────────────────────────────────────────────────"
if [ "$fails" -gt 0 ]; then
  printf '%s\n' "${RED}${fails} FAIL${OFF} / ${YEL}${warns} WARN${OFF} — every FAIL must be fixed."
  echo "Also required: pnpm lint, pnpm build, and the judgement checks in the qa-verify skill."
  exit 1
fi
printf '%s\n' "${GRN}0 FAIL${OFF} / ${YEL}${warns} WARN${OFF} — mechanical rules pass."
echo "Also required: pnpm lint, pnpm build, and the judgement checks in the qa-verify skill."
exit 0
