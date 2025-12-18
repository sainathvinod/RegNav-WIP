// RegScout - AI-Powered Regulatory Document Discovery
// Enterprise Edition with Modern Black/Purple/White Theme

import React, { useState, useMemo, useEffect } from 'react';
import { AppLayout } from '../components/layout/AppLayout';
import { useAppStore } from '../store/appStore';
import {
  COUNTRIES,
  US_STATES,
  LINES_OF_BUSINESS,
  REGULATORY_DOCUMENT_TYPES,
  getAvailableLOBsForStates,
  getAvailableDocTypesForStates,
} from '../data/mockData';
import { executeScoutingJob } from '../services/scoutingService';
import { ScoutingConfiguration, DiscoveryProgress } from '../types';
import { checkSourceQuality, getNonGovWarning } from '../utils/sourceQuality';
import {
  MagnifyingGlassIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  PencilSquareIcon,
  TrashIcon,
  LinkIcon,
  FunnelIcon,
  ArrowsUpDownIcon,
} from '@heroicons/react/24/outline';

export const RegScout: React.FC = () => {
  const {
    selectedCountries,
    selectedStates,
    selectedLOBs,
    selectedDocTypes,
    llmConfig,
    regScoutView,
    discoveredSources,
    setRegScoutView,
    setSelectedCountries,
    setSelectedStates,
    toggleState,
    setSelectedLOBs,
    toggleLOB,
    setSelectedDocTypes,
    toggleDocType,
    setDiscoveredSources,
    removeDiscoveredSource,
  } = useAppStore();

  // Local state
  const [searchDepth, setSearchDepth] = useState<'shallow' | 'moderate' | 'deep'>('moderate');
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.7);
  const [maxResults] = useState(50);
  const [discoveryProgress, setDiscoveryProgress] = useState<DiscoveryProgress>({
    step: 'generating',
    stepLabel: 'Generating queries',
    percent: 0,
  });
  
  // Results table state
  const [sortBy, setSortBy] = useState<'name' | 'pages'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [filterType, setFilterType] = useState<'all' | 'gov-auto' | 'user-added'>('all');

  // Get selected country details
  const selectedCountry = COUNTRIES.find(c => c.code === selectedCountries[0]) || COUNTRIES[0];
  
  // Get states for selected country
  const availableStates = useMemo(() => {
    // For now, only US states are available
    if (selectedCountries[0] === 'US') {
      return US_STATES;
    }
    // Future: add Canadian provinces, UK countries, Australian states
    return [];
  }, [selectedCountries]);

  // Get available LOBs based on selected states (US only, INTERSECTION)
  const availableLOBs = useMemo(() => {
    if (selectedCountries[0] === 'US' && selectedStates.length > 0) {
      const availableIds = getAvailableLOBsForStates(selectedStates);
      return LINES_OF_BUSINESS.filter(lob => availableIds.includes(lob.id));
    }
    return LINES_OF_BUSINESS;
  }, [selectedCountries, selectedStates]);

  // Get available Doc Types based on selected states (US only, INTERSECTION)
  const availableDocTypes = useMemo(() => {
    if (selectedCountries[0] === 'US' && selectedStates.length > 0) {
      const availableIds = getAvailableDocTypesForStates(selectedStates);
      return REGULATORY_DOCUMENT_TYPES.filter(dt => availableIds.includes(dt.id));
    }
    return REGULATORY_DOCUMENT_TYPES;
  }, [selectedCountries, selectedStates]);

  // Clear incompatible selections when country changes
  useEffect(() => {
    setSelectedStates([]);
    setSelectedLOBs([]);
    setSelectedDocTypes([]);
  }, [selectedCountries, setSelectedStates, setSelectedLOBs, setSelectedDocTypes]);

  // Clear LOB/DocType selections when states change (they may no longer be valid)
  useEffect(() => {
    if (selectedCountries[0] === 'US' && selectedStates.length > 0) {
      const availableLobIds = getAvailableLOBsForStates(selectedStates);
      const availableDocTypeIds = getAvailableDocTypesForStates(selectedStates);
      
      setSelectedLOBs(selectedLOBs.filter(id => availableLobIds.includes(id)));
      setSelectedDocTypes(selectedDocTypes.filter(id => availableDocTypeIds.includes(id)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStates]); // Only run when states change

  // Can run if all required fields selected
  const canRunDiscovery = selectedCountries.length > 0 && selectedStates.length > 0 && 
                          selectedLOBs.length > 0 && selectedDocTypes.length > 0;

  // Handle discovery
  const handleRunDiscovery = async () => {
    if (!canRunDiscovery) return;

    setRegScoutView('loading');
    setDiscoveryProgress({ step: 'generating', stepLabel: 'Generating queries', percent: 0 });

    const config: ScoutingConfiguration = {
      countries: selectedCountries,
      states: selectedStates,
      linesOfBusiness: selectedLOBs,
      documentTypes: selectedDocTypes,
      llmConfig,
      searchDepth,
      includeHistorical: false,
      validateUrls: true,
      extractMetadata: true,
      confidenceThreshold,
      maxResults,
    };

    try {
      const job = await executeScoutingJob(config, (progress) => {
        setDiscoveryProgress(progress);
      });

      setDiscoveredSources(job.results || []);
      setRegScoutView('results');
    } catch (error) {
      console.error('Discovery failed:', error);
      alert('Discovery failed. Please try again.');
      setRegScoutView('config');
    }
  };

  // Quality check for results
  const qualityCheck = checkSourceQuality(discoveredSources, 3);
  
  // Separate sources by trust level
  const govAutoSources = discoveredSources.filter(s => s.trustLevel === 'gov-auto');
  const userAddedSources = discoveredSources.filter(s => s.trustLevel === 'user-added');

  // Filter and sort sources for table
  const filteredSources = useMemo(() => {
    let sources = discoveredSources;
    
    // Apply filter
    if (filterType === 'gov-auto') {
      sources = govAutoSources;
    } else if (filterType === 'user-added') {
      sources = userAddedSources;
    }
    
    // Apply sort
    const sorted = [...sources].sort((a, b) => {
      if (sortBy === 'name') {
        const aName = a.sourceName || '';
        const bName = b.sourceName || '';
        return sortDirection === 'asc' 
          ? aName.localeCompare(bName)
          : bName.localeCompare(aName);
      } else if (sortBy === 'pages') {
        const aPages = a.metadata?.pages || 0;
        const bPages = b.metadata?.pages || 0;
        return sortDirection === 'asc' 
          ? aPages - bPages
          : bPages - aPages;
      }
      return 0;
    });
    
    return sorted;
  }, [discoveredSources, govAutoSources, userAddedSources, filterType, sortBy, sortDirection]);

  // Toggle sort
  const toggleSort = (field: 'name' | 'pages') => {
    if (sortBy === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDirection('asc');
    }
  };

  // Render CONFIG view
  if (regScoutView === 'config') {
    return (
      <AppLayout title="RegScout - Document Discovery">
        <div className="max-w-7xl mx-auto">
          {/* Modern Header with Purple Accent */}
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-3">
              <div className="p-3 bg-purple-600 rounded-lg">
                <MagnifyingGlassIcon className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-100">RegScout</h1>
                <p className="text-gray-400 mt-1">
                  AI-powered discovery of authoritative regulatory documents
                </p>
              </div>
            </div>
          </div>

          {/* Configuration Panel - Dark Theme */}
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-8 mb-6 shadow-2xl">
            <h2 className="text-xl font-semibold text-gray-100 mb-6">Discovery Configuration</h2>

            {/* Country Selection */}
            <div className="mb-8">
              <label className="block text-sm font-medium text-gray-300 mb-3">
                Country
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {COUNTRIES.map((country) => (
                  <button
                    key={country.code}
                    onClick={() => setSelectedCountries([country.code])}
                    className={`px-4 py-3 rounded-lg border-2 text-sm font-medium transition-all ${
                      selectedCountries.includes(country.code)
                        ? 'border-purple-500 bg-purple-600 text-white shadow-lg shadow-purple-500/30'
                        : 'border-gray-700 bg-gray-800 text-gray-300 hover:border-purple-500 hover:text-white'
                    }`}
                  >
                    {country.name}
                  </button>
                ))}
              </div>
            </div>

            {/* State Selection */}
            <div className="mb-8">
              <label className="block text-sm font-medium text-gray-300 mb-3">
                {selectedCountry?.label || 'State'} ({selectedStates.length} selected)
              </label>
              {availableStates.length > 0 ? (
                <>
                  <div className="grid grid-cols-4 md:grid-cols-8 lg:grid-cols-10 gap-2 max-h-64 overflow-y-auto p-4 bg-gray-800 rounded-lg border border-gray-700">
                    {availableStates.map((state) => (
                      <button
                        key={state.code}
                        onClick={() => toggleState(state.code)}
                        className={`px-3 py-2 rounded-md text-sm font-medium transition-all ${
                          selectedStates.includes(state.code)
                            ? 'bg-purple-600 text-white shadow-md'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
                        }`}
                        title={state.name}
                      >
                        {state.code}
                      </button>
                    ))}
                  </div>
                  <div className="mt-3 flex gap-3">
                    <button
                      onClick={() => setSelectedStates(availableStates.map(s => s.code))}
                      className="text-sm text-purple-400 hover:text-purple-300 transition-colors"
                    >
                      Select All
                    </button>
                    <button
                      onClick={() => setSelectedStates([])}
                      className="text-sm text-gray-500 hover:text-gray-400 transition-colors"
                    >
                      Clear All
                    </button>
                  </div>
                </>
              ) : (
                <div className="p-6 bg-gray-800 rounded-lg border border-gray-700 text-center">
                  <p className="text-gray-400">
                    {selectedCountry.label} data not yet available for {selectedCountry.name}
                  </p>
                </div>
              )}
            </div>

            {/* Lines of Business */}
            <div className="mb-8">
              <label className="block text-sm font-medium text-gray-300 mb-3">
                Lines of Business ({selectedLOBs.length} selected)
                {selectedCountries[0] === 'US' && selectedStates.length > 0 && (
                  <span className="ml-2 text-xs text-purple-400">
                    (Showing only LOBs valid for ALL selected states)
                  </span>
                )}
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {availableLOBs.map((lob) => (
                  <button
                    key={lob.id}
                    onClick={() => toggleLOB(lob.id)}
                    className={`px-4 py-3 rounded-lg border-2 text-left transition-all ${
                      selectedLOBs.includes(lob.id)
                        ? 'border-purple-500 bg-purple-600/20 text-purple-300'
                        : 'border-gray-700 bg-gray-800 text-gray-300 hover:border-purple-500 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{lob.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate text-white">
                          {lob.name}
                        </div>
                        <div className="text-xs text-gray-400 truncate">{lob.code}</div>
                      </div>
                      {selectedLOBs.includes(lob.id) && (
                        <CheckCircleIcon className="h-5 w-5 text-purple-400 flex-shrink-0" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Document Types */}
            <div className="mb-8">
              <label className="block text-sm font-medium text-gray-300 mb-3">
                Regulatory Document Types ({selectedDocTypes.length} selected)
                {selectedCountries[0] === 'US' && selectedStates.length > 0 && (
                  <span className="ml-2 text-xs text-purple-400">
                    (Showing only types valid for ALL selected states)
                  </span>
                )}
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {availableDocTypes.map((docType) => (
                  <button
                    key={docType.id}
                    onClick={() => toggleDocType(docType.id)}
                    className={`px-4 py-3 rounded-lg border-2 text-left transition-all ${
                      selectedDocTypes.includes(docType.id)
                        ? 'border-purple-500 bg-purple-600/20 text-purple-300'
                        : 'border-gray-700 bg-gray-800 text-gray-300 hover:border-purple-500 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-white">{docType.name}</span>
                          <span className="px-2 py-0.5 text-xs bg-gray-700 text-gray-300 rounded">
                            {docType.code}
                          </span>
                        </div>
                        <div className="text-xs text-gray-400 mt-1 truncate">{docType.description}</div>
                      </div>
                      {selectedDocTypes.includes(docType.id) && (
                        <CheckCircleIcon className="h-5 w-5 text-purple-400 flex-shrink-0" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Advanced Options */}
            <div className="border-t border-gray-800 pt-6">
              <h3 className="text-sm font-semibold text-gray-300 mb-4">Advanced Options</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Search Depth */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Search Depth
                  </label>
                  <select
                    value={searchDepth}
                    onChange={(e) => setSearchDepth(e.target.value as any)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  >
                    <option value="shallow">Shallow (Primary sources only)</option>
                    <option value="moderate">Moderate (Recommended)</option>
                    <option value="deep">Deep (Comprehensive search)</option>
                  </select>
                </div>

                {/* Confidence Threshold */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Confidence Threshold: {(confidenceThreshold * 100).toFixed(0)}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={confidenceThreshold}
                    onChange={(e) => setConfidenceThreshold(parseFloat(e.target.value))}
                    className="w-full accent-purple-500"
                  />
                </div>
              </div>
            </div>

            {/* Action Button - FIXED: Always visible */}
            <div className="mt-8 flex items-center gap-4">
              <button
                onClick={handleRunDiscovery}
                disabled={!canRunDiscovery}
                className={`flex items-center gap-2 px-8 py-4 rounded-lg font-semibold text-lg transition-all ${
                  canRunDiscovery
                    ? 'bg-purple-600 text-white hover:bg-purple-700 shadow-lg shadow-purple-600/30 hover:shadow-purple-600/50'
                    : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                }`}
              >
                <MagnifyingGlassIcon className="h-6 w-6" />
                Discover Sources
              </button>

              {!canRunDiscovery && (
                <div className="flex items-center gap-2 text-sm text-yellow-400">
                  <ExclamationTriangleIcon className="h-5 w-5" />
                  <span>Please select Country, {selectedCountry.label}, LOB, and Document Types</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  // Render LOADING view
  if (regScoutView === 'loading') {
    return (
      <AppLayout title="RegScout - Discovering Sources">
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="max-w-2xl w-full mx-4">
            <div className="bg-gray-900 rounded-2xl border border-gray-800 p-12 shadow-2xl">
              {/* Progress Circle */}
              <div className="flex justify-center mb-8">
                <div className="relative">
                  <div className="w-32 h-32 rounded-full border-8 border-gray-800"></div>
                  <div 
                    className="absolute inset-0 w-32 h-32 rounded-full border-8 border-purple-500 border-t-transparent animate-spin"
                  ></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-3xl font-bold text-white">{discoveryProgress.percent}%</span>
                  </div>
                </div>
              </div>

              {/* Progress Timeline */}
              <div className="space-y-4">
                {[
                  { step: 'generating', label: 'Generating queries' },
                  { step: 'searching', label: 'Searching official sources' },
                  { step: 'validating', label: 'Validating links' },
                  { step: 'extracting', label: 'Extracting metadata' },
                  { step: 'finalizing', label: 'Finalizing results' },
                ].map((item, index) => {
                  const isActive = item.step === discoveryProgress.step;
                  const isComplete = ['generating', 'searching', 'validating', 'extracting'].indexOf(discoveryProgress.step) > ['generating', 'searching', 'validating', 'extracting'].indexOf(item.step as any);
                  
                  return (
                    <div key={item.step} className="flex items-center gap-4">
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-semibold ${
                        isComplete ? 'bg-purple-600 text-white' :
                        isActive ? 'bg-purple-500 text-white animate-pulse' :
                        'bg-gray-800 text-gray-500'
                      }`}>
                        {isComplete ? <CheckCircleIcon className="h-5 w-5" /> : index + 1}
                      </div>
                      <div className={`flex-1 text-sm font-medium ${
                        isComplete || isActive ? 'text-white' : 'text-gray-500'
                      }`}>
                        {item.label}
                      </div>
                      {isActive && (
                        <ArrowPathIcon className="h-5 w-5 text-purple-400 animate-spin" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  // Render RESULTS view
  return (
    <AppLayout title="RegScout - Discovery Results">
      <div className="max-w-7xl mx-auto">
        {/* Header with Selection Summary */}
        <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-sm border-b border-gray-800 -mx-6 px-6 py-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white mb-2">Discovery Results</h1>
              <div className="flex items-center gap-4 text-sm text-gray-400">
                <span>Country: <span className="text-purple-400">{selectedCountry.name}</span></span>
                <span>•</span>
                <span>{selectedCountry.label}s: <span className="text-purple-400">{selectedStates.join(', ')}</span></span>
                <span>•</span>
                <span>LOBs: <span className="text-purple-400">{selectedLOBs.length}</span></span>
                <span>•</span>
                <span>Doc Types: <span className="text-purple-400">{selectedDocTypes.length}</span></span>
              </div>
            </div>
            <button
              onClick={() => setRegScoutView('config')}
              className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-all border border-gray-700"
            >
              <PencilSquareIcon className="h-5 w-5" />
              Edit Selections
            </button>
          </div>
        </div>

        {/* Quality Warning */}
        {qualityCheck.warning && (
          <div className="mb-6 p-4 bg-yellow-900/20 border border-yellow-700 rounded-lg flex items-start gap-3">
            <ExclamationTriangleIcon className="h-6 w-6 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-medium text-yellow-300 mb-1">Quality Check</div>
              <div className="text-sm text-yellow-200">{qualityCheck.warning}</div>
            </div>
          </div>
        )}

        {/* Government-Authorized Sources */}
        {govAutoSources.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <CheckCircleIcon className="h-6 w-6 text-green-400" />
              Government-Authorized Sources ({govAutoSources.length})
            </h2>
            <div className="space-y-3">
              {govAutoSources.map((source) => (
                <div
                  key={source.id}
                  className="bg-gray-900 border border-green-800/30 rounded-lg p-4 hover:border-green-600/50 transition-all"
                >
                  <div className="flex items-start gap-3">
                    <CheckCircleIcon className="h-6 w-6 text-green-400 flex-shrink-0 mt-1" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-sm font-semibold text-white">{source.sourceName}</h3>
                        <span className="px-2 py-0.5 text-xs bg-blue-900 text-blue-200 rounded">
                          {source.stateCode}
                        </span>
                        <span className="px-2 py-0.5 text-xs bg-green-900 text-green-200 rounded">
                          Gov Auto
                        </span>
                      </div>
                      <p className="text-sm text-gray-400 mb-2">{source.agencyName}</p>
                      <a
                        href={source.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-sm text-purple-400 hover:text-purple-300 transition-colors"
                      >
                        <LinkIcon className="h-4 w-4" />
                        {source.sourceUrl}
                      </a>
                    </div>
                    <button
                      onClick={() => removeDiscoveredSource(source.id)}
                      className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-all"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* User-Added Sources */}
        {userAddedSources.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <ExclamationTriangleIcon className="h-6 w-6 text-yellow-400" />
              Additional Sources ({userAddedSources.length})
            </h2>
            <div className="space-y-3">
              {userAddedSources.map((source) => (
                <div
                  key={source.id}
                  className="bg-gray-900 border border-yellow-800/30 rounded-lg p-4 hover:border-yellow-600/50 transition-all"
                >
                  <div className="flex items-start gap-3">
                    <ExclamationTriangleIcon className="h-6 w-6 text-yellow-400 flex-shrink-0 mt-1" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-sm font-semibold text-white">{source.sourceName}</h3>
                        <span className="px-2 py-0.5 text-xs bg-yellow-900 text-yellow-200 rounded">
                          {getNonGovWarning(source.sourceUrl)}
                        </span>
                      </div>
                      <a
                        href={source.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-sm text-purple-400 hover:text-purple-300 transition-colors"
                      >
                        <LinkIcon className="h-4 w-4" />
                        {source.sourceUrl}
                      </a>
                    </div>
                    <button
                      onClick={() => removeDiscoveredSource(source.id)}
                      className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-all"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {discoveredSources.length === 0 && (
          <div className="bg-gray-900 rounded-lg border border-gray-800 p-12 text-center">
            <XCircleIcon className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No Sources Found</h3>
            <p className="text-gray-400 mb-6">
              No government-authorized sources were discovered. Try:
            </p>
            <ul className="text-sm text-gray-400 mb-6 space-y-1">
              <li>• Selecting more document types</li>
              <li>• Adjusting the confidence threshold</li>
              <li>• Choosing different states or LOBs</li>
            </ul>
            <button
              onClick={() => setRegScoutView('config')}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all"
            >
              Adjust Configuration
            </button>
          </div>
        )}

        {/* Summary Table */}
        {filteredSources.length > 0 && (
          <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">Summary Table</h2>
              <div className="flex items-center gap-4">
                {/* Filter */}
                <div className="flex items-center gap-2">
                  <FunnelIcon className="h-5 w-5 text-gray-400" />
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value as any)}
                    className="px-3 py-1.5 bg-gray-800 border border-gray-700 text-gray-200 rounded text-sm"
                  >
                    <option value="all">All Sources</option>
                    <option value="gov-auto">Gov Auto Only</option>
                    <option value="user-added">User-Added Only</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th 
                      className="text-left py-3 px-4 text-sm font-medium text-gray-300 cursor-pointer hover:text-white"
                      onClick={() => toggleSort('name')}
                    >
                      <div className="flex items-center gap-2">
                        Document Name
                        {sortBy === 'name' && (
                          <ArrowsUpDownIcon className="h-4 w-4" />
                        )}
                      </div>
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-300">
                      Summary
                    </th>
                    <th 
                      className="text-left py-3 px-4 text-sm font-medium text-gray-300 cursor-pointer hover:text-white"
                      onClick={() => toggleSort('pages')}
                    >
                      <div className="flex items-center gap-2">
                        Pages
                        {sortBy === 'pages' && (
                          <ArrowsUpDownIcon className="h-4 w-4" />
                        )}
                      </div>
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-300">
                      Source URL
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-300">
                      Type
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSources.map((source) => (
                    <tr key={source.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                      <td className="py-3 px-4 text-sm text-white">
                        {source.sourceName}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-400">
                        {source.metadata?.generatedSummary || source.metadata?.category || 'No summary available'}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-400">
                        {source.metadata?.pages || '-'}
                      </td>
                      <td className="py-3 px-4 text-sm">
                        <a
                          href={source.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-purple-400 hover:text-purple-300 transition-colors truncate block max-w-xs"
                        >
                          {source.sourceUrl}
                        </a>
                      </td>
                      <td className="py-3 px-4 text-sm">
                        <span className={`px-2 py-1 rounded text-xs ${
                          source.trustLevel === 'gov-auto'
                            ? 'bg-green-900 text-green-200'
                            : 'bg-yellow-900 text-yellow-200'
                        }`}>
                          {source.trustLevel === 'gov-auto' ? 'Gov Auto' : 'User-Added'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Bottom Actions */}
        <div className="mt-8 flex justify-center gap-4">
          <button
            onClick={() => setRegScoutView('config')}
            className="px-6 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-all border border-gray-700"
          >
            Edit Selections
          </button>
          <button
            onClick={handleRunDiscovery}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all shadow-lg shadow-purple-600/30"
          >
            Run Discovery Again
          </button>
        </div>
      </div>
    </AppLayout>
  );
};
