import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Loader from '../common/Loader';
import config from '../../config';
import { resolveImageUrl } from '../../utils/imageUrl';
import { normalizeStatus } from '../../utils/statusUtils';
import '../../styles/citizen-variables.css';
import '../../styles/CitizenUtilities.css';
import './CitizenDashboard.css';
import './MyComplaints.css';

const MyComplaints = () => {
    const [complaints, setComplaints] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('All');
    const navigate = useNavigate();

    // Map display labels to canonical statuses for filtering
    const DISPLAY_TO_CANONICAL = {
        'Pending': 'REPORTED',
        'Assigned': 'ASSIGNED',
        'In Progress': 'IN_PROGRESS',
        'Pending Review': 'VERIFICATION_PENDING',
        'Resolved': 'RESOLVED'
    };

    useEffect(() => {
        fetchComplaints();
    }, []);

    const fetchComplaints = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;
            const res = await fetch(`${config.API_BASE_URL}/complaints`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                const normalized = (data.data || []).map(c => ({
                    ...c,
                    status: normalizeStatus(c.status)
                }));
                setComplaints(normalized);
            }
        } catch (err) {
            console.error('Failed to fetch complaints', err);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status) => {
        const map = {
            REPORTED: '#f59e0b', ASSIGNED: '#3b82f6', IN_PROGRESS: '#8b5cf6',
            VERIFICATION_PENDING: '#eab308', RESOLVED: '#10b981', REJECTED: '#ef4444',
            Scheduled: '#6366f1', 'Resolved - Pending Officer Review': '#f97316', Withdrawn: '#6b7280'
        };
        return map[status] || '#64748b';
    };

    const getStatusIcon = (status) => {
        const map = {
            REPORTED: 'fa-clock', ASSIGNED: 'fa-user-check', IN_PROGRESS: 'fa-spinner',
            VERIFICATION_PENDING: 'fa-hourglass-half', RESOLVED: 'fa-check-circle',
            REJECTED: 'fa-times-circle', Scheduled: 'fa-calendar-check'
        };
        return map[status] || 'fa-circle';
    };

    const filtered = activeTab === 'All'
        ? complaints
        : complaints.filter((c) => c.status === DISPLAY_TO_CANONICAL[activeTab]);

    const getCount = (status) =>
        status === 'All' ? complaints.length : complaints.filter((c) => c.status === DISPLAY_TO_CANONICAL[status]).length;

    const timeSince = (dateStr) => {
        const secs = Math.floor((Date.now() - new Date(dateStr)) / 1000);
        if (secs < 60) return 'Just now';
        if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
        if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
        if (secs < 604800) return `${Math.floor(secs / 86400)}d ago`;
        return new Date(dateStr).toLocaleDateString();
    };

    if (loading) return <Loader text="Fetching your complaints..." />;

    return (
        <div className="mc-page-wrap">
            <div className="mc-header">
                <div>
                    <h2 className="mc-title">
                        <i className="fas fa-clipboard-list mc-title-icon"></i>
                        My Complaints
                    </h2>
                    <p className="mc-subtitle">Track the status of your reported issues</p>
                </div>
                <div className="mc-total-pill">{complaints.length} Total</div>
            </div>

            <div className="mc-status-grid">
                {[
                    { label: 'Pending', icon: 'fa-clock', color: '#f59e0b' },
                    { label: 'Assigned', icon: 'fa-user-check', color: '#3b82f6' },
                    { label: 'In Progress', icon: 'fa-spinner', color: '#8b5cf6' },
                    { label: 'Pending Review', icon: 'fa-hourglass-half', color: '#eab308' },
                    { label: 'Resolved', icon: 'fa-check-circle', color: '#10b981' }
                ].map((s) => {
                    const count = getCount(s.label);
                    return (
                        <div
                            key={s.label}
                            onClick={() => setActiveTab(activeTab === s.label ? 'All' : s.label)}
                            className="mc-stat-card"
                            style={{
                                background: activeTab === s.label ? `${s.color}18` : 'rgba(255,255,255,0.02)',
                                border: `1px solid ${activeTab === s.label ? `${s.color}40` : 'rgba(255,255,255,0.06)'}`
                            }}
                        >
                            <i className={`fas ${s.icon} mc-stat-icon`} style={{ color: s.color }}></i>
                            <div className="mc-stat-count">{count}</div>
                            <div className="mc-stat-label">{s.display || s.label}</div>
                        </div>
                    );
                })}
            </div>

            {activeTab !== 'All' && (
                <div className="mc-filter-pill">
                    Filtered: <span className="mc-filter-value" style={{ color: getStatusColor(activeTab) }}>{activeTab}</span>
                    <span onClick={() => setActiveTab('All')} className="mc-filter-clear">x</span>
                </div>
            )}

            {filtered.length === 0 ? (
                <div className="mc-empty-state">
                    <i className="fas fa-inbox mc-empty-icon"></i>
                    <p className="mc-empty-text">
                        {activeTab === 'All' ? 'No complaints filed yet.' : `No ${activeTab.toLowerCase()} complaints.`}
                    </p>
                    {activeTab === 'All' && (
                        <button onClick={() => navigate('/citizen')} className="mc-report-btn">
                            <i className="fas fa-plus mc-report-btn-icon"></i>Report an Issue
                        </button>
                    )}
                </div>
            ) : (
                <div className="mc-list">
                    {filtered.map((item, idx) => {
                        const sc = getStatusColor(item.status);
                        return (
                            <div
                                key={item._id || item.complaintId}
                                onClick={() => navigate(`/citizen/complaint/${item._id}`)}
                                className="mc-item-card"
                                style={{ animationDelay: `${idx * 0.05}s` }}
                            >
                                <div className="mc-thumb-wrap">
                                    {item.beforeImageUrl ? (
                                        <img src={resolveImageUrl(item.beforeImageUrl)} alt="Issue" className="mc-thumb" />
                                    ) : (
                                        <div className="mc-thumb-empty">
                                            <i className="fas fa-image"></i>
                                        </div>
                                    )}
                                </div>

                                <div className="mc-content">
                                    <div className="mc-content-head">
                                        <h3 className="mc-item-title">{item.title}</h3>
                                        <span className="mc-status-pill" style={{ background: `${sc}18`, color: sc, border: `1px solid ${sc}35` }}>
                                            <i className={`fas ${getStatusIcon(item.status)} mc-status-pill-icon`}></i>
                                            {item.status || 'Pending'}
                                        </span>
                                    </div>

                                    <p className="mc-item-desc">{item.description || 'No description provided'}</p>

                                    <div className="mc-meta-row">
                                        <span><i className="fas fa-tag mc-meta-icon"></i> {item.issueType || 'General'}</span>
                                        <span><i className="fas fa-map-pin mc-meta-icon"></i> {item.address || 'GPS Location'}</span>
                                        <span className="mc-meta-time">
                                            <i className="fas fa-clock mc-meta-icon"></i> {timeSince(item.createdAt)}
                                        </span>
                                    </div>
                                </div>

                                <div className="mc-arrow">
                                    <i className="fas fa-chevron-right"></i>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default MyComplaints;

