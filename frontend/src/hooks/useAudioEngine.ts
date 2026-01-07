import { useRef } from 'react';
import { AudioEngine } from '../audio/AudioEngine';
import { useUIStore } from '../stores/uiStore';

export const useAudioEngine = () => {
    const engineRef = useRef<AudioEngine>(AudioEngine.getInstance());
    const setAudioActive = useUIStore(state => state.setAudioActive);
    const isAudioActive = useUIStore(state => state.isAudioActive);

    const initializeAudio = async () => {
        try {
            await engineRef.current.initialize();
            setAudioActive(true);
        } catch (e) {
            console.error('Failed to initialize audio', e);
        }
    };

    const stopAudio = () => {
        engineRef.current.suspend();
        setAudioActive(false);
    };

    return {
        engine: engineRef.current,
        initializeAudio,
        stopAudio,
        isAudioActive
    };
};
