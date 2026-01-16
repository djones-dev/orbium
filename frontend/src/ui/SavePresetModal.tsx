import React, { useState } from 'react';
import { useUIStore } from '../stores/uiStore';
import { usePresets } from '../hooks/usePresets';
import { PresetCategory, PresetType } from '../types/preset';
import './SavePresetModal.css';

export const SavePresetModal: React.FC = () => {
    const isOpen = useUIStore(state => state.isSaveModalOpen);
    const setOpen = useUIStore(state => state.setSaveModalOpen);
    const showToast = useUIStore(state => state.showToast);
    const { createPreset } = usePresets();

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState<PresetCategory>('planet');
    const [type, setType] = useState<PresetType>('generator');
    const [isSaving, setIsSaving] = useState(false);

    if (!isOpen) return null;

    const handleSave = async () => {
        if (!name.trim()) {
            showToast('NAME IS REQUIRED', 'error');
            return;
        }

        setIsSaving(true);
        try {
            // NOTE: In a real scenario, we'd grab the current simulation state here.
            // For now, we're saving the metadata as requested.
            await createPreset({
                name,
                description,
                category,
                type,
                parameters: {} // Placeholder for Task 13 session capture
            });
            showToast('PRESET SAVED', 'success');
            setOpen(false);
            setName('');
            setDescription('');
        } catch (err: any) {
            showToast(err.message || 'FAILED TO SAVE', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="save-preset-modal">
                <div className="modal-header">
                    <h3>SAVE NEW PRESET</h3>
                    <button className="close-btn" onClick={() => setOpen(false)}>×</button>
                </div>

                <div className="modal-body">
                    <div className="form-group">
                        <label>NAME</label>
                        <input
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="My Preset..."
                            autoFocus
                        />
                    </div>

                    <div className="form-group">
                        <label>DESCRIPTION</label>
                        <textarea
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder="Optional description..."
                        />
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>CATEGORY</label>
                            <select value={category} onChange={e => setCategory(e.target.value as any)}>
                                <option value="planet">PLANET</option>
                                <option value="moon">MOON</option>
                                <option value="attribute">ATTR</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label>TYPE</label>
                            <select value={type} onChange={e => setType(e.target.value as any)}>
                                <option value="generator">GENERATOR</option>
                                <option value="effect">EFFECT</option>
                                <option value="modulator">MODULATOR</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="modal-footer">
                    <button className="cancel-btn" onClick={() => setOpen(false)} disabled={isSaving}>CANCEL</button>
                    <button className="save-btn" onClick={handleSave} disabled={isSaving}>
                        {isSaving ? 'SAVING...' : 'SAVE SESSION'}
                    </button>
                </div>
            </div>
        </div>
    );
};
