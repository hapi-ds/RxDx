#!/bin/bash

# Test script to verify version increment functionality

echo "=== Testing WorkItem Version Increment ==="
echo ""

# First, login to get a token
echo "1. Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "password123"}')

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ Failed to login"
  exit 1
fi

echo "✓ Logged in successfully"
echo ""

# Create a test workitem
echo "2. Creating a test workitem..."
CREATE_RESPONSE=$(curl -s -X POST http://localhost:8000/api/v1/workitems \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "type": "requirement",
    "title": "Test Requirement for Version Check",
    "description": "Initial version",
    "status": "draft",
    "priority": 3
  }')

WORKITEM_ID=$(echo $CREATE_RESPONSE | grep -o '"id":"[^"]*' | cut -d'"' -f4)
INITIAL_VERSION=$(echo $CREATE_RESPONSE | grep -o '"version":"[^"]*' | cut -d'"' -f4)

if [ -z "$WORKITEM_ID" ]; then
  echo "❌ Failed to create workitem"
  echo "Response: $CREATE_RESPONSE"
  exit 1
fi

echo "✓ Created workitem: $WORKITEM_ID"
echo "  Initial version: $INITIAL_VERSION"
echo ""

# Update the workitem
echo "3. Updating the workitem..."
UPDATE_RESPONSE=$(curl -s -X PATCH "http://localhost:8000/api/v1/workitems/$WORKITEM_ID?change_description=Updated%20title" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "Updated Test Requirement",
    "description": "Updated version"
  }')

NEW_VERSION=$(echo $UPDATE_RESPONSE | grep -o '"version":"[^"]*' | cut -d'"' -f4)

echo "✓ Updated workitem"
echo "  New version: $NEW_VERSION"
echo ""

# Get version history
echo "4. Checking version history..."
HISTORY_RESPONSE=$(curl -s -X GET "http://localhost:8000/api/v1/workitems/$WORKITEM_ID/history" \
  -H "Authorization: Bearer $TOKEN")

VERSION_COUNT=$(echo $HISTORY_RESPONSE | grep -o '"version"' | wc -l)

echo "✓ Version history retrieved"
echo "  Number of versions: $VERSION_COUNT"
echo ""

# Verify results
echo "=== Results ==="
if [ "$INITIAL_VERSION" = "1.0" ] && [ "$NEW_VERSION" = "1.1" ]; then
  echo "✅ Version increment working correctly!"
  echo "   Initial: $INITIAL_VERSION → Updated: $NEW_VERSION"
else
  echo "❌ Version increment NOT working"
  echo "   Initial: $INITIAL_VERSION → Updated: $NEW_VERSION (expected 1.1)"
fi

if [ "$VERSION_COUNT" -ge 1 ]; then
  echo "✅ Version history contains versions"
else
  echo "❌ Version history is empty or incomplete"
fi

echo ""
echo "Full update response:"
echo "$UPDATE_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$UPDATE_RESPONSE"
