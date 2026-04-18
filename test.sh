#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ "$(basename "$SCRIPT_DIR")" != "astro-shopsavvy" ]]; then
  echo "WARNING: test.sh should be run from the astro-shopsavvy directory."
  echo "         Current directory: $SCRIPT_DIR"
fi

cd "$SCRIPT_DIR"

echo "astro-shopsavvy Integration Tests"
echo "=================================="
echo ""

# ── Structural checks ────────────────────────────────────────────────────────

echo "Checking required files..."
REQUIRED=(
  "src/index.ts"
  "src/integration.ts"
  "src/middleware.ts"
  "src/client.ts"
  "src/schema.ts"
  "src/types.ts"
  "src/rss.ts"
  "src/loaders/products.ts"
  "src/endpoints/handlers.ts"
  "src/components/ProductCard.astro"
  "src/components/PriceComparisonTable.astro"
  "src/components/DealFeed.astro"
  "src/components/PriceHistory.astro"
  "package.json"
  "tsconfig.json"
  "README.md"
  "LICENSE"
  ".gitignore"
)
MISSING=0
for f in "${REQUIRED[@]}"; do
  if [ ! -f "$f" ]; then
    echo "  MISSING: $f"
    MISSING=$((MISSING + 1))
  fi
done
if [ "$MISSING" -eq 0 ]; then
  echo "  All required files present"
else
  echo "  $MISSING required file(s) missing"
  exit 1
fi
echo ""

# ── Component checks ─────────────────────────────────────────────────────────

echo "Checking Astro component structure..."
for component in ProductCard PriceComparisonTable DealFeed PriceHistory; do
  file="src/components/${component}.astro"
  if grep -q "interface Props" "$file"; then
    echo "  $component.astro — Props interface present"
  else
    echo "  FAIL: $component.astro missing Props interface"
    exit 1
  fi
done
echo ""

# ── Zero-JS assertion ────────────────────────────────────────────────────────

echo "Checking zero-JS components (ProductCard + PriceComparisonTable)..."
for component in ProductCard PriceComparisonTable; do
  file="src/components/${component}.astro"
  if ! grep -q "<script" "$file"; then
    echo "  $component.astro — no client JS (correct)"
  else
    echo "  FAIL: $component.astro contains <script> tag (should be zero-JS)"
    exit 1
  fi
done
echo ""

# ── Island assertions ────────────────────────────────────────────────────────

echo "Checking interactive islands (DealFeed + PriceHistory have client script)..."
for component in DealFeed PriceHistory; do
  file="src/components/${component}.astro"
  if grep -q "<script" "$file"; then
    echo "  $component.astro — client script present (correct)"
  else
    echo "  FAIL: $component.astro missing <script> tag (should be interactive)"
    exit 1
  fi
done
echo ""

# ── Key exports check ────────────────────────────────────────────────────────

echo "Checking key exports in src/index.ts..."
EXPORTS=(shopsavvy shopsavvyLoader ShopSavvySchema createClient handleShopSavvyRequest dealsToRssItems productToRssItem)
for export_name in "${EXPORTS[@]}"; do
  if grep -q "$export_name" src/index.ts; then
    echo "  Exported: $export_name"
  else
    echo "  FAIL: src/index.ts missing export '$export_name'"
    exit 1
  fi
done
echo ""

# ── TypeScript + unit tests ──────────────────────────────────────────────────

if command -v bun &>/dev/null; then
  echo "Installing dependencies..."
  bun install --silent

  echo ""
  echo "Running TypeScript type check..."
  if bun run typecheck 2>&1 | grep -E "^src/"; then
    echo "  TypeScript errors found"
    exit 1
  else
    echo "  TypeScript OK"
  fi

  echo ""
  echo "Running export tests..."
  bun run tests/test-exports.ts

  echo ""
  echo "Running schema tests..."
  bun run tests/test-schema.ts
else
  echo "bun not found — skipping TypeScript and unit tests"
fi

echo ""
echo "All checks passed."
