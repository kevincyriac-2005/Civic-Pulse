import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Loader from '../common/Loader';
import config from '../../config';
import { getStatusColor, getStatusLabel, normalizeStatus } from '../../utils/statusUtils';
import { resolveImageUrl } from '../../utils/imageUrl';
import '../../styles/admin-variables.css';
import '../../styles/AdminUtilities.css';
import './AdminDashboard.css';
import './AdminComplaints.css';

const AdminComplaints = () => {
    const [complaints, setComplaints] = useState([]);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState('');
    const [activeTab, setActiveTab] = useState('All');
    const navigate = useNavigate();

    useEffect(() => {
        fetchComplaints();
    }, []);

    const fetchComplaints = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            if (!token) {
                setErrorMsg('Not authenticated.');
                setLoading(false);
                return;
            }

            const res = await fetch(`${config.API_BASE_URL}/admin/complaints`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            let data = null;
            try { data = await res.json(); } catch (e) { }

            if (!res.ok) {
                setErrorMsg((data && data.message) ? data.message : `API error ${res.status}`);
                setComplaints([]);
            } else {
                if (data && data.success) {
                    const normalized = (data.complaints || []).map(c => ({
                        ...c,
                        status: normalizeStatus(c.status)
                    }));
                    setComplaints(normalized);
                } else {
                    setErrorMsg((data && data.message) || 'No complaints returned');
                    setComplaints([]);
                }
            }
        } catch (err) {
            console.error("Failed to fetch complaints", err);
            setErrorMsg('Failed to fetch complaints. Check network connection.');
        } finally {
            setLoading(false);
        }
    };

    // Filter Logic
    const getFilteredComplaints = () => {
        if (activeTab === 'All') return complaints;
        if (activeTab === 'Verified') return complaints.filter(c => c.verificationStatus === 'Verified');
        if (activeTab === 'Unverified') return complaints.filter(c => c.verificationStatus !== 'Verified');
        return complaints.filter(c => c.status === activeTab);
    };

    const displayedComplaints = getFilteredComplaints();

    const getCount = (status) => {
        if (status === 'All') return complaints.length;
        if (status === 'Verified') return complaints.filter(c => c.verificationStatus === 'Verified').length;
        if (status === 'Unverified') return complaints.filter(c => c.verificationStatus !== 'Verified').length;
        return complaints.filter(c => c.status === status).length;
    };



    if (loading) return <Loader text="Fetching all complaints..." />;
    if (errorMsg) return <div className="acl-error">Error: {errorMsg}</div>;

    return (
        <div className="officer-card animate-fade-up acl-root-card">
            <div className="acl-header admin-flex-between">
                <h2>All Complaints Overview</h2>
                <button className="btn-secondary" onClick={fetchComplaints}>
                    <i className="fas fa-sync-alt"></i> Refresh
                </button>
            </div>

            {/* Filter Tabs */}
            <div className="officer-tabs acl-tabs">
                {['All', 'REPORTED', 'ASSIGNED', 'IN_PROGRESS', 'VERIFICATION_PENDING', 'RESOLVED', 'REJECTED', 'Verified', 'Unverified'].map(status => (
                    <button
                        key={status}
                        className={`officer-tab acl-tab-nowrap ${activeTab === status ? 'active' : ''}`}
                        onClick={() => setActiveTab(status)}
                    >
                        {['Verified', 'Unverified', 'All'].includes(status) ? status : getStatusLabel(status)}
                        {getCount(status) > 0 && (
                            <span className="tab-badge acl-tab-badge">
                                {getCount(status)}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            <div className="complaint-list">
                {displayedComplaints.length === 0 && (
                    <p className="acl-empty">
                        No complaints found for <strong>{activeTab}</strong>.
                    </p>
                )}

                {displayedComplaints.map(item => (
                    <div className="complaint-item acl-complaint-card" key={item._id}>
                        <div className="acl-content-row">
                            {/* Thumbnail */}
                            <div className="acl-thumb-panel">
                                <span className="acl-thumb-label">Before</span>
                                {item.beforeImageUrl ? (
                                    <img
                                        src={resolveImageUrl(item.beforeImageUrl)}
                                        alt="Issue"
                                        className="acl-thumb-img"
                                    />
                                ) : <div className="acl-thumb-placeholder">No Image</div>}
                            </div>

                            {/* Details */}
                            <div className="acl-body">
                                <div className="acl-card-row">
                                    <h3 className="acl-title">{item.title}</h3>
                                    <div className="acl-badge-group">
                                        <span
                                            className="acl-status-badge"
                                            style={{
                                                background: `${getStatusColor(item.status)}22`,
                                                color: getStatusColor(item.status),
                                                border: `1px solid ${getStatusColor(item.status)}44`
                                            }}
                                        >
                                            {getStatusLabel(item.status)}
                                        </span>
                                        {item.verificationStatus === 'Verified' && (
                                            <span className="acl-verified-badge">
                                                ✓ Verified
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <p className="acl-location-text">
                                    {item.address || (
                                        Array.isArray(item.location?.coordinates) && item.location.coordinates.length === 2
                                            ? `Lat: ${Number(item.location.coordinates[1]).toFixed(4)}, Lng: ${Number(item.location.coordinates[0]).toFixed(4)}`
                                            : 'GPS Location'
                                    )}
                                </p>

                                <p className="acl-description">
                                    {item.description ? (item.description.length > 120 ? item.description.substring(0, 120) + '...' : item.description) : 'No description provided'}
                                </p>

                                <div className="acl-meta-grid">
                                    <div className="acl-meta-item">
                                        <span className="acl-meta-label">ID</span>
                                        <span className="acl-meta-value">{item.complaintId || item._id.toString().substring(0, 10)}</span>
                                    </div>
                                    <div className="acl-meta-item">
                                        <span className="acl-meta-label">Tag</span>
                                        <span className="acl-meta-value">{item.issueType || item.category || 'General'}</span>
                                    </div>
                                    <div className="acl-meta-item">
                                        <span className="acl-meta-label">Loc</span>
                                        <span className="acl-meta-value">
                                            {item.address || (
                                                Array.isArray(item.location?.coordinates) && item.location.coordinates.length === 2
                                                    ? `Lat: ${Number(item.location.coordinates[1]).toFixed(4)}, Lng: ${Number(item.location.coordinates[0]).toFixed(4)}`
                                                    : 'GPS Location'
                                            )}
                                        </span>
                                    </div>
                                    <div className="acl-meta-item">
                                        <span className="acl-meta-label">Date</span>
                                        <span className="acl-meta-value">{new Date(item.createdAt).toLocaleDateString()}</span>
                                    </div>
                                    <div className="acl-meta-item">
                                        <span className="acl-meta-label">Officer</span>
                                        <span className={`acl-meta-value ${item.officer_id?.name ? '' : 'acl-meta-unassigned'}`}>
                                            {item.officer_id?.name || 'Unassigned'}
                                        </span>
                                    </div>
                                    <div className="acl-meta-item">
                                        <span className="acl-meta-label">Worker</span>
                                        <span className={`acl-meta-value ${item.employee_id?.name ? '' : 'acl-meta-unassigned'}`}>
                                            {item.employee_id?.name || 'Unassigned'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Action Button */}
                        <div className="acl-action-row">
                            <button
                                onClick={() => navigate(`/admin/complaint/${item._id}`)}
                                className="admin-view-btn"
                            >
                                <i className="fas fa-eye"></i>
                                View Details
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AdminComplaints;

