import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { OrbitalBody } from '../types/orbital';
import { useAudioEngine } from '../hooks/useAudioEngine';

interface SelectionContextType {
    selectedBody: OrbitalBody | null;
    selectedBodyId: string | null;
    select: (id: string) => void;
    deselect: () => void;
    manager: any;
}

const SelectionContext = createContext<SelectionContextType | undefined>(undefined);

export const SelectionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [selectedBodyId, setSelectedBodyId] = useState<string | null>(null);
    const { engine } = useAudioEngine();

    // State to force re-render when bodies change
    const [version, setVersion] = useState(0);

    // Subscribe to manager changes
    React.useEffect(() => {
        const unsubscribe = engine.bodiesManager.subscribe(() => {
            setVersion(v => v + 1);
        });
        return () => { unsubscribe(); };
    }, [engine]);

    const select = useCallback((id: string) => {
        setSelectedBodyId(id);
    }, []);

    const deselect = useCallback(() => {
        setSelectedBodyId(null);
    }, []);

    const selectedBody = useMemo(() => {
        if (!selectedBodyId) return null;
        const body = engine.bodiesManager.getBodyById(selectedBodyId);
        return body || null;
    }, [selectedBodyId, engine.bodiesManager, version]);

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
