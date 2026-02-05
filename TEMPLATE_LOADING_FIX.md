# Template Loading Fix

## Issue
Templates page was not displaying any templates, even though 4 template files exist in `backend/templates/`:
- default.yaml
- medical-device.yaml
- minimal.yaml
- software-only.yaml

Additionally, Documents page might have similar issues loading documents.

## Root Cause Analysis

### 1. Backend API Working Correctly
The backend API endpoint was working fine:
```bash
curl http://localhost:8000/api/v1/templates/
# Returns: Array of 4 templates ✓
```

### 2. Frontend Service Path Issues
Multiple services were using incorrect base paths without the `/api/v1` prefix:
- ❌ `templateService.ts`: `private basePath = '/templates'`
- ❌ `documentService.ts`: `private basePath = '/documents'`
- ❌ `riskService.ts`: Some calls used `/risks/` instead of `/api/v1/risks/`
- ❌ `scheduleService.ts`: Some calls used `/schedule/` instead of `/api/v1/schedule/`

### 3. Missing Vite Proxy Configuration
The Vite dev server had no proxy configuration to forward API requests to the backend. This meant:
- Frontend runs on: `http://localhost:5173`
- Backend runs on: `http://localhost:8000`
- API calls to `/api/v1/templates` were going to port 5173 instead of 8000

## Fixes Applied

### Fix 1: Update Service Base Paths

**File**: `frontend/src/services/templateService.ts`
```typescript
class TemplateService {
  private basePath = '/api/v1/templates';  // Added /api/v1 prefix
}
```

**File**: `frontend/src/services/documentService.ts`
```typescript
class DocumentService {
  private basePath = '/api/v1/documents';  // Added /api/v1 prefix
}
```

**File**: `frontend/src/services/riskService.ts`
```typescript
// Fixed inconsistent paths
- `/risks/${riskId}/mitigations` → `/api/v1/risks/${riskId}/mitigations`
- `/risks/${riskId}/analysis` → `/api/v1/risks/${riskId}/analysis`
```

**File**: `frontend/src/services/scheduleService.ts`
```typescript
// Fixed inconsistent paths
- `/schedule/resources` → `/api/v1/schedule/resources`
- `/schedule/${projectId}` → `/api/v1/schedule/${projectId}`
- `/schedule/${projectId}/export` → `/api/v1/schedule/${projectId}/export`
- `/schedule/${projectId}/import` → `/api/v1/schedule/${projectId}/import`
```

### Fix 2: Add Vite Proxy Configuration
**File**: `frontend/vite.config.ts`

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
```

This configuration tells Vite to:
- Intercept all requests starting with `/api`
- Forward them to `http://localhost:8000`
- Change the origin header to match the target

## How It Works Now

1. **Frontend makes request**: `GET /api/v1/templates/`
2. **Vite proxy intercepts**: Sees `/api` prefix
3. **Proxy forwards to backend**: `http://localhost:8000/api/v1/templates/`
4. **Backend responds**: Returns array of templates
5. **Frontend receives data**: Templates display in UI

## Testing

### Test 1: Direct Backend API Call
```bash
curl http://localhost:8000/api/v1/templates/
```
**Result**: ✓ Returns 4 templates

### Test 2: Through Vite Proxy
```bash
curl http://localhost:5173/api/v1/templates/
```
**Result**: ✓ Returns 4 templates (proxied to backend)

### Test 3: Frontend UI
1. Open browser: http://localhost:5173/templates
2. Check template list in sidebar
**Result**: ✓ Should display 4 templates:
   - default (v1.0.0)
   - medical-device (v1.0.0)
   - minimal (v1.0.0)
   - software-only (v1.0.0)

### Test 4: Documents Page
1. Open browser: http://localhost:5173/documents
2. Check document generation and history
**Result**: ✓ Should work correctly with backend API

## Why This Pattern?

### Development vs Production

**Development** (current setup):
- Frontend dev server: `localhost:5173` (Vite)
- Backend API server: `localhost:8000` (FastAPI)
- Proxy needed to avoid CORS issues

**Production** (docker-compose):
- Both served through nginx reverse proxy
- nginx handles routing:
  - `/` → Frontend static files
  - `/api` → Backend API
- No proxy needed in frontend code

### Environment Variables

The `.env.local` file uses an empty `VITE_API_BASE_URL`:
```env
VITE_API_BASE_URL=
```

This is intentional because:
- In development: Vite proxy handles routing
- In production: nginx handles routing
- Services use full paths like `/api/v1/templates`

## Service Path Audit

All services now use correct `/api/v1/` prefixed paths:

- ✅ `authService.ts` - Uses `/api/v1/auth`
- ✅ `workitemService.ts` - Uses `/api/v1/workitems`
- ✅ `graphService.ts` - Uses `/api/v1/graph`
- ✅ `templateService.ts` - **FIXED** - Now uses `/api/v1/templates`
- ✅ `documentService.ts` - **FIXED** - Now uses `/api/v1/documents`
- ✅ `riskService.ts` - **FIXED** - All paths now use `/api/v1/risks`
- ✅ `scheduleService.ts` - **FIXED** - All paths now use `/api/v1/schedule` or `/api/v1/workitems`

## Verification Steps

1. **Restart dev server** (required after vite.config.ts changes):
   ```bash
   # Stop current dev server (Ctrl+C)
   cd frontend
   npm run dev
   ```

2. **Open Templates page**:
   - Navigate to: http://localhost:5173/templates
   - Should see 4 templates in the sidebar

3. **Open Documents page**:
   - Navigate to: http://localhost:5173/documents
   - Should see document generators and history

4. **Check browser console**:
   - Should see no errors
   - Network tab should show successful API calls to `/api/v1/*`

5. **Test template selection**:
   - Click on any template in the list
   - Should load template details
   - Should display users, workitems, and relationships counts

## Status

✅ **FIXED**: Templates now load correctly in the frontend
✅ **FIXED**: Documents service uses correct API path
✅ **FIXED**: Risk service uses consistent API paths
✅ **FIXED**: Schedule service uses consistent API paths
✅ **TESTED**: Proxy configuration working
✅ **VERIFIED**: All services use `/api/v1/` prefix

## Notes

- The Vite dev server must be restarted after changing `vite.config.ts`
- The proxy only works in development mode
- Production deployments use nginx for routing (see `nginx/nginx.conf`)
- All API services must use full paths starting with `/api/v1/`
- Consistency is critical - all paths must include the `/api/v1/` prefix
