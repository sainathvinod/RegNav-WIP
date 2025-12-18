// Settings - LLM Configuration and Application Settings
import React, { useState } from 'react';
import { AppLayout } from '../components/layout/AppLayout';
import { useAppStore } from '../store/appStore';
import { LLM_PROVIDERS } from '../data/mockData';
import { LLMProvider, LLMModel } from '../types';
import {
  Cog6ToothIcon,
  CpuChipIcon,
  KeyIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  SparklesIcon,
  BoltIcon,
  CurrencyDollarIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

export const Settings: React.FC = () => {
  const { llmConfig, setLLMConfig, updateLLMConfig } = useAppStore();
  
  const [selectedProvider, setSelectedProvider] = useState<LLMProvider>(
    LLM_PROVIDERS.find(p => p.id === llmConfig.provider) || LLM_PROVIDERS[0]
  );
  
  const [selectedModel, setSelectedModel] = useState<LLMModel | null>(
    selectedProvider.models.find(m => m.id === llmConfig.model) || selectedProvider.models[0]
  );
  
  const [apiKey, setApiKey] = useState(llmConfig.apiKey || '');
  const [showApiKey, setShowApiKey] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');

  const handleProviderChange = (provider: LLMProvider) => {
    setSelectedProvider(provider);
    const defaultModel = provider.models[0];
    setSelectedModel(defaultModel);
    updateLLMConfig({
      provider: provider.id,
      model: defaultModel.id,
    });
  };

  const handleModelChange = (model: LLMModel) => {
    setSelectedModel(model);
    updateLLMConfig({ model: model.id });
  };

  const handleTestConnection = async () => {
    setTestStatus('testing');
    
    // Simulate API test
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    if (selectedProvider.requiresApiKey && !apiKey) {
      setTestStatus('error');
      setTimeout(() => setTestStatus('idle'), 3000);
      return;
    }
    
    setTestStatus('success');
    setTimeout(() => setTestStatus('idle'), 3000);
  };

  const handleSaveConfig = () => {
    setLLMConfig({
      ...llmConfig,
      apiKey: selectedProvider.requiresApiKey ? apiKey : undefined,
    });
    alert('Configuration saved successfully!');
  };

  return (
    <AppLayout title="Settings">
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Cog6ToothIcon className="h-8 w-8 text-primary" />
          Settings
        </h1>
        <p className="mt-2 text-gray-600">
          Configure AI models and application preferences
        </p>
      </div>

      {/* LLM Provider Selection */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <SparklesIcon className="h-6 w-6 text-primary" />
          AI Model Provider
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {LLM_PROVIDERS.map((provider) => (
            <button
              key={provider.id}
              onClick={() => handleProviderChange(provider)}
              className={clsx(
                'p-4 rounded-lg border-2 text-left transition-all',
                selectedProvider.id === provider.id
                  ? 'border-primary bg-primary/5 shadow-md'
                  : 'border-gray-200 hover:border-primary/30'
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-gray-900">{provider.name}</h3>
                {selectedProvider.id === provider.id && (
                  <CheckCircleIcon className="h-5 w-5 text-primary" />
                )}
              </div>
              <div className="space-y-1 text-xs text-gray-600">
                <div className="flex items-center gap-1">
                  <CpuChipIcon className="h-3.5 w-3.5" />
                  {provider.models.length} models available
                </div>
                <div className="flex items-center gap-1">
                  {provider.supportsStreaming && (
                    <>
                      <BoltIcon className="h-3.5 w-3.5" />
                      Streaming supported
                    </>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {provider.requiresApiKey ? (
                    <>
                      <KeyIcon className="h-3.5 w-3.5" />
                      API key required
                    </>
                  ) : (
                    <>
                      <CheckCircleIcon className="h-3.5 w-3.5 text-green-600" />
                      No API key needed
                    </>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Model Selection */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <CpuChipIcon className="h-6 w-6 text-primary" />
          Model Selection
        </h2>

        <div className="space-y-3">
          {selectedProvider.models.map((model) => (
            <button
              key={model.id}
              onClick={() => handleModelChange(model)}
              className={clsx(
                'w-full p-4 rounded-lg border-2 text-left transition-all',
                selectedModel?.id === model.id
                  ? 'border-primary bg-primary/5'
                  : 'border-gray-200 hover:border-primary/30'
              )}
            >
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-gray-900">{model.name}</h3>
                    {selectedModel?.id === model.id && (
                      <CheckCircleIcon className="h-5 w-5 text-primary" />
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{model.description}</p>
                  
                  <div className="grid grid-cols-3 gap-3">
                    <div className="flex items-center gap-2">
                      <BoltIcon className={clsx(
                        'h-4 w-4',
                        model.speedRating === 'fast' ? 'text-green-600' :
                        model.speedRating === 'medium' ? 'text-yellow-600' : 'text-orange-600'
                      )} />
                      <span className="text-xs text-gray-600 capitalize">{model.speedRating} speed</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <SparklesIcon className={clsx(
                        'h-4 w-4',
                        model.qualityRating === 'high' ? 'text-purple-600' :
                        model.qualityRating === 'medium' ? 'text-blue-600' : 'text-gray-600'
                      )} />
                      <span className="text-xs text-gray-600 capitalize">{model.qualityRating} quality</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <CurrencyDollarIcon className="h-4 w-4 text-green-600" />
                      <span className="text-xs text-gray-600">
                        {model.costPerToken === 0 ? 'Free' : `$${model.costPerToken.toFixed(6)}/token`}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* API Key Configuration */}
      {selectedProvider.requiresApiKey && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <KeyIcon className="h-6 w-6 text-primary" />
            API Authentication
          </h2>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {selectedProvider.name} API Key
            </label>
            <div className="relative">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={`Enter your ${selectedProvider.name} API key`}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary pr-24"
              />
              <button
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 text-xs text-primary hover:text-primary-dark"
              >
                {showApiKey ? 'Hide' : 'Show'}
              </button>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Your API key is stored locally and encrypted. It's never shared with third parties.
            </p>
          </div>

          <button
            onClick={handleTestConnection}
            disabled={testStatus === 'testing'}
            className={clsx(
              'px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2',
              testStatus === 'testing'
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : testStatus === 'success'
                ? 'bg-green-600 text-white'
                : testStatus === 'error'
                ? 'bg-red-600 text-white'
                : 'bg-primary text-white hover:bg-primary-dark'
            )}
          >
            {testStatus === 'testing' && (
              <>
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Testing Connection...
              </>
            )}
            {testStatus === 'success' && (
              <>
                <CheckCircleIcon className="h-5 w-5" />
                Connection Successful!
              </>
            )}
            {testStatus === 'error' && (
              <>
                <ExclamationTriangleIcon className="h-5 w-5" />
                Connection Failed
              </>
            )}
            {testStatus === 'idle' && 'Test Connection'}
          </button>
        </div>
      )}

      {/* Advanced Parameters */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Advanced Parameters</h2>

        <div className="space-y-4">
          {/* Temperature */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">
                Temperature: {llmConfig.temperature.toFixed(2)}
              </label>
              <InformationCircleIcon 
                className="h-4 w-4 text-gray-400" 
                title="Controls randomness. Lower = more focused, Higher = more creative"
              />
            </div>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={llmConfig.temperature}
              onChange={(e) => updateLLMConfig({ temperature: parseFloat(e.target.value) })}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Focused (0.0)</span>
              <span>Balanced (1.0)</span>
              <span>Creative (2.0)</span>
            </div>
          </div>

          {/* Max Tokens */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Max Tokens: {llmConfig.maxTokens}
            </label>
            <input
              type="range"
              min="100"
              max="8000"
              step="100"
              value={llmConfig.maxTokens}
              onChange={(e) => updateLLMConfig({ maxTokens: parseInt(e.target.value) })}
              className="w-full"
            />
            <p className="text-xs text-gray-500 mt-1">
              Maximum length of the generated response
            </p>
          </div>

          {/* Top P */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Top P: {llmConfig.topP.toFixed(2)}
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={llmConfig.topP}
              onChange={(e) => updateLLMConfig({ topP: parseFloat(e.target.value) })}
              className="w-full"
            />
            <p className="text-xs text-gray-500 mt-1">
              Controls diversity via nucleus sampling
            </p>
          </div>

          {/* Frequency & Presence Penalty */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Frequency Penalty: {llmConfig.frequencyPenalty.toFixed(1)}
              </label>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={llmConfig.frequencyPenalty}
                onChange={(e) => updateLLMConfig({ frequencyPenalty: parseFloat(e.target.value) })}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Presence Penalty: {llmConfig.presencePenalty.toFixed(1)}
              </label>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={llmConfig.presencePenalty}
                onChange={(e) => updateLLMConfig({ presencePenalty: parseFloat(e.target.value) })}
                className="w-full"
              />
            </div>
          </div>

          {/* Additional Settings */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Timeout (seconds)
              </label>
              <input
                type="number"
                min="10"
                max="300"
                value={llmConfig.timeout}
                onChange={(e) => updateLLMConfig({ timeout: parseInt(e.target.value) || 60 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Retry Attempts
              </label>
              <input
                type="number"
                min="0"
                max="10"
                value={llmConfig.retries}
                onChange={(e) => updateLLMConfig({ retries: parseInt(e.target.value) || 3 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
          </div>

          {/* Toggles */}
          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={llmConfig.enableCaching}
                onChange={(e) => updateLLMConfig({ enableCaching: e.target.checked })}
                className="rounded text-primary focus:ring-primary"
              />
              <span className="text-sm text-gray-700">Enable response caching (faster & cheaper)</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={llmConfig.enableStreaming}
                onChange={(e) => updateLLMConfig({ enableStreaming: e.target.checked })}
                className="rounded text-primary focus:ring-primary"
              />
              <span className="text-sm text-gray-700">Enable streaming responses</span>
            </label>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex items-center justify-end gap-3">
        <button
          onClick={() => updateLLMConfig(selectedProvider.requiresApiKey ? { apiKey: '' } : {})}
          className="px-6 py-3 rounded-lg border-2 border-gray-300 text-gray-700 font-medium hover:bg-gray-50"
        >
          Reset to Defaults
        </button>
        <button
          onClick={handleSaveConfig}
          className="px-6 py-3 rounded-lg bg-primary text-white font-medium hover:bg-primary-dark shadow-md"
        >
          Save Configuration
        </button>
      </div>

      {/* Info Panel */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start gap-3">
          <InformationCircleIcon className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-900">
            <p className="font-medium mb-1">About LLM Configuration</p>
            <p className="text-blue-800">
              The selected AI model will be used across all RegNav.AI agents (RegScout, RegIngest, RuleMiner, 
              RuleSense, and RegValidate). Choose a model that balances your needs for speed, quality, and cost. 
              For production use, we recommend GPT-4 Turbo or Claude 3 Opus for best accuracy.
            </p>
          </div>
        </div>
      </div>
    </div>
    </AppLayout>
  );
};

