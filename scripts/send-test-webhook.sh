#!/usr/bin/env bash
# Usage:
#   ./scripts/send-test-webhook.sh <razorpayOrderId> [event]
#   ./scripts/send-test-webhook.sh order_Pq1xAbC payment.captured
#   ./scripts/send-test-webhook.sh order_Pq1xAbC payment.failed
set -euo pipefail

ORDER_ID="${1:?Usage: $0 <razorpayOrderId> [event]}"
EVENT="${2:-payment.captured}"
URL="${WEBHOOK_URL:-http://localhost:${PORT:-3000}/webhooks/razorpay}"

cd "$(dirname "$0")/.."
SECRET=$(grep '^RAZORPAY_WEBHOOK_SECRET=' .env | cut -d= -f2- | tr -d '\r')

BODY="{\"event\":\"$EVENT\",\"payload\":{\"payment\":{\"entity\":{\"id\":\"pay_demo_$(date +%s)\",\"order_id\":\"$ORDER_ID\"}}}}"
SIG=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "$SECRET" | awk '{print $NF}')

echo "Sending $EVENT for $ORDER_ID"
curl -s -X POST "$URL" \
  -H "Content-Type: application/json" \
  -H "x-razorpay-signature: $SIG" \
  -H "x-razorpay-event-id: evt_demo_$(date +%s)" \
  --data-raw "$BODY"
echo
