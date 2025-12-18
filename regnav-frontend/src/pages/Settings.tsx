// Settings - Module-Level LLM Configuration & Reference Prompts
import React, { useState } from 'react';
import { AppLayout } from '../components/layout/AppLayout';
import { LLMConfig } from '../components/LLMConfig';
import { ReferencePromptEditor } from '../components/ReferencePromptEditor';
import { useAppStore } from '../store/appStore';
import { ModuleName } from '../types';
import {
  Cog6ToothIcon,
  MagnifyingGlassIcon,
  DocumentTextIcon,
  BeakerIcon,
  LightBulbIcon,
  ShieldCheckIcon,
  CpuChipIcon,
} from '@heroicons/react/24/outline';

interface ModuleInfo {
  id: ModuleName;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  status: 'active' | 'coming-soon';
}

const MODULES: ModuleInfo[] = [
  {
    id: 'regscout',
    name: 'RegScout',
    description: 'AI-powered regulatory source discovery',
    icon: MagnifyingGlassIcon,
    color: 'purple',
    status: 'active',
  },
  {
    id: 'regingest',
    name: 'RegIngest',
    description: 'Document ingestion and processing',
    icon: DocumentTextIcon,
    color: 'blue',
    status: 'coming-soon',
  },
  {
    id: 'ruleminer',
    name: 'RuleMiner',
    description: 'Rule extraction from documents',
    icon: BeakerIcon,
    color: 'green',
    status: 'coming-soon',
  },
  {
    id: 'rulesense',
    name: 'RuleSense',
    description: 'Rule interpretation & categorization',
    icon: LightBulbIcon,
    color: 'yellow',
    status: 'coming-soon',
  },
  {
    id: 'regvalidate',
    name: 'RegValidate',
    description: 'File validation against rules',
    icon: ShieldCheckIcon,
    color: 'red',
    status: 'coming-soon',
  },
];

type SettingsTab = 'llm' | 'prompts';

export const Settings: React.FC = () => {
  const { getModuleLLMConfig, updateModuleLLMConfig } = useAppStore();
  const [activeTab, setActiveTab] = useState<SettingsTab>('llm');
  const [selectedModule, setSelectedModule] = useState<ModuleName>('regscout');

  const currentModule = MODULES.find(m => m.id === selectedModule)!;
  const currentConfig = getModuleLLMConfig(selectedModule);

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
    <AppLayout title="Settings">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-50 flex items-center gap-3">
            <Cog6ToothIcon className="h-8 w-8 text-purple-500" />
            Settings
          </h1>
          <p className="mt-2 text-gray-400">
            Configure AI models and reference prompts for RegNav.AI
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="mb-8 border-b border-gray-700">
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab('llm')}
              className={`
                px-6 py-3 font-semibold transition-all relative
                ${activeTab === 'llm'
                  ? 'text-purple-400 border-b-2 border-purple-500'
                  : 'text-gray-400 hover:text-gray-300'
                }
              `}
            >
              <span className="flex items-center gap-2">
                <CpuChipIcon className="w-5 h-5" />
                LLM Configuration
              </span>
            </button>
            <button
              onClick={() => setActiveTab('prompts')}
              className={`
                px-6 py-3 font-semibold transition-all relative
                ${activeTab === 'prompts'
                  ? 'text-purple-400 border-b-2 border-purple-500'
                  : 'text-gray-400 hover:text-gray-300'
                }
              `}
            >
              <span className="flex items-center gap-2">
                <DocumentTextIcon className="w-5 h-5" />
                Reference Prompts
              </span>
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'llm' && (
          <>
            {/* Module Selector */}
            <div className="mb-6">
          <h2 className="text-sm font-semibold text-gray-300 mb-3">Select Module</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {MODULES.map((module) => {
              const Icon = module.icon;
              const selected = module.id === selectedModule;
              const colors = getColorClasses(module.color, selected);
              const isDisabled = module.status === 'coming-soon';

              return (
                <button
                  key={module.id}
                  onClick={() => !isDisabled && setSelectedModule(module.id)}
                  disabled={isDisabled}
                  className={`relative p-4 rounded-lg border transition-all ${colors.border} ${colors.bg} ${
                    isDisabled ? 'opacity-40 cursor-not-allowed' : `${colors.hover} cursor-pointer`
                  }`}
                >
                  {isDisabled && (
                    <div className="absolute top-1 right-1">
                      <span className="text-xs bg-gray-700 text-gray-400 px-2 py-0.5 rounded">
                        Soon
                      </span>
                    </div>
                  )}
                  <Icon className={`h-8 w-8 mx-auto mb-2 ${colors.text}`} />
                  <div className={`text-sm font-medium ${colors.text}`}>{module.name}</div>
                  <div className="text-xs text-gray-500 mt-1">{module.description}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Module Configuration */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-50">
                {currentModule.name} AI Configuration
              </h2>
              <p className="text-sm text-gray-400 mt-1">
                This configuration will be used whenever {currentModule.name} runs
              </p>
            </div>
          </div>

          <LLMConfig
            config={currentConfig}
            onChange={(newConfig) => updateModuleLLMConfig(selectedModule, newConfig)}
            title={`${currentModule.name} AI Model`}
            collapsible={false}
          />
        </div>

        {/* Info Panel */}
        <div className="card border border-blue-500/30 bg-blue-500/5">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Cog6ToothIcon className="h-6 w-6 text-blue-400" />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-blue-300 mb-2">How Module Configuration Works</h3>
              <ul className="text-sm text-gray-300 space-y-1">
                <li>• Each module (RegScout, RegIngest, etc.) has its own independent LLM configuration</li>
                <li>• Configure the AI model once here, and it will be used automatically in that module</li>
                <li>• API keys are stored securely in your browser's local storage</li>
                <li>• You can use different models for different modules (e.g., Claude for RegScout, GPT-4o for RegIngest)</li>
                <li>• Click "Test Connection" to verify your API key before saving</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Module Defaults Reference */}
        <div className="mt-6 card border border-gray-700">
          <h3 className="text-sm font-semibold text-gray-300 mb-3">Recommended Defaults</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-2 px-3 text-gray-400 font-medium">Module</th>
                  <th className="text-left py-2 px-3 text-gray-400 font-medium">Provider</th>
                  <th className="text-left py-2 px-3 text-gray-400 font-medium">Model</th>
                  <th className="text-left py-2 px-3 text-gray-400 font-medium">Temperature</th>
                  <th className="text-left py-2 px-3 text-gray-400 font-medium">Use Case</th>
                </tr>
              </thead>
              <tbody className="text-gray-300">
                <tr className="border-b border-gray-800">
                  <td className="py-2 px-3 font-medium text-purple-300">RegScout</td>
                  <td className="py-2 px-3">Anthropic</td>
                  <td className="py-2 px-3">Claude Sonnet 4.5</td>
                  <td className="py-2 px-3">0.3</td>
                  <td className="py-2 px-3 text-gray-400">Factual source discovery</td>
                </tr>
                <tr className="border-b border-gray-800">
                  <td className="py-2 px-3 font-medium text-blue-300">RegIngest</td>
                  <td className="py-2 px-3">OpenAI</td>
                  <td className="py-2 px-3">GPT-4o</td>
                  <td className="py-2 px-3">0.2</td>
                  <td className="py-2 px-3 text-gray-400">Document parsing & extraction</td>
                </tr>
                <tr className="border-b border-gray-800">
                  <td className="py-2 px-3 font-medium text-green-300">RuleMiner</td>
                  <td className="py-2 px-3">Anthropic</td>
                  <td className="py-2 px-3">Claude Sonnet 4.5</td>
                  <td className="py-2 px-3">0.1</td>
                  <td className="py-2 px-3 text-gray-400">Precise rule extraction</td>
                </tr>
                <tr className="border-b border-gray-800">
                  <td className="py-2 px-3 font-medium text-yellow-300">RuleSense</td>
                  <td className="py-2 px-3">Anthropic</td>
                  <td className="py-2 px-3">Claude Opus</td>
                  <td className="py-2 px-3">0.4</td>
                  <td className="py-2 px-3 text-gray-400">Complex interpretation</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-medium text-red-300">RegValidate</td>
                  <td className="py-2 px-3">OpenAI</td>
                  <td className="py-2 px-3">GPT-4o Mini</td>
                  <td className="py-2 px-3">0.2</td>
                  <td className="py-2 px-3 text-gray-400">Fast validation checks</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
          </>
        )}

        {activeTab === 'prompts' && (
          <ReferencePromptEditor />
        )}
      </div>
    </AppLayout>
  );
};
