import { useRef, useCallback } from 'react';
import { AudioEngine } from '../audio/AudioEngine';
import { useUIStore } from '../stores/uiStore';

export const useAudioEngine = () => {
    const engineRef = useRef<AudioEngine>(AudioEngine.getInstance());
    const setAudioActive = useUIStore(state => state.setAudioActive);
    const isAudioActive = useUIStore(state => state.isAudioActive);

    // Playback state (Transport)
    const setPlaying = useUIStore(state => state.setPlaying);
    const isPlaying = useUIStore(state => state.isPlaying);

    const initializeAudio = useCallback(async () => {
        try {
            if (!isAudioActive) {
                await engineRef.current.initialize();
                setAudioActive(true);
            }
            // Auto-start playback on init
            if (engineRef.current.context?.state === 'suspended') {
                await engineRef.current.context.resume();
            }
            setPlaying(true);
        } catch (e) {
            console.error('Failed to initialize audio', e);
        }
    }, [isAudioActive, setAudioActive, setPlaying]);

    const togglePlayback = useCallback(async () => {
        if (!engineRef.current.context) return;

        if (isPlaying) {
            await engineRef.current.context.suspend();
            setPlaying(false);
        } else {
            await engineRef.current.context.resume();
            setPlaying(true);
        }
    }, [isPlaying, setPlaying]);

    return {
        engine: engineRef.current,
        initializeAudio,
        togglePlayback,
        isAudioActive,
        isPlaying
    };
};

