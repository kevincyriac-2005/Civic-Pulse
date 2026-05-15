import React from 'react';
import '../../styles/fieldworker-variables.css';
import '../../styles/FieldworkerUtilities.css';
import './FieldWorker.css';
import './StatusBadge.css';

const StatusBadge = ({ status }) => {
    let config = { bg: 'rgba(30, 41, 59, 1)', text: '#94a3b8', label: 'UNKNOWN' };

    switch (String(status).toLowerCase()) {
        case 'assigned':
        case 'pending':
            config = { bg: 'rgba(51, 65, 85, 1)', text: '#cbd5e1', label: 'OPEN' };
            break;
        case 'inprogress':
        case 'in-progress':
            config = { bg: 'rgba(30, 58, 138, 0.4)', text: '#60a5fa', label: 'IN PROGRESS' };
            break;
        case 'resolved':
        case 'closed':
            config = { bg: 'rgba(6, 78, 59, 0.4)', text: '#34d399', label: 'RESOLVED' };
            break;
        case 'rejected':
            config = { bg: 'rgba(127, 29, 29, 0.4)', text: '#f87171', label: 'REJECTED' };
            break;
        default:
            config = { bg: 'rgba(30, 41, 59, 1)', text: '#94a3b8', label: String(status).toUpperCase() };
            break;
    }

    return (
        <span className="fw-status-badge" style={{ backgroundColor: config.bg, color: config.text }}>
            {config.label}
        </span>
    );
};

export default StatusBadge;
