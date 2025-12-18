// Lightweight LLM Indicator - Shows which AI model is configured for the current module
import React from 'react';
import { Link } from 'react-router-dom';
import { LLMConfiguration } from '../types';
import { LLM_PROVIDERS } from '../data/mockData';
import { Cog6ToothIcon, ExclamationTriangleIcon, SparklesIcon } from '@heroicons/react/24/outline';

interface LLMIndicatorProps {
  config: LLMConfiguration;
  moduleName: string;
}

export const LLMIndicator: React.FC<LLMIndicatorProps> = ({ config, moduleName }) => {
  const provider = LLM_PROVIDERS.find(p => p.id === config.provider);
  const model = provider?.models.find(m => m.id === config.model);
  
  const hasApiKey = config.apiKey && config.apiKey.length > 0;
  const requiresKey = provider?.requiresApiKey;
  const isConfigured = !requiresKey || hasApiKey;

  return (
    <div className={`flex items-center justify-between p-4 rounded-lg border ${
      isConfigured 
        ? 'border-purple-500/30 bg-purple-500/10' 
        : 'border-yellow-500/30 bg-yellow-500/10'
    }`}>
      {/* Left: AI Model Info */}
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
          isConfigured ? 'bg-purple-500/20' : 'bg-yellow-500/20'
        }`}>
          {isConfigured ? (
            <SparklesIcon className="h-6 w-6 text-purple-400" />
          ) : (
            <ExclamationTriangleIcon className="h-6 w-6 text-yellow-400" />
          )}
        </div>
        
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-300">
              AI Model:
            </span>
            {isConfigured ? (
              <>
                <span className="text-sm font-semibold text-purple-300">
                  {provider?.name} - {model?.name}
                </span>
                <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded">
                  Configured
                </span>
              </>
            ) : (
              <span className="text-sm font-semibold text-yellow-300">
                Not Configured
              </span>
            )}
          </div>
          
          <div className="text-xs text-gray-500 mt-0.5">
            {isConfigured ? (
              <>
                Temperature: {config.temperature} • Max Tokens: {config.maxTokens} • Timeout: {config.timeout}s
              </>
            ) : (
              'API key required for real-time discovery'
            )}
          </div>
        </div>
      </div>

      {/* Right: Settings Link */}
      <Link
        to="/settings"
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-300 hover:bg-gray-750 hover:border-purple-500/50 transition-all text-sm"
      >
        <Cog6ToothIcon className="h-4 w-4" />
        <span>Configure in Settings</span>
      </Link>
    </div>
  );
};

