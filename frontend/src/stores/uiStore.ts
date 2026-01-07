import { create } from 'zustand';

interface UIState {
    isAudioActive: boolean;
    setAudioActive: (active: boolean) => void;
    // We can add more UI state here as needed
}

export const useUIStore = create<UIState>((set) => ({
    isAudioActive: false,
    setAudioActive: (active) => set({ isAudioActive: active }),
}));
