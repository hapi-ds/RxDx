# Diagnose Risks UI Issue

## Steps to Debug

### 1. Check Browser Console
1. Open http://localhost:3000/risks in your browser
2. Open Developer Tools (F12)
3. Go to the Console tab
4. Look for these log messages:
   - `[RisksPage] Loading risks with filters:`
   - `[RisksPage] API response:`
   - `[RisksPage] Items count:`

### 2. Check Network Tab
1. In Developer Tools, go to the Network tab
2. Refresh the page (F5)
3. Look for a request to `/api/v1/risks/` or `/risks/`
4. Click on that request and check:
   - **Status**: Should be 200 (not 304, 401, or 500)
   - **Response**: Should show JSON with `items`, `total`, `pages`
   - **Preview**: Should show an array of risk objects

### 3. Check for Errors
Look for any red error messages in the console that might indicate:
- Authentication errors
- Network errors
- JavaScript errors

### 4. Test API Directly
Run this in your terminal to verify the API works:
```bash
./test_risks_api.sh
```

Expected output:
```json
{
  "total": 5,
  "pages": 1,
  "item_count": 5,
  "first_risk": "Unauthorized Access Risk"
}
```

## Common Issues and Solutions

### Issue 1: 401 Unauthorized
**Symptom**: Network tab shows 401 status
**Solution**: 
- Log out and log back in
- Clear browser cookies
- Check if token is expired

### Issue 2: 304 Not Modified (Cached Response)
**Symptom**: Network tab shows 304 status
**Solution**:
- Hard refresh: Ctrl+Shift+R (Linux/Windows) or Cmd+Shift+R (Mac)
- Open in incognito/private window
- Clear browser cache

### Issue 3: Empty Response
**Symptom**: API returns 200 but `items` array is empty
**Solution**:
- Check backend logs: `docker logs rxdx-backend --tail 50`
- Verify database has risks: See step 4 above
- Check if backend code was restarted after fix

### Issue 4: CORS Error
**Symptom**: Console shows CORS policy error
**Solution**:
- Check nginx configuration
- Restart nginx: `docker compose restart nginx`

### Issue 5: Frontend Not Updated
**Symptom**: Console logs don't appear
**Solution**:
- Rebuild frontend: `docker compose restart frontend`
- Wait 30 seconds for rebuild
- Hard refresh browser

## What to Report

If risks still don't show, please provide:

1. **Console logs**: Copy all messages from browser console
2. **Network request**: 
   - URL of the request
   - Status code
   - Response body (from Preview or Response tab)
3. **Any error messages**: Red errors in console
4. **API test result**: Output from `./test_risks_api.sh`

This will help identify exactly where the issue is occurring.
