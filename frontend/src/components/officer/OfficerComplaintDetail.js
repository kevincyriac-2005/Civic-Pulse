import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import config from '../../config';
import { toast } from 'react-toastify';
import Loader from '../common/Loader';
import { getStatusColor, getStatusLabel, normalizeStatus } from '../../utils/statusUtils';
import { resolveImageUrl } from '../../utils/imageUrl';
import '../../styles/officer-variables.css';
import '../../styles/OfficerUtilities.css';
import './officerDashboard.css';
import './OfficerComplaintDetail.css';

const OfficerComplaintDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [complaint, setComplaint] = useState(null);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState('');
    const [actionLoading, setActionLoading] = useState(false);
    const [actionErrorMsg, setActionErrorMsg] = useState('');
    const [reviewNotes, setReviewNotes] = useState('');
    const [fieldWorkers, setFieldWorkers] = useState([]);
    const [selectedWorkerId, setSelectedWorkerId] = useState('');

    useEffect(() => {
        fetchComplaintDetail();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    useEffect(() => {
        if (!complaint) return;
        setSelectedWorkerId(complaint.assignedFieldWorker?.id || '');
        fetchFieldWorkers(complaint.department);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [complaint?.id, complaint?.department, complaint?.assignedFieldWorker?.id]);

    const fetchComplaintDetail = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            if (!token) {
                setErrorMsg('Not authenticated');
                setLoading(false);
                return;
            }

            const res = await axios.get(`${config.API_BASE_URL}/officers/complaint/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.data.success) {
                setComplaint(res.data.complaint);
                setErrorMsg('');
            } else {
                setErrorMsg(res.data.message || 'Failed to load complaint details.');
            }
        } catch (err) {
            console.error('Fetch error:', err);
            setErrorMsg(err.response?.data?.message || 'Network Error. Could not fetch.');
        } finally {
            setLoading(false);
        }
    };

    const fetchFieldWorkers = async (department) => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${config.API_BASE_URL}/field-workers`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });

            const workers = Array.isArray(res.data)
                ? res.data
                : Array.isArray(res.data?.data)
                    ? res.data.data
                    : [];

            setFieldWorkers(
                department
                    ? workers.filter((worker) => worker.department === department)
                    : workers
            );
        } catch (err) {
            console.error('Failed to load field workers', err);
        }
    };

    const updateComplaintAfterReview = (actionType, notes) => {
        const actionLabel = actionType === 'approve' ? 'Approve' : 'Rework';
        const defaultNotes = actionType === 'approve'
            ? 'Resolution approved by officer.'
            : 'Evidence rejected and task returned to worker for rework.';
        const remarkLine = `[Officer Review] ${actionLabel}: ${notes || defaultNotes}`;
        const nextStatus = actionType === 'approve' ? 'RESOLVED' : 'IN_PROGRESS';
        const nextVerification = actionType === 'approve' ? 'Verified' : 'Failed';

        setComplaint((prev) => {
            if (!prev) return prev;

            return {
                ...prev,
                status: nextStatus,
                verificationStatus: nextVerification,
                officerRemarks: prev.officerRemarks
                    ? `${prev.officerRemarks}\n${remarkLine}`
                    : remarkLine
            };
        });
    };

    const updateComplaintAfterReassign = (notes) => {
        const selectedWorker = fieldWorkers.find((worker) => worker._id === selectedWorkerId);

        setComplaint((prev) => {
            if (!prev) return prev;

            return {
                ...prev,
                status: 'ASSIGNED',
                assignedFieldWorker: selectedWorker ? {
                    id: selectedWorker._id,
                    name: selectedWorker.name,
                    phone: selectedWorker.phone,
                    isActive: selectedWorker.isActive,
                    status: selectedWorker.isAvailable ? 'Available' : 'Busy'
                } : prev.assignedFieldWorker,
                officerRemarks: notes
                    ? notes
                    : prev.officerRemarks
            };
        });
    };

    const handleReviewAction = async (actionType) => {
        if (!complaint?.id) return;

        const confirmText = actionType === 'approve'
            ? 'approve this resolution'
            : 'return this complaint for rework';

        if (!window.confirm(`Are you sure you want to ${confirmText}?`)) return;

        setActionLoading(true);
        setActionErrorMsg('');
        try {
            const token = localStorage.getItem('token');
            const notes = reviewNotes.trim();
            let res;

            try {
                res = await axios.put(
                    `${config.API_BASE_URL}/complaints/${complaint.id}/review`,
                    {
                        action: actionType === 'approve' ? 'Approve' : 'Rework',
                        officerNotes: notes
                    },
                    {
                        headers: { Authorization: `Bearer ${token}` }
                    }
                );
            } catch (primaryErr) {
                const canFallback = actionType === 'approve' || actionType === 'rework';
                if (!canFallback) throw primaryErr;

                res = await axios.put(
                    `${config.API_BASE_URL}/complaints/${complaint.id}/status`,
                    {
                        status: actionType === 'approve' ? 'RESOLVED' : 'IN_PROGRESS',
                        remarks: notes || (actionType === 'approve'
                            ? 'Resolution approved by officer.'
                            : 'Evidence rejected and task returned to worker for rework.'),
                        afterImage: actionType === 'approve' ? complaint.afterImage : undefined
                    },
                    {
                        headers: { Authorization: `Bearer ${token}` }
                    }
                );
            }

            if (res.data.success) {
                updateComplaintAfterReview(actionType, notes);
                toast.success(actionType === 'approve' ? 'Resolution approved.' : 'Complaint returned for rework.');
                setReviewNotes('');
                fetchComplaintDetail();
            } else {
                toast.error(res.data.message || `Failed to ${actionType}`);
            }
        } catch (err) {
            console.error('Review action error:', err);
            const message = err.response?.data?.message || 'Error executing review action';
            setActionErrorMsg(message);
            toast.error(message);
        } finally {
            setActionLoading(false);
        }
    };

    const handleReassign = async () => {
        if (!complaint?.id) return;
        if (!selectedWorkerId) {
            toast.warning('Please select a field worker to reassign.');
            return;
        }
        if (selectedWorkerId === complaint.assignedFieldWorker?.id) {
            toast.info('Select a different field worker to reassign.');
            return;
        }
        if (!window.confirm('Are you sure you want to reassign this complaint?')) return;

        setActionLoading(true);
        setActionErrorMsg('');
        try {
            const token = localStorage.getItem('token');
            const notes = reviewNotes.trim();
            const res = await axios.post(
                `${config.API_BASE_URL}/schedules`,
                {
                    complaint_id: complaint.id,
                    employee_id: selectedWorkerId,
                    officerRemarks: notes || 'Reassigned by Officer',
                    assignedAt: new Date().toISOString()
                },
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );

            if (res.data.success) {
                updateComplaintAfterReassign(notes);
                toast.success('Complaint reassigned successfully.');
                setReviewNotes('');
                fetchComplaintDetail();
            } else {
                toast.error(res.data.message || 'Failed to reassign worker.');
            }
        } catch (err) {
            console.error('Reassign error:', err);
            const message = err.response?.data?.message || 'Error reassigning worker';
            setActionErrorMsg(message);
            toast.error(message);
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) return <Loader text="Loading complaint details..." />;
    if (errorMsg) return (
        <div className="ocd-error-wrap">
            <i className="fas fa-exclamation-circle text-danger ocd-error-icon"></i>
            <h3 className="text-white">Error</h3>
            <p className="text-muted">{errorMsg}</p>
            <button className="btn-secondary ocd-error-back-btn" onClick={() => navigate(-1)}>
                <i className="fas fa-arrow-left"></i> Go Back
            </button>
        </div>
    );
    if (!complaint) return null;

    const normalizedStatus = normalizeStatus(complaint.status);
    const isPendingReview = normalizedStatus === 'VERIFICATION_PENDING';

    return (
        <div className="officer-dashboard fade-in ocd-page">
            <div className="ocd-header-row">
                <button className="ocd-back-btn" onClick={() => navigate(-1)}>
                    <i className="fas fa-arrow-left"></i> Back to Complaints
                </button>
                <h1 className="ocd-page-title">Complaint Detail View</h1>
            </div>

            <div className="ocd-layout-grid">
                <div className="ocd-col">
                    <div className="officer-card ocd-card">
                        <div className="officer-flex-between ocd-summary-header">
                            <div>
                                <span className="ocd-id-line">
                                    <i className="fas fa-hashtag"></i> {complaint.complaintId}
                                </span>
                                <h2 className="ocd-category-title">{complaint.category}</h2>
                            </div>
                            <span
                                className="ocd-status-pill"
                                style={{
                                    padding: '0.4rem 1rem',
                                    borderRadius: '20px',
                                    fontSize: '0.85rem',
                                    fontWeight: 600,
                                    background: `${getStatusColor(normalizedStatus)}22`,
                                    color: getStatusColor(normalizedStatus),
                                    border: `1px solid ${getStatusColor(normalizedStatus)}44`
                                }}
                            >
                                {getStatusLabel(normalizedStatus)}
                            </span>
                        </div>

                        <p className="ocd-description-block">
                            {complaint.description || 'No description provided.'}
                        </p>

                        <div className="ocd-summary-grid">
                            <SummaryField icon="fa-building" label="Department" value={complaint.department} />
                            <SummaryField icon="fa-calendar" label="Reported Date" value={new Date(complaint.createdAt).toLocaleString()} />
                            <SummaryField icon="fa-user" label="Reported By" value={complaint.reportedBy ? complaint.reportedBy.name : 'Unknown Citizen'} />
                            {complaint.reportedBy && <SummaryField icon="fa-phone" label="Reporter Contact" value={complaint.reportedBy.phone || 'N/A'} />}
                        </div>
                    </div>

                    <div className="officer-card ocd-card">
                        <h3 className="ocd-card-title">
                            <i className="fas fa-images text-primary ocd-title-icon-gap"></i> Image Evidence
                        </h3>
                        <div className="officer-grid-2 ocd-image-grid">
                            <div>
                                <p className="ocd-image-label">Before (Citizen Upload)</p>
                                {complaint.beforeImage ? (
                                    <img src={resolveImageUrl(complaint.beforeImage)} alt="Before" className="ocd-evidence-img" />
                                ) : (
                                    <div className="ocd-evidence-placeholder">No Image Provided</div>
                                )}
                            </div>
                            <div>
                                <p className="ocd-image-label">After (Completion Evidence)</p>
                                {complaint.afterImage ? (
                                    <img src={resolveImageUrl(complaint.afterImage)} alt="After" className="ocd-evidence-img" />
                                ) : (
                                    <div className="ocd-evidence-placeholder ocd-evidence-placeholder-after">
                                        No completion evidence uploaded yet
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="officer-card ocd-card">
                        <div className="officer-flex-between ocd-card-head-row">
                            <h3 className="ocd-head-title">
                                <i className="fas fa-shield-alt text-success ocd-title-icon-gap"></i> Verification Pipeline
                            </h3>
                            <span
                                className="ocd-verification-pill"
                                style={{
                                    padding: '0.2rem 0.6rem',
                                    borderRadius: '4px',
                                    fontSize: '0.75rem',
                                    fontWeight: 'bold',
                                    background: complaint.verificationStatus === 'Verified' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                                    color: complaint.verificationStatus === 'Verified' ? '#10b981' : '#ef4444'
                                }}
                            >
                                {complaint.verificationStatus || 'FLAGGED'}
                            </span>
                        </div>

                        <div className="ocd-verification-grid">
                            <VerifCheck
                                label="EXIF Location Validation"
                                passed={complaint.resolutionMetadata?.exifCheck === 'pass'}
                                icon="fa-map-pin"
                            />
                            <VerifCheck
                                label="AI Vision Check"
                                passed={complaint.resolutionMetadata?.labelCheck === 'pass'}
                                icon="fa-robot"
                            />
                            <VerifCheck
                                label="Duplicate Hash Guard"
                                passed={complaint.resolutionMetadata?.imageSimilarityCheck === 'pass'}
                                icon="fa-copy"
                            />
                        </div>

                        {isPendingReview && (
                            <div className="ocd-warning-box">
                                <i className="fas fa-exclamation-triangle ocd-title-icon-gap"></i>
                                <strong>Manual Review Required:</strong>{' '}
                                {complaint.resolutionMetadata?.log || 'Automated verification flagged this task. Please inspect the images carefully.'}
                            </div>
                        )}
                    </div>
                </div>

                <div className="ocd-col">
                    {isPendingReview && (
                        <div className="officer-card ocd-review-card">
                            <h3 className="ocd-review-title">
                                <i className="fas fa-clipboard-check ocd-title-icon-gap"></i> Officer Review Action
                            </h3>
                            <p className="ocd-review-note">
                                This complaint is pending your manual review. You can approve the completion, return it for rework, or reassign it to another worker.
                            </p>

                            <label className="ocd-review-label" htmlFor="officer-review-notes">Officer Notes</label>
                            <textarea
                                id="officer-review-notes"
                                className="officer-input ocd-review-input"
                                rows="4"
                                placeholder="Add optional notes for the worker or review trail..."
                                value={reviewNotes}
                                onChange={(event) => setReviewNotes(event.target.value)}
                                disabled={actionLoading}
                            />

                            <label className="ocd-review-label" htmlFor="officer-review-worker">Reassign Worker</label>
                            <select
                                id="officer-review-worker"
                                className="officer-input ocd-worker-select"
                                value={selectedWorkerId}
                                onChange={(event) => setSelectedWorkerId(event.target.value)}
                                disabled={actionLoading || fieldWorkers.length === 0}
                            >
                                <option value="">Select a field worker</option>
                                {fieldWorkers.map((worker) => (
                                    <option key={worker._id} value={worker._id}>
                                        {worker.name} ({worker.department})
                                    </option>
                                ))}
                            </select>
                            {fieldWorkers.length === 0 && (
                                <p className="ocd-review-helper">No field workers were found for this department.</p>
                            )}
                            {actionErrorMsg && (
                                <div className="ocd-review-error">
                                    <i className="fas fa-exclamation-circle ocd-title-icon-gap"></i>{actionErrorMsg}
                                </div>
                            )}

                            <div className="officer-flex-col ocd-review-actions">
                                <button
                                    type="button"
                                    className="btn-primary ocd-action-btn ocd-action-btn-approve"
                                    onClick={() => handleReviewAction('approve')}
                                    disabled={actionLoading}
                                >
                                    <i className="fas fa-check-circle"></i> Approve Resolution
                                </button>
                                <button
                                    type="button"
                                    className="btn-secondary ocd-action-btn ocd-action-btn-rework"
                                    onClick={() => handleReviewAction('rework')}
                                    disabled={actionLoading}
                                >
                                    <i className="fas fa-undo"></i> Request Rework
                                </button>
                                <button
                                    type="button"
                                    className="btn-secondary ocd-action-btn ocd-action-btn-reassign"
                                    onClick={handleReassign}
                                    disabled={actionLoading || fieldWorkers.length === 0}
                                >
                                    <i className="fas fa-user-times"></i> Reassign Worker
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="officer-card ocd-card">
                        <h3 className="ocd-card-title">
                            <i className="fas fa-hard-hat text-warning ocd-title-icon-gap"></i> Assigned Worker
                        </h3>
                        {complaint.assignedFieldWorker ? (
                            <div>
                                <div className="ocd-worker-row">
                                    <div className="ocd-worker-avatar">
                                        {complaint.assignedFieldWorker.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <h4 className="ocd-worker-name">{complaint.assignedFieldWorker.name}</h4>
                                        <span className="ocd-worker-status">
                                            <i
                                                className="fas fa-circle ocd-worker-status-dot"
                                                style={{ color: complaint.assignedFieldWorker.isActive ? '#10b981' : '#ef4444' }}
                                            ></i>
                                            {complaint.assignedFieldWorker.status}
                                        </span>
                                    </div>
                                </div>
                                <SummaryField icon="fa-phone" label="Contact" value={complaint.assignedFieldWorker.phone || 'N/A'} />
                            </div>
                        ) : (
                            <div className="ocd-empty-note">No field worker is currently assigned.</div>
                        )}
                    </div>

                    <div className="officer-card ocd-card">
                        <h3 className="ocd-card-title">
                            <i className="fas fa-map-marker-alt text-danger ocd-title-icon-gap"></i> Location Data
                        </h3>
                        <p className="ocd-location-address">
                            {complaint.location?.address || 'Address not resolved.'}
                        </p>
                        {complaint.location?.lat && complaint.location?.lng && (
                            <>
                                <div className="ocd-location-coords">
                                    {Number(complaint.location.lat).toFixed(6)}, {Number(complaint.location.lng).toFixed(6)}
                                </div>
                                <button
                                    className="btn-secondary ocd-map-btn"
                                    onClick={() => window.open(`https://www.google.com/maps?q=${complaint.location.lat},${complaint.location.lng}`, '_blank')}
                                >
                                    <i className="fas fa-external-link-alt"></i> Open in Maps
                                </button>
                            </>
                        )}
                    </div>

                    <div className="officer-card ocd-card">
                        <h3 className="ocd-card-title">
                            <i className="fas fa-stream text-primary ocd-title-icon-gap"></i> Lifecycle Timeline
                        </h3>
                        <div className="ocd-timeline">
                            <div className="ocd-timeline-line"></div>
                            {complaint.timeline?.map((step, idx) => (
                                <div key={`${step.status}-${idx}`} className={`ocd-timeline-item ${idx === complaint.timeline.length - 1 ? 'ocd-timeline-item-last' : ''}`}>
                                    <div className="ocd-timeline-dot" style={{ background: getStatusColor(normalizeStatus(step.status)) }}></div>
                                    <div className="ocd-timeline-status">{getStatusLabel(normalizeStatus(step.status))}</div>
                                    <div className="ocd-timeline-date">
                                        {new Date(step.date).toLocaleString()}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const SummaryField = ({ icon, label, value }) => (
    <div className="ocd-summary-field">
        <div className="ocd-summary-icon-wrap">
            <i className={`fas ${icon}`}></i>
        </div>
        <div>
            <div className="ocd-summary-label">{label}</div>
            <div className="ocd-summary-value">{value}</div>
        </div>
    </div>
);

const VerifCheck = ({ label, passed }) => (
    <div
        className="ocd-verif-check"
        style={{
            border: `1px solid ${passed ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
            background: passed ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.05)'
        }}
    >
        <i
            className={`fas ${passed ? 'fa-check-circle' : 'fa-times-circle'} ocd-verif-icon`}
            style={{ color: passed ? '#10b981' : '#ef4444' }}
        ></i>
        <div>
            <div className="ocd-verif-label">{label}</div>
            <div className="ocd-verif-state" style={{ color: passed ? '#10b981' : '#ef4444' }}>
                {passed ? 'Passed Validations' : 'Failed / Missing'}
            </div>
        </div>
    </div>
);

export default OfficerComplaintDetail;
