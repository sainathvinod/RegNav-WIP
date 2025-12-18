# Configurable Reference Prompts System

## Overview

The Configurable Reference Prompts system is an **enterprise-grade meta-prompting infrastructure** that allows users to define, manage, and customize reference templates for AI-generated discovery prompts across all regulatory document types.

This system transforms RegNav.AI from using hardcoded prompts to a **fully configurable, user-controlled prompt engineering platform**.

---

## 🎯 Key Innovation

### The Problem
Previously, all prompt generation used a single hardcoded Wisconsin WCPOLS prompt as the reference template. While this worked well for that specific use case, it meant:
- ❌ Users couldn't customize prompt quality or style
- ❌ No way to incorporate organization-specific requirements
- ❌ All document types shared the same generic template structure
- ❌ No ability to iterate and improve prompts over time

### The Solution
**Document-Type-Level Reference Prompt Configuration:**
```
User configures reference prompts → Stored per doc type → Used for meta-prompting → Generates discovery prompts
```

Now, for each regulatory document type (WCPOLS, STATUTE, ADMIN_CODE, etc.), users can:
- ✅ View and edit the reference prompt template
- ✅ Customize for their organization's specific needs
- ✅ Import/export prompt libraries across teams
- ✅ Reset to defaults anytime
- ✅ See exactly what template is being used

---

## 📋 Architecture

### 1. Data Layer: Default Reference Prompts

**File:** `src/data/defaultReferencePrompts.ts`

Contains:
- 13 pre-configured reference prompts (one per doc type)
- Gold standard templates for each category
- Document type metadata (name, description, icon)

**Example Structure:**
```typescript
export const DEFAULT_REFERENCE_PROMPTS: Record<string, string> = {
  wcpols: `You are an expert regulatory compliance analyst...`,
  wcstats: `You are an expert in statistical reporting...`,
  statute: `You are an expert in insurance law...`,
  // ... 10 more
};

export const DOC_TYPE_INFO: Record<string, {
  name: string;
  description: string;
  icon: string;
}> = {
  wcpols: {
    name: 'WCPOLS',
    description: 'Workers\' Compensation Policy Language Reporting',
    icon: '📋',
  },
  // ... etc
};
```

**Coverage:**
- WCPOLS (Workers' Comp Policy Language)
- WCSTAT (Workers' Comp Statistics)
- ISO Forms
- Rate Filing Manuals
- DMV Requirements
- NAIC Filing
- State Bulletins
- Insurance Statutes
- Form Filing Guidelines
- Classification Codes
- Administrative Code
- Agency Portals
- Regulatory Guidance

---

### 2. State Management: Zustand Store

**File:** `src/store/appStore.ts`

**New State:**
```typescript
interface AppStore {
  // ...
  referencePrompts: Record<string, string>; // Prompt per doc type
  
  // Actions
  getReferencePrompt: (docType: string) => string;
  updateReferencePrompt: (docType: string, prompt: string) => void;
  resetReferencePrompt: (docType: string) => void;
  exportReferencePrompts: () => string;
  importReferencePrompts: (jsonData: string) => boolean;
}
```

**Persistence:**
- All user-configured prompts are saved to `localStorage`
- Survives browser restarts
- Synced across tabs
- Can be exported as JSON for backup/sharing

**Smart Defaults:**
- On first load, initializes with `DEFAULT_REFERENCE_PROMPTS`
- If user modifies a prompt, it's saved and used instead
- Reset functionality restores original default

---

### 3. UI Layer: Reference Prompt Editor

**File:** `src/components/ReferencePromptEditor.tsx`

**Features:**

#### Left Panel: Document Type Selector
- 13 document types displayed as cards
- Each shows: icon, name, and status indicator
- Green dot indicates "Custom" (user-modified)
- Click to switch between doc types
- Warns if unsaved changes exist

#### Right Panel: Editor
- Large textarea (96 rows) with monospace font
- Real-time character/line count
- Unsaved changes indicator (yellow badge)
- Save confirmation (green badge)
- Syntax highlighting (dark theme)

#### Action Buttons
- **Save Changes:** Commits edits to store (disabled until changes made)
- **Reset to Default:** Restores original template (with confirmation modal)
- **Export All:** Downloads all prompts as JSON
- **Import:** Uploads JSON file to restore prompts

#### Smart UX
- Prevents navigation if unsaved changes (with confirmation)
- Visual feedback for all state changes
- Keyboard-friendly (no auto-save to prevent accidental overwrites)
- Professional dark theme with purple accents

---

### 4. Settings Page Integration

**File:** `src/pages/Settings.tsx`

**New Tab Navigation:**
```
Settings
├── LLM Configuration (existing)
│   └── Module selector + LLM config UI
└── Reference Prompts (NEW)
    └── ReferencePromptEditor component
```

**Tab UI:**
- Clean horizontal tabs with icons
- "LLM Configuration" (CpuChipIcon)
- "Reference Prompts" (DocumentTextIcon)
- Active tab highlighted in purple
- Smooth transitions

---

### 5. Prompt Generation Service Integration

**File:** `src/services/promptGeneratorService.ts`

**Changes:**

**Before:**
```typescript
const REFERENCE_PROMPT_TEMPLATE = `hardcoded Wisconsin prompt...`;

const generateMetaPrompt = (country, state, lob, docType) => {
  // Always used hardcoded template
  return `Use this reference: ${REFERENCE_PROMPT_TEMPLATE}`;
};
```

**After:**
```typescript
const generateMetaPrompt = (
  country, 
  state, 
  lob, 
  docType, 
  referencePrompt // Now accepts user-configured prompt
) => {
  return `Use this reference: ${referencePrompt}`;
};

export const generateDiscoveryPrompt = async (
  country,
  state,
  lob,
  docType,
  llmConfig,
  referencePrompt, // NEW parameter
  onProgress
) => {
  const metaPrompt = generateMetaPrompt(
    country, 
    state, 
    lob, 
    docType, 
    referencePrompt
  );
  // Call LLM with meta-prompt...
};
```

---

### 6. RegScout Integration

**File:** `src/pages/RegScout.tsx`

**Changes:**

**Store Access:**
```typescript
const {
  // ...
  getReferencePrompt, // NEW: Get configured prompt
} = useAppStore();
```

**Prompt Generation:**
```typescript
const handleGeneratePrompt = async () => {
  const firstDocType = selectedDocTypes[0];
  
  // Get user-configured reference prompt for this doc type
  const referencePrompt = getReferencePrompt(firstDocType);
  
  const prompt = await generateDiscoveryPrompt(
    selectedCountries[0],
    firstState,
    selectedLOB,
    firstDocType,
    llmConfig,
    referencePrompt, // Pass to generator
    (status) => setPromptGenerationStatus(status)
  );
  
  setGeneratedPrompt(prompt);
};
```

**Flow:**
1. User selects doc type in RegScout
2. Clicks "Generate Prompt"
3. System retrieves reference prompt for that doc type from store
4. Passes to `generateDiscoveryPrompt`
5. Meta-prompt uses user's custom template
6. Generated prompt reflects user's preferences

---

## 🎨 User Experience Flow

### Configuration (Settings → Reference Prompts)

```
┌─────────────────────────────────────────────────────────────┐
│  Settings > Reference Prompts                               │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐  ┌────────────────────────────────────┐  │
│  │ Doc Types    │  │ Editor                             │  │
│  ├──────────────┤  ├────────────────────────────────────┤  │
│  │ 📋 WCPOLS ●  │  │ 📋 WCPOLS                          │  │
│  │ 📊 WCSTATS   │  │ Workers' Comp Policy Language      │  │
│  │ 📄 ISO Forms │  │                                     │  │
│  │ 💰 Rate...   │  │ [Large Textarea - User can edit]   │  │
│  │ ...          │  │                                     │  │
│  │              │  │ You are an expert regulatory...    │  │
│  │              │  │ Find ALL authoritative sources...  │  │
│  │              │  │ Include BOTH government (.gov)...  │  │
│  │              │  │                                     │  │
│  │              │  ├────────────────────────────────────┤  │
│  │              │  │ 2,847 characters | 68 lines        │  │
│  │              │  │                                     │  │
│  │              │  │ [Reset to Default]  [Save Changes] │  │
│  └──────────────┘  └────────────────────────────────────┘  │
│                                                              │
│  [Export All]  [Import]                                     │
└─────────────────────────────────────────────────────────────┘
```

### Usage (RegScout)

```
User Flow:
1. User selects: US → WI → Workers' Comp → WCPOLS
2. Clicks "Generate Prompt"
3. System uses the WCPOLS reference prompt configured in Settings
4. LLM generates discovery prompt based on that template
5. User reviews/edits generated prompt
6. Clicks "Discover Sources"
7. Discovery uses the final prompt
```

---

## 🔧 Technical Implementation Details

### Import/Export Format

**Export Format (JSON):**
```json
{
  "wcpols": "You are an expert regulatory compliance analyst...",
  "wcstats": "You are an expert in statistical reporting...",
  "statute": "You are an expert in insurance law...",
  // ... all 13 doc types
}
```

**File Naming:**
```
regnav-reference-prompts-{timestamp}.json
Example: regnav-reference-prompts-1734585600000.json
```

**Import Validation:**
- Checks JSON structure
- Validates object format
- Graceful error handling
- Shows save confirmation on success

---

### State Persistence

**localStorage Key:**
```
regnav-storage
```

**Structure:**
```json
{
  "state": {
    "referencePrompts": {
      "wcpols": "custom prompt...",
      "wcstats": "custom prompt...",
      // ...
    },
    "moduleLLMConfigs": { /* ... */ },
    "selectedCountries": [ /* ... */ ]
    // ... other persisted state
  },
  "version": 0
}
```

**Benefits:**
- Automatic serialization/deserialization
- Browser-native storage
- No backend required
- Fast access

---

### Performance Considerations

**Optimization Strategies:**

1. **Lazy Loading:**
   - Reference prompts only loaded when Settings tab opened
   - Editor component mounts on demand

2. **Efficient Updates:**
   - Only modified prompts stored in localStorage
   - Unchanged prompts use defaults (saves space)

3. **Smart Caching:**
   - Store maintains prompts in memory
   - No re-fetch from localStorage on access

4. **Character Limits:**
   - No enforced limits (flexibility for users)
   - Average prompt: 2,000-3,000 characters
   - Max realistic: ~10,000 characters

---

## 📊 Default Prompt Quality

All 13 default reference prompts follow the **Wisconsin WCPOLS Gold Standard:**

### Quality Characteristics:
- ✅ Comprehensive scope definition
- ✅ Explicit government + industry org coverage
- ✅ Strong directive language (CRITICAL, MANDATORY)
- ✅ Specific domain examples (e.g., `wcrb.org`)
- ✅ Structured JSON output format
- ✅ Quality scoring rubric (confidence levels)
- ✅ Metadata extraction requirements

### Prompt Structure:
```
1. Expert Role Declaration
2. Scope Definition
3. Source Type Categories
   a. Government Sources
   b. Industry Organizations
4. Requirements & Instructions
5. Output Format Specification
6. Quality Standards
```

---

## 🚀 Use Cases

### 1. Organization-Specific Customization
**Scenario:** Insurance company has internal compliance team with specific terminology

**Action:**
- Edit STATUTE reference prompt
- Add company-specific statute references
- Include internal compliance definitions
- Save and use across all discoveries

### 2. Multi-State Operations
**Scenario:** Company operates in 12 states, each with unique sources

**Action:**
- Create detailed ADMIN_CODE prompt with all 12 states' specific agencies
- Include state-specific rating bureau domains
- Export and share with compliance team

### 3. Iterative Improvement
**Scenario:** Discovery for WCSTATS missing key sources

**Action:**
- Review generated prompts in RegScout
- Edit WCSTATS reference prompt in Settings
- Add missing source types or domain examples
- Re-run discovery with improved prompt

### 4. Team Collaboration
**Scenario:** Legal team perfects STATUTE prompts, wants to share

**Action:**
- Export reference prompts to JSON
- Share file via email/Slack
- Team members import
- Everyone uses same high-quality templates

### 5. Rollback & Testing
**Scenario:** User experiments with new prompt, wants to revert

**Action:**
- Click "Reset to Default"
- Instantly restores original template
- No data loss

---

## 🔐 Security & Privacy

**Data Storage:**
- All prompts stored locally in browser
- No transmission to external servers
- No cloud sync (by design for enterprise security)

**Export Files:**
- Plain JSON (no encryption by default)
- Users can encrypt if needed before sharing
- Filename includes timestamp for version tracking

**API Keys:**
- Reference prompts do NOT contain API keys
- API keys stored separately in LLM configs
- Clear separation of concerns

---

## 🎓 Best Practices

### For Administrators:
1. **Start with Defaults:**
   - Use built-in prompts as-is initially
   - Gather feedback from discovery results
   - Iterate based on actual performance

2. **Document Changes:**
   - Keep a log of prompt modifications
   - Note reasons for changes
   - Export regularly for backup

3. **Test Thoroughly:**
   - After editing a prompt, test with multiple state/LOB combinations
   - Compare results before/after changes
   - Validate that discovery returns expected sources

4. **Share Knowledge:**
   - Export high-quality prompts
   - Create organization-specific prompt library
   - Document best practices for each doc type

### For End Users:
1. **View Before Edit:**
   - Read the default prompt first
   - Understand the structure and intent
   - Make targeted improvements, not wholesale rewrites

2. **Use Reset:**
   - If unsure, reset to default and start over
   - No risk of breaking functionality

3. **Export Often:**
   - Create backups of working prompts
   - Export before major edits

4. **Request Changes:**
   - If you identify improvements, share with team
   - Collaborate on prompt refinement

---

## 📈 Metrics & Validation

### Prompt Quality Indicators:
- **Character Count:** 1,500+ (comprehensive)
- **Sections:** 5+ (structured)
- **Examples:** 3+ specific domains/sources
- **Output Format:** JSON schema defined
- **Directive Language:** CRITICAL, MANDATORY, REQUIRED present

### Discovery Quality Metrics:
- **Source Count:** 5-10+ per discovery
- **Gov-Auto Ratio:** 70%+ government sources
- **Confidence Scores:** Majority 0.7+ confidence
- **Zero Results:** <5% of discoveries

---

## 🛠️ Technical Maintenance

### Adding New Document Types

**Steps:**
1. Add to `DEFAULT_REFERENCE_PROMPTS` in `defaultReferencePrompts.ts`
2. Add metadata to `DOC_TYPE_INFO`
3. Update `REGULATORY_DOCUMENT_TYPES` in `mockData.ts`
4. No UI changes needed (auto-renders)

**Example:**
```typescript
// defaultReferencePrompts.ts
export const DEFAULT_REFERENCE_PROMPTS = {
  // ... existing
  new_doc_type: `You are an expert in... [detailed prompt]`,
};

export const DOC_TYPE_INFO = {
  // ... existing
  new_doc_type: {
    name: 'New Document Type',
    description: 'Brief description',
    icon: '🆕',
  },
};
```

### Updating Default Prompts

**When to Update:**
- Discovered systematic gaps in source coverage
- Regulatory landscape changes (new agencies, consolidations)
- User feedback identifies common issues
- LLM capabilities improve (new models, better instruction following)

**Process:**
1. Edit prompt in `defaultReferencePrompts.ts`
2. Test with representative state/LOB/doc-type combinations
3. Validate results quality
4. Document changes in comments
5. Users can pull updates by resetting

---

## 🧪 Testing Guide

### Manual Testing

**Test 1: Edit & Save**
```
1. Go to Settings → Reference Prompts
2. Select WCPOLS
3. Edit prompt (add a line at the end)
4. Click "Save Changes"
5. Reload page
6. Verify: Edit persists
```

**Test 2: Reset to Default**
```
1. Edit WCPOLS prompt
2. Save
3. Click "Reset to Default"
4. Confirm action
5. Verify: Prompt reverts to original
```

**Test 3: Export/Import**
```
1. Export all prompts (downloads JSON)
2. Edit multiple prompts in Settings
3. Import the exported JSON file
4. Verify: All prompts restored to exported state
```

**Test 4: RegScout Integration**
```
1. Edit WCPOLS reference prompt (add "TEST:" at start)
2. Save
3. Go to RegScout
4. Select US → WI → Workers' Comp → WCPOLS
5. Click "Generate Prompt"
6. Verify: Generated prompt reflects custom template
```

### Automated Testing

**Unit Tests (Recommended):**
```typescript
describe('ReferencePrompts', () => {
  test('updateReferencePrompt stores prompt', () => {
    const store = createStore();
    store.updateReferencePrompt('wcpols', 'New prompt');
    expect(store.getReferencePrompt('wcpols')).toBe('New prompt');
  });

  test('resetReferencePrompt restores default', () => {
    const store = createStore();
    store.updateReferencePrompt('wcpols', 'Custom');
    store.resetReferencePrompt('wcpols');
    expect(store.getReferencePrompt('wcpols'))
      .toBe(DEFAULT_REFERENCE_PROMPTS.wcpols);
  });

  test('exportReferencePrompts returns valid JSON', () => {
    const store = createStore();
    const json = store.exportReferencePrompts();
    expect(() => JSON.parse(json)).not.toThrow();
  });
});
```

---

## 🔮 Future Enhancements

### Planned Features:

1. **Prompt Templates Library:**
   - Pre-built templates for common industries
   - One-click import of industry-specific prompts
   - Community-contributed prompt sharing

2. **Version History:**
   - Track changes over time
   - Rollback to previous versions
   - Diff view between versions

3. **AI-Assisted Prompt Improvement:**
   - "Optimize this prompt" button
   - LLM analyzes and suggests improvements
   - A/B testing different prompt versions

4. **Prompt Analytics:**
   - Track which prompts generate best results
   - Show success metrics per reference prompt
   - Recommend optimizations

5. **Multi-Language Support:**
   - Reference prompts in multiple languages
   - Auto-translate for international teams

6. **Prompt Validation:**
   - Real-time syntax checking
   - Structure analysis
   - Warning for missing key elements

---

## 📚 Related Documentation

- **META_PROMPTING_SYSTEM.md** - Overall meta-prompting architecture
- **CENTRALIZED_LLM_CONFIGURATION.md** - Module-level LLM settings
- **ENHANCED_LLM_PROMPTS.md** - Discovery prompt improvements
- **REALTIME_LLM_INTEGRATION.md** - LLM API integration

---

## 🤝 Contributing

### Improving Default Prompts:
1. Test prompt across multiple states/LOBs
2. Document improvements and rationale
3. Submit via PR with examples of improved results
4. Include before/after discovery comparisons

### Adding Features:
1. Follow existing patterns (Zustand store, React components)
2. Maintain dark theme consistency
3. Ensure persistence works correctly
4. Add validation and error handling
5. Update this documentation

---

## 📝 Changelog

### v1.0.0 - Initial Release
- 13 default reference prompts (all major doc types)
- Full Settings UI with editor
- Import/export functionality
- RegScout integration
- Persistent storage
- Reset to defaults

---

## ✨ Summary

The **Configurable Reference Prompts System** represents a fundamental shift in how RegNav.AI handles prompt engineering:

**Before:** Hardcoded, one-size-fits-all prompts
**After:** User-controlled, document-type-specific, customizable templates

**Impact:**
- 🎯 **Precision:** Tailored prompts for each doc type
- 🔧 **Control:** Users define their own quality standards
- 📈 **Improvement:** Iterative refinement based on results
- 🤝 **Collaboration:** Export/import for team alignment
- 🛡️ **Safety:** Reset functionality prevents mistakes

This feature empowers compliance teams to take ownership of their discovery quality, adapt to evolving regulatory landscapes, and maintain institutional knowledge through curated prompt libraries.

---

**For questions or support, refer to the main RegNav.AI documentation or contact the development team.**

