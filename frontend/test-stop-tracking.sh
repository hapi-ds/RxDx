#!/bin/bash
# Test script for stopTracking optimistic updates

cd "$(dirname "$0")"

echo "Running stopTracking tests..."
npx vitest run src/stores/timeTrackingStore.test.ts -t "stopTracking" 2>&1

echo ""
echo "Running persistence tests for stopTracking..."
npx vitest run src/stores/timeTrackingStore.persistence.test.ts -t "stop tracking" 2>&1
