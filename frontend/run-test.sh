#!/bin/bash
cd "$(dirname "$0")"
npm run test:run -- src/stores/timeTrackingStore.taskSelection.properties.test.ts
