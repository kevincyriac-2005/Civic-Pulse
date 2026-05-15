import React, { useState, useEffect, useRef } from 'react';
import Loader from '../common/Loader';
import { useParams, useNavigate } from 'react-router-dom';
import config from '../../config';
import { toast } from 'react-toastify';
import { getStatusColor, getStatusLabel, normalizeStatus, isStatusResolved } from '../../utils/statusUtils';
import { resolveImageUrl } from '../../utils/imageUrl';
import '../../styles/fieldworker-variables.css';
import '../../styles/FieldworkerUtilities.css';
import './FieldworkerDashboard.css';
import './FieldworkerComplaintDetail.css';

const FieldworkerComplaintDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [task, setTask] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [status, setStatus] = useState('');
    const [remarks, setRemarks] = useState('');
    const [afterImage, setAfterImage] = useState(null); // Base64
    const [imagePreview, setImagePreview] = useState(null);
    const fileInputRef = useRef(null);

    useEffect(() => {
        fetchTaskDetails();
    }, [id]);

    const fetchTaskDetails = async () => {
        try {
            const token = localStorage.getItem('token');
            const listRes = await fetch(`${config.API_BASE_URL}/field-workers/tasks`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await listRes.json();

            if (listRes.ok && data.success) {
                const foundTask = (data.activeTasks || []).find(t => t._id === id);
                if (foundTask) {
                    foundTask.status = normalizeStatus(foundTask.status);
                    setTask(foundTask);
                    setStatus(foundTask.status);
                } else {
                    setError("Task not found or access denied.");
                }
            } else {
                setError(data.message || "Failed to fetch task details");
            }

        } catch (err) {
            console.error("Error fetching task:", err);
            setError("Network error.");
        } finally {
            setLoading(false);
        }
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setAfterImage(reader.result); 
                setImagePreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleUpdate = async () => {
        if (status === 'RESOLVED' && !afterImage) {
            toast.warning("Please upload an 'After' image to mark as Resolved.");
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${config.API_BASE_URL}/field-workers/update-status/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ status })
            });
            const statusData = await res.json();

            if (statusData.success && status === 'RESOLVED') {
                const evidenceRes = await fetch(`${config.API_BASE_URL}/field-workers/upload-evidence/${id}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        evidenceImageUrl: afterImage,
                        remarks
                    })
                });
                const evidenceData = await evidenceRes.json();
                if (evidenceData.success) {
                    toast.success("Task resolved and evidence submitted.");
                    navigate('/fieldworker/dashboard');
                } else {
                    toast.error(evidenceData.message || "Failed to submit evidence");
                }
            } else if (statusData.success) {
                toast.success(`Task status updated to ${status}`);
                navigate('/fieldworker/dashboard');
            } else {
                toast.error(statusData.message || "Update failed");
            }
        } catch (err) {
            console.error("Update error:", err);
            toast.error("Failed to update status");
        }
    };

    if (loading) return <Loader text="Loading complaint details..." />;
    if (error) return <div className="error-message">{error}</div>;
    if (!task) return <div className="error-message">Task not found.</div>;

    return (
        <div className="fwcd-page-wrap animate-fade-in">
            <div className="fwcd-card-wrap fieldworker-card">
                
                {/* Header Section */}
                <div className="fwcd-header">
                    <button onClick={() => navigate(-1)} className="fwcd-back-btn">
                        <i className="fas fa-chevron-left"></i> Back to Tasks
                    </button>
                    <div className="fwcd-head-content">
                        <h1 className="fwcd-title">{task.issueType || task.title}</h1>
                        <span className="status-badge fwcd-status-badge" style={{ backgroundColor: getStatusColor(task.status) }}>
                            {getStatusLabel(task.status).toUpperCase()}
                        </span>
                    </div>
                </div>

                {/* Info Grid */}
                <div className="fwcd-details-grid">
                    <div className="fwcd-item">
                        <label className="fwcd-label">Assigned On</label>
                        <div className="fwcd-value">
                            <i className="fas fa-calendar-alt fwcd-icon"></i>
                            {new Date(task.createdAt).toLocaleDateString()}
                        </div>
                    </div>
                    <div className="fwcd-item">
                        <label className="fwcd-label">Priority Level</label>
                        <div className="fwcd-value">
                            <i className="fas fa-exclamation-triangle fwcd-icon"></i>
                            {task.priority || "Normal"}
                        </div>
                    </div>
                    <div className="fwcd-item">
                        <label className="fwcd-label">Reported Category</label>
                        <div className="fwcd-value">
                            <i className="fas fa-tag fwcd-icon"></i>
                            {task.category?.name || "Civic Issue"}
                        </div>
                    </div>
                    <div className="fwcd-item">
                        <label className="fwcd-label">Task Identifier</label>
                        <div className="fwcd-value fwcd-id">
                            <i className="fas fa-hashtag fwcd-icon"></i>
                            {task.complaintId || task._id.substring(0, 8)}
                        </div>
                    </div>
                </div>

                {/* Description */}
                <div className="fwcd-section">
                    <h3 className="fwcd-section-title">Execution Description</h3>
                    <div className="fwcd-description-box">
                        {task.description || "No specific instructions provided. Follow standard protocols."}
                    </div>
                </div>

                {/* Media Comparison Section */}
                <div className="fwcd-section">
                    <h3 className="fwcd-section-title">Visual Documentation</h3>
                    <div className="fwcd-media-grid">
                        <div className="fwcd-media-col">
                            <h4 className="fwcd-media-subtitle">Before (Reported)</h4>
                            <div className="fwcd-img-frame">
                                {task.beforeImageUrl ? (
                                    <img src={resolveImageUrl(task.beforeImageUrl)} alt="Before" className="fwcd-media-img" />
                                ) : (
                                    <div className="fwcd-media-placeholder">
                                        <i className="fas fa-image"></i>
                                        <span>No image provided</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="fwcd-media-col">
                            <h4 className="fwcd-media-subtitle">After (Completion Proof)</h4>
                            <div className="fwcd-proof-frame">
                                <div className="fwcd-upload-container">
                                    {imagePreview ? (
                                        <div className="fwcd-preview-wrapper scale-in">
                                            <img src={imagePreview} alt="Preview" className="fwcd-preview-img-filled" />
                                            <button onClick={() => { setAfterImage(null); setImagePreview(null); }} className="fwcd-remove-img-btn">
                                                <i className="fas fa-times"></i>
                                            </button>
                                        </div>
                                    ) : task.afterImageUrl && !isStatusResolved(task.status) ? (
                                        <div className="fwcd-existing-after-wrap">
                                            <img src={resolveImageUrl(task.afterImageUrl)} alt="After" className="fwcd-media-img" />
                                            <div className="fwcd-existing-after-actions">
                                                <button type="button" className="fwcd-replace-img-btn" onClick={() => fileInputRef.current.click()}>
                                                    <i className="fas fa-camera"></i> Replace evidence
                                                </button>
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={handleImageChange}
                                                    ref={fileInputRef}
                                                    className="fwcd-hidden-input"
                                                />
                                            </div>
                                        </div>
                                    ) : task.afterImageUrl ? (
                                        <img src={resolveImageUrl(task.afterImageUrl)} alt="After" className="fwcd-media-img" />
                                    ) : (
                                        <div className="fwcd-upload-container">
                                            {!isStatusResolved(task.status) ? (
                                                <div className="fwcd-upload-zone">
                                                    <div className="fwcd-upload-trigger-lg" onClick={() => fileInputRef.current.click()}>
                                                        <div className="fwcd-upload-circle">
                                                            <i className="fas fa-camera"></i>
                                                        </div>
                                                        <span className="fwcd-upload-text-lg">Tap to Upload Evidence</span>
                                                        <input
                                                            type="file"
                                                            accept="image/*"
                                                            onChange={handleImageChange}
                                                            ref={fileInputRef}
                                                            className="fwcd-hidden-input"
                                                        />
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="fwcd-resolved-msg">
                                                    <i className="fas fa-check-circle"></i>
                                                    <span>Resolution documented</span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="fwcd-action-bar">
                    <div className="fwcd-action-header">
                        <h3 className="fwcd-action-title">Task Action Panel</h3>
                        {afterImage && <span className="fwcd-evidence-badge"><i className="fas fa-paperclip"></i> Evidence Attached</span>}
                    </div>

                    <div className="fwcd-action-layout">
                        <div className="fwcd-status-group">
                            <label className="fwcd-action-label">Current Phase</label>
                            <select
                                value={status}
                                onChange={(e) => setStatus(e.target.value)}
                                disabled={isStatusResolved(task.status)}
                                className="fwcd-action-select"
                            >
                                <option value="ASSIGNED">Assigned</option>
                                <option value="IN_PROGRESS">In Progress</option>
                                <option value="RESOLVED">Resolved</option>
                            </select>
                        </div>

                        <div className="fwcd-remarks-group">
                            <label className="fwcd-action-label">Completion Remarks</label>
                            <textarea
                                value={remarks}
                                onChange={(e) => setRemarks(e.target.value)}
                                placeholder="Detail your actions here..."
                                disabled={isStatusResolved(task.status)}
                                className="fwcd-action-textarea"
                            />
                        </div>
                    </div>

                    {!isStatusResolved(task.status) && (
                        <div className="fwcd-submit-container">
                            <button
                                onClick={handleUpdate}
                                className={`primary-btn fwcd-submit-btn-premium ${loading ? 'opacity-50 pointer-events-none' : ''}`}
                                disabled={loading}
                            >
                                {loading ? 'Synchronizing...' : 'Sychronize Status & Evidence'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FieldworkerComplaintDetail;
