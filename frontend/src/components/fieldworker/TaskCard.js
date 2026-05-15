import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import config from '../../config';
import axios from 'axios';
import { isStatusPending, isStatusInProgress, isStatusResolved } from '../../utils/statusUtils';
import '../../styles/fieldworker-variables.css';
import '../../styles/FieldworkerUtilities.css';
import './FieldWorker.css';
import './TaskCard.css';

// --- Sub-component: Completion Modal ---
const CompletionModal = ({ task, onClose, onRefresh }) => {
    const [loading, setLoading] = useState(false);
    const [file, setFile] = useState(null);
    const [remarks, setRemarks] = useState('');
    const [executionGps, setExecutionGps] = useState(null);
    const [locationStatus, setLocationStatus] = useState('idle');

    const handleFileChange = (e) => setFile(e.target.files[0]);

    const captureLocation = () => {
        if (!navigator.geolocation) {
            toast.error("Geolocation is not supported by your browser");
            return;
        }
        setLocationStatus('computing');
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setExecutionGps({ lat: position.coords.latitude, lng: position.coords.longitude });
                setLocationStatus('success');
                toast.success("Execution coordinates locked.");
            },
            () => {
                setLocationStatus('failed');
                toast.error("Failed to capture location. Ensure permissions are granted.");
            }
        );
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!file) {
            toast.warning("Photographic evidence is required to resolve a task.");
            return;
        }

        setLoading(true);
        try {
            const base64Url = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });

            const token = localStorage.getItem('token');
            const response = await axios.post(`${config.API_BASE_URL}/field-workers/upload-evidence/${task._id}`, {
                evidenceImageUrl: base64Url,
                remarks: remarks,
                latitude: executionGps?.lat,
                longitude: executionGps?.lng
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.success) {
                toast.success("Task resolved and evidence submitted.");
                onRefresh();
                onClose();
            } else {
                toast.error("Failed to mark task as resolved.");
            }
        } catch (error) {
            console.error(error);
            toast.error("Submission failed. Network or server error.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fw-modal-overlay">
            <div className="fw-modal-content">
                <div className="fw-flex-between tc-modal-head">
                    <h2 className="tc-modal-title">
                        <i className="fas fa-clipboard-check text-emerald"></i>
                        Completion Protocol
                    </h2>
                    <button onClick={onClose} className="tc-modal-close">&times;</button>
                </div>

                <div className="tc-target-box">
                    <p className="tc-target-title">Target: {task.issueType || task.title}</p>
                    <p className="tc-target-id">ID: {task.complaintId || task._id.substring(0, 8)}</p>
                </div>

                <form onSubmit={handleSubmit} className="tc-modal-form">
                    <div>
                        <label className="tc-modal-label">Photographic Evidence *</label>
                        <div className={`fw-upload-box ${file ? 'active' : ''}`}>
                            <input type="file" accept="image/*" onChange={handleFileChange} id="evidence-upload" className="tc-hidden-input" />
                            <label htmlFor="evidence-upload" className="tc-upload-label">
                                <i className={`fas fa-camera tc-upload-icon ${file ? 'tc-upload-icon-active' : ''}`}></i>
                                <span className={`tc-upload-text ${file ? 'tc-upload-text-active' : ''}`}>
                                    {file ? file.name : "Tap to capture or upload after-image"}
                                </span>
                            </label>
                        </div>
                    </div>

                    <div>
                        <label className="tc-modal-label">Execution Remarks</label>
                        <textarea
                            value={remarks}
                            onChange={(e) => setRemarks(e.target.value)}
                            placeholder="Detail actions taken to resolve..."
                            className="fw-textarea"
                        ></textarea>
                    </div>

                    <div>
                        <button
                            type="button"
                            onClick={captureLocation}
                            className={`tc-location-btn ${locationStatus === 'success' ? 'tc-location-btn-success' : ''}`}
                        >
                            {locationStatus === 'success' ? <i className="fas fa-check-circle"></i> : <i className="fas fa-map-marker-alt"></i>}
                            {locationStatus === 'computing' ? 'Locking Coordinates...' :
                                locationStatus === 'success' ? 'Coordinates Locked' : 'Auto-Capture Execution GPS'}
                        </button>
                    </div>

                    <button type="submit" disabled={loading} className={`fw-btn tc-submit-btn ${loading ? 'fw-btn-disabled' : 'fw-btn-dark'}`}>
                        {loading ? 'Uploading & Synchronizing...' : 'Submit Resolution Evidence'}
                    </button>
                </form>
            </div>
        </div>
    );
};

// --- Main TaskCard Component ---
const TaskCard = ({ task, onRefresh }) => {
    const navigate = useNavigate();
    const [showModal, setShowModal] = useState(false);

    // Derived States using consolidated helpers
    const isPending = isStatusPending(task.status);
    const isInProgress = isStatusInProgress(task.status);
    const isResolved = isStatusResolved(task.status);

    // Priority Strip Color Mapping
    const priorityFormat = String(task.priority).toLowerCase();
    let stripColor = '#94a3b8'; // default gray
    let badgeClass = 'fw-badge-normal';
    let severityLabel = 'Normal';

    if (priorityFormat === 'high' || priorityFormat === 'critical') {
        stripColor = '#ef4444'; // red-500
        badgeClass = 'fw-badge-critical';
        severityLabel = 'Critical';
    } else if (priorityFormat === 'medium') {
        stripColor = '#f97316'; // orange-500
        badgeClass = 'fw-badge-elevated';
        severityLabel = 'Elevated';
    }

    // Calculate days ago
    const assignedDate = new Date(task.createdAt || task.assignedAt);
    const diffTime = Math.abs(new Date() - assignedDate);
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    let timeText = 'Just now';
    if (diffHours > 0 && diffHours < 24) timeText = `${diffHours}h ago`;
    else if (diffDays >= 1) timeText = `${diffDays}d ago`;

    // Coordinates logic
    const hasCoordinates = (task.report_latitude && task.report_longitude) || (task.location && task.location.coordinates);
    const lat = task.report_latitude || (task.location && task.location.coordinates ? task.location.coordinates[1] : null);
    const lng = task.report_longitude || (task.location && task.location.coordinates ? task.location.coordinates[0] : null);

    const handleUpdateStatus = async (newStatus) => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.put(`${config.API_BASE_URL}/field-workers/update-status/${task._id}`, { status: newStatus }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.success) {
                toast.success(`Execution Initiated: ${newStatus}`);
                onRefresh();
            }
        } catch (error) {
            console.error(error);
            toast.error("Status update failed");
        }
    };

    return (
        <React.Fragment>
            <div className="fw-task-card group">
                <div className="fw-task-strip" style={{ backgroundColor: stripColor }}></div>
                <div className="fw-task-content">
                    <div className="fw-task-header">
                        <div>
                            <h3 className="fw-task-title">{task.issueType || task.title}</h3>
                            <p className="fw-task-id">#{task.complaintId || task._id.substring(0, 8)}</p>
                        </div>
                        <span className={`fw-badge ${badgeClass}`}>
                            {severityLabel}
                        </span>
                    </div>

                    <p className="fw-task-desc">
                        {task.description || "Refer to standard municipal execution guidelines for this task category. Detailed description was omitted."}
                    </p>

                    <div className="fw-task-meta-grid">
                        <div className="fw-meta-item">
                            <i className="fas fa-map-marker-alt fw-meta-icon"></i>
                            <span className="fw-meta-text">{task.category?.name || "Target Area Zone"}</span>
                        </div>
                        <div className="fw-meta-item">
                            <i className="fas fa-clock fw-meta-icon"></i>
                            <span>{timeText}</span>
                        </div>
                    </div>

                    <div className="fw-task-actions">
                        <div className="fw-status-indicator">
                            {isPending && (
                                <>
                                    <div className="fw-status-dot-wrap">
                                        <div className="fw-status-dot-ping"></div>
                                        <div className="fw-status-dot-core"></div>
                                    </div>
                                    <span className="fw-status-text">Ready to Start</span>
                                </>
                            )}
                            {isInProgress && (
                                <>
                                    <i className="fas fa-tools text-purple tc-status-icon"></i>
                                    <span className="fw-status-text fw-status-text-purple">In Progress</span>
                                </>
                            )}
                            {isResolved && (
                                <>
                                    <i className="fas fa-check-double text-emerald tc-status-icon"></i>
                                    <span className="fw-status-text fw-status-text-emerald">Completed</span>
                                </>
                            )}
                        </div>

                        <div className="tc-actions-row">
                            {isPending && (
                                <button onClick={() => handleUpdateStatus('InProgress')} className="fw-btn fw-btn-dark">
                                    Execute Protocol
                                </button>
                            )}

                            {isInProgress && (
                                <button onClick={() => setShowModal(true)} className="fw-btn fw-btn-success">
                                    Upload Evidence
                                </button>
                            )}

                            <button
                                onClick={() => navigate(`/fieldworker/task/${task._id}`)}
                                className="fw-btn fw-btn-dark"
                                title="View full task details"
                            >
                                View Details
                            </button>

                            {hasCoordinates && (
                                <a
                                    href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="fw-btn fw-btn-link tc-map-link-btn"
                                    title="Navigate via Maps"
                                >
                                    <i className="fas fa-location-arrow"></i>
                                </a>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {showModal && (
                <CompletionModal
                    task={task}
                    onClose={() => setShowModal(false)}
                    onRefresh={onRefresh}
                />
            )}
        </React.Fragment>
    );
};

export default TaskCard;
