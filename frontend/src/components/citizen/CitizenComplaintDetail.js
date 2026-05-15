import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Loader from '../common/Loader';
import config from '../../config';
import { getStatusColor, getStatusLabel, normalizeStatus } from '../../utils/statusUtils';
import { resolveImageUrl } from '../../utils/imageUrl';
import '../../styles/citizen-variables.css';
import '../../styles/CitizenUtilities.css';
import './CitizenDashboard.css';
import './CitizenComplaintDetail.css';

const CitizenComplaintDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [complaint, setComplaint] = useState(null);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState('');
    const [showWithdrawModal, setShowWithdrawModal] = useState(false);
    const [withdrawReason, setWithdrawReason] = useState('');
    const [withdrawing, setWithdrawing] = useState(false);

    useEffect(() => {
        fetchComplaint();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const fetchComplaint = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) { setErrorMsg('Not authenticated.'); setLoading(false); return; }

            const res = await fetch(`${config.API_BASE_URL}/complaints/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();

            if (res.ok && data.success) {
                const c = data.complaint;
                c.status = normalizeStatus(c.status);
                setComplaint(c);
            } else {
                setErrorMsg(data.message || 'Failed to load complaint.');
            }
        } catch (err) {
            console.error('Complaint detail fetch error:', err);
            setErrorMsg('Network error.');
        } finally {
            setLoading(false);
        }
    };

    const handleWithdraw = async () => {
        try {
            setWithdrawing(true);
            const token = localStorage.getItem('token');
            const res = await fetch(`${config.API_BASE_URL}/complaints/${id}/withdraw`, {
                method: 'PUT',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason: withdrawReason })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                const updated = data.complaint;
                updated.status = normalizeStatus(updated.status);
                setComplaint(updated);
                setShowWithdrawModal(false);
                setWithdrawReason('');
            } else {
                alert(data.message || 'Failed to withdraw complaint.');
            }
        } catch (err) {
            alert('Network error during withdrawal.');
        } finally {
            setWithdrawing(false);
        }
    };

    const getVerifBadge = (status) => {
        const map = {
            Verified: { color: '#10b981', icon: 'fa-check-circle', text: 'Verified' },
            Flagged: { color: '#f59e0b', icon: 'fa-exclamation-triangle', text: 'Flagged' },
            Unverified: { color: '#64748b', icon: 'fa-question-circle', text: 'Unverified' },
            NotVerified: { color: '#64748b', icon: 'fa-question-circle', text: 'Not Verified' },
            Failed: { color: '#ef4444', icon: 'fa-times-circle', text: 'Failed' }
        };
        return map[status] || map.NotVerified;
    };

    const openGoogleMaps = (lat, lng) => {
        window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
    };

    if (loading) return <Loader text="Loading complaint details..." />;
    if (errorMsg) {
        return (
            <div className="ccd-error-wrap">
                <i className="fas fa-exclamation-triangle ccd-error-icon"></i>
                <p className="ccd-error-text">{errorMsg}</p>
                <button onClick={() => navigate('/citizen/history')} className="ccd-back-btn">
                    <i className="fas fa-arrow-left"></i> Back to Complaints
                </button>
            </div>
        );
    }
    if (!complaint) return null;

    const c = complaint;
    const statusColor = getStatusColor(c.status);
    const verifInfo = getVerifBadge(c.verificationStatus);
    const lat = c.report_latitude ?? c.location?.coordinates?.[1];
    const lng = c.report_longitude ?? c.location?.coordinates?.[0];

    return (
        <div className="ccd-wrap">
            <button onClick={() => navigate(-1)} className="ccd-back-btn ccd-back-btn-spacing">
                <i className="fas fa-arrow-left"></i> Back
            </button>

            <div className="ccd-card">
                <div className="ccd-head">
                    <div>
                        <h2 className="ccd-title">{c.title}</h2>
                        <p className="ccd-id"><i className="fas fa-hashtag"></i> {c.complaintId || c._id}</p>
                    </div>
                    <div className="ccd-badges">
                        <span className="ccd-badge" style={{ background: `${statusColor}20`, color: statusColor, borderColor: `${statusColor}40` }}>
                            {getStatusLabel(c.status)}
                        </span>
                        <span className="ccd-badge" style={{ background: `${verifInfo.color}20`, color: verifInfo.color, borderColor: `${verifInfo.color}40` }}>
                            <i className={`fas ${verifInfo.icon}`}></i> {verifInfo.text}
                        </span>
                    </div>
                </div>

                <div className="ccd-grid-2 ccd-gap-top">
                    <InfoRow icon="fa-tag" label="Category" value={c.issueType || 'General'} />
                    <InfoRow icon="fa-flag" label="Priority" value={c.priority || 'Medium'} />
                    <InfoRow icon="fa-calendar" label="Reported" value={new Date(c.createdAt).toLocaleString()} />
                    <InfoRow icon="fa-building" label="Department" value={c.departmentId?.name || 'Pending Assignment'} />
                    <InfoRow icon="fa-user-shield" label="Officer" value={c.officer_id?.name || 'Not yet assigned'} />
                    <InfoRow icon="fa-user-cog" label="Field Worker" value={c.employee_id?.name || 'Not yet assigned'} />
                </div>

                {c.description && (
                    <div className="ccd-description-box">
                        <span className="ccd-small-label">Description</span>
                        <p className="ccd-description-text">{c.description}</p>
                    </div>
                )}
            </div>

            <div className="ccd-card ccd-mt">
                <h3 className="ccd-section-title"><i className="fas fa-images ccd-icon-blue"></i>Image Evidence</h3>
                <div className="ccd-image-grid" style={{ gridTemplateColumns: c.afterImageUrl ? '1fr 1fr' : '1fr' }}>
                    <div>
                        <span className="ccd-image-label">Before</span>
                        {c.beforeImageUrl ? (
                            <img src={resolveImageUrl(c.beforeImageUrl)} alt="Before" className="ccd-image" />
                        ) : (
                            <div className="ccd-no-image"><i className="fas fa-image ccd-no-image-icon"></i>No Image</div>
                        )}
                    </div>
                    {c.afterImageUrl && (
                        <div>
                            <span className="ccd-image-label">After (Resolution)</span>
                            <img src={resolveImageUrl(c.afterImageUrl)} alt="After" className="ccd-image" />
                        </div>
                    )}
                </div>
            </div>

            <div className="ccd-card ccd-mt">
                <h3 className="ccd-section-title"><i className="fas fa-map-marker-alt ccd-icon-amber"></i>Location</h3>
                <div className="ccd-grid-2">
                    <InfoRow icon="fa-map-pin" label="Address" value={c.address || c.report_location || 'GPS Location'} />
                    <InfoRow icon="fa-globe" label="Coordinates" value={lat && lng ? `${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}` : 'N/A'} />
                </div>
                {lat && lng && (
                    <div className="ccd-location-actions">
                        <button onClick={() => openGoogleMaps(lat, lng)} className="ccd-action-btn ccd-action-btn-blue">
                            <i className="fas fa-external-link-alt ccd-action-icon"></i>View on Google Maps
                        </button>
                        <button onClick={() => navigate('/citizen/map')} className="ccd-action-btn ccd-action-btn-green">
                            <i className="fas fa-map-marked-alt ccd-action-icon"></i>Open Complaint Map
                        </button>
                    </div>
                )}
            </div>

            <div className="ccd-card ccd-mt">
                <h3 className="ccd-section-title"><i className="fas fa-shield-alt ccd-icon-purple"></i>Verification Results</h3>

                <div className="ccd-verif-badges">
                    <VerifBadge
                        label="EXIF Check"
                        passed={c.trustMetadata?.spatialDelta != null}
                        detail={c.trustMetadata?.spatialDelta != null ? `${c.trustMetadata.spatialDelta}m delta` : 'No EXIF data'}
                    />
                    <VerifBadge
                        label="Label Check"
                        passed={c.detectedLabels && c.detectedLabels.length > 0}
                        detail={c.detectedLabels?.length > 0 ? `${c.detectedLabels.length} labels` : 'No labels'}
                    />
                    <VerifBadge
                        label="Location Check"
                        passed={c.verificationStatus === 'Verified'}
                        detail={c.verificationStatus || 'Unverified'}
                    />
                </div>

                {c.trustMetadata && (
                    <div className="ccd-trust-box">
                        <span className="ccd-trust-title">Trust Metadata</span>
                        <div className="ccd-trust-grid">
                            <span className="ccd-trust-item">Source: <span className="ccd-trust-value">{c.trustMetadata.captureSource || 'Unknown'}</span></span>
                            <span className="ccd-trust-item">Trust Level: <span className="ccd-trust-value">{c.trustMetadata.verificationStatus || 'UNVERIFIED'}</span></span>
                            <span className="ccd-trust-item">Spatial Delta: <span className="ccd-trust-value">{c.trustMetadata.spatialDelta != null ? `${c.trustMetadata.spatialDelta}m` : 'N/A'}</span></span>
                            <span className="ccd-trust-item">Location Source: <span className="ccd-trust-value">{c.trustMetadata.locationSource || 'N/A'}</span></span>
                        </div>
                    </div>
                )}

                {c.detectedLabels && c.detectedLabels.length > 0 && (
                    <div className="ccd-labels-wrap">
                        <span className="ccd-trust-title">AI Detected Labels</span>
                        <div className="ccd-labels-row">
                            {c.detectedLabels.map((lbl, i) => (
                                <span key={i} className="ccd-label-pill">
                                    {lbl.label} <span className="ccd-label-score">({(lbl.score * 100).toFixed(0)}%)</span>
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {c.officerRemarks && (
                <div className="ccd-card ccd-mt">
                    <h3 className="ccd-section-title"><i className="fas fa-comment-dots ccd-icon-yellow"></i>Officer / System Remarks</h3>
                    <pre className="ccd-remarks">{c.officerRemarks}</pre>
                </div>
            )}

            {c.status === 'REPORTED' && (
                <div className="ccd-card ccd-card-danger ccd-mt">
                    <div className="ccd-withdraw-head">
                        <div>
                            <h3 className="ccd-section-title ccd-withdraw-title"><i className="fas fa-undo ccd-action-icon"></i>Withdraw Complaint</h3>
                            <p className="ccd-withdraw-subtitle">This complaint is still pending. You can withdraw it if it was filed by mistake.</p>
                        </div>
                        <button onClick={() => setShowWithdrawModal(true)} className="ccd-action-btn ccd-action-btn-red">
                            <i className="fas fa-times-circle ccd-action-icon"></i>Withdraw
                        </button>
                    </div>
                </div>
            )}

            {c.status === 'REJECTED' && c.officerRemarks?.includes('Withdrawn') && (
                <div className="ccd-card ccd-card-withdrawn ccd-mt">
                    <div className="ccd-withdrawn-row">
                        <i className="fas fa-ban ccd-withdrawn-icon"></i>
                        <div>
                            <h3 className="ccd-withdrawn-title">Complaint Withdrawn</h3>
                            <p className="ccd-withdrawn-text">This complaint has been withdrawn and will not be processed further.</p>
                        </div>
                    </div>
                </div>
            )}

            {showWithdrawModal && (
                <div className="ct-modal-overlay">
                    <div className="ccd-modal">
                        <h3 className="ccd-modal-title"><i className="fas fa-exclamation-triangle ccd-action-icon"></i>Confirm Withdrawal</h3>
                        <p className="ccd-modal-text">
                            This action cannot be undone. The complaint will be marked as <strong className="ccd-modal-strong">Withdrawn</strong> and will stop being processed.
                        </p>
                        <div className="ccd-modal-field">
                            <label className="ccd-modal-label">Reason (optional)</label>
                            <textarea
                                value={withdrawReason}
                                onChange={(e) => setWithdrawReason(e.target.value)}
                                placeholder="e.g. Filed by mistake, issue already resolved..."
                                rows={3}
                                className="ccd-modal-textarea"
                            />
                        </div>
                        <div className="ccd-modal-actions">
                            <button
                                onClick={() => { setShowWithdrawModal(false); setWithdrawReason(''); }}
                                disabled={withdrawing}
                                className="ccd-modal-btn ccd-modal-btn-cancel"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleWithdraw}
                                disabled={withdrawing}
                                className="ccd-modal-btn ccd-modal-btn-danger"
                                style={{ opacity: withdrawing ? 0.6 : 1, cursor: withdrawing ? 'not-allowed' : 'pointer' }}
                            >
                                {withdrawing ? 'Withdrawing...' : 'Yes, Withdraw'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="ccd-footer">
                Complaint filed on {new Date(c.createdAt).toLocaleString()}
                {c.resolvedAt && ` � Resolved on ${new Date(c.resolvedAt).toLocaleString()}`}
            </div>
        </div>
    );
};

const InfoRow = ({ icon, label, value }) => (
    <div className="ccd-info-row">
        <i className={`fas ${icon} ccd-info-icon`}></i>
        <div>
            <span className="ccd-info-label">{label}</span>
            <span className="ccd-info-value">{value}</span>
        </div>
    </div>
);

const VerifBadge = ({ label, passed, detail }) => (
    <div
        className="ccd-verif-badge"
        style={{
            background: passed ? 'rgba(16,185,129,0.08)' : 'rgba(100,116,139,0.08)',
            border: `1px solid ${passed ? 'rgba(16,185,129,0.25)' : 'rgba(100,116,139,0.2)'}`
        }}
    >
        <i
            className={`fas ${passed ? 'fa-check-circle' : 'fa-minus-circle'}`}
            style={{ color: passed ? '#10b981' : '#64748b' }}
        ></i>
        <span className="ccd-verif-label">{label}</span>
        <span className="ccd-verif-detail">{detail}</span>
    </div>
);

export default CitizenComplaintDetail;

