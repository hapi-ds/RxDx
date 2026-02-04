#!/bin/bash

# Get token
echo "Getting authentication token..."
TOKEN=$(curl -s -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@rxdx.example.com", "password": "password123"}' \
  | jq -r '.access_token')

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo "Failed to get token"
  exit 1
fi

echo "Token obtained successfully"
echo ""

# Get risks
echo "Fetching risks from API..."
curl -s "http://localhost:8000/api/v1/risks/?page=1&size=10" \
  -H "Authorization: Bearer $TOKEN" \
  | jq '{total: .total, pages: .pages, item_count: (.items | length), first_risk: .items[0].title}'
