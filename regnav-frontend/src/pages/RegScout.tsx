// RegScout - AI-Powered Regulatory Document Discovery
import React, { useState } from 'react';
import { AppLayout } from '../components/layout/AppLayout';
import { useAppStore } from '../store/appStore';
import { COUNTRIES, US_STATES, LINES_OF_BUSINESS, REGULATORY_DOCUMENT_TYPES } from '../data/mockData';
import { executeScoutingJob, estimateScoutingJob } from '../services/scoutingService';
import { ScoutingConfiguration } from '../types';
import {
  MagnifyingGlassIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  GlobeAltIcon,
  MapPinIcon,
  BriefcaseIcon,
  DocumentTextIcon,
  Cog6ToothIcon,
  PlayIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  CheckBadgeIcon,
  LinkIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

export const RegScout: React.FC = () => {
  const {
    selectedCountries,
    selectedStates,
    selectedLOBs,
    selectedDocTypes,
    llmConfig,
    currentScoutingJob,
    discoveredSources,
    setSelectedCountries,
    toggleState,
    toggleLOB,
    toggleDocType,
    setCurrentScoutingJob,
    setDiscoveredSources,
  } = useAppStore();

  const [searchDepth, setSearchDepth] = useState<'shallow' | 'moderate' | 'deep'>('moderate');
  const [includeHistorical, setIncludeHistorical] = useState(false);
  const [validateUrls, setValidateUrls] = useState(true);
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.7);
  const [maxResults, setMaxResults] = useState(50);
  const [isRunning, setIsRunning] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const estimate = estimateScoutingJob({
    countries: selectedCountries,
    states: selectedStates,
    linesOfBusiness: selectedLOBs,
    documentTypes: selectedDocTypes,
    llmConfig,
    searchDepth,
    includeHistorical,
    validateUrls,
    extractMetadata: true,
    confidenceThreshold,
    maxResults,
  });

  const canRun = selectedCountries.length > 0 && selectedStates.length > 0 && 
                 selectedLOBs.length > 0 && selectedDocTypes.length > 0;

  const handleRunScout = async () => {
    if (!canRun) return;

    setIsRunning(true);
    setShowResults(false);

    const config: ScoutingConfiguration = {
      countries: selectedCountries,
      states: selectedStates,
      linesOfBusiness: selectedLOBs,
      documentTypes: selectedDocTypes,
      llmConfig,
      searchDepth,
      includeHistorical,
      validateUrls,
      extractMetadata: true,
      confidenceThreshold,
      maxResults,
    };

    try {
      const job = await executeScoutingJob(config, (update) => {
        setCurrentScoutingJob({
          ...currentScoutingJob!,
          ...update,
        });
      });

      setCurrentScoutingJob(job);
      setDiscoveredSources(job.results || []);
      setShowResults(true);
    } catch (error) {
      console.error('Scouting job failed:', error);
      alert('Scouting job failed. Please check the console for details.');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <AppLayout title="RegScout - Document Discovery">
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <MagnifyingGlassIcon className="h-8 w-8 text-primary" />
              RegScout
            </h1>
            <p className="mt-2 text-gray-600">
              AI-powered discovery of authoritative regulatory documents and sources
            </p>
          </div>
          <a
            href="/settings"
            className="flex items-center gap-2 px-4 py-2 text-sm text-primary hover:text-primary-dark hover:bg-primary/5 rounded-lg transition-colors"
          >
            <Cog6ToothIcon className="h-5 w-5" />
            Configure LLM
          </a>
        </div>
      </div>

      {/* Configuration Panel */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Scouting Configuration</h2>

        {/* Country Selection */}
        <div className="mb-6">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <GlobeAltIcon className="h-5 w-5 text-primary" />
            Country
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {COUNTRIES.map((country) => (
              <button
                key={country.code}
                onClick={() => setSelectedCountries([country.code])}
                className={clsx(
                  'px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all',
                  selectedCountries.includes(country.code)
                    ? 'border-primary bg-primary text-white'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-primary/50'
                )}
              >
                {country.name}
              </button>
            ))}
          </div>
        </div>

        {/* State Selection */}
        <div className="mb-6">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <MapPinIcon className="h-5 w-5 text-primary" />
            States ({selectedStates.length} selected)
          </label>
          <div className="grid grid-cols-4 md:grid-cols-8 lg:grid-cols-10 gap-2 max-h-64 overflow-y-auto p-2 border border-gray-200 rounded-lg">
            {US_STATES.map((state) => (
              <button
                key={state.code}
                onClick={() => toggleState(state.code)}
                className={clsx(
                  'px-2 py-1 rounded text-xs font-medium transition-all',
                  selectedStates.includes(state.code)
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                )}
                title={state.name}
              >
                {state.code}
              </button>
            ))}
          </div>
          <div className="mt-2 flex gap-2">
            <button
              onClick={() => useAppStore.setState({ selectedStates: US_STATES.map(s => s.code) })}
              className="text-xs text-primary hover:text-primary-dark"
            >
              Select All
            </button>
            <button
              onClick={() => useAppStore.setState({ selectedStates: [] })}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Clear All
            </button>
          </div>
        </div>

        {/* Line of Business Selection */}
        <div className="mb-6">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <BriefcaseIcon className="h-5 w-5 text-primary" />
            Lines of Business ({selectedLOBs.length} selected)
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {LINES_OF_BUSINESS.map((lob) => (
              <button
                key={lob.id}
                onClick={() => toggleLOB(lob.id)}
                className={clsx(
                  'px-4 py-3 rounded-lg border-2 text-left transition-all',
                  selectedLOBs.includes(lob.id)
                    ? 'border-primary bg-primary/5'
                    : 'border-gray-200 bg-white hover:border-primary/30'
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{lob.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">{lob.name}</div>
                    <div className="text-xs text-gray-500 truncate">{lob.description}</div>
                  </div>
                  {selectedLOBs.includes(lob.id) && (
                    <CheckCircleIcon className="h-5 w-5 text-primary flex-shrink-0" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Document Type Selection */}
        <div className="mb-6">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <DocumentTextIcon className="h-5 w-5 text-primary" />
            Regulatory Document Types ({selectedDocTypes.length} selected)
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {REGULATORY_DOCUMENT_TYPES.map((docType) => (
              <button
                key={docType.id}
                onClick={() => toggleDocType(docType.id)}
                className={clsx(
                  'px-4 py-3 rounded-lg border-2 text-left transition-all',
                  selectedDocTypes.includes(docType.id)
                    ? 'border-secondary bg-secondary/5'
                    : 'border-gray-200 bg-white hover:border-secondary/30'
                )}
              >
                <div className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">{docType.name}</span>
                      <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                        {docType.code}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1 truncate">{docType.description}</div>
                  </div>
                  {selectedDocTypes.includes(docType.id) && (
                    <CheckCircleIcon className="h-5 w-5 text-secondary flex-shrink-0" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Advanced Options */}
        <div className="border-t border-gray-200 pt-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Advanced Options</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Search Depth */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Depth
              </label>
              <select
                value={searchDepth}
                onChange={(e) => setSearchDepth(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              >
                <option value="shallow">Shallow (Primary sources only)</option>
                <option value="moderate">Moderate (Recommended)</option>
                <option value="deep">Deep (Comprehensive search)</option>
              </select>
            </div>

            {/* Confidence Threshold */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confidence Threshold: {(confidenceThreshold * 100).toFixed(0)}%
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={confidenceThreshold}
                onChange={(e) => setConfidenceThreshold(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>

            {/* Max Results */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Max Results per Combination
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={maxResults}
                onChange={(e) => setMaxResults(parseInt(e.target.value) || 50)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>

            {/* Checkboxes */}
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={includeHistorical}
                  onChange={(e) => setIncludeHistorical(e.target.checked)}
                  className="rounded text-primary focus:ring-primary"
                />
                <span className="text-sm text-gray-700">Include historical versions</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={validateUrls}
                  onChange={(e) => setValidateUrls(e.target.checked)}
                  className="rounded text-primary focus:ring-primary"
                />
                <span className="text-sm text-gray-700">Validate URLs (slower but accurate)</span>
              </label>
            </div>
          </div>
        </div>

        {/* Estimates */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-3">
            <ClockIcon className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="flex-1">
              <div className="text-sm font-medium text-blue-900 mb-1">Job Estimates</div>
              <div className="grid grid-cols-3 gap-4 text-sm text-blue-800">
                <div>
                  <span className="font-medium">Searches:</span> {estimate.totalSearches}
                </div>
                <div>
                  <span className="font-medium">Time:</span> ~{Math.ceil(estimate.estimatedTime / 60)} min
                </div>
                <div>
                  <span className="font-medium">Cost:</span> ${estimate.estimatedCost.toFixed(4)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex items-center gap-3">
          <button
            onClick={handleRunScout}
            disabled={!canRun || isRunning}
            className={clsx(
              'flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all',
              canRun && !isRunning
                ? 'bg-primary text-white hover:bg-primary-dark shadow-md hover:shadow-lg'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            )}
          >
            {isRunning ? (
              <>
                <ArrowPathIcon className="h-5 w-5 animate-spin" />
                Discovering Sources...
              </>
            ) : (
              <>
                <PlayIcon className="h-5 w-5" />
                Start Discovery
              </>
            )}
          </button>

          {!canRun && (
            <div className="flex items-center gap-2 text-sm text-orange-600">
              <ExclamationTriangleIcon className="h-5 w-5" />
              <span>Please select at least one option from each category</span>
            </div>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      {isRunning && currentScoutingJob && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Discovery Progress</span>
            <span className="text-sm font-medium text-primary">{currentScoutingJob.progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              className="bg-primary h-full transition-all duration-300 rounded-full"
              style={{ width: `${currentScoutingJob.progress}%` }}
            />
          </div>
          <div className="mt-3 flex items-center justify-between text-sm text-gray-600">
            <span>Sources Found: {currentScoutingJob.sourcesFound}</span>
            <span>Validated: {currentScoutingJob.sourcesValidated}</span>
          </div>
        </div>
      )}

      {/* Results */}
      {showResults && discoveredSources.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <CheckBadgeIcon className="h-6 w-6 text-green-600" />
              Discovered Sources ({discoveredSources.length})
            </h2>
            <button
              onClick={() => {
                const dataStr = JSON.stringify(discoveredSources, null, 2);
                const dataBlob = new Blob([dataStr], { type: 'application/json' });
                const url = URL.createObjectURL(dataBlob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `regscout-results-${Date.now()}.json`;
                link.click();
              }}
              className="text-sm text-primary hover:text-primary-dark"
            >
              Export Results
            </button>
          </div>

          <div className="space-y-3">
            {discoveredSources.map((source) => (
              <div
                key={source.id}
                className="border border-gray-200 rounded-lg p-4 hover:border-primary/50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    {source.validationResult?.isValid ? (
                      <CheckCircleIcon className="h-6 w-6 text-green-600" />
                    ) : (
                      <XCircleIcon className="h-6 w-6 text-red-600" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-semibold text-gray-900">{source.sourceName}</h3>
                      <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">
                        {source.stateCode}
                      </span>
                      <span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded">
                        Confidence: {(source.confidenceScore * 100).toFixed(0)}%
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-2">{source.agencyName}</p>
                    
                    <a
                      href={source.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-sm text-primary hover:text-primary-dark"
                    >
                      <LinkIcon className="h-4 w-4" />
                      {source.sourceUrl}
                    </a>
                    
                    {source.metadata && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {source.metadata.format && (
                          <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                            {source.metadata.format}
                          </span>
                        )}
                        {source.metadata.fileSize && (
                          <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                            {source.metadata.fileSize}
                          </span>
                        )}
                        {source.metadata.category && (
                          <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                            {source.metadata.category}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
    </AppLayout>
  );
};

