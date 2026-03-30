import React from 'react';
import { useUIStore } from '../stores/uiStore';
import './ToastContainer.css';

export const ToastContainer: React.FC = () => {
    const toast = useUIStore(state => state.toast);

    if (!toast) return null;

    return (
        <div className={`toast-container ${toast.type}`}>
            <span className="toast-icon">{toast.type === 'success' ? '✓' : '⚠'}</span>
            <span className="toast-message">{toast.message}</span>
        </div>
    );
};
