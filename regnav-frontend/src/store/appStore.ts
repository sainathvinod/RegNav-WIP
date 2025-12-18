// Global application state management with Zustand
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { LLMConfiguration, ScoutingJob, RegulatorySource, ModuleName, ModuleLLMConfigurations } from '../types';
import { DEFAULT_LLM_CONFIG, MODULE_DEFAULT_LLM_CONFIGS } from '../data/mockData';
import { DEFAULT_REFERENCE_PROMPTS } from '../data/defaultReferencePrompts';

interface AppStore {
  // UI State
  sidebarCollapsed: boolean;
  regScoutView: 'config' | 'loading' | 'results';
  
  // Configuration
  selectedCountries: string[];
  selectedStates: string[];
  selectedLOB: string; // Single-select LOB
  selectedDocTypes: string[];
  llmConfig: LLMConfiguration; // Global LLM config (for Settings page)
  moduleLLMConfigs: ModuleLLMConfigurations; // Per-module LLM configs
  referencePrompts: Record<string, string>; // Reference prompts per doc type
  
  // Scouting
  currentScoutingJob: ScoutingJob | null;
  scoutingHistory: ScoutingJob[];
  discoveredSources: RegulatorySource[];
  
  // Actions
  toggleSidebar: () => void;
  setRegScoutView: (view: 'config' | 'loading' | 'results') => void;
  setSelectedCountries: (countries: string[]) => void;
  setSelectedStates: (states: string[]) => void;
  toggleState: (stateCode: string) => void;
  setSelectedLOB: (lob: string) => void; // Single LOB setter
  setSelectedDocTypes: (types: string[]) => void;
  toggleDocType: (typeId: string) => void;
  setLLMConfig: (config: LLMConfiguration) => void;
  updateLLMConfig: (updates: Partial<LLMConfiguration>) => void;
  getModuleLLMConfig: (module: ModuleName) => LLMConfiguration;
  setModuleLLMConfig: (module: ModuleName, config: LLMConfiguration) => void;
  updateModuleLLMConfig: (module: ModuleName, updates: Partial<LLMConfiguration>) => void;
  getReferencePrompt: (docType: string) => string;
  updateReferencePrompt: (docType: string, prompt: string) => void;
  resetReferencePrompt: (docType: string) => void;
  exportReferencePrompts: () => string;
  importReferencePrompts: (jsonData: string) => boolean;
  setCurrentScoutingJob: (job: ScoutingJob | null) => void;
  addScoutingJob: (job: ScoutingJob) => void;
  updateScoutingJob: (jobId: string, updates: Partial<ScoutingJob>) => void;
  setDiscoveredSources: (sources: RegulatorySource[]) => void;
  addDiscoveredSource: (source: RegulatorySource) => void;
  removeDiscoveredSource: (sourceId: string) => void;
  clearSelections: () => void;
  reset: () => void;
}

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      // Initial State
      sidebarCollapsed: false,
      regScoutView: 'config',
      selectedCountries: ['US'],
      selectedStates: [],
      selectedLOB: '', // Single LOB
      selectedDocTypes: [],
      llmConfig: DEFAULT_LLM_CONFIG as LLMConfiguration,
      moduleLLMConfigs: MODULE_DEFAULT_LLM_CONFIGS as ModuleLLMConfigurations,
      referencePrompts: DEFAULT_REFERENCE_PROMPTS,
      currentScoutingJob: null,
      scoutingHistory: [],
      discoveredSources: [],

      // Actions
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      
      setRegScoutView: (view) => set({ regScoutView: view }),

      setSelectedCountries: (countries) => set({ selectedCountries: countries }),

      setSelectedStates: (states) => set({ selectedStates: states }),

      toggleState: (stateCode) =>
        set((state) => ({
          selectedStates: state.selectedStates.includes(stateCode)
            ? state.selectedStates.filter((s) => s !== stateCode)
            : [...state.selectedStates, stateCode],
        })),

      setSelectedLOB: (lob) => set({ selectedLOB: lob }), // Single LOB

      setSelectedDocTypes: (types) => set({ selectedDocTypes: types }),

      toggleDocType: (typeId) =>
        set((state) => ({
          selectedDocTypes: state.selectedDocTypes.includes(typeId)
            ? state.selectedDocTypes.filter((t) => t !== typeId)
            : [...state.selectedDocTypes, typeId],
        })),

      setLLMConfig: (config) => set({ llmConfig: config }),

      updateLLMConfig: (updates) =>
        set((state) => ({
          llmConfig: { ...state.llmConfig, ...updates },
        })),

      getModuleLLMConfig: (module) => get().moduleLLMConfigs[module],

      setModuleLLMConfig: (module, config) =>
        set((state) => ({
          moduleLLMConfigs: {
            ...state.moduleLLMConfigs,
            [module]: config,
          },
        })),

      updateModuleLLMConfig: (module, updates) =>
        set((state) => ({
          moduleLLMConfigs: {
            ...state.moduleLLMConfigs,
            [module]: { ...state.moduleLLMConfigs[module], ...updates },
          },
        })),

      getReferencePrompt: (docType) => {
        const prompts = get().referencePrompts;
        return prompts[docType] || DEFAULT_REFERENCE_PROMPTS[docType] || '';
      },

      updateReferencePrompt: (docType, prompt) =>
        set((state) => ({
          referencePrompts: {
            ...state.referencePrompts,
            [docType]: prompt,
          },
        })),

      resetReferencePrompt: (docType) =>
        set((state) => ({
          referencePrompts: {
            ...state.referencePrompts,
            [docType]: DEFAULT_REFERENCE_PROMPTS[docType] || '',
          },
        })),

      exportReferencePrompts: () => {
        const prompts = get().referencePrompts;
        return JSON.stringify(prompts, null, 2);
      },

      importReferencePrompts: (jsonData) => {
        try {
          const prompts = JSON.parse(jsonData);
          if (typeof prompts !== 'object' || prompts === null) {
            return false;
          }
          set({ referencePrompts: prompts });
          return true;
        } catch (error) {
          console.error('Failed to import reference prompts:', error);
          return false;
        }
      },

      setCurrentScoutingJob: (job) => set({ currentScoutingJob: job }),

      addScoutingJob: (job) =>
        set((state) => ({
          scoutingHistory: [job, ...state.scoutingHistory],
          currentScoutingJob: job,
        })),

      updateScoutingJob: (jobId, updates) =>
        set((state) => ({
          scoutingHistory: state.scoutingHistory.map((job) =>
            job.id === jobId ? { ...job, ...updates } : job
          ),
          currentScoutingJob:
            state.currentScoutingJob?.id === jobId
              ? { ...state.currentScoutingJob, ...updates }
              : state.currentScoutingJob,
        })),

      setDiscoveredSources: (sources) => set({ discoveredSources: sources }),

      addDiscoveredSource: (source) =>
        set((state) => ({
          discoveredSources: [...state.discoveredSources, source],
        })),
      
      removeDiscoveredSource: (sourceId) =>
        set((state) => ({
          discoveredSources: state.discoveredSources.filter(s => s.id !== sourceId),
        })),

      clearSelections: () =>
        set({
          selectedStates: [],
          selectedLOB: '',
          selectedDocTypes: [],
        }),

      reset: () =>
        set({
          sidebarCollapsed: false,
          selectedCountries: ['US'],
          selectedStates: [],
          selectedLOB: '',
          selectedDocTypes: [],
          llmConfig: DEFAULT_LLM_CONFIG as LLMConfiguration,
          currentScoutingJob: null,
          discoveredSources: [],
        }),
    }),
    {
      name: 'regnav-storage',
      partialize: (state) => ({
        selectedCountries: state.selectedCountries,
        selectedStates: state.selectedStates,
        selectedLOB: state.selectedLOB,
        selectedDocTypes: state.selectedDocTypes,
        llmConfig: state.llmConfig,
        moduleLLMConfigs: state.moduleLLMConfigs,
        referencePrompts: state.referencePrompts,
      }),
    }
  )
);

// Selector hooks
export const useSidebarCollapsed = () => useAppStore((state) => state.sidebarCollapsed);
export const useSelectedCountries = () => useAppStore((state) => state.selectedCountries);
export const useSelectedStates = () => useAppStore((state) => state.selectedStates);
export const useSelectedLOB = () => useAppStore((state) => state.selectedLOB); // Single LOB
export const useSelectedDocTypes = () => useAppStore((state) => state.selectedDocTypes);
export const useLLMConfig = () => useAppStore((state) => state.llmConfig);
export const useModuleLLMConfig = (module: ModuleName) => useAppStore((state) => state.moduleLLMConfigs[module]);
export const useCurrentScoutingJob = () => useAppStore((state) => state.currentScoutingJob);
export const useDiscoveredSources = () => useAppStore((state) => state.discoveredSources);
