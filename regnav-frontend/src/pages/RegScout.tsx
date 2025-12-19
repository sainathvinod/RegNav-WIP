// RegScout - AI-Powered Regulatory Document Discovery
// Enterprise Edition with Modern Black/Purple/White Theme

import React, { useState, useMemo, useEffect } from 'react';
import { AppLayout } from '../components/layout/AppLayout';
import { LLMIndicator } from '../components/LLMIndicator';
import { PromptEditor } from '../components/PromptEditor';
import { SaveProfileModal } from '../components/SaveProfileModal';
import { useAppStore } from '../store/appStore';
import { generateDiscoveryPrompt } from '../services/promptGeneratorService';
import {
  COUNTRIES,
  LOB_CATALOG,
  getAvailableLOBsForRegions,
  getRegionsForCountry,
  getLOBDetails,
} from '../data/regscoutMappings';
import { REGULATORY_DOCUMENT_TYPES, getAvailableDocTypesForStates } from '../data/mockData';
import { WI_LOB_TO_DOC_TYPES } from '../data/stateMappings/WI';
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
  DocumentTextIcon,
  ArrowLeftIcon,
  FolderIcon,
} from '@heroicons/react/24/outline';

export const RegScout: React.FC = () => {
  const {
    selectedCountries,
    selectedStates,
    selectedLOB,
    selectedDocTypes,
    regScoutView,
    discoveredSources,
    setRegScoutView,
    setSelectedCountries,
    setSelectedStates,
    toggleState,
    setSelectedLOB,
    setSelectedDocTypes,
    toggleDocType,
    setDiscoveredSources,
    addDiscoveredSource,
    removeDiscoveredSource,
    getModuleLLMConfig,
    getModuleReferencePrompt,
    createProfile,
  } = useAppStore();

  // Get module-specific LLM config
  const llmConfig = getModuleLLMConfig('regscout');

  // Local state
  const [searchDepth, setSearchDepth] = useState<'shallow' | 'moderate' | 'deep'>('moderate');
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.7);
  const [maxResults] = useState(50);
  const [discoveryProgress, setDiscoveryProgress] = useState<DiscoveryProgress>({
    step: 'generating',
    stepLabel: 'Generating queries',
    percent: 0,
  });
  
  // Prompt generation state
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);
  const [promptGenerationStatus, setPromptGenerationStatus] = useState('');
  
  // Results table state
  const [sortBy, setSortBy] = useState<'name' | 'pages'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [filterType, setFilterType] = useState<'all' | 'gov-auto' | 'user-added'>('all');
  
  // Bulk operations state
  const [selectedSourceIds, setSelectedSourceIds] = useState<Set<string>>(new Set());
  const [showAddSourceModal, setShowAddSourceModal] = useState(false);
  const [sourceBlocks, setSourceBlocks] = useState<Array<{ id: string; name: string; url: string; error?: string }>>([
    { id: '1', name: '', url: '' }
  ]);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [showSaveProfileModal, setShowSaveProfileModal] = useState(false);

  // Get selected country details
  const selectedCountry = COUNTRIES.find(c => c.code === selectedCountries[0]) || COUNTRIES[0];
  
  // Check if US is selected (full functionality)
  const isUSSelected = selectedCountries[0] === 'US';
  
  // Get regions for selected country (works for all countries)
  const availableRegions = useMemo(() => {
    return getRegionsForCountry(selectedCountries[0] || 'US');
  }, [selectedCountries]);

  // Get available LOBs based on selected regions (INTERSECTION logic for all countries)
  const availableLOBs = useMemo(() => {
    if (selectedStates.length > 0) {
      const availableIds = getAvailableLOBsForRegions(selectedCountries[0] || 'US', selectedStates);
      // Convert IDs to LOB objects with details
      return availableIds.map(id => getLOBDetails(id)).filter(Boolean) as any[];
    }
    // No regions selected - show all LOBs
    return Object.values(LOB_CATALOG);
  }, [selectedCountries, selectedStates]);

  // Check if Wisconsin-only is selected
  const isWIOnly = useMemo(() => {
    return selectedCountries[0] === 'US' && 
           selectedStates.length === 1 && 
           selectedStates[0] === 'WI';
  }, [selectedCountries, selectedStates]);

  // Get available Doc Types based on selected states (WI-specific if applicable)
  const availableDocTypes = useMemo(() => {
    // WI-specific: Filter by LOB if WI is selected and LOB is set
    if (isWIOnly && selectedLOB && WI_LOB_TO_DOC_TYPES[selectedLOB]) {
      const wiDocTypeIds = WI_LOB_TO_DOC_TYPES[selectedLOB];
      return REGULATORY_DOCUMENT_TYPES.filter(dt => wiDocTypeIds.includes(dt.id));
    }
    
    // Generic logic for other states
    if (selectedCountries[0] === 'US' && selectedStates.length > 0) {
      const availableIds = getAvailableDocTypesForStates(selectedStates);
      return REGULATORY_DOCUMENT_TYPES.filter(dt => availableIds.includes(dt.id));
    }
    
    return REGULATORY_DOCUMENT_TYPES;
  }, [selectedCountries, selectedStates, selectedLOB, isWIOnly]);

  // Clear incompatible selections when country changes
  useEffect(() => {
    setSelectedStates([]);
    setSelectedLOB('');
    setSelectedDocTypes([]);
  }, [selectedCountries, setSelectedStates, setSelectedLOB, setSelectedDocTypes]);

  // Clear LOB/DocType selections when regions change (they may no longer be valid)
  useEffect(() => {
    if (selectedStates.length > 0) {
      const availableLobIds = getAvailableLOBsForRegions(selectedCountries[0] || 'US', selectedStates);
      const availableDocTypeIds = selectedCountries[0] === 'US' 
        ? getAvailableDocTypesForStates(selectedStates)
        : selectedDocTypes; // Keep existing for non-US
      
      // Clear LOB if no longer valid
      if (selectedLOB && !availableLobIds.includes(selectedLOB)) {
        setSelectedLOB('');
      }
      if (selectedCountries[0] === 'US') {
        setSelectedDocTypes(selectedDocTypes.filter(id => availableDocTypeIds.includes(id)));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStates]); // Only run when states change

  // Can run if all required fields selected (US only for now)
  const canRunDiscovery = isUSSelected && 
                          selectedCountries.length > 0 && 
                          selectedStates.length > 0 && 
                          selectedLOB !== '' && 
                          selectedDocTypes.length > 0;

  // Handle prompt generation
  const handleGeneratePrompt = async () => {
    if (!canRunDiscovery) return;

    setIsGeneratingPrompt(true);

    try {
      // Use first state and first doc type for prompt generation
      // (If multiple, we'll generate prompts for each combination during discovery)
      const firstState = selectedStates[0];
      const firstDocType = selectedDocTypes[0];

      // Get the configured meta prompt for this doc type (RegScout module)
      const referencePrompt = getModuleReferencePrompt('regscout', firstDocType);

      const prompt = await generateDiscoveryPrompt(
        selectedCountries[0],
        firstState,
        selectedLOB,
        firstDocType,
        llmConfig,
        referencePrompt,
        (status) => setPromptGenerationStatus(status)
      );

      setGeneratedPrompt(prompt);
      setPromptGenerationStatus('');
    } catch (error) {
      console.error('Prompt generation failed:', error);
      alert('Failed to generate prompt. Please try again.');
    } finally {
      setIsGeneratingPrompt(false);
    }
  };

  // Handle prompt approval (proceed to discovery)
  const handleApprovePrompt = () => {
    handleRunDiscovery();
  };

  // Handle discovery
  const handleRunDiscovery = async () => {
    if (!canRunDiscovery) return;

    setRegScoutView('loading');
    setDiscoveryProgress({ step: 'generating', stepLabel: 'Generating queries', percent: 0 });

    const config: ScoutingConfiguration = {
      countries: selectedCountries,
      states: selectedStates,
      linesOfBusiness: [selectedLOB], // Single LOB wrapped in array
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
      const job = await executeScoutingJob(
        config,
        (progress) => {
          setDiscoveryProgress(progress);
        },
        generatedPrompt || undefined // Pass custom prompt if available
      );

      setDiscoveredSources(job.results || []);
      setRegScoutView('results');
    } catch (error) {
      console.error('Discovery failed:', error);
      alert('Discovery failed. Please try again.');
      setRegScoutView('config');
    }
  };

  // Bulk operations handlers
  const toggleSourceSelection = (sourceId: string) => {
    setSelectedSourceIds(prev => {
      const next = new Set(prev);
      if (next.has(sourceId)) {
        next.delete(sourceId);
      } else {
        next.add(sourceId);
      }
      return next;
    });
  };

  const toggleAllGovSources = () => {
    const govIds = discoveredSources.filter(s => s.trustLevel === 'gov-auto').map(s => s.id);
    if (govIds.every(id => selectedSourceIds.has(id))) {
      setSelectedSourceIds(new Set());
    } else {
      setSelectedSourceIds(new Set(govIds));
    }
  };

  const handleBulkDelete = () => {
    setDiscoveredSources(discoveredSources.filter(s => !selectedSourceIds.has(s.id)));
    setSelectedSourceIds(new Set());
  };

  const addSourceBlock = () => {
    setSourceBlocks([...sourceBlocks, { id: Date.now().toString(), name: '', url: '' }]);
  };

  const removeSourceBlock = (blockId: string) => {
    if (sourceBlocks.length === 1) return; // Keep at least one block
    setSourceBlocks(sourceBlocks.filter(block => block.id !== blockId));
  };

  const updateSourceBlock = (blockId: string, field: 'name' | 'url', value: string) => {
    setSourceBlocks(sourceBlocks.map(block => 
      block.id === blockId ? { ...block, [field]: value, error: undefined } : block
    ));
  };

  const handleAddSource = () => {
    // Validate all blocks
    const validatedBlocks = sourceBlocks.map(block => {
      if (!block.url.trim() && !block.name.trim()) {
        return { ...block, error: undefined }; // Empty blocks are ignored
      }
      if (!block.url.trim()) {
        return { ...block, error: 'URL is required' };
      }
      // Basic URL validation
      try {
        new URL(block.url.trim());
        return { ...block, error: undefined };
      } catch {
        return { ...block, error: 'Invalid URL format' };
      }
    });

    setSourceBlocks(validatedBlocks);

    // Check if there are any errors
    if (validatedBlocks.some(block => block.error)) {
      return;
    }

    // Get valid blocks (non-empty with URLs)
    const validBlocks = validatedBlocks.filter(block => block.url.trim());

    if (validBlocks.length === 0) {
      return;
    }

    // Add all valid sources
    validBlocks.forEach(block => {
      const newSource: any = {
        id: `user-${Date.now()}-${Math.random()}`,
        country: selectedCountries[0] || 'US',
        stateCode: selectedStates[0] || '',
        lineOfBusiness: selectedLOB || '',
        documentType: selectedDocTypes[0] || '',
        sourceUrl: block.url.trim(),
        sourceName: block.name.trim() || 'User-Added Source',
        discoveryMethod: 'user_provided',
        status: 'active',
        confidenceScore: 0.5,
        trustLevel: 'user-added',
        metadata: {
          category: 'USER_ADDED',
          generatedSummary: 'User-provided source for regulatory compliance.',
          jurisdiction: `State: ${selectedStates[0] || 'Unknown'}`,
        },
        createdAt: new Date().toISOString(),
        discoveredBy: 'User',
      };
      
      addDiscoveredSource(newSource);
    });

    // Show toast
    setToastMessage(`Added ${validBlocks.length} source${validBlocks.length > 1 ? 's' : ''}`);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);

    // Reset and close
    setSourceBlocks([{ id: '1', name: '', url: '' }]);
    setShowAddSourceModal(false);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach(file => {
      const newSource: any = {
        id: `upload-${Date.now()}-${Math.random()}`,
        country: selectedCountries[0] || 'US',
        stateCode: selectedStates[0] || '',
        lineOfBusiness: selectedLOB || '',
        documentType: selectedDocTypes[0] || '',
        sourceUrl: `local://${file.name}`,
        sourceName: file.name,
        discoveryMethod: 'user_provided',
        status: 'active',
        confidenceScore: 0.5,
        trustLevel: 'user-added',
        metadata: {
          category: 'UPLOADED_DOCUMENT',
          generatedSummary: `Uploaded document: ${file.name}`,
          jurisdiction: `State: ${selectedStates[0] || 'Unknown'}`,
          fileSize: `${(file.size / 1024).toFixed(1)} KB`,
          format: file.name.split('.').pop()?.toUpperCase() || 'Unknown',
        },
        createdAt: new Date().toISOString(),
        discoveredBy: 'User Upload',
      };
      
      addDiscoveredSource(newSource);
    });

    event.target.value = '';
  };

  const handleSaveProfile = (profileData: any) => {
    const profile = createProfile(profileData);
    setToastMessage(`Profile "${profile.name}" saved successfully!`);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
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
          {/* Modern Header */}
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-3">
              <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgb(var(--color-accent-primary))' }}>
                <MagnifyingGlassIcon className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold" style={{ color: 'var(--text)' }}>RegScout</h1>
                <p className="mt-1" style={{ color: 'var(--muted)' }}>
                  AI-powered discovery of authoritative regulatory documents
                </p>
              </div>
            </div>
          </div>

          {/* AI Model Indicator */}
          <div className="mb-6">
            <LLMIndicator config={llmConfig} moduleName="RegScout" />
          </div>

          {/* Configuration Panel */}
          <div className="rounded-xl border p-8 mb-6 shadow-2xl" style={{ backgroundColor: 'var(--color-bg-panel)', borderColor: 'var(--color-border-subtle)' }}>
            <h2 className="text-xl font-semibold mb-6" style={{ color: 'var(--color-text-primary)' }}>Discovery Configuration</h2>

            {/* Country Selection */}
            <div className="mb-8">
              <label className="block text-sm font-medium mb-3" style={{ color: 'var(--color-text-secondary)' }}>
                Country
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {COUNTRIES.map((country) => {
                  const isSelected = selectedCountries.includes(country.code);
                  return (
                    <button
                      key={country.code}
                      onClick={() => setSelectedCountries([country.code])}
                      className="px-4 py-3 rounded-lg border-2 text-sm font-medium transition-all"
                      style={{
                        backgroundColor: isSelected ? 'rgb(var(--color-accent-primary))' : 'var(--surface-2)',
                        borderColor: isSelected ? 'rgb(var(--color-accent-primary))' : 'var(--border)',
                        color: isSelected ? '#FFFFFF' : 'var(--muted)',
                        boxShadow: isSelected ? `0 10px 25px -5px rgba(var(--color-accent-primary), 0.3)` : 'none',
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.borderColor = 'rgb(var(--color-accent-primary))';
                          e.currentTarget.style.color = 'var(--text)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.borderColor = 'var(--border)';
                          e.currentTarget.style.color = 'var(--muted)';
                        }
                      }}
                    >
                      {country.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Region Selection (Dynamic label based on country) */}
            <div className="mb-8">
              <label className="block text-sm font-medium mb-3" style={{ color: 'var(--color-text-secondary)' }}>
                {selectedCountry?.label || 'Region'} ({selectedStates.length} selected)
              </label>
              {availableRegions.length > 0 ? (
                <>
                  <div className="grid grid-cols-4 md:grid-cols-8 lg:grid-cols-10 gap-2 max-h-64 overflow-y-auto p-4 rounded-lg border" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
                    {availableRegions.map((region) => {
                      const isSelected = selectedStates.includes(region.code);
                      return (
                        <button
                          key={region.code}
                          onClick={() => toggleState(region.code)}
                          className="px-3 py-2 rounded-md text-sm font-medium transition-all"
                          style={{
                            backgroundColor: isSelected ? 'rgb(var(--color-accent-primary))' : 'var(--surface-2)',
                            color: isSelected ? '#FFFFFF' : 'var(--muted)',
                            boxShadow: isSelected ? '0 4px 6px -1px rgba(0, 0, 0, 0.1)' : 'none',
                          }}
                          onMouseEnter={(e) => {
                            if (!isSelected) {
                              e.currentTarget.style.backgroundColor = 'var(--hover)';
                              e.currentTarget.style.color = 'var(--text)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isSelected) {
                              e.currentTarget.style.backgroundColor = 'var(--surface-2)';
                              e.currentTarget.style.color = 'var(--muted)';
                            }
                          }}
                          title={region.name}
                        >
                          {region.code}
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-3 flex gap-3">
                    <button
                      onClick={() => setSelectedStates(availableRegions.map(s => s.code))}
                      className="text-sm transition-colors"
                      style={{ color: 'rgb(var(--color-accent-primary))' }}
                      onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                      onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                    >
                      Select All
                    </button>
                    <button
                      onClick={() => setSelectedStates([])}
                      className="text-sm transition-colors"
                      style={{ color: 'var(--muted)' }}
                      onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
                      onMouseLeave={(e) => e.currentTarget.style.color = 'var(--muted)'}
                    >
                      Clear All
                    </button>
                  </div>
                </>
              ) : (
                <div className="p-6 rounded-lg border text-center" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
                  <p style={{ color: 'var(--muted)' }}>
                    {selectedCountry.label} data not yet available for {selectedCountry.name}
                  </p>
                </div>
              )}
            </div>

            {/* Lines of Business (Single-Select) */}
            <div className={`mb-8 ${!isUSSelected ? 'opacity-60' : ''}`}>
              <div className="flex items-center gap-3 mb-3">
                <label className="block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                  Line of Business {isUSSelected && selectedLOB && (
                    <span style={{ color: 'rgb(var(--color-accent-primary))' }}>(1 selected)</span>
                  )}
                  {isUSSelected && selectedStates.length > 0 && !selectedLOB && (
                    <span className="ml-2 text-xs" style={{ color: 'rgb(var(--color-accent-primary))' }}>
                      (Showing only LOBs valid for ALL selected {selectedCountry?.label?.toLowerCase()})
                    </span>
                  )}
                </label>
                {!isUSSelected && (
                  <span className="px-3 py-1 text-xs font-medium rounded-full border" style={{ 
                    backgroundColor: 'rgba(var(--color-accent-primary), 0.1)',
                    color: 'rgb(var(--color-accent-primary))',
                    borderColor: 'rgb(var(--color-accent-primary))'
                  }}>
                    Coming Soon
                  </span>
                )}
              </div>
              
              {!isUSSelected && (
                <div className="mb-4 p-3 border rounded-lg" style={{ backgroundColor: 'var(--surface-2)', borderColor: 'var(--border)', opacity: 0.7 }}>
                  <p className="text-sm" style={{ color: 'var(--muted)' }}>
                    LOB and document-type discovery for {selectedCountry.name} is coming soon. For now, select {selectedCountry.label?.toLowerCase()} only.
                  </p>
                </div>
              )}
              
              <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 ${!isUSSelected ? 'pointer-events-none' : ''}`}>
                {availableLOBs.slice(0, 6).map((lob) => {
                  const isSelected = selectedLOB === lob.id;
                  const isDisabled = !isUSSelected;
                  
                  return (
                    <button
                      key={lob.id}
                      onClick={() => isUSSelected && setSelectedLOB(lob.id)}
                      disabled={isDisabled}
                      className="px-4 py-3 rounded-lg border-2 text-left transition-all"
                      style={{
                        backgroundColor: isDisabled 
                          ? 'var(--surface-2)' 
                          : isSelected 
                          ? `rgba(var(--color-accent-primary), 0.15)` 
                          : 'var(--surface)',
                        borderColor: isDisabled
                          ? 'var(--border-subtle)'
                          : isSelected
                          ? 'rgb(var(--color-accent-primary))'
                          : 'var(--border)',
                        color: isDisabled
                          ? 'var(--disabled)'
                          : isSelected
                          ? 'rgb(var(--color-accent-primary))'
                          : 'var(--muted)',
                        opacity: isDisabled ? 0.5 : 1,
                        cursor: isDisabled ? 'not-allowed' : 'pointer',
                      }}
                      onMouseEnter={(e) => {
                        if (!isDisabled && !isSelected) {
                          e.currentTarget.style.borderColor = 'rgb(var(--color-accent-primary))';
                          e.currentTarget.style.color = 'var(--text)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isDisabled && !isSelected) {
                          e.currentTarget.style.borderColor = 'var(--border)';
                          e.currentTarget.style.color = 'var(--muted)';
                        }
                      }}
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-2xl flex-shrink-0">{lob.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                              {lob.name}
                            </span>
                            {lob.code && (
                              <span className="px-1.5 py-0.5 text-xs rounded" style={{ backgroundColor: 'var(--surface-2)', color: 'var(--muted)' }}>
                                {lob.code}
                              </span>
                            )}
                          </div>
                          <p className="text-xs leading-relaxed" style={{ color: 'var(--muted)' }}>
                            {lob.description}
                          </p>
                        </div>
                        {isUSSelected && isSelected && (
                          <CheckCircleIcon className="h-5 w-5 flex-shrink-0 mt-1" style={{ color: 'rgb(var(--color-accent-primary))' }} />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Document Types */}
            <div className={`mb-8 ${!isUSSelected ? 'opacity-60' : ''}`}>
              <div className="flex items-center gap-3 mb-3">
                <label className="block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                  Regulatory Document Types ({isUSSelected ? selectedDocTypes.length : 0} selected)
                  {isUSSelected && selectedStates.length > 0 && (
                    <span className="ml-2 text-xs" style={{ color: 'rgb(var(--color-accent-primary))' }}>
                      (Showing only types valid for ALL selected states)
                    </span>
                  )}
                </label>
                {!isUSSelected && (
                  <span className="px-3 py-1 text-xs font-medium rounded-full border" style={{ 
                    backgroundColor: 'rgba(var(--color-accent-primary), 0.1)',
                    color: 'rgb(var(--color-accent-primary))',
                    borderColor: 'rgb(var(--color-accent-primary))'
                  }}>
                    Coming Soon
                  </span>
                )}
              </div>
              
              <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 ${!isUSSelected ? 'pointer-events-none' : ''}`}>
                {availableDocTypes.map((docType) => {
                  const isSelected = selectedDocTypes.includes(docType.id);
                  const isDisabled = !isUSSelected;
                  
                  return (
                    <button
                      key={docType.id}
                      onClick={() => isUSSelected && toggleDocType(docType.id)}
                      disabled={isDisabled}
                      className="px-4 py-3 rounded-lg border-2 text-left transition-all"
                      style={{
                        backgroundColor: isDisabled 
                          ? 'var(--surface-2)' 
                          : isSelected 
                          ? `rgba(var(--color-accent-primary), 0.15)` 
                          : 'var(--surface)',
                        borderColor: isDisabled
                          ? 'var(--border-subtle)'
                          : isSelected
                          ? 'rgb(var(--color-accent-primary))'
                          : 'var(--border)',
                        color: isDisabled
                          ? 'var(--disabled)'
                          : isSelected
                          ? 'rgb(var(--color-accent-primary))'
                          : 'var(--muted)',
                        opacity: isDisabled ? 0.5 : 1,
                        cursor: isDisabled ? 'not-allowed' : 'pointer',
                      }}
                      onMouseEnter={(e) => {
                        if (!isDisabled && !isSelected) {
                          e.currentTarget.style.borderColor = 'rgb(var(--color-accent-primary))';
                          e.currentTarget.style.color = 'var(--text)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isDisabled && !isSelected) {
                          e.currentTarget.style.borderColor = 'var(--border)';
                          e.currentTarget.style.color = 'var(--muted)';
                        }
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{docType.name}</span>
                            <span className="px-2 py-0.5 text-xs rounded" style={{ backgroundColor: 'var(--surface-2)', color: 'var(--muted)' }}>
                              {docType.code}
                            </span>
                          </div>
                          <div className="text-xs mt-1 truncate" style={{ color: 'var(--muted)' }}>{docType.description}</div>
                        </div>
                        {isUSSelected && isSelected && (
                          <CheckCircleIcon className="h-5 w-5 flex-shrink-0" style={{ color: 'rgb(var(--color-accent-primary))' }} />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* WI-Only: Authority FYI */}
            {isWIOnly && selectedLOB === 'workers_comp' && (
              <div className="mb-6 p-3 border rounded-lg" style={{ backgroundColor: 'var(--surface-2)', borderColor: 'var(--border)', opacity: 0.8 }}>
                <p className="text-xs" style={{ color: 'var(--muted)' }}>
                  <strong style={{ color: 'var(--text-secondary)' }}>FYI:</strong> Common WI Workers' Compensation authorities include WI DWD (Department of Workforce Development), WI OCI (Office of the Commissioner of Insurance), and WI Legislature.
                </p>
              </div>
            )}

            {/* Advanced Options */}
            <div className="border-t pt-6 mt-6" style={{ borderColor: 'var(--border)' }}>
              <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-secondary)' }}>Advanced Options</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Search Depth */}
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                    Search Depth
                  </label>
                  <select
                    value={searchDepth}
                    onChange={(e) => setSearchDepth(e.target.value as any)}
                    className="w-full px-3 py-2 border rounded-lg transition-all"
                    style={{ 
                      backgroundColor: 'var(--surface-2)', 
                      borderColor: 'var(--border)', 
                      color: 'var(--text)'
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = 'rgb(var(--color-accent-primary))';
                      e.currentTarget.style.boxShadow = `0 0 0 3px rgba(var(--color-accent-primary), 0.1)`;
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <option value="shallow">Shallow (Primary sources only)</option>
                    <option value="moderate">Moderate (Recommended)</option>
                    <option value="deep">Deep (Comprehensive search)</option>
                  </select>
                </div>

                {/* Confidence Threshold */}
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
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
                  {/* FYI Note for High Confidence */}
                  {confidenceThreshold >= 0.7 && (
                    <div className="mt-2 p-2 bg-blue-900/20 border border-blue-800/30 rounded text-xs text-blue-300">
                      {confidenceThreshold === 1.0 ? (
                        <span>
                          <strong>FYI:</strong> At 100% confidence, results are strict and may return fewer sources. 
                          Consider 70–90% to broaden discovery.
                        </span>
                      ) : (
                        <span>
                          <strong>FYI:</strong> Higher confidence thresholds may return fewer sources.
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Prompt Editor - Generate and edit discovery prompt */}
            {canRunDiscovery && (
              <div className="mt-8">
                <PromptEditor
                  prompt={generatedPrompt}
                  onPromptChange={setGeneratedPrompt}
                  onGenerate={handleGeneratePrompt}
                  onApprove={handleApprovePrompt}
                  isGenerating={isGeneratingPrompt}
                  generationStatus={promptGenerationStatus}
                  configuration={{
                    country: selectedCountries[0],
                    state: selectedStates[0] || '',
                    lob: selectedLOB,
                    docType: selectedDocTypes[0] || '',
                  }}
                />
              </div>
            )}

            {/* Info Message when fields not selected */}
            {!canRunDiscovery && (
              <div className="mt-8 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <div className="flex items-center gap-2 text-sm text-yellow-400">
                  <ExclamationTriangleIcon className="h-5 w-5" />
                  {!isUSSelected ? (
                    <span>Discovery for {selectedCountry.name} coming soon. Please select United States for full functionality.</span>
                  ) : (
                    <span>Please select {selectedCountry.label}, LOB, and Document Types to begin</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </AppLayout>
    );
  }

  // Render LOADING view
  if (regScoutView === 'loading') {
    return (
      <AppLayout title="RegScout - Discovering Sources">
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0, 0, 0, 0.9)' }}>
          <div className="max-w-2xl w-full mx-4">
            <div className="rounded-2xl border p-12 shadow-2xl" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border-subtle)' }}>
              {/* Progress Circle */}
              <div className="flex justify-center mb-8">
                <div className="relative">
                  <div className="w-32 h-32 rounded-full border-8" style={{ borderColor: 'var(--border)' }}></div>
                  <div 
                    className="absolute inset-0 w-32 h-32 rounded-full border-8 border-t-transparent animate-spin"
                    style={{ borderColor: 'rgb(var(--color-accent-primary))' }}
                  ></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-3xl font-bold" style={{ color: 'var(--text)' }}>{discoveryProgress.percent}%</span>
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
                      <div 
                        className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-semibold"
                        style={{
                          backgroundColor: isComplete 
                            ? 'rgb(var(--color-accent-primary))' 
                            : isActive 
                            ? 'rgba(var(--color-accent-primary), 0.8)' 
                            : 'var(--surface-2)',
                          color: isComplete || isActive ? '#FFFFFF' : 'var(--disabled)',
                        }}
                      >
                        {isComplete ? <CheckCircleIcon className="h-5 w-5" /> : index + 1}
                      </div>
                      <div 
                        className="flex-1 text-sm font-medium"
                        style={{ color: isComplete || isActive ? 'var(--text)' : 'var(--disabled)' }}
                      >
                        {item.label}
                      </div>
                      {isActive && (
                        <ArrowPathIcon className="h-5 w-5 animate-spin" style={{ color: 'rgb(var(--color-accent-primary))' }} />
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
        <div className="sticky top-0 z-10 backdrop-blur-sm border-b -mx-6 px-6 py-4 mb-6" style={{ backgroundColor: 'rgba(var(--color-bg-panel), 0.9)', borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--text)' }}>Discovery Results</h1>
              <div className="flex items-center gap-4 text-sm" style={{ color: 'var(--muted)' }}>
                <span>Country: <span style={{ color: 'rgb(var(--color-accent-primary))' }}>{selectedCountry.name}</span></span>
                <span>•</span>
                <span>{selectedCountry.label}: <span style={{ color: 'rgb(var(--color-accent-primary))' }}>{selectedStates.join(', ')}</span></span>
                <span>•</span>
                <span>LOB: <span style={{ color: 'rgb(var(--color-accent-primary))' }}>{selectedLOB ? getLOBDetails(selectedLOB)?.name : 'None'}</span></span>
                <span>•</span>
                <span>Doc Types: <span style={{ color: 'rgb(var(--color-accent-primary))' }}>{selectedDocTypes.length}</span></span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowAddSourceModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all"
              >
                <PencilSquareIcon className="h-5 w-5" />
                Add Source
              </button>
              <label 
                className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all border cursor-pointer"
                style={{
                  backgroundColor: 'var(--surface-2)',
                  color: 'var(--text)',
                  borderColor: 'var(--border)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--hover)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--surface-2)';
                }}
              >
                <input
                  type="file"
                  accept=".pdf,.docx,.txt"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <DocumentTextIcon className="h-5 w-5" />
                Upload File
              </label>
            </div>
          </div>
        </div>

        {/* Toast Notification */}
        {showToast && (
          <div className="fixed top-4 right-4 z-50 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-fade-in">
            <CheckCircleIcon className="h-5 w-5" />
            {toastMessage}
          </div>
        )}

        {/* Add Source Modal */}
        {showAddSourceModal && (
          <div className="fixed inset-0 backdrop-blur-sm z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
            <div className="border rounded-lg max-w-2xl w-full p-6 max-h-[80vh] overflow-y-auto" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
              <h2 className="text-xl font-semibold text-white mb-4">Add Sources</h2>
              
              <div className="space-y-6 mb-6">
                {sourceBlocks.map((block, index) => (
                  <div key={block.id} className="border rounded-lg p-4" style={{ backgroundColor: 'var(--color-bg-elevated)', borderColor: 'var(--color-border-default)', opacity: 0.9 }}>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Source {index + 1}</span>
                      {sourceBlocks.length > 1 && (
                        <button
                          onClick={() => removeSourceBlock(block.id)}
                          className="transition-colors"
                          style={{ color: 'var(--muted)' }}
                          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--error)'}
                          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--muted)'}
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                          Source Name
                        </label>
                        <input
                          type="text"
                          value={block.name}
                          onChange={(e) => updateSourceBlock(block.id, 'name', e.target.value)}
                          placeholder="e.g., Wisconsin OCI Bulletin 2024"
                          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          style={{ backgroundColor: 'var(--color-bg-elevated)', borderColor: 'var(--color-border-default)', color: 'var(--color-text-primary)' }}
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                          Source URL *
                        </label>
                        <input
                          type="url"
                          value={block.url}
                          onChange={(e) => updateSourceBlock(block.id, 'url', e.target.value)}
                          placeholder="https://..."
                          className="w-full px-4 py-2 border rounded-lg transition-all"
                          style={{ 
                            backgroundColor: 'var(--surface-2)', 
                            borderColor: block.error ? 'var(--error)' : 'var(--border)', 
                            color: 'var(--text)' 
                          }}
                          onFocus={(e) => {
                            if (!block.error) {
                              e.currentTarget.style.borderColor = 'rgb(var(--color-accent-primary))';
                              e.currentTarget.style.boxShadow = `0 0 0 3px rgba(var(--color-accent-primary), 0.1)`;
                            }
                          }}
                          onBlur={(e) => {
                            e.currentTarget.style.borderColor = block.error ? 'var(--error)' : 'var(--border)';
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                        />
                        {block.error && (
                          <p className="text-sm mt-1" style={{ color: 'var(--error)' }}>{block.error}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                
                <button
                  onClick={addSourceBlock}
                  className="flex items-center gap-2 text-sm transition-colors"
                  style={{ color: 'rgb(var(--color-accent-primary))' }}
                  onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                >
                  <PencilSquareIcon className="h-4 w-4" />
                  + Add another source
                </button>
              </div>
              
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowAddSourceModal(false);
                    setSourceBlocks([{ id: '1', name: '', url: '' }]);
                  }}
                  className="px-4 py-2 rounded-lg transition-all"
                  style={{ backgroundColor: 'var(--surface-2)', color: 'var(--text-secondary)' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--hover)';
                    e.currentTarget.style.color = 'var(--text)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--surface-2)';
                    e.currentTarget.style.color = 'var(--text-secondary)';
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddSource}
                  className="px-4 py-2 text-white rounded-lg transition-all"
                  style={{ backgroundColor: 'rgb(var(--color-accent-primary))' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgb(var(--color-accent-hover))'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgb(var(--color-accent-primary))'}
                >
                  Add {sourceBlocks.filter(b => b.url.trim()).length > 0 ? `${sourceBlocks.filter(b => b.url.trim()).length} ` : ''}Source{sourceBlocks.filter(b => b.url.trim()).length > 1 ? 's' : ''}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Quality Warning */}
        {qualityCheck.warning && (
          <div className="mb-6 p-4 bg-yellow-900/20 border border-yellow-700 rounded-lg flex items-start gap-3">
            <ExclamationTriangleIcon className="h-6 w-6 flex-shrink-0 mt-0.5" style={{ color: 'var(--warning)' }} />
            <div>
              <div className="font-medium mb-1" style={{ color: 'var(--warning)' }}>Quality Check</div>
              <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>{qualityCheck.warning}</div>
            </div>
          </div>
        )}

        {/* Government-Authorized Sources Section */}
        {govAutoSources.length > 0 && (
          <div className="mb-8">
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircleIcon className="h-6 w-6 text-green-400" />
                <h2 className="text-xl font-semibold text-white">
                  Government-Authorized Sources ({govAutoSources.length})
                </h2>
              </div>
              <p className="text-sm ml-8" style={{ color: 'var(--muted)' }}>
                Auto-discovered and government-authorized for your selection.
              </p>
            </div>
            
            <div className="flex items-center justify-between mb-4">
              <div />  {/* Spacer */}
              
              {selectedSourceIds.size > 0 && (
                <div className="flex items-center gap-3">
                  <span className="text-sm" style={{ color: 'var(--muted)' }}>{selectedSourceIds.size} selected</span>
                  <button
                    onClick={handleBulkDelete}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all"
                  >
                    <TrashIcon className="h-4 w-4" />
                    Delete Selected
                  </button>
                </div>
              )}
            </div>
            
            <div className="mb-3">
              <label 
                className="flex items-center gap-2 text-sm cursor-pointer transition-colors"
                style={{ color: 'var(--muted)' }}
                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--muted)'}
              >
                <input
                  type="checkbox"
                  checked={govAutoSources.length > 0 && govAutoSources.every(s => selectedSourceIds.has(s.id))}
                  onChange={toggleAllGovSources}
                  className="w-4 h-4 rounded"
                  style={{
                    borderColor: 'var(--border)',
                    backgroundColor: 'var(--surface-2)',
                    accentColor: 'rgb(var(--color-accent-primary))'
                  }}
                />
                Select All
              </label>
            </div>
            
            <div className="space-y-3">
              {govAutoSources.map((source) => (
                <div
                  key={source.id}
                  className="border rounded-lg p-4 transition-all"
                  style={{
                    backgroundColor: 'var(--surface)',
                    borderColor: 'var(--success)',
                    borderWidth: '1px',
                    borderStyle: 'solid'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.boxShadow = `0 0 0 1px var(--success)`}
                  onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selectedSourceIds.has(source.id)}
                      onChange={() => toggleSourceSelection(source.id)}
                      className="mt-1 w-4 h-4 rounded"
                      style={{
                        borderColor: 'var(--border)',
                        backgroundColor: 'var(--surface-2)',
                        accentColor: 'rgb(var(--color-accent-primary))'
                      }}
                    />
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
                      <p className="text-sm mb-2" style={{ color: 'var(--muted)' }}>{source.agencyName}</p>
                      <a
                        href={source.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-sm transition-colors"
                        style={{ color: 'rgb(var(--color-accent-primary))' }}
                        onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                        onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                      >
                        <LinkIcon className="h-4 w-4" />
                        {source.sourceUrl}
                      </a>
                    </div>
                    <button
                      onClick={() => removeDiscoveredSource(source.id)}
                      className="p-2 rounded-lg transition-all"
                      style={{ color: 'var(--muted)' }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = 'var(--error)';
                        e.currentTarget.style.backgroundColor = 'rgba(220, 38, 38, 0.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = 'var(--muted)';
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* User-Added Sources Section */}
        {userAddedSources.length > 0 && (
          <div className="mb-8">
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <ExclamationTriangleIcon className="h-6 w-6" style={{ color: 'var(--warning)' }} />
                <h2 className="text-xl font-semibold" style={{ color: 'var(--text)' }}>
                  User-Added Sources ({userAddedSources.length})
                </h2>
              </div>
              <p className="text-sm ml-8" style={{ color: 'var(--muted)' }}>
                Manually added sources (may include internal or non-government resources).
              </p>
            </div>
            <div className="space-y-3">
              {userAddedSources.map((source) => (
                <div
                  key={source.id}
                  className="border rounded-lg p-4 transition-all"
                  style={{
                    backgroundColor: 'var(--surface)',
                    borderColor: 'var(--warning)',
                    borderWidth: '1px',
                    borderStyle: 'solid'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.boxShadow = `0 0 0 1px var(--warning)`}
                  onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
                >
                  <div className="flex items-start gap-3">
                    <ExclamationTriangleIcon className="h-6 w-6 flex-shrink-0 mt-1" style={{ color: 'var(--warning)' }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{source.sourceName}</h3>
                        <span className="px-2 py-0.5 text-xs rounded" style={{ backgroundColor: 'rgba(var(--color-accent-primary), 0.1)', color: 'var(--warning)' }}>
                          {getNonGovWarning(source.sourceUrl)}
                        </span>
                      </div>
                      <a
                        href={source.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-sm transition-colors"
                        style={{ color: 'rgb(var(--color-accent-primary))' }}
                        onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                        onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                      >
                        <LinkIcon className="h-4 w-4" />
                        {source.sourceUrl}
                      </a>
                    </div>
                    <button
                      onClick={() => removeDiscoveredSource(source.id)}
                      className="p-2 rounded-lg transition-all"
                      style={{ color: 'var(--muted)' }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = 'var(--error)';
                        e.currentTarget.style.backgroundColor = 'rgba(220, 38, 38, 0.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = 'var(--muted)';
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
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
          <div className="rounded-lg border p-12 text-center" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
            <XCircleIcon className="h-16 w-16 mx-auto mb-4" style={{ color: 'var(--muted)' }} />
            <h3 className="text-lg font-medium mb-2" style={{ color: 'var(--text)' }}>No Sources Found</h3>
            <p className="mb-6" style={{ color: 'var(--muted)' }}>
              No government-authorized sources were discovered. You can:
            </p>
            <ul className="text-sm space-y-1" style={{ color: 'var(--muted)' }}>
              <li>• Add sources manually using the "Add Source" button above</li>
              <li>• Upload documents using the "Upload File" button above</li>
            </ul>
          </div>
        )}

        {/* Summary Table Section */}
        {filteredSources.length > 0 && (
          <div className="rounded-lg border p-6" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--text)' }}>Summary Table (Current Working Set)</h2>
              <p className="text-sm" style={{ color: 'var(--muted)' }}>
                This table always reflects the sources currently selected above.
              </p>
            </div>
            
            <div className="flex items-center justify-between mb-4">
              <div />  {/* Spacer */}
              <div className="flex items-center gap-4">
                {/* Filter */}
                <div className="flex items-center gap-2">
                  <FunnelIcon className="h-5 w-5" style={{ color: 'var(--muted)' }} />
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value as any)}
                    className="px-3 py-1.5 border rounded text-sm"
                    style={{
                      backgroundColor: 'var(--surface-2)',
                      borderColor: 'var(--border)',
                      color: 'var(--text)'
                    }}
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
                  <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
                    <th 
                      className="text-left py-3 px-4 text-sm font-medium cursor-pointer transition-colors"
                      style={{ color: 'var(--text-secondary)' }}
                      onClick={() => toggleSort('name')}
                      onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text)'}
                      onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
                    >
                      <div className="flex items-center gap-2">
                        Document Name
                        {sortBy === 'name' && (
                          <ArrowsUpDownIcon className="h-4 w-4" />
                        )}
                      </div>
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                      Description
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                      Doc Type
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                      Authority/Agency
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                      Jurisdiction
                    </th>
                    <th 
                      className="text-left py-3 px-4 text-sm font-medium cursor-pointer transition-colors"
                      style={{ color: 'var(--text-secondary)' }}
                      onClick={() => toggleSort('pages')}
                      onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text)'}
                      onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
                    >
                      <div className="flex items-center gap-2">
                        Pages
                        {sortBy === 'pages' && (
                          <ArrowsUpDownIcon className="h-4 w-4" />
                        )}
                      </div>
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                      Confidence
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                      Source URL
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                      Source Type
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSources.map((source) => (
                    <tr 
                      key={source.id} 
                      className="border-b transition-colors" 
                      style={{ borderColor: 'var(--border-subtle)' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--surface-2)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <td className="py-3 px-4 text-sm font-medium" style={{ color: 'var(--text)' }}>
                        {source.sourceName}
                      </td>
                      <td className="py-3 px-4 text-sm max-w-sm" style={{ color: 'var(--text-secondary)' }}>
                        {source.metadata?.generatedSummary || 'Official regulatory document'}
                      </td>
                      <td className="py-3 px-4 text-sm">
                        <span className="px-2 py-1 rounded text-xs" style={{ 
                          backgroundColor: 'rgba(var(--color-accent-primary), 0.1)', 
                          color: 'rgb(var(--color-accent-primary))' 
                        }}>
                          {source.metadata?.category?.replace(/_/g, ' ') || 'Unknown'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm" style={{ color: 'var(--text)' }}>
                        {source.agencyName || '—'}
                      </td>
                      <td className="py-3 px-4 text-sm" style={{ color: 'var(--muted)' }}>
                        {source.metadata?.jurisdiction || `State: ${source.stateCode}`}
                      </td>
                      <td className="py-3 px-4 text-sm text-center" style={{ color: 'var(--muted)' }}>
                        {source.metadata?.pages || '—'}
                      </td>
                      <td className="py-3 px-4 text-sm text-center">
                        <span className="font-semibold" style={{
                          color: source.confidenceScore >= 0.9
                            ? 'var(--success)'
                            : source.confidenceScore >= 0.8
                            ? 'var(--warning)'
                            : 'var(--muted)'
                        }}>
                          {Math.round(source.confidenceScore * 100)}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm">
                        <a
                          href={source.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="transition-colors truncate block max-w-xs"
                          style={{ color: 'rgb(var(--color-accent-primary))' }}
                          onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                          onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                          title={source.sourceUrl}
                        >
                          {source.sourceUrl}
                        </a>
                      </td>
                      <td className="py-3 px-4 text-sm">
                        <span 
                          className="px-2 py-1 rounded text-xs font-medium"
                          style={{
                            backgroundColor: source.trustLevel === 'gov-auto' 
                              ? 'rgba(5, 150, 105, 0.1)' 
                              : 'rgba(217, 119, 6, 0.1)',
                            color: source.trustLevel === 'gov-auto' 
                              ? 'var(--success)' 
                              : 'var(--warning)',
                            border: `1px solid ${source.trustLevel === 'gov-auto' ? 'var(--success)' : 'var(--warning)'}`
                          }}
                        >
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
            className="flex items-center gap-2 px-6 py-3 rounded-lg border transition-all"
            style={{ 
              backgroundColor: 'var(--surface)', 
              color: 'var(--text-secondary)', 
              borderColor: 'var(--border)' 
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--surface-2)';
              e.currentTarget.style.borderColor = 'rgb(var(--color-accent-primary))';
              e.currentTarget.style.color = 'var(--text)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--surface)';
              e.currentTarget.style.borderColor = 'var(--border)';
              e.currentTarget.style.color = 'var(--text-secondary)';
            }}
          >
            <ArrowLeftIcon className="h-5 w-5" />
            Back to Configuration
          </button>
          <button
            onClick={() => setShowSaveProfileModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-500 transition-all shadow-lg shadow-green-600/30"
          >
            <FolderIcon className="h-5 w-5" />
            Save as Profile
          </button>
          <button
            onClick={handleRunDiscovery}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all shadow-lg shadow-purple-600/30"
          >
            Run Discovery Again
          </button>
        </div>

        {/* Save Profile Modal */}
        <SaveProfileModal
          isOpen={showSaveProfileModal}
          onClose={() => setShowSaveProfileModal(false)}
          onSave={handleSaveProfile}
          configuration={{
            countries: selectedCountries,
            states: selectedStates,
            linesOfBusiness: selectedLOB,
            documentTypes: selectedDocTypes,
            searchDepth,
            confidenceThreshold,
            maxResults,
          }}
          sources={discoveredSources}
        />
      </div>
    </AppLayout>
  );
};
