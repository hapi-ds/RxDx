#!/bin/bash

# Login
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "password123"}')

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)

# Create workitem
CREATE_RESPONSE=$(curl -s -X POST http://localhost:8000/api/v1/workitems \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"type": "requirement", "title": "Test Requirement for History", "description": "Test description", "status": "draft"}')

echo "Create response: $CREATE_RESPONSE"

WORKITEM_ID=$(echo $CREATE_RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin)['id'])" 2>/dev/null)

echo "Created workitem: $WORKITEM_ID"

# Update it twice
curl -s -X PATCH "http://localhost:8000/api/v1/workitems/$WORKITEM_ID?change_description=First%20update" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"title": "Test Updated 1"}' > /dev/null

curl -s -X PATCH "http://localhost:8000/api/v1/workitems/$WORKITEM_ID?change_description=Second%20update" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"title": "Test Updated 2"}' > /dev/null

# Get history
echo "Getting history..."
HISTORY=$(curl -s -X GET "http://localhost:8000/api/v1/workitems/$WORKITEM_ID/history" \
  -H "Authorization: Bearer $TOKEN")

echo "$HISTORY" | python3 -m json.tool
