# LLM API Proxy Server Setup

## Why Do You Need This?

Web browsers block direct API calls to services like Anthropic, OpenAI, and Google due to CORS (Cross-Origin Resource Sharing) security restrictions. The proxy server acts as a middleman, allowing your frontend application to communicate with these APIs securely.

## Quick Start

### 1. Install Dependencies

```bash
cd /Users/kalpanamadupathi/Documents/GitHub/RegNav.AI
npm install express cors node-fetch
```

### 2. Start the Proxy Server

```bash
node proxy-server.js
```

You should see:
```
🚀 LLM API Proxy Server running on http://localhost:3001

📋 Available endpoints:
   GET  http://localhost:3001/health
   POST http://localhost:3001/api/anthropic
   POST http://localhost:3001/api/openai
   POST http://localhost:3001/api/google

✅ CORS enabled for all origins
```

### 3. Start Your Frontend (in a separate terminal)

```bash
cd regnav-frontend
npm start
```

### 4. Test Your API Key

1. Go to **Settings** in the app
2. Configure your **Anthropic API key**
3. Click **Test Connection**
4. You should see "Connected successfully" ✅

## Troubleshooting

### Error: "Cannot connect to proxy server"

**Problem**: The proxy server is not running or is on a different port.

**Solution**:
- Make sure you ran `node proxy-server.js` in a separate terminal
- Check that port 3001 is not being used by another application
- Verify the proxy is running by visiting: http://localhost:3001/health

### Error: "API key is invalid" or "401 Unauthorized"

**Problem**: Your API key is incorrect or expired.

**Solution**:
- Verify your API key at: https://console.anthropic.com/settings/keys
- Make sure you're using the correct key format (starts with `sk-ant-`)
- Check that your API key has not expired

### Error: "Rate limit exceeded"

**Problem**: You've exceeded Anthropic's rate limits.

**Solution**:
- Wait a few minutes before trying again
- Upgrade your Anthropic plan if needed
- Check your usage at: https://console.anthropic.com/settings/usage

### Proxy Server Crashes

**Problem**: The proxy server stops unexpectedly.

**Solution**:
- Check the terminal for error messages
- Ensure all dependencies are installed: `npm install express cors node-fetch`
- Restart the proxy server: `node proxy-server.js`

## Running Both Servers

You need to run TWO things simultaneously:

**Terminal 1 - Proxy Server:**
```bash
cd /Users/kalpanamadupathi/Documents/GitHub/RegNav.AI
node proxy-server.js
```

**Terminal 2 - Frontend:**
```bash
cd /Users/kalpanamadupathi/Documents/GitHub/RegNav.AI/regnav-frontend
npm start
```

## Production Deployment

For production, you should:

1. Deploy the proxy server to a cloud service (AWS, Heroku, etc.)
2. Update the `PROXY_URL` in `src/services/llm/anthropicClient.ts` to your production URL
3. Store API keys securely (environment variables, secrets manager)
4. Add authentication to the proxy endpoints
5. Enable rate limiting and monitoring

## Security Notes

⚠️ **Important Security Considerations:**

1. **API Keys**: Never commit API keys to version control
2. **Environment Variables**: Use `.env` files for sensitive configuration
3. **Authentication**: Add authentication to proxy endpoints in production
4. **Rate Limiting**: Implement rate limiting to prevent abuse
5. **Logging**: Monitor and log API usage for security auditing

## Alternative: Backend API

For a more robust solution, consider building a full backend API:

1. Create a FastAPI or Express backend
2. Handle authentication and user management
3. Store API keys securely in a database
4. Implement usage tracking and billing
5. Add caching to reduce API costs

See `AI_PROMPTS_AND_CODE_TEMPLATES.md` for backend implementation examples.
