import { create } from 'zustand';
import { SynthModule } from '../types/preset';

interface UIState {
    isAudioActive: boolean;
    setAudioActive: (active: boolean) => void;
    isPlaying: boolean;
    setPlaying: (playing: boolean) => void;
    hoveredPreset: SynthModule | null;
    hoveredPresetY: number | null;
    setHoveredPreset: (preset: SynthModule | null, y?: number) => void;
    isSaveModalOpen: boolean;
    setSaveModalOpen: (open: boolean) => void;
    editingPresetId: string | null;
    setEditingPresetId: (id: string | null) => void;
    toast: { message: string, type: 'success' | 'error' } | null;
    showToast: (message: string, type: 'success' | 'error') => void;
    debug: boolean;
    setDebug: (debug: boolean) => void;
    masterGain: number;
    setMasterGain: (gain: number) => void;
    pickingModulationTargetForId: string | null;
    setPickingModulationTarget: (id: string | null) => void;
}

export const useUIStore = create<UIState>((set) => ({
    isAudioActive: false,
    setAudioActive: (active) => set({ isAudioActive: active }),
    isPlaying: false,
    setPlaying: (playing) => set({ isPlaying: playing }),
    hoveredPreset: null,
    hoveredPresetY: null,
    setHoveredPreset: (preset, y = 0) => set({ hoveredPreset: preset, hoveredPresetY: preset ? y : null }),
    isSaveModalOpen: false,
    setSaveModalOpen: (open) => set({ isSaveModalOpen: open }),
    editingPresetId: null,
    setEditingPresetId: (id) => set({ editingPresetId: id }),
    toast: null,
    showToast: (message, type) => {
        set({ toast: { message, type } });
        setTimeout(() => set({ toast: null }), 3000);
    },
    debug: false,
    setDebug: (debug) => set({ debug }),
    masterGain: parseFloat(localStorage.getItem('orbium_master_gain') || '0.8'),
    setMasterGain: (masterGain) => {
        localStorage.setItem('orbium_master_gain', masterGain.toString());
        set({ masterGain });
    },
    pickingModulationTargetForId: null,
    setPickingModulationTarget: (id) => set({ pickingModulationTargetForId: id }),
}));
