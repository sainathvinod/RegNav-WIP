# Centralized LLM Configuration - Settings-Based Approach

## 🎯 Overview

RegNav.AI now features a **centralized, settings-based LLM configuration** where all AI model settings are managed in one place (Settings page), with lightweight indicators displayed in each module.

**Design Philosophy:**
- ✅ **Configure once, use everywhere** - Set up AI models in Settings
- ✅ **Lightweight module indicators** - Each module shows which AI is configured
- ✅ **Seamless integration** - Modules automatically use saved configuration
- ✅ **Professional UX** - Clear separation of configuration and usage

---

## 🏗️ Architecture

### **Settings Page (Configuration Hub)**
- Module selector tabs: RegScout, RegIngest, RuleMiner, RuleSense, RegValidate
- Full LLM configuration per module:
  - Provider selection (OpenAI, Anthropic, Google, Azure, Ollama)
  - Model selection with descriptions
  - API key input
  - Advanced parameters (temperature, max tokens, timeout)
  - Test connection button
- Recommended defaults table
- How-it-works info panel

### **Module Pages (Usage)**
- **Lightweight indicator bar** at the top showing:
  - Current AI model configured (e.g., "Anthropic - Claude Sonnet 4.5")
  - Configuration status (Configured ✓ / Not Configured ⚠️)
  - Quick stats (temperature, max tokens, timeout)
  - "Configure in Settings" button (links to Settings page)
- Module automatically uses the configured LLM for all operations
- No configuration UI in the module itself

---

## 📊 User Flow

### **Initial Setup**

```
User opens RegNav.AI
↓
Sees "Not Configured" warning in RegScout
↓
Clicks "Configure in Settings" button
↓
Settings page opens with RegScout tab selected
↓
User selects: Anthropic → Claude Sonnet 4.5
↓
Enters API key: sk-ant-xxxxx...
↓
Adjusts temperature: 0.3
↓
Clicks "Test Connection" → ✓ Success
↓
Configuration automatically saved
↓
Returns to RegScout
↓
Sees "Configured ✓" with model name
↓
Runs discovery → Uses Claude Sonnet 4.5 automatically
```

### **Switching Models**

```
User wants to try GPT-4o instead
↓
Clicks "Configure in Settings" in RegScout
↓
Changes provider to OpenAI
↓
Selects GPT-4o model
↓
Enters OpenAI API key
↓
Tests connection → ✓ Success
↓
Returns to RegScout
↓
Indicator updates: "OpenAI - GPT-4o"
↓
Next discovery uses GPT-4o
```

---

## 🎨 UI Components

### **1. Settings Page (New Design)**

**Module Selector:**
```
┌──────────────────────────────────────────────────────────┐
│  [RegScout]  [RegIngest]  [RuleMiner]  [RuleSense]  [...]│
│   Active      Soon         Soon         Soon              │
└──────────────────────────────────────────────────────────┘
```

**Module Configuration:**
```
┌──────────────────────────────────────────────────────────┐
│ RegScout AI Configuration                                │
│                                                            │
│ LLM Provider:                                             │
│  [OpenAI] [Anthropic] [Google] [Azure] [Ollama]          │
│                                                            │
│ Model:                                                     │
│  • Claude Sonnet 4.5 (Latest) - Superior reasoning...    │
│  • Claude 3.5 Sonnet - Excellent performance...          │
│  • Claude 3 Opus - Most intelligent...                    │
│                                                            │
│ API Key: •••••••••••••••••••••• [Show]                    │
│                                                            │
│ Temperature: [0.3] Max Tokens: [4000] Timeout: [90]s     │
│                                                            │
│ [Test Connection] ✓ Connected successfully               │
└──────────────────────────────────────────────────────────┘
```

### **2. LLM Indicator (Module Pages)**

**When Configured:**
```
┌──────────────────────────────────────────────────────────┐
│ ✨  AI Model: Anthropic - Claude Sonnet 4.5  [Configured✓]│
│     Temperature: 0.3 • Max Tokens: 4000 • Timeout: 90s  │
│                              [⚙️ Configure in Settings]   │
└──────────────────────────────────────────────────────────┘
```

**When Not Configured:**
```
┌──────────────────────────────────────────────────────────┐
│ ⚠️  AI Model: Not Configured                              │
│     API key required for real-time discovery            │
│                              [⚙️ Configure in Settings]   │
└──────────────────────────────────────────────────────────┘
```

---

## 🔧 Technical Implementation

### **Files Modified**

1. **`src/pages/Settings.tsx`** (Complete Rewrite)
   - Module selector with 5 tabs
   - Integrated `<LLMConfig>` component per module
   - Calls `updateModuleLLMConfig(moduleName, config)`
   - Shows recommended defaults table
   - Info panel explaining how it works

2. **`src/components/LLMIndicator.tsx`** (New)
   - Lightweight component showing current config
   - Props: `config`, `moduleName`
   - Displays provider, model, status, parameters
   - Links to Settings page

3. **`src/pages/RegScout.tsx`** (Simplified)
   - Removed full `<LLMConfig>` component
   - Added `<LLMIndicator>` at top of page
   - Automatically uses `getModuleLLMConfig('regscout')`
   - No longer imports `updateModuleLLMConfig`

### **State Management**

**Store (`appStore.ts`):**
```typescript
moduleLLMConfigs: {
  regscout: { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022', ... },
  regingest: { provider: 'openai', model: 'gpt-4o', ... },
  ruleminer: { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022', ... },
  rulesense: { provider: 'anthropic', model: 'claude-3-opus-20240229', ... },
  regvalidate: { provider: 'openai', model: 'gpt-4o-mini', ... }
}
```

**Actions:**
- `getModuleLLMConfig(module)` - Read config
- `updateModuleLLMConfig(module, updates)` - Write config
- `setModuleLLMConfig(module, config)` - Replace config

**Persistence:**
- All configs saved to `localStorage` under `regnav-storage`
- Survives page refreshes
- Per-module independence

---

## 💡 Benefits

### **For Users**
✅ **Single configuration location** - No hunting through modules
✅ **Clear visibility** - Always see which AI is running
✅ **Quick switching** - Change models from one place
✅ **No repetition** - Configure once, use in all operations
✅ **Professional appearance** - Clean, enterprise-grade UI

### **For Developers**
✅ **Separation of concerns** - Config in Settings, usage in modules
✅ **Reusable components** - `LLMIndicator` used across all modules
✅ **Maintainable** - Single source of truth for LLM config
✅ **Scalable** - Easy to add new modules
✅ **Testable** - Config logic isolated from business logic

---

## 🧪 Testing Instructions

### **Step 1: Test Settings Page**

1. Navigate to **http://localhost:3000/settings**

2. **Module Selector:**
   - Click each module tab (RegScout, RegIngest, etc.)
   - Verify "Coming Soon" badge for inactive modules
   - Active modules should show full configuration

3. **Configure RegScout:**
   - Select **Anthropic** provider
   - Select **Claude Sonnet 4.5 (Latest)** model
   - Enter API key: `sk-ant-...` (get from https://console.anthropic.com/)
   - Adjust temperature: `0.3`
   - Click **"Test Connection"**
   - Should see: ✓ "Connected successfully to claude-3-5-sonnet-20241022"

4. **Verify Recommended Defaults Table:**
   - Should show 5 modules
   - Each with provider, model, temperature, use case

### **Step 2: Test Module Indicator**

1. Navigate to **RegScout** (http://localhost:3000/regscout)

2. **LLM Indicator (Top of Page):**
   - Should show: "AI Model: Anthropic - Claude Sonnet 4.5"
   - Should have green "Configured ✓" badge
   - Should show: "Temperature: 0.3 • Max Tokens: 4000 • Timeout: 90s"
   - Should have "Configure in Settings" button

3. **Click "Configure in Settings":**
   - Should navigate to Settings page
   - RegScout tab should be selected
   - Configuration should match what was shown

### **Step 3: Test Real Discovery**

1. In **RegScout**, configure:
   - Country: United States
   - State: Wisconsin
   - LOB: Workers' Compensation
   - Doc Types: WCPOLS

2. Click **"Discover Sources"**

3. **Verify Real LLM Call:**
   - Progress bar appears
   - Browser console shows: "Anthropic API call completed in XXXXms"
   - Results show sources with `discoveredBy: "anthropic:claude-3-5-sonnet-20241022"`

4. **Check Results Quality:**
   - Sources should be government URLs
   - Should include authoritative seed sources
   - Each source should have description, agency, confidence

### **Step 4: Test Model Switching**

1. Return to **Settings**

2. **Switch to OpenAI:**
   - Select OpenAI provider
   - Select GPT-4o model
   - Enter OpenAI API key
   - Test connection

3. **Return to RegScout:**
   - Indicator should update: "OpenAI - GPT-4o"
   - Run discovery again
   - Console should show: "OpenAI API call completed..."

### **Step 5: Test Without API Key**

1. **Settings:** Remove API key (leave blank)

2. **Return to RegScout:**
   - Indicator shows: "⚠️ Not Configured"
   - Warning text: "API key required for real-time discovery"

3. **Try to run discovery:**
   - Should still work (falls back to mock data)
   - Console warning: "Using fallback discovery..."

---

## 📱 Responsive Design

**Desktop (>1024px):**
- Module selector: 5 columns
- Full configuration panel with all options visible
- Recommended defaults table: All columns

**Tablet (768px - 1024px):**
- Module selector: 3 columns
- Configuration panel: Stacked layout
- Defaults table: Horizontal scroll

**Mobile (<768px):**
- Module selector: 2 columns, vertical scroll
- Configuration panel: Fully stacked
- LLM Indicator: Stacked content
- "Configure" button below

---

## 🔒 Security Notes

**API Key Storage:**
- Stored in browser `localStorage`
- Encrypted at rest by browser
- Never sent to RegNav backend
- Only sent directly to LLM provider (HTTPS)

**Production Recommendations:**
- Consider backend proxy for API keys
- Implement rate limiting
- Add usage analytics
- Rotate keys regularly

---

## 🚀 Future Enhancements

### **Phase 2 (Planned)**
- [ ] **Usage analytics** - Track API calls per module
- [ ] **Cost estimation** - Show monthly spend estimate
- [ ] **Model comparison** - A/B test different models
- [ ] **Prompt library** - Save/load custom prompts
- [ ] **Team sharing** - Share configurations across team

### **Phase 3 (Vision)**
- [ ] **Auto-optimization** - AI suggests best model for task
- [ ] **Response caching** - Reduce API costs
- [ ] **Fallback chains** - Automatically try backup models
- [ ] **Multi-model ensemble** - Combine multiple LLMs

---

## 📊 Module Status

| Module | Status | Default Model | Configuration Location |
|--------|--------|---------------|------------------------|
| **RegScout** | ✅ Active | Claude Sonnet 4.5 | Settings → RegScout |
| **RegIngest** | 🔜 Coming Soon | GPT-4o | Settings → RegIngest |
| **RuleMiner** | 🔜 Coming Soon | Claude Sonnet 4.5 | Settings → RuleMiner |
| **RuleSense** | 🔜 Coming Soon | Claude Opus | Settings → RuleSense |
| **RegValidate** | 🔜 Coming Soon | GPT-4o Mini | Settings → RegValidate |

---

## ✅ Summary

### **What Changed:**
✅ **Settings page** completely redesigned as configuration hub
✅ **Module tabs** for selecting which module to configure
✅ **LLMIndicator component** created for lightweight display
✅ **RegScout simplified** - removed embedded config, added indicator
✅ **Centralized state** - all configs managed in one place

### **What Works:**
✅ Configure LLM in Settings → Automatically used in module
✅ Switch models → Instantly reflected in module indicator
✅ Test connection → Real-time API validation
✅ No API key → Graceful fallback to mock data
✅ Build passes → No errors, production-ready

### **User Experience:**
✅ **Cleaner modules** - Focus on task, not configuration
✅ **Clearer status** - Always know which AI is running
✅ **Faster setup** - Configure all modules from one page
✅ **Professional** - Enterprise-grade settings UI

---

## 🎉 Ready for Production!

The centralized LLM configuration system is now live and production-ready. Users get a professional, settings-based configuration experience with lightweight indicators in each module.

**Test it now:**
- http://localhost:3000/settings (Configure)
- http://localhost:3000/regscout (Use)

**Happy configuring! ⚙️✨**

