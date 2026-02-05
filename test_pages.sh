#!/bin/bash

# Test script to verify Documents and Templates pages load without errors

echo "Testing Documents and Templates pages..."
echo ""

# Test Documents page
echo "1. Testing Documents page..."
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5173/documents)
if [ "$RESPONSE" = "200" ]; then
    echo "   ✓ Documents page loads (HTTP 200)"
else
    echo "   ✗ Documents page failed (HTTP $RESPONSE)"
fi

# Test Templates page
echo "2. Testing Templates page..."
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5173/templates)
if [ "$RESPONSE" = "200" ]; then
    echo "   ✓ Templates page loads (HTTP 200)"
else
    echo "   ✗ Templates page failed (HTTP $RESPONSE)"
fi

echo ""
echo "Note: These tests only verify HTTP responses."
echo "To test for JavaScript errors, open the pages in a browser and check the console."
echo ""
echo "Frontend: http://localhost:5173"
echo "Documents: http://localhost:5173/documents"
echo "Templates: http://localhost:5173/templates"
