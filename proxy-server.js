/**
 * Simple Proxy Server for LLM API Calls
 * 
 * This proxy allows the frontend to make API calls to LLM providers
 * without exposing API keys or dealing with CORS issues.
 * 
 * Usage:
 * 1. npm install express cors node-fetch
 * 2. node proxy-server.js
 * 3. Update frontend to use http://localhost:3001/api/anthropic
 */

const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Anthropic Claude API Proxy
app.post('/api/anthropic', async (req, res) => {
  try {
    const { apiKey, model, messages, maxTokens, temperature, topP } = req.body;

    if (!apiKey) {
      return res.status(400).json({ error: 'API key is required' });
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: model || 'claude-sonnet-4-20250514',
        max_tokens: maxTokens || 4096,
        messages: messages || [{ role: 'user', content: 'Hello' }],
        temperature: temperature !== undefined ? temperature : 1,
        top_p: topP !== undefined ? topP : 1,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data.error || { message: 'Anthropic API error' },
      });
    }

    res.json(data);
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({
      error: {
        message: error.message || 'Internal server error',
        type: 'proxy_error',
      },
    });
  }
});

// OpenAI API Proxy
app.post('/api/openai', async (req, res) => {
  try {
    const { apiKey, model, messages, maxTokens, temperature } = req.body;

    if (!apiKey) {
      return res.status(400).json({ error: 'API key is required' });
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model || 'gpt-4',
        messages: messages || [{ role: 'user', content: 'Hello' }],
        max_tokens: maxTokens || 4096,
        temperature: temperature !== undefined ? temperature : 1,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    res.json(data);
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({
      error: {
        message: error.message || 'Internal server error',
        type: 'proxy_error',
      },
    });
  }
});

// Google Gemini API Proxy
app.post('/api/google', async (req, res) => {
  try {
    const { apiKey, model, prompt, maxTokens, temperature } = req.body;

    if (!apiKey) {
      return res.status(400).json({ error: 'API key is required' });
    }

    const modelName = model || 'gemini-pro';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt || 'Hello' }]
        }],
        generationConfig: {
          maxOutputTokens: maxTokens || 4096,
          temperature: temperature !== undefined ? temperature : 1,
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    res.json(data);
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({
      error: {
        message: error.message || 'Internal server error',
        type: 'proxy_error',
      },
    });
  }
});

app.listen(PORT, () => {
  console.log(`\n🚀 LLM API Proxy Server running on http://localhost:${PORT}`);
  console.log(`\n📋 Available endpoints:`);
  console.log(`   GET  http://localhost:${PORT}/health`);
  console.log(`   POST http://localhost:${PORT}/api/anthropic`);
  console.log(`   POST http://localhost:${PORT}/api/openai`);
  console.log(`   POST http://localhost:${PORT}/api/google`);
  console.log(`\n✅ CORS enabled for all origins`);
  console.log(`\n💡 Update your frontend to use these endpoints instead of calling APIs directly.\n`);
});
