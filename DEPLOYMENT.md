# Deployment Guide

## Setting Up API Key Authentication

**IMPORTANT**: The API key should be set in the Digital Ocean App Platform dashboard or via CLI, NOT in version control.

### Option 1: Via Digital Ocean Dashboard

1. Go to your app in Digital Ocean
2. Navigate to Settings → App-Level Environment Variables
3. Add a new variable:
   - Name: `API_KEY`
   - Value: Your API key (e.g., `UTafjWIufSFApp1P3i3HqrRhiXbt9FRae8JLQj7cg1w`)
   - Type: Secret
4. Save and redeploy

### Option 2: Via CLI

```bash
# Get your app ID
doctl apps list

# Update the environment variable
doctl apps update <app-id> --spec .do/app.yaml

# Or update directly via API
doctl apps env get <app-id>
```

### Option 3: During Initial Deployment

If deploying for the first time, edit `.do/app.yaml` locally (don't commit it):

```yaml
envs:
  - key: API_KEY
    value: YOUR_API_KEY_HERE
    scope: RUN_TIME
    type: SECRET
```

Then deploy:
```bash
doctl apps create --spec .do/app.yaml
```

Then immediately revert the change in `.do/app.yaml` and push the clean version.

## Testing Authentication

After setting the API key:

```bash
# Test without auth (should return 401)
curl https://your-app-url/sse

# Test with auth via header
curl -H "Authorization: Bearer YOUR_API_KEY" \
  https://your-app-url/sse

# Test with auth via query parameter
curl "https://your-app-url/sse?apiKey=YOUR_API_KEY"
```

## Rotating API Keys

If you need to change the API key:

1. Update the value in Digital Ocean dashboard
2. Redeploy the app
3. Update N8N and other clients with the new key

