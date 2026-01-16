import { create } from 'zustand';
import { Preset } from '../types/preset';

interface UIState {
    isAudioActive: boolean;
    setAudioActive: (active: boolean) => void;
    hoveredPreset: Preset | null;
    hoveredPresetY: number | null;
    setHoveredPreset: (preset: Preset | null, y?: number) => void;
}

export const useUIStore = create<UIState>((set) => ({
    isAudioActive: false,
    setAudioActive: (active) => set({ isAudioActive: active }),
    hoveredPreset: null,
    hoveredPresetY: null,
    setHoveredPreset: (preset, y = 0) => set({ hoveredPreset: preset, hoveredPresetY: preset ? y : null }),
}));
