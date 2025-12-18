// Global application state management with Zustand
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { LLMConfiguration, ScoutingJob, RegulatorySource } from '../types';
import { DEFAULT_LLM_CONFIG } from '../data/mockData';

interface AppStore {
  // UI State
  sidebarCollapsed: boolean;
  regScoutView: 'config' | 'loading' | 'results';
  
  // Configuration
  selectedCountries: string[];
  selectedStates: string[];
  selectedLOBs: string[];
  selectedDocTypes: string[];
  llmConfig: LLMConfiguration;
  
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
  setSelectedLOBs: (lobs: string[]) => void;
  toggleLOB: (lobId: string) => void;
  setSelectedDocTypes: (types: string[]) => void;
  toggleDocType: (typeId: string) => void;
  setLLMConfig: (config: LLMConfiguration) => void;
  updateLLMConfig: (updates: Partial<LLMConfiguration>) => void;
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
      selectedLOBs: [],
      selectedDocTypes: [],
      llmConfig: DEFAULT_LLM_CONFIG as LLMConfiguration,
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

      setSelectedLOBs: (lobs) => set({ selectedLOBs: lobs }),

      toggleLOB: (lobId) =>
        set((state) => ({
          selectedLOBs: state.selectedLOBs.includes(lobId)
            ? state.selectedLOBs.filter((l) => l !== lobId)
            : [...state.selectedLOBs, lobId],
        })),

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
          selectedLOBs: [],
          selectedDocTypes: [],
        }),

      reset: () =>
        set({
          sidebarCollapsed: false,
          selectedCountries: ['US'],
          selectedStates: [],
          selectedLOBs: [],
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
        selectedLOBs: state.selectedLOBs,
        selectedDocTypes: state.selectedDocTypes,
        llmConfig: state.llmConfig,
      }),
    }
  )
);

// Selector hooks
export const useSidebarCollapsed = () => useAppStore((state) => state.sidebarCollapsed);
export const useSelectedCountries = () => useAppStore((state) => state.selectedCountries);
export const useSelectedStates = () => useAppStore((state) => state.selectedStates);
export const useSelectedLOBs = () => useAppStore((state) => state.selectedLOBs);
export const useSelectedDocTypes = () => useAppStore((state) => state.selectedDocTypes);
export const useLLMConfig = () => useAppStore((state) => state.llmConfig);
export const useCurrentScoutingJob = () => useAppStore((state) => state.currentScoutingJob);
export const useDiscoveredSources = () => useAppStore((state) => state.discoveredSources);
