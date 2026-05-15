import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Loader from '../common/Loader';
import config from '../../config';
import { resolveImageUrl } from '../../utils/imageUrl';
import '../../styles/admin-variables.css';
import '../../styles/AdminUtilities.css';
import './AdminComplaintDetail.css';

const AdminComplaintDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [complaint, setComplaint] = useState(null);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        fetchComplaint();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const fetchComplaint = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                setErrorMsg('Not authenticated.');
                setLoading(false);
                return;
            }

            const res = await fetch(`${config.API_BASE_URL}/admin/complaints/${id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            let data = null;
            try { data = await res.json(); } catch (e) { }

            if (!res.ok) {
                setErrorMsg((data && data.message) ? data.message : `API error ${res.status}`);
            } else if (data && data.success) {
                setComplaint(data.complaint);
            } else {
                setErrorMsg('Failed to load complaint details.');
            }
        } catch (err) {
            console.error("Error fetching complaint detail:", err);
            setErrorMsg('Network error. Failed to fetch complaint.');
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status) => {
        const map = {
            'Pending': '#f59e0b', 'Assigned': '#3b82f6', 'InProgress': '#8b5cf6',
            'Resolved': '#10b981', 'Rejected': '#ef4444', 'Resolved - Pending Officer Review': '#f97316'
        };
        return map[status] || '#64748b';
    };

    const getVerificationColor = (vs) => {
        const map = { 'Verified': '#10b981', 'Flagged': '#f59e0b', 'Failed': '#ef4444', 'Unverified': '#64748b', 'NotVerified': '#64748b' };
        return map[vs] || '#64748b';
    };

    if (loading) return <Loader text="Loading complaint details..." />;
    if (errorMsg) return (
        <div className="acd-error-wrapper">
            <p>Error: {errorMsg}</p>
            <button onClick={() => navigate('/admin/complaints')} className="admin-back-btn">
                <i className="fas fa-arrow-left"></i> Back to Complaints
            </button>
        </div>
    );
    if (!complaint) return null;

    const c = complaint;
    const statusColor = getStatusColor(c.status);
    const verifColor = getVerificationColor(c.verificationStatus);

    return (
        <div className="acd-page-wrapper">
            {/* Header */}
            <div className="acd-header-row admin-flex-between">
                <button onClick={() => navigate('/admin/complaints')} className="admin-back-btn">
                    <i className="fas fa-arrow-left"></i> Back to Complaints
                </button>
                <div className="acd-badge-row">
                    <span
                        className="acd-badge"
                        style={{ background: `${statusColor}22`, color: statusColor, borderColor: `${statusColor}44` }}
                    >
                        {c.status}
                    </span>
                    <span
                        className="acd-badge"
                        style={{ background: `${verifColor}22`, color: verifColor, borderColor: `${verifColor}44` }}
                    >
                        {c.verificationStatus || 'Not Verified'}
                    </span>
                </div>
            </div>

            {/* Title & ID */}
            <div className="acd-card">
                <h2 className="acd-card-title">{c.title}</h2>
                <p className="acd-card-id">
                    <i className="fas fa-hashtag"></i> {c.complaintId || c._id}
                </p>
                <p className="acd-card-desc">
                    {c.description || 'No description provided.'}
                </p>
            </div>

            {/* Images */}
            <div className="acd-card">
                <h3 className="acd-section-title">Evidence Images</h3>
                <div className={c.afterImageUrl ? 'acd-img-grid-2' : 'acd-img-grid-1'}>
                    <div>
                        <span className="acd-img-label">Before Image</span>
                        {c.beforeImageUrl ? (
                            <img src={resolveImageUrl(c.beforeImageUrl)} alt="Before" className="acd-img" />
                        ) : (
                            <div className="acd-no-img">No Before Image</div>
                        )}
                    </div>
                    {c.afterImageUrl && (
                        <div>
                            <span className="acd-img-label">After Image</span>
                            <img src={resolveImageUrl(c.afterImageUrl)} alt="After" className="acd-img" />
                        </div>
                    )}
                </div>
            </div>

            {/* Complaint Details Grid */}
            <div className="acd-card">
                <h3 className="acd-section-title">Complaint Details</h3>
                <div className="acd-details-grid">
                    <DetailRow label="Category / Issue Type" value={c.issueType || 'General'} icon="fa-tag" />
                    <DetailRow label="Priority" value={c.priority || 'Medium'} icon="fa-flag" />
                    <DetailRow label="Department" value={c.departmentId?.name || 'Unassigned'} icon="fa-building" />
                    <DetailRow label="Created Date" value={new Date(c.createdAt).toLocaleString()} icon="fa-calendar" />
                    <DetailRow label="Assigned Officer" value={c.officer_id?.name || 'Unassigned'} icon="fa-user-shield" />
                    <DetailRow label="Field Worker" value={c.employee_id?.name || 'Unassigned'} icon="fa-user-cog" />
                    <DetailRow label="Citizen" value={c.citizenId?.name || 'Unknown'} icon="fa-user" />
                    <DetailRow label="Assigned At" value={c.assignedAt ? new Date(c.assignedAt).toLocaleString() : 'Not yet assigned'} icon="fa-clock" />
                </div>
            </div>

            {/* Location */}
            <div className="acd-card">
                <h3 className="acd-section-title">Location Data</h3>
                <div className="acd-details-grid">
                    <DetailRow label="Address" value={c.address || c.report_location || 'GPS Location'} icon="fa-map-marker-alt" />
                    <DetailRow label="Latitude" value={c.report_latitude ?? (c.location?.coordinates?.[1] || 'N/A')} icon="fa-globe" />
                    <DetailRow label="Longitude" value={c.report_longitude ?? (c.location?.coordinates?.[0] || 'N/A')} icon="fa-globe" />
                    <DetailRow label="Location Delta" value={c.locationDelta != null ? `${c.locationDelta}m` : 'N/A'} icon="fa-ruler" />
                </div>
            </div>

            {/* Verification Results */}
            <div className="acd-card">
                <h3 className="acd-section-title">Verification Results</h3>
                <div className="acd-details-grid">
                    <DetailRow label="Verification Status" value={c.verificationStatus || 'Not Verified'} icon="fa-shield-alt" />
                    <DetailRow label="Location Delta" value={c.locationDelta != null ? `${c.locationDelta}m` : 'N/A'} icon="fa-ruler" />
                </div>

                {/* Trust Metadata */}
                {c.trustMetadata && (
                    <div className="acd-trust-meta">
                        <h4>Trust Metadata</h4>
                        <div className="acd-trust-meta-grid">
                            <span className="acd-trust-meta-key">Capture Source: <span className="acd-trust-meta-val">{c.trustMetadata.captureSource || 'Unknown'}</span></span>
                            <span className="acd-trust-meta-key">Location Source: <span className="acd-trust-meta-val">{c.trustMetadata.locationSource || 'N/A'}</span></span>
                            <span className="acd-trust-meta-key">Spatial Delta: <span className="acd-trust-meta-val">{c.trustMetadata.spatialDelta != null ? `${c.trustMetadata.spatialDelta}m` : 'N/A'}</span></span>
                            <span className="acd-trust-meta-key">Trust Level: <span className="acd-trust-meta-val">{c.trustMetadata.verificationStatus || 'UNVERIFIED'}</span></span>
                        </div>
                    </div>
                )}

                {/* Vision Labels */}
                {c.detectedLabels && c.detectedLabels.length > 0 && (
                    <div className="acd-labels-section">
                        <h4>Vision API Detected Labels</h4>
                        <div className="acd-labels-wrap">
                            {c.detectedLabels.map((lbl, i) => (
                                <span key={i} className="acd-label-chip">
                                    {lbl.label} <span className="acd-label-score">({(lbl.score * 100).toFixed(0)}%)</span>
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Officer Remarks */}
            {c.officerRemarks && (
                <div className="acd-card">
                    <h3 className="acd-section-title">Officer / System Remarks</h3>
                    <pre className="acd-remarks-pre">
                        {c.officerRemarks}
                    </pre>
                </div>
            )}
        </div>
    );
};

/* ── Reusable DetailRow sub-component ── */

const DetailRow = ({ label, value, icon }) => (
    <div className="acd-detail-row">
        <i className={`fas ${icon} acd-detail-icon`}></i>
        <div>
            <span className="acd-detail-label">{label}</span>
            <span className="acd-detail-value">{value}</span>
        </div>
    </div>
);

export default AdminComplaintDetail;

