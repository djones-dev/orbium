import React from 'react';
import './AudioStartModal.css';

interface AudioStartModalProps {
    onStart: () => void;
}

export const AudioStartModal: React.FC<AudioStartModalProps> = ({ onStart }) => {
    return (
        <div className="audio-start-overlay">
            <div className="audio-start-modal">
                <div className="modal-header">
                    <span>SYSTEM INITIALIZATION</span>
                    <span>v1.0</span>
                </div>
                <div className="modal-content">
                    <div className="modal-icon">◈</div>
                    <div className="modal-title">ORBIUM AUDIO ENGINE</div>
                    <div className="modal-desc">
                        Interaction with the Orbium system requires active audio processing.
                        Please initialize the engine to begin simulation.
                    </div>
                    <div className="modal-actions">
                        <button className="start-btn" onClick={onStart}>
                            INITIALIZE SYSTEM
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
