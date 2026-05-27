// Reusable LLM Configuration Component
import React, { useState } from 'react';
import { LLMConfiguration, LLMTestResult } from '../types';
import { LLM_PROVIDERS } from '../data/mockData';
import { testLLMConnection } from '../services/llm/llmClient';
import { CheckCircleIcon, XCircleIcon, ClockIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';

interface LLMConfigProps {
  config: LLMConfiguration;
  onChange: (config: LLMConfiguration) => void;
  title?: string;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
}

export const LLMConfig: React.FC<LLMConfigProps> = ({
  config,
  onChange,
  title = 'AI Configuration',
  collapsible = true,
  defaultCollapsed = false,
}) => {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<LLMTestResult | null>(null);

  const selectedProvider = LLM_PROVIDERS.find((p) => p.id === config.provider);
  const availableModels = selectedProvider?.models || [];

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      const result = await testLLMConnection(config);
      setTestResult(result);
    } catch (error: any) {
      setTestResult({
        success: false,
        message: 'Test failed',
        error: error.message || 'Unknown error',
      });
    } finally {
      setTesting(false);
    }
  };

  const updateConfig = (updates: Partial<LLMConfiguration>) => {
    onChange({ ...config, ...updates });
  };

  return (
    <div className="card border border-purple-500/30">
      {/* Header */}
      <div
        className={`flex items-center justify-between ${collapsible ? 'cursor-pointer' : ''}`}
        onClick={() => collapsible && setCollapsed(!collapsed)}
      >
        <div className="flex items-center space-x-2">
          <span className="text-lg font-semibold text-gray-50">🤖 {title}</span>
          {testResult?.success && (
            <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded">Connected</span>
          )}
        </div>
        {collapsible && (
          <button type="button" className="text-gray-400 hover:text-gray-200">
            {collapsed ? <ChevronDownIcon className="w-5 h-5" /> : <ChevronUpIcon className="w-5 h-5" />}
          </button>
        )}
      </div>

      {/* Content */}
      {(!collapsible || !collapsed) && (
        <div className="mt-4 space-y-4">
          {/* Provider Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">LLM Provider</label>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {LLM_PROVIDERS.map((provider) => (
                <button
                  key={provider.id}
                  type="button"
                  onClick={() => {
                    updateConfig({
                      provider: provider.id,
                      model: provider.models[0].id,
                    });
                    setTestResult(null);
                  }}
                  className={`p-3 rounded-lg border text-center transition-all ${
                    config.provider === provider.id
                      ? 'border-purple-500 bg-purple-500/20 text-purple-300'
                      : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-purple-500/50 hover:bg-gray-750'
                  }`}
                >
                  <div className="text-xs font-medium">{provider.name}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {provider.models.length} model{provider.models.length !== 1 ? 's' : ''}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Model Selection */}
          {selectedProvider && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Model</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {availableModels.map((model) => (
                  <button
                    key={model.id}
                    type="button"
                    onClick={() => {
                      updateConfig({ model: model.id });
                      setTestResult(null);
                    }}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      config.model === model.id
                        ? 'border-purple-500 bg-purple-500/20'
                        : 'border-gray-700 bg-gray-800 hover:border-purple-500/50 hover:bg-gray-750'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-sm font-medium text-gray-200">{model.name}</div>
                        <div className="text-xs text-gray-500 mt-1">{model.description}</div>
                      </div>
                      {model.costPerToken === 0 && (
                        <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded">Free</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* API Key — managed server-side in Phase 1+ */}
          {selectedProvider?.requiresApiKey && (
            <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 px-4 py-3">
              <p className="text-sm text-blue-300 font-medium">API credentials are managed securely by the platform administrator</p>
              <p className="text-xs text-blue-400/80 mt-1">
                Keys are stored in Azure Key Vault and injected server-side. No browser-side API key is required.
              </p>
            </div>
          )}

          {/* Advanced Parameters */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Temperature</label>
              <input
                type="number"
                min="0"
                max="2"
                step="0.1"
                value={config.temperature}
                onChange={(e) => updateConfig({ temperature: parseFloat(e.target.value) })}
                className="input w-full"
              />
              <p className="text-xs text-gray-500 mt-1">Controls randomness (0-2)</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Max Tokens</label>
              <input
                type="number"
                min="100"
                max="16000"
                step="100"
                value={config.maxTokens}
                onChange={(e) => updateConfig({ maxTokens: parseInt(e.target.value) })}
                className="input w-full"
              />
              <p className="text-xs text-gray-500 mt-1">Max response length</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Timeout (s)</label>
              <input
                type="number"
                min="10"
                max="300"
                step="10"
                value={config.timeout}
                onChange={(e) => updateConfig({ timeout: parseInt(e.target.value) })}
                className="input w-full"
              />
              <p className="text-xs text-gray-500 mt-1">Request timeout</p>
            </div>
          </div>

          {/* Test Connection Button */}
          <div>
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testing}
              className="btn-primary w-full md:w-auto"
            >
              {testing ? (
                <>
                  <ClockIcon className="w-5 h-5 mr-2 animate-spin" />
                  Testing Connection...
                </>
              ) : (
                <>
                  {testResult?.success ? (
                    <CheckCircleIcon className="w-5 h-5 mr-2" />
                  ) : testResult ? (
                    <XCircleIcon className="w-5 h-5 mr-2" />
                  ) : null}
                  Test Connection
                </>
              )}
            </button>

            {/* Test Result */}
            {testResult && (
              <div
                className={`mt-3 p-3 rounded-lg border ${
                  testResult.success
                    ? 'border-green-500/50 bg-green-500/10'
                    : 'border-red-500/50 bg-red-500/10'
                }`}
              >
                <div className="flex items-start space-x-2">
                  {testResult.success ? (
                    <CheckCircleIcon className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  ) : (
                    <XCircleIcon className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <div className={`text-sm font-medium ${testResult.success ? 'text-green-300' : 'text-red-300'}`}>
                      {testResult.message}
                    </div>
                    {testResult.latency && (
                      <div className="text-xs text-gray-400 mt-1">Latency: {testResult.latency}ms</div>
                    )}
                    {testResult.error && (
                      <div className="text-xs text-red-400 mt-1">{testResult.error}</div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

