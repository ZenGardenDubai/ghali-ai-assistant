#!/usr/bin/env bash
# Create all Ghali WhatsApp message templates in 360dialog WABA.
#
# Usage:
#   DIALOG360_API_KEY=<key> ./scripts/create-templates-360dialog.sh
#
# Templates go into Meta review after creation — status will be "submitted"
# initially, then "APPROVED" after review (up to 48h).

set -euo pipefail

API_KEY="${DIALOG360_API_KEY:?Missing DIALOG360_API_KEY env var}"
BASE_URL="https://waba-v2.360dialog.io/v1/configs/templates"

submit_template() {
  local name="$1"
  local category="$2"
  local body_text="$3"
  local examples="$4"  # JSON array of example strings

  local payload
  payload=$(cat <<ENDJSON
{
  "name": "${name}",
  "category": "${category}",
  "language": "en",
  "components": [
    {
      "type": "BODY",
      "text": ${body_text},
      "example": {
        "body_text": [${examples}]
      }
    }
  ]
}
ENDJSON
)

  echo "──────────────────────────────────────"
  echo "Submitting: ${name} (${category})"

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
  fi
  echo "  Response: ${body}"
  echo ""
}

echo "Creating 9 Ghali templates in 360dialog WABA..."
echo ""

# 1. ghali_reminder — UTILITY, 1 var
submit_template "ghali_reminder" "UTILITY" \
  '"Hi from Ghali! Here is your scheduled reminder:\n\n{{1}}\n\nReply to chat with your AI assistant."' \
  '["Drink 8 glasses of water today"]'

# 2. ghali_heartbeat — UTILITY, 1 var
submit_template "ghali_heartbeat" "UTILITY" \
  '"Hi from Ghali! Here is a check-in for you:\n\n{{1}}\n\nReply to chat with your AI assistant."' \
  '["How did your interview go yesterday?"]'

# 3. ghali_broadcast — MARKETING, 1 var
submit_template "ghali_broadcast" "MARKETING" \
  '"Hi from Ghali! Here is an announcement:\n\n{{1}}\n\nReply to chat with your AI assistant."' \
  '["We just launched image generation! Send any image idea to try it out."]'

# 4. ghali_broadcast_image — MARKETING, 1 var
submit_template "ghali_broadcast_image" "MARKETING" \
  '"Hi from Ghali! Here is an announcement:\n\n{{1}}\n\nReply to chat with your AI assistant."' \
  '["Check out our new feature update!"]'

# 5. ghali_credits_reset — UTILITY, 2 vars
submit_template "ghali_credits_reset" "UTILITY" \
  '"Your {{2}} credits have been refreshed. You now have {{1}} credits for this month."' \
  '["60", "Basic"]'

# 6. ghali_credits_low — UTILITY, 1 var
submit_template "ghali_credits_low" "UTILITY" \
  '"You have {{1}} credits remaining this month. Need more? Send \"upgrade\" to learn about Pro."' \
  '["5"]'

# 7. ghali_subscription_active — UTILITY, 1 var
submit_template "ghali_subscription_active" "UTILITY" \
  '"Your Ghali Pro plan is now active. You have {{1}} credits this month."' \
  '["600"]'

# 8. ghali_subscription_ended — UTILITY, 1 var
submit_template "ghali_subscription_ended" "UTILITY" \
  '"Your Pro plan has ended. You'\''re now on the Basic plan with {{1}} credits/month."' \
  '["60"]'

# 9. ghali_scheduled_task — UTILITY, 1 var
submit_template "ghali_scheduled_task" "UTILITY" \
  '"📋 Scheduled Task Result:\n\n{{1}}\n\nReply to chat with your AI assistant."' \
  '["Here is your daily news briefing for March 10, 2026."]'

echo "══════════════════════════════════════"
echo "All templates submitted. Fetching current status..."
echo ""

# Fetch all templates and show status
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
        print('No ghali_* templates found in response.')
        print('Full response (truncated):', json.dumps(data, indent=2)[:500])
    else:
        print(f'Found {len(ghali)} Ghali templates:')
        print(f'{\"Name\":<30} {\"Status\":<15} {\"Category\":<12}')
        print('-' * 57)
        for t in sorted(ghali, key=lambda x: x.get('name','')):
            print(f'{t.get(\"name\",\"?\"):<30} {t.get(\"status\",\"?\"):<15} {t.get(\"category\",\"?\"):<12}')
except Exception as e:
    print(f'Error parsing response: {e}')
    print('Raw:', sys.stdin.read()[:300] if hasattr(sys.stdin, 'read') else '')
"

echo ""
echo "Done. Templates in 'submitted' status will be reviewed by Meta (up to 48h)."
