#!/bin/bash

# Login
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "password123"}')

TOKEN=$(echo $LOGIN_RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin)['access_token'])" 2>/dev/null)

if [ -z "$TOKEN" ]; then
  echo "Failed to login"
  exit 1
fi

# Get graph visualization
echo "Getting graph visualization..."
curl -s -X GET "http://localhost:8000/api/v1/graph/visualization" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool 2>&1 | head -50
