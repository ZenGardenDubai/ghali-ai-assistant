#!/usr/bin/env bash
# Delete old marketing templates and create v2 replacements with opt-out text.
#
# Why: Meta reclassified several templates as MARKETING and requires marketing
# templates to include a clear opt-out mechanism ("Reply STOP to unsubscribe").
#
# Templates being replaced (all classified MARKETING by Meta):
#   ghali_broadcast       → ghali_broadcast_v2
#   ghali_broadcast_image → ghali_broadcast_image_v2
#   ghali_reminder        → ghali_reminder_v2
#   ghali_heartbeat       → ghali_heartbeat_v2
#   ghali_credits_low     → ghali_credits_low_v2
#   ghali_scheduled_task  → ghali_scheduled_task_v2
#   ghali_accept_terms    → deleted (not in codebase)
#
# Usage:
#   DIALOG360_API_KEY=<key> ./scripts/update-marketing-templates-360dialog.sh
#
# After running, new templates go into Meta review (status: "submitted", up to 48h).

set -euo pipefail

API_KEY="${DIALOG360_API_KEY:?Missing DIALOG360_API_KEY env var}"
BASE_URL="https://waba-v2.360dialog.io/v1/configs/templates"
HAD_ERRORS=false

# ──────────────────────────────────────
# Helper: delete a template by name
# ──────────────────────────────────────

delete_template() {
  local name="$1"
  echo "Deleting: ${name}"

  local http_code response
  response=$(curl -s -w "\n%{http_code}" -X DELETE "${BASE_URL}/${name}" \
    -H "D360-API-KEY: ${API_KEY}")

  http_code=$(echo "$response" | tail -1)
  body=$(echo "$response" | sed '$d')

  if [[ "$http_code" == "200" || "$http_code" == "204" ]]; then
    echo "  ✓ Deleted (HTTP ${http_code})"
  elif [[ "$http_code" == "404" ]]; then
    echo "  - Not found (already deleted)"
  else
    echo "  ✗ Failed (HTTP ${http_code})"
    echo "  Response: ${body}"
    HAD_ERRORS=true
    return 1
  fi
}

# ──────────────────────────────────────
# Helper: create a text-only template
# ──────────────────────────────────────

create_template() {
  local name="$1"
  local category="$2"
  local body_text="$3"
  local example="$4"

  echo "Submitting: ${name} (${category})"

  local payload
  payload=$(printf '{
  "name": "%s",
  "category": "%s",
  "language": "en",
  "components": [
    {
      "type": "BODY",
      "text": %s,
      "example": {
        "body_text": [[%s]]
      }
    }
  ]
}' "$name" "$category" "$body_text" "$example")

  local http_code response
  response=$(curl -s -w "\n%{http_code}" -X POST "${BASE_URL}" \
    -H "D360-API-KEY: ${API_KEY}" \
    -H "Content-Type: application/json" \
    -d "${payload}")

  http_code=$(echo "$response" | tail -1)
  body=$(echo "$response" | sed '$d')

  if [[ "$http_code" == "200" || "$http_code" == "201" ]]; then
    echo "  ✓ Submitted (HTTP ${http_code})"
  else
    echo "  ✗ Failed (HTTP ${http_code})"
    echo "  Response: ${body}"
    HAD_ERRORS=true
  fi
}

# ══════════════════════════════════════
# Step 1: Delete old templates
# ══════════════════════════════════════

echo "Step 1: Deleting old marketing templates..."
echo ""
delete_template "ghali_broadcast" || true
delete_template "ghali_broadcast_image" || true
delete_template "ghali_reminder" || true
delete_template "ghali_heartbeat" || true
delete_template "ghali_credits_low" || true
delete_template "ghali_scheduled_task" || true
delete_template "ghali_accept_terms" || true
echo ""

# ══════════════════════════════════════
# Step 2: Create v2 templates with opt-out text
# ══════════════════════════════════════

echo "Step 2: Creating v2 templates with opt-out text..."
echo ""

# 1. ghali_reminder_v2
create_template "ghali_reminder_v2" "MARKETING" \
  '"Hi from Ghali! Here is your scheduled reminder:\n\n{{1}}\n\nReply to chat with your AI assistant.\n\nReply STOP to unsubscribe."' \
  '"Drink 8 glasses of water today"'
echo ""

# 2. ghali_heartbeat_v2
create_template "ghali_heartbeat_v2" "MARKETING" \
  '"Hi from Ghali! Here is a check-in for you:\n\n{{1}}\n\nReply to chat with your AI assistant.\n\nReply STOP to unsubscribe."' \
  '"How did your interview go yesterday?"'
echo ""

# 3. ghali_broadcast_v2
create_template "ghali_broadcast_v2" "MARKETING" \
  '"Hi from Ghali! Here is an announcement:\n\n{{1}}\n\nReply to chat with your AI assistant.\n\nReply STOP to unsubscribe."' \
  '"We just launched image generation! Send any image idea to try it out."'
echo ""

# 4. ghali_broadcast_image_v2 (IMAGE header)
echo "Submitting: ghali_broadcast_image_v2 (MARKETING) [IMAGE]"
payload=$(cat <<'ENDJSON'
{
  "name": "ghali_broadcast_image_v2",
  "category": "MARKETING",
  "language": "en",
  "components": [
    {
      "type": "HEADER",
      "format": "IMAGE",
      "example": {
        "header_handle": ["https://ghali.ae/ghali-logo-with-bg.png"]
      }
    },
    {
      "type": "BODY",
      "text": "Hi from Ghali! Here is an announcement:\n\n{{1}}\n\nReply to chat with your AI assistant.\n\nReply STOP to unsubscribe.",
      "example": {
        "body_text": [["Check out our new feature update!"]]
      }
    }
  ]
}
ENDJSON
)

response=$(curl -s -w "\n%{http_code}" -X POST "${BASE_URL}" \
  -H "D360-API-KEY: ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d "${payload}")

http_code=$(echo "$response" | tail -1)
body=$(echo "$response" | sed '$d')

if [[ "$http_code" == "200" || "$http_code" == "201" ]]; then
  echo "  ✓ Submitted (HTTP ${http_code})"
else
  echo "  ✗ Failed (HTTP ${http_code})"
  echo "  Response: ${body}"
  HAD_ERRORS=true
fi
echo ""

# 5. ghali_credits_low_v2
create_template "ghali_credits_low_v2" "MARKETING" \
  '"You have {{1}} credits remaining this month. Need more? Send \"upgrade\" to learn about Pro.\n\nReply STOP to unsubscribe."' \
  '"5"'
echo ""

# 6. ghali_scheduled_task_v2
create_template "ghali_scheduled_task_v2" "MARKETING" \
  '"📋 Scheduled Task Result:\n\n{{1}}\n\nReply to chat with your AI assistant.\n\nReply STOP to unsubscribe."' \
  '"Here is your daily news briefing for March 15, 2026."'
echo ""

# ══════════════════════════════════════
# Step 3: Verify
# ══════════════════════════════════════

echo "══════════════════════════════════════"
echo "Fetching current template status..."
echo ""

response=$(curl -s -X GET "${BASE_URL}" \
  -H "D360-API-KEY: ${API_KEY}")

echo "$response" | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    templates = data if isinstance(data, list) else data.get('waba_templates', data.get('data', data.get('templates', [])))
    if not isinstance(templates, list):
        print('Response:', json.dumps(data, indent=2)[:500])
        sys.exit(0)
    ghali = [t for t in templates if t.get('name', '').startswith('ghali_')]
    if not ghali:
        print('No ghali_* templates found.')
    else:
        print(f'Found {len(ghali)} Ghali templates:')
        print(f'{\"Name\":<35} {\"Status\":<15} {\"Category\":<12}')
        print('-' * 62)
        for t in sorted(ghali, key=lambda x: x.get('name','')):
            print(f'{t.get(\"name\",\"?\"):<35} {t.get(\"status\",\"?\"):<15} {t.get(\"category\",\"?\"):<12}')
except Exception as e:
    print(f'Error parsing response: {e}')
"

echo ""
if [[ "$HAD_ERRORS" == "true" ]]; then
  echo "⚠ Some operations failed — see errors above."
  exit 1
fi
echo "Done. New v2 templates will be reviewed by Meta (up to 48h)."
