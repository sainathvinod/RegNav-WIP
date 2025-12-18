/**
 * Meta Prompt Editor
 * 
 * Allows users to configure meta prompts for each regulatory document type.
 * These prompts serve as templates for AI-generated discovery prompts.
 */

import React, { useState, useEffect } from 'react';
import { 
  DocumentTextIcon, 
  ArrowPathIcon, 
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  InformationCircleIcon,
  MagnifyingGlassIcon,
  BeakerIcon,
  LightBulbIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';
import { useAppStore } from '../store/appStore';
import { DEFAULT_REFERENCE_PROMPTS, DOC_TYPE_INFO } from '../data/defaultReferencePrompts';
import { ModuleName } from '../types';

interface ModuleInfo {
  id: ModuleName;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

const MODULES: ModuleInfo[] = [
  {
    id: 'regscout',
    name: 'RegScout',
    description: 'Regulatory source discovery',
    icon: MagnifyingGlassIcon,
    color: 'purple',
  },
  {
    id: 'regingest',
    name: 'RegIngest',
    description: 'Document ingestion',
    icon: DocumentTextIcon,
    color: 'blue',
  },
  {
    id: 'ruleminer',
    name: 'RuleMiner',
    description: 'Rule extraction',
    icon: BeakerIcon,
    color: 'green',
  },
  {
    id: 'rulesense',
    name: 'RuleSense',
    description: 'Rule interpretation',
    icon: LightBulbIcon,
    color: 'yellow',
  },
  {
    id: 'regvalidate',
    name: 'RegValidate',
    description: 'File validation',
    icon: ShieldCheckIcon,
    color: 'red',
  },
];

export const ReferencePromptEditor: React.FC = () => {
  const { 
    moduleReferencePrompts, 
    getModuleReferencePrompt,
    updateModuleReferencePrompt, 
    resetModuleReferencePrompt,
    exportModuleReferencePrompts,
    importModuleReferencePrompts 
  } = useAppStore();

  const [selectedModule, setSelectedModule] = useState<ModuleName>('regscout');
  const [selectedDocType, setSelectedDocType] = useState<string>('wcpols');
  const [editedPrompt, setEditedPrompt] = useState<string>('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle');
  const [charCount, setCharCount] = useState(0);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Load prompt when module or doc type changes
  useEffect(() => {
    const prompt = getModuleReferencePrompt(selectedModule, selectedDocType);
    setEditedPrompt(prompt);
    setCharCount(prompt.length);
    setHasUnsavedChanges(false);
    setSaveStatus('idle');
  }, [selectedModule, selectedDocType, moduleReferencePrompts, getModuleReferencePrompt]);

  const handlePromptChange = (value: string) => {
    setEditedPrompt(value);
    setCharCount(value.length);
    setHasUnsavedChanges(true);
    setSaveStatus('idle');
  };

  const handleSave = () => {
    try {
      updateModuleReferencePrompt(selectedModule, selectedDocType, editedPrompt);
      setHasUnsavedChanges(false);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      console.error('Failed to save meta prompt:', error);
      setSaveStatus('error');
    }
  };

  const handleReset = () => {
    resetModuleReferencePrompt(selectedModule, selectedDocType);
    const defaultPrompt = DEFAULT_REFERENCE_PROMPTS[selectedDocType] || '';
    setEditedPrompt(defaultPrompt);
    setCharCount(defaultPrompt.length);
    setHasUnsavedChanges(false);
    setSaveStatus('idle');
    setShowResetConfirm(false);
  };

  const handleExport = () => {
    const json = exportModuleReferencePrompts(selectedModule);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `regnav-${selectedModule}-meta-prompts-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const success = importModuleReferencePrompts(selectedModule, content);
      if (success) {
        // Reload current prompt
        const prompt = getModuleReferencePrompt(selectedModule, selectedDocType);
        setEditedPrompt(prompt);
        setCharCount(prompt.length);
        setHasUnsavedChanges(false);
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 3000);
      } else {
        setSaveStatus('error');
      }
    };
    reader.readAsText(file);
  };

  const docTypes = Object.keys(DOC_TYPE_INFO);
  const currentDocInfo = DOC_TYPE_INFO[selectedDocType];
  const isModified = moduleReferencePrompts[selectedModule]?.[selectedDocType] !== DEFAULT_REFERENCE_PROMPTS[selectedDocType];

  const getColorClasses = (color: string, selected: boolean) => {
    const colors: Record<string, { border: string; bg: string; text: string; hover: string }> = {
      purple: {
        border: selected ? 'border-purple-500' : 'border-gray-700',
        bg: selected ? 'bg-purple-500/20' : 'bg-gray-800',
        text: selected ? 'text-purple-300' : 'text-gray-400',
        hover: 'hover:border-purple-500/50',
      },
      blue: {
        border: selected ? 'border-blue-500' : 'border-gray-700',
        bg: selected ? 'bg-blue-500/20' : 'bg-gray-800',
        text: selected ? 'text-blue-300' : 'text-gray-400',
        hover: 'hover:border-blue-500/50',
      },
      green: {
        border: selected ? 'border-green-500' : 'border-gray-700',
        bg: selected ? 'bg-green-500/20' : 'bg-gray-800',
        text: selected ? 'text-green-300' : 'text-gray-400',
        hover: 'hover:border-green-500/50',
      },
      yellow: {
        border: selected ? 'border-yellow-500' : 'border-gray-700',
        bg: selected ? 'bg-yellow-500/20' : 'bg-gray-800',
        text: selected ? 'text-yellow-300' : 'text-gray-400',
        hover: 'hover:border-yellow-500/50',
      },
      red: {
        border: selected ? 'border-red-500' : 'border-gray-700',
        bg: selected ? 'bg-red-500/20' : 'bg-gray-800',
        text: selected ? 'text-red-300' : 'text-gray-400',
        hover: 'hover:border-red-500/50',
      },
    };
    return colors[color];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <DocumentTextIcon className="w-7 h-7 text-purple-400" />
            Meta Prompt Configuration
          </h2>
          <p className="mt-2 text-gray-400">
            Configure meta prompts for each regulatory document type. These serve as templates for AI-generated discovery prompts.
          </p>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2 border border-gray-700"
          >
            <ArrowDownTrayIcon className="w-4 h-4" />
            Export All
          </button>
          <label className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2 border border-gray-700 cursor-pointer">
            <ArrowUpTrayIcon className="w-4 h-4" />
            Import
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Module Selector */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-gray-300 mb-3">Select Module</h3>
        <div className="grid grid-cols-5 gap-3">
          {MODULES.map((module) => {
            const Icon = module.icon;
            const selected = module.id === selectedModule;
            const colors = getColorClasses(module.color, selected);

            return (
              <button
                key={module.id}
                onClick={() => {
                  if (hasUnsavedChanges) {
                    if (window.confirm('You have unsaved changes. Discard them?')) {
                      setSelectedModule(module.id);
                    }
                  } else {
                    setSelectedModule(module.id);
                  }
                }}
                className={`p-4 rounded-lg border transition-all ${colors.border} ${colors.bg} ${colors.hover} cursor-pointer`}
              >
                <Icon className={`h-8 w-8 mx-auto mb-2 ${colors.text}`} />
                <div className={`text-sm font-medium ${colors.text}`}>{module.name}</div>
                <div className="text-xs text-gray-500 mt-1">{module.description}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4 flex items-start gap-3">
        <InformationCircleIcon className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-gray-300">
          <strong className="text-purple-400">How it works:</strong> When generating discovery prompts, RegNav.AI uses these meta prompts as templates. 
          The LLM analyzes your meta prompt and creates a customized prompt for any country/state/LOB/doc-type combination.
          Wisconsin WCPOLS is the gold standard—customize it for your organization's needs.
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Document Type Selector */}
        <div className="col-span-3 space-y-2">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Regulatory Document Types
          </h3>
          <div className="space-y-1">
            {docTypes.map((docType) => {
              const info = DOC_TYPE_INFO[docType];
              const isSelected = selectedDocType === docType;
              const hasCustom = moduleReferencePrompts[selectedModule]?.[docType] !== DEFAULT_REFERENCE_PROMPTS[docType];

              return (
                <button
                  key={docType}
                  onClick={() => {
                    if (hasUnsavedChanges) {
                      if (window.confirm('You have unsaved changes. Discard them?')) {
                        setSelectedDocType(docType);
                      }
                    } else {
                      setSelectedDocType(docType);
                    }
                  }}
                  className={`
                    w-full text-left px-4 py-3 rounded-lg transition-all
                    ${isSelected 
                      ? 'bg-purple-600 text-white shadow-lg' 
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }
                  `}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{info.icon}</span>
                      <span className="font-medium text-sm">{info.name}</span>
                    </div>
                    {hasCustom && (
                      <span className="w-2 h-2 bg-green-400 rounded-full" title="Modified"></span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Editor */}
        <div className="col-span-9 space-y-4">
          {/* Editor Header */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <span className="text-2xl">{currentDocInfo.icon}</span>
                {currentDocInfo.name}
              </h3>
              <p className="text-sm text-gray-400 mt-1">{currentDocInfo.description}</p>
            </div>
            
            <div className="flex items-center gap-2">
              {isModified && (
                <span className="px-3 py-1 bg-green-900/30 border border-green-500/30 text-green-400 text-xs rounded-full">
                  Custom
                </span>
              )}
              {hasUnsavedChanges && (
                <span className="px-3 py-1 bg-yellow-900/30 border border-yellow-500/30 text-yellow-400 text-xs rounded-full animate-pulse">
                  Unsaved Changes
                </span>
              )}
              {saveStatus === 'saved' && (
                <span className="px-3 py-1 bg-green-900/30 border border-green-500/30 text-green-400 text-xs rounded-full flex items-center gap-1">
                  <CheckCircleIcon className="w-3 h-3" />
                  Saved
                </span>
              )}
              {saveStatus === 'error' && (
                <span className="px-3 py-1 bg-red-900/30 border border-red-500/30 text-red-400 text-xs rounded-full flex items-center gap-1">
                  <ExclamationTriangleIcon className="w-3 h-3" />
                  Error
                </span>
              )}
            </div>
          </div>

          {/* Textarea */}
          <textarea
            value={editedPrompt}
            onChange={(e) => handlePromptChange(e.target.value)}
            className="w-full h-96 px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-gray-200 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
            placeholder="Enter meta prompt..."
            spellCheck={false}
          />

          {/* Stats */}
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>{charCount.toLocaleString()} characters</span>
            <span>{editedPrompt.split('\n').length} lines</span>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-800">
            <button
              onClick={() => setShowResetConfirm(true)}
              disabled={!isModified}
              className={`
                px-4 py-2 rounded-lg flex items-center gap-2 transition-colors
                ${isModified
                  ? 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700'
                  : 'bg-gray-900 text-gray-600 cursor-not-allowed border border-gray-800'
                }
              `}
            >
              <ArrowPathIcon className="w-4 h-4" />
              Reset to Default
            </button>

            <button
              onClick={handleSave}
              disabled={!hasUnsavedChanges}
              className={`
                px-6 py-2 rounded-lg font-semibold transition-all
                ${hasUnsavedChanges
                  ? 'bg-purple-600 text-white hover:bg-purple-500 shadow-lg shadow-purple-500/20'
                  : 'bg-gray-800 text-gray-600 cursor-not-allowed'
                }
              `}
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-lg border border-gray-700 max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-start gap-3 mb-4">
              <ExclamationTriangleIcon className="w-6 h-6 text-yellow-400 flex-shrink-0" />
              <div>
                <h3 className="text-lg font-semibold text-white">Reset to Default?</h3>
                <p className="text-sm text-gray-400 mt-1">
                  This will replace your custom prompt with the default template. This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleReset}
                className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-500 transition-colors"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

