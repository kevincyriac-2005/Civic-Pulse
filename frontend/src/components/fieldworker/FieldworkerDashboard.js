import React, { useState, useEffect } from 'react';
import axios from 'axios';
import config from '../../config';
import { toast } from 'react-toastify';
import { getStatusColor, getStatusLabel, normalizeStatus, isStatusPending, isStatusInProgress } from '../../utils/statusUtils';
import '../../styles/fieldworker-variables.css';
import '../../styles/FieldworkerUtilities.css';
import './FieldworkerDashboard.css'; // Will be refactored subsequently if needed
import './FieldworkerDashboardPage.css';

const StatBox = ({ label, count, colorClass, iconClass }) => (
    <div className="fwd-stat-card stat-card flex flex-col justify-center animate-fade-up">
        <div className="fwd-stat-head">
            <span className="fwd-stat-label">{label}</span>
            <i className={`fas ${iconClass} fwd-stat-icon`}></i>
        </div>
        <span className={`fwd-stat-value ${colorClass}`}>{count}</span>
    </div>
);

const TaskCard = ({ task, onUpdateStatus, onResolveInitiate }) => {
    const isPending = isStatusPending(task.status);
    const isInProgress = isStatusInProgress(task.status);

    const isHighPriority = task.priority === 'High' || task.priority === 'Critical';

    return (
        <div className={`fwd-task-card ${isHighPriority ? 'fwd-task-card-high' : ''}`}>
            {/* Header */}
            <div className="fwd-task-head">
                <div>
                    <h3 className="fwd-task-title">{task.issueType || task.title}</h3>
                    <p className="fwd-task-ticket">Ticket #{task.complaintId || task._id.substring(0, 8).toUpperCase()}</p>
                </div>
                <div className="fwd-task-badges">
                    {isHighPriority && (
                        <span className="fwd-badge-high">HIGH Priority</span>
                    )}
                    <span className="fwd-badge-status fwd-badge-status-light" style={{ background: getStatusColor(task.status) }}>
                        {getStatusLabel(task.status).toUpperCase()}
                    </span>
                </div>
            </div>

            {/* Content */}
            <p className="fwd-task-desc">
                {task.description || "No specific description provided for this task. Follow standard operational procedures."}
            </p>

            {/* Metadata Footer */}
            <div className="fwd-task-meta">
                <div>
                    <span className="fwd-meta-label">Assigned On</span>
                    <span className="fwd-meta-value">{new Date(task.createdAt).toLocaleDateString()}</span>
                </div>
                <div>
                    <span className="fwd-meta-label">Location</span>
                    <span className="fwd-meta-value">{task.address || "Location specified via GPS"}</span>
                </div>
            </div>

            {/* Actions */}
            <div className="fwd-task-actions">
                {isPending && (
                    <button onClick={() => onUpdateStatus(task._id, 'IN_PROGRESS')} className="fwd-btn fwd-btn-start">
                        <i className="fas fa-play fwd-btn-icon"></i> Start Execution
                    </button>
                )}
                {isInProgress && (
                    <button onClick={() => onResolveInitiate(task)} className="fwd-btn fwd-btn-resolve">
                        <i className="fas fa-check-double fwd-btn-icon"></i> Resolving / Evidence
                    </button>
                )}

                {(task.report_latitude && task.report_longitude) || (task.location && task.location.coordinates) ? (
                    <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${task.report_latitude || task.location.coordinates[1]},${task.report_longitude || task.location.coordinates[0]}`}
                        target="_blank"
                        rel="noreferrer"
                        className="fwd-nav-link"
                    >
                        <i className="fas fa-location-arrow"></i>
                    </a>
                ) : null}
            </div>
        </div>
    );
};

const CompletionModal = ({ task, onClose, onRefresh }) => {
    const [loading, setLoading] = useState(false);
    const [file, setFile] = useState(null);
    const [remarks, setRemarks] = useState('');
    const [locationCaptured, setLocationCaptured] = useState(false);
    const [executionGps, setExecutionGps] = useState(null);

    const handleFileChange = (e) => setFile(e.target.files[0]);

    const captureLocation = () => {
        if (!navigator.geolocation) {
            toast.error("Geolocation is not supported by your browser");
            return;
        }
        setLocationCaptured('computing');
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setExecutionGps({ lat: position.coords.latitude, lng: position.coords.longitude });
                setLocationCaptured('success');
                toast.success("Execution coordinates locked.");
            },
            (error) => {
                setLocationCaptured('failed');
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
        <div className="fwd-modal-overlay">
            <div className="animate-fade-up fwd-modal">
                <div className="fwd-modal-head">
                    <h2 className="fwd-modal-title"><i className="fas fa-clipboard-check fwd-modal-title-icon"></i> Completion Protocol</h2>
                    <button onClick={onClose} className="fwd-modal-close">&times;</button>
                </div>

                <div className="fwd-modal-target">
                    <p className="fwd-modal-target-title"><strong>Target:</strong> {task.issueType || task.title}</p>
                    <p className="fwd-modal-target-id">ID: {task.complaintId || task._id}</p>
                </div>

                <form onSubmit={handleSubmit} className="fwd-modal-form">

                    {/* File Upload */}
                    <div>
                        <label className="fwd-modal-label">Photographic Evidence *</label>
                        <div className={`fwd-upload-box ${file ? 'fwd-upload-box-active' : ''}`}>
                            <input type="file" accept="image/*" onChange={handleFileChange} id="evidence-upload" className="fwd-hidden-input" />
                            <label htmlFor="evidence-upload" className="fwd-upload-label">
                                <i className={`fas fa-camera fwd-upload-icon ${file ? 'fwd-upload-icon-active' : ''}`}></i>
                                <span className={`fwd-upload-text ${file ? 'fwd-upload-text-active' : ''}`}>
                                    {file ? file.name : "Tap to capture or upload after-image"}
                                </span>
                            </label>
                        </div>
                    </div>

                    {/* Remarks */}
                    <div>
                        <label className="fwd-modal-label">Execution Remarks</label>
                        <textarea
                            value={remarks}
                            onChange={(e) => setRemarks(e.target.value)}
                            placeholder="Detail actions taken to resolve..."
                            className="fwd-modal-textarea"
                        ></textarea>
                    </div>

                    {/* GPS Tag */}
                    <div>
                        <button type="button" onClick={captureLocation} className={`fwd-gps-btn ${locationCaptured === 'success' ? 'fwd-gps-btn-success' : ''}`}>
                            {locationCaptured === 'success' ? <i className="fas fa-check-circle"></i> : <i className="fas fa-map-marker-alt"></i>}
                            {locationCaptured === 'computing' ? 'Locking Coordinates...' :
                                locationCaptured === 'success' ? 'Coordinates Locked' : 'Auto-Capture Execution GPS'}
                        </button>
                    </div>

                    {/* Submit */}
                    <button type="submit" disabled={loading} className={`fwd-submit-btn ${loading ? 'fwd-submit-btn-loading' : ''}`}>
                        {loading ? 'Uploading & Synchronizing...' : 'Submit Resolution Evidence'}
                    </button>
                </form>
            </div>
        </div>
    );
};

const FieldworkerDashboard = () => {
    const [summary, setSummary] = useState({ totalAssigned: 0, pendingTasks: 0, inProgress: 0, completedToday: 0 });
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalTask, setModalTask] = useState(null);

    const fetchTasks = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const response = await axios.get(`${config.API_BASE_URL}/field-workers/tasks`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.success) {
                setSummary(response.data.summary);

                const normalizedTasks = (response.data.activeTasks || []).map(t => ({
                    ...t,
                    status: normalizeStatus(t.status)
                }));
                setTasks(normalizedTasks);
            }
        } catch (error) {
            console.error("Error fetching tasks:", error);
            toast.error("Failed to load active assignments");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTasks();
    }, []);

    const handleUpdateStatus = async (taskId, newStatus) => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.put(`${config.API_BASE_URL}/field-workers/update-status/${taskId}`, { status: newStatus }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.success) {
                toast.success(`Execution Initiated: ${newStatus}`);
                fetchTasks();
            }
        } catch (error) {
            console.error(error);
            toast.error("Status update failed");
        }
    };

    if (loading) {
        return (
            <div className="fwd-loading-wrap">
                <div className="fwd-loading-text">Loading Field Protocol...</div>
            </div>
        );
    }

    return (
        <div className="fwd-page-wrap">

            {/* Header */}
            <header className="fwd-header">
                <h1 className="fwd-header-title">Field Worker Dashboard</h1>
                <p className="fwd-header-subtitle">Assigned Task Execution Panel</p>
            </header>

            {/* Summary Cards */}
            <div className="fwd-summary-grid">
                <StatBox label="Total Assigned" count={summary.totalAssigned} colorClass="text-slate-200" iconClass="fa-clipboard-list" />
                <StatBox label="Pending Action" count={summary.pendingTasks} colorClass="text-red-400" iconClass="fa-exclamation-circle" />
                <StatBox label="In Progress" count={summary.inProgress} colorClass="text-blue-400" iconClass="fa-tools" />
                <StatBox label="Completed Today" count={summary.completedToday} colorClass="text-emerald-400" iconClass="fa-check-double" />
            </div>

            {/* Active Tasks Grid */}
            <div className="fwd-section">
                <h2 className="fwd-section-title">
                    <i className="fas fa-layer-group fwd-section-icon"></i> My Active Tasks
                </h2>

                {tasks.length === 0 ? (
                    <div className="fwd-empty-state">
                        <i className="fas fa-glass-cheers fa-3x fwd-empty-icon"></i>
                        <h3 className="fwd-empty-title">All Clear</h3>
                        <p className="fwd-empty-text">You have no active tasks currently assigned.</p>
                    </div>
                ) : (
                    <div className="fwd-task-grid">
                        {tasks.map(task => (
                            <TaskCard
                                key={task._id}
                                task={task}
                                onUpdateStatus={handleUpdateStatus}
                                onResolveInitiate={setModalTask}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Modal Injection */}
            {modalTask && (
                <CompletionModal
                    task={modalTask}
                    onClose={() => setModalTask(null)}
                    onRefresh={fetchTasks}
                />
            )}

        </div>
    );
};

export default FieldworkerDashboard;
