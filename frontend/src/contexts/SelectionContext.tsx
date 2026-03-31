import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { useAudioEngine } from '../hooks/useAudioEngine';
import { World } from '../ecs/World';
import { ComponentType } from '../ecs/components/Component';
import { AudioComponent } from '../ecs/components/AudioComponent';
import { PresetComponent } from '../ecs/components/PresetComponent';
import { AudioEventType } from '../events/AudioEvents';
import { EventBus } from '../events/EventBus';

import { AudioParams } from '../types/audio';
import { PhysicsSystem } from '../simulation/PhysicsSystem';
import { VelocityComponent } from '../ecs/components/VelocityComponent';
import { MetadataComponent } from '../ecs/components/MetadataComponent';
import { VisualComponent } from '../ecs/components/VisualComponent';

interface SelectedBodyInfo {
    id: string;
    name?: string;
    type: string;
    position: { radius: number; angle: number };
    velocity: number;
    audioParams: Partial<AudioParams>;
    visualConfig: {
        color: string;
        size: number;
    };
    presetId?: string;
}

interface SelectionContextType {
    selectedBody: SelectedBodyInfo | null;
    selectedBodyId: string | null;
    select: (id: string) => void;
    deselect: () => void;
    manager: any;
}

const SelectionContext = createContext<SelectionContextType | undefined>(undefined);

export const SelectionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [selectedBodyId, setSelectedBodyId] = useState<string | null>(null);
    const { engine } = useAudioEngine();

    // State to force re-render when bodies or params change
    const [version, setVersion] = useState(0);

    // Subscribe to events that should trigger a selection refresh
    React.useEffect(() => {
        const bus = EventBus.getInstance();
        const update = () => setVersion(v => v + 1);
        
        const unsubAdd = bus.on(AudioEventType.BODY_ADDED, update);
        const unsubRem = bus.on(AudioEventType.BODY_REMOVED, update);
        const unsubParams = bus.on(AudioEventType.PARAMS_CHANGED, (data: any) => {
            if (data.id === selectedBodyId) update();
        });

        // For position/velocity, we might want to update more frequently,
        // but for the inspector text, maybe once per frame or similar is enough.
        // Actually, we'll just let the version increment on each frame for now if selected?
        // No, that's too much. Let's just use the current values when it re-renders.
        
        return () => { 
            unsubAdd();
            unsubRem();
            unsubParams();
        };
    }, [selectedBodyId]);

    const select = useCallback((id: string) => {
        setSelectedBodyId(id);
    }, []);

    const deselect = useCallback(() => {
        setSelectedBodyId(null);
    }, []);

    const selectedBody = useMemo(() => {
        if (!selectedBodyId) return null;
        
        const world = World.getInstance();
        if (!world.entities.hasEntity(selectedBodyId)) return null;

        const audio = world.entities.getComponent<AudioComponent>(selectedBodyId, ComponentType.Audio);
        const preset = world.entities.getComponent<PresetComponent>(selectedBodyId, ComponentType.Preset);
        const vel = world.entities.getComponent<VelocityComponent>(selectedBodyId, ComponentType.Velocity);
        const metadata = world.entities.getComponent<MetadataComponent>(selectedBodyId, ComponentType.Metadata);
        const visual = world.entities.getComponent<VisualComponent>(selectedBodyId, ComponentType.Visual);
        
        // Get position from PhysicsSystem for most accurate sim state
        const pos = PhysicsSystem.getInstance().getPosition(selectedBodyId) || { radius: 0, angle: 0 };

        if (!audio || !visual) return null;

        return {
            id: selectedBodyId,
            name: metadata?.name,
            type: preset?.bodyType ?? (selectedBodyId === 'sun-primary' ? 'sun' : 'planet'),
            position: pos,
            velocity: vel?.angular ?? 0,
            audioParams: audio.parameters,
            visualConfig: {
                color: visual.color,
                size: visual.size,
            },
            presetId: preset?.presetId
        };
    }, [selectedBodyId, version]);

    const value = useMemo(() => ({
        selectedBody,
        selectedBodyId,
        select,
        deselect,
        manager: engine.bodiesManager
    }), [selectedBody, selectedBodyId, select, deselect, engine.bodiesManager]);

    return (
        <SelectionContext.Provider value={value}>
            {children}
        </SelectionContext.Provider>
    );
};

export const useSelection = () => {
    const context = useContext(SelectionContext);
    if (context === undefined) {
        throw new Error('useSelection must be used within a SelectionProvider');
    }
    return context;
};
