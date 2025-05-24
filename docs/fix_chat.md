# Chat System Troubleshooting Guide

## Recent Fixes

We've resolved several key issues affecting the chat functionality:

1. **Fixed Infinite Recursion Error**: Removed code in `before_request` that was causing severe recursion when accessing user data.
2. **Fixed API Routes**: Modified the React app routing to properly handle API requests.
3. **Improved Error Handling**: Simplified error handlers to avoid cascading errors.

## Testing the Chat API

You can test the chat API directly using one of these methods:

### Method 1: Using the API Test Page

1. Log in at: `/auth/login`
2. Visit the API test page at: `/api_test.html`
3. Click "Test Connection" to verify basic connectivity
4. Send a test message to see if the API responds correctly

### Method 2: Using curl

```bash
# Log in first via web browser, then use cookies from browser
curl -X POST http://localhost:8081/api/chat \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "X-Requested-With: XMLHttpRequest" \
  --cookie "session=YOUR_SESSION_COOKIE" \
  -d '{"message":"Hello"}'
```

### Method 3: Using the Python Test Script

```bash
# Edit YOUR_SESSION_COOKIE in test_api_chat.py first
python test_api_chat.py
```

## Common Issues and Solutions

### 1. Authentication Problems

**Symptoms**: 
- Redirects to login page
- 401 Unauthorized errors
- HTML received instead of JSON

**Solutions**:
- Make sure you're logged in
- Include `credentials: 'include'` in fetch requests
- Add `X-Requested-With: XMLHttpRequest` header to identify API requests

### 2. CORS Issues

**Symptoms**:
- Console errors about CORS policy
- API calls blocked by browser

**Solutions**:
- Ensure CORS is properly configured in Flask
- Check that your request contains proper headers
- Dev environment should have CORS enabled for local domains

### 3. JSON Parsing Errors

**Symptoms**:
- "Invalid JSON" errors
- Server returning HTML instead of JSON

**Solutions**:
- Add proper `Accept: application/json` header
- Check server logs for errors in API routes
- Look for HTML error pages being returned instead of JSON

## Quick Start

For the quickest setup:

1. Run the server with detailed logging:
   ```bash
   python server_test.py
   ```

2. Visit `/auth/login` to log in
   
3. Visit `/chat` to access the chat interface

If issues persist, check the server logs for detailed error information. 