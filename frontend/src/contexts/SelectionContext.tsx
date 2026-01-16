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
    const { engine, isAudioActive } = useAudioEngine();

    const select = useCallback((id: string) => {
        setSelectedBodyId(id);
    }, []);

    const deselect = useCallback(() => {
        setSelectedBodyId(null);
    }, []);

    const selectedBody = useMemo(() => {
        if (!selectedBodyId) return null;
        const body = engine.bodiesManager.getBodyById(selectedBodyId);
        console.log('SelectionContext: Looking for ID', selectedBodyId, 'Found body:', !!body, 'Bodies count:', engine.bodiesManager.getBodies().length);
        return body || null;
    }, [selectedBodyId, engine.bodiesManager, isAudioActive]);

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
