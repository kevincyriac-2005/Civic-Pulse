import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from 'axios';
import config from '../../config';
import { resolveImageUrl } from '../../utils/imageUrl';
import { isStatusPending, isStatusInProgress, isStatusResolved } from '../../utils/statusUtils';
import '../../styles/fieldworker-variables.css';
import '../../styles/FieldworkerUtilities.css';
import './FieldWorker.css';
import './TaskAction.css';

/* ─────────────────────────────────────────────
   Helper: Severity/Priority Strip colour
 ───────────────────────────────────────────── */
const getPriorityStyle = (priority = '') => {
    const p = String(priority).toLowerCase();
    if (p === 'high' || p === 'critical') return { color: '#ef4444', label: 'Critical', badgeClass: 'fw-badge-critical' };
    if (p === 'medium') return { color: '#f97316', label: 'Elevated', badgeClass: 'fw-badge-elevated' };
    return { color: '#10b981', label: 'Normal', badgeClass: 'fw-badge-normal' };
};

/* ─────────────────────────────────────────────
   Verification Check Row
 ───────────────────────────────────────────── */
const VerificationRow = ({ label, status, detail }) => {
    const isPassed = status === 'pass';
    const isFailed = status === 'fail';
    const color = isPassed ? '#10b981' : isFailed ? '#ef4444' : '#f59e0b';
    const icon = isPassed ? 'fa-check-circle' : isFailed ? 'fa-times-circle' : 'fa-exclamation-circle';
    const bg = isPassed ? 'rgba(16,185,129,0.07)' : isFailed ? 'rgba(239,68,68,0.07)' : 'rgba(245,158,11,0.07)';
    const border = isPassed ? 'rgba(16,185,129,0.25)' : isFailed ? 'rgba(239,68,68,0.25)' : 'rgba(245,158,11,0.25)';
    const verdict = isPassed ? 'PASSED' : isFailed ? 'FAILED' : 'WARNING';

    return (
        <div className="ta-verification-row" style={{ background: bg, border: `1px solid ${border}` }}>
            <i className={`fas ${icon} ta-verification-icon`} style={{ color }} />
            <div className="ta-verification-content">
                <div className="ta-verification-head">
                    <span className="ta-verification-label">{label}</span>
                    <span className="ta-verdict-chip" style={{ color, background: bg, border: `1px solid ${border}` }}>{verdict}</span>
                </div>
                {detail && <p className="ta-verification-detail">{detail}</p>}
            </div>
        </div>
    );
};

/* ─────────────────────────────────────────────
   Evidence Upload Panel (Integrated into Image Grid)
 ───────────────────────────────────────────── */
const EvidenceUploadZone = ({ task, onResolved, isInProgress }) => {
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef(null);

    const handleFileChange = (e) => {
        const selected = e.target.files[0];
        if (selected) {
            setFile(selected);
            const reader = new FileReader();
            reader.onloadend = () => setPreview(reader.result);
            reader.readAsDataURL(selected);
        }
    };

    const handleUpload = async () => {
        if (!file) { toast.warning('Photographic evidence is required.'); return; }
        setUploading(true);
        try {
            const base64Url = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });

            const token = localStorage.getItem('token');
            const res = await axios.post(
                `${config.API_BASE_URL}/field-workers/upload-evidence/${task._id}`,
                { evidenceImageUrl: base64Url, remarks: "Task resolved via TaskAction portal." },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (res.data.success) {
                toast.success('Evidence submitted. Task resolved!');
                onResolved(res.data);
                setFile(null);
                setPreview(null);
            } else { toast.error('Submission failed.'); }
        } catch (err) {
            console.error(err);
            toast.error('Upload failed.');
        } finally { setUploading(false); }
    };

    if (preview) {
        return (
            <div className="ta-upload-integration-wrap">
                <div className="ta-preview-wrapper scale-in">
                    <img src={preview} alt="After" className="ta-image-panel-img" />
                    <button onClick={handleUpload} disabled={uploading} className="ta-upload-integration-btn">
                        {uploading ? <i className="fas fa-spinner fa-spin" /> : <><i className="fas fa-check" /> Commit Evidence</>}
                    </button>
                    <button onClick={() => { setFile(null); setPreview(null); }} className="ta-preview-cancel">&times;</button>
                </div>
            </div>
        );
    }

    if (task.afterImageUrl && !isInProgress) {
        return <img src={resolveImageUrl(task.afterImageUrl)} alt="After" className="ta-image-panel-img" />;
    }

    if (task.afterImageUrl && isInProgress) {
        return (
            <div className="ta-existing-after-wrap">
                <img src={resolveImageUrl(task.afterImageUrl)} alt="After" className="ta-image-panel-img" />
                <div className="ta-existing-after-actions">
                    <button type="button" className="ta-replace-evidence-btn" onClick={() => fileInputRef.current.click()}>
                        <i className="fas fa-camera" /> Replace evidence
                    </button>
                    <input type="file" accept="image/*" ref={fileInputRef} className="ta-hidden-input" onChange={handleFileChange} />
                </div>
            </div>
        );
    }

    if (!isInProgress) {
        return (
            <div className="ta-image-panel-empty">
                <i className="fas fa-clock ta-image-panel-empty-icon" />
                <span className="ta-image-panel-empty-text">Visible once In Progress</span>
            </div>
        );
    }

    return (
        <div className="ta-upload-integration-wrap">
            {preview ? (
                <div className="ta-preview-wrapper scale-in">
                    <img src={preview} alt="After" className="ta-image-panel-img" />
                    <button onClick={handleUpload} disabled={uploading} className="ta-upload-integration-btn">
                        {uploading ? <i className="fas fa-spinner fa-spin" /> : <><i className="fas fa-check" /> Commit Evidence</>}
                    </button>
                    <button onClick={() => {setFile(null); setPreview(null);}} className="ta-preview-cancel">&times;</button>
                </div>
            ) : (
                <div className="ta-image-panel-upload-trigger" onClick={() => fileInputRef.current.click()}>
                    <i className="fas fa-camera ta-image-panel-empty-icon active" />
                    <span className="ta-image-panel-empty-text active">Tap to capture completion</span>
                    <input type="file" accept="image/*" ref={fileInputRef} className="ta-hidden-input" onChange={handleFileChange} />
                </div>
            )}
        </div>
    );
};

/* ─────────────────────────────────────────────
   MAIN: TaskAction
 ───────────────────────────────────────────── */
const TaskAction = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [task, setTask] = useState(null);
    const [loading, setLoading] = useState(true);
    const [taskError, setTaskError] = useState('Task not found.');
    const [verificationResult, setVerificationResult] = useState(null);
    const [updatingStatus, setUpdatingStatus] = useState(false);

    const fetchTask = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${config.API_BASE_URL}/field-workers/task-detail/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.success) {
                setTask(res.data.task);
            } else {
                setTaskError(res.data.message || 'Could not load task.');
            }
        } catch (err) {
            console.error(err);
            setTaskError('Network error.');
        } finally { setLoading(false); }
    }, [id]);

    useEffect(() => { fetchTask(); }, [fetchTask]);

    const handleStatusUpdate = async (newStatus) => {
        setUpdatingStatus(true);
        try {
            const token = localStorage.getItem('token');
            await axios.put(
                `${config.API_BASE_URL}/field-workers/update-status/${id}`,
                { status: newStatus },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            toast.success(`Protocol updated to ${newStatus}`);
            fetchTask();
        } catch (err) {
            console.error(err);
            toast.error('Status update failed.');
        } finally { setUpdatingStatus(false); }
    };

    if (loading) return <div className="fw-page-container ta-state-center">Loading...</div>;
    if (!task) return <div className="fw-page-container ta-error-wrap">Task not found.</div>;

    const { color: stripColor, label: severityLabel, badgeClass } = getPriorityStyle(task.priority);
    
    // Status Logic using helpers
    const isPending = isStatusPending(task.status);
    const isInProgress = isStatusInProgress(task.status);
    const isResolved = isStatusResolved(task.status);

    const lat = task.report_latitude || task.location?.coordinates?.[1];
    const lng = task.report_longitude || task.location?.coordinates?.[0];
    const verif = verificationResult || task.resolutionMetadata;

    return (
        <div className="fw-page-container">
            <div className="fw-max-width">
                <button className="fw-btn fw-btn-dark ta-back-btn" onClick={() => navigate(-1)}>
                    <i className="fas fa-arrow-left" /> Back
                </button>

                <div className="fw-header-card ta-header-card">
                    <div className="ta-header-main">
                        <div className="ta-priority-strip" style={{ backgroundColor: stripColor }} />
                        <div>
                            <p className="fw-header-subtitle ta-header-subtitle">Task #{task.complaintId || String(task._id).substring(0, 8)}</p>
                            <h1 className="fw-header-title">{task.issueType || task.title}</h1>
                            <div className="ta-header-meta-row">
                                <span className={`fw-badge ${badgeClass}`}>{severityLabel}</span>
                                <span className="ta-header-meta"><i className="fas fa-calendar-alt" /> {new Date(task.createdAt).toLocaleDateString()}</span>
                            </div>
                        </div>
                    </div>
                    <div className="ta-status-wrap">
                        <div className={`ta-status-chip ${isResolved ? 'ta-status-chip-resolved' : isInProgress ? 'ta-status-chip-progress' : 'ta-status-chip-pending'}`}>
                            {isResolved ? 'RESOLVED' : isInProgress ? 'IN PROGRESS' : 'PENDING'}
                        </div>
                    </div>
                </div>

                <div className="ta-main-grid">
                    {/* LEFT COLUMN: Data & Images */}
                    <div className="ta-col">
                        <div className="ta-panel">
                            <h3 className="ta-panel-title"><i className="fas fa-file-alt" /> Description</h3>
                            <p className="ta-panel-text">{task.description || 'No description.'}</p>
                            {lat && lng && (
                                <div className="ta-map-box">
                                    <a href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`} target="_blank" rel="noreferrer" className="ta-map-link">
                                        Navigate to Location ↗
                                    </a>
                                </div>
                            )}
                        </div>

                        <div className="ta-panel">
                            <h3 className="ta-panel-title"><i className="fas fa-images" /> Visual Evidence</h3>
                            <div className="ta-image-row">
                                <div className="ta-image-panel">
                                    <span className="ta-image-panel-title">Before</span>
                                    <img src={resolveImageUrl(task.beforeImageUrl || task.imageUrl)} alt="Before" className="ta-image-panel-img" />
                                </div>
                                <div className="ta-image-panel">
                                    <span className="ta-image-panel-title">After</span>
                                    <EvidenceUploadZone 
                                        task={task} 
                                        isInProgress={isInProgress}
                                        onResolved={(data) => { setVerificationResult(data.verificationResults); fetchTask(); }} 
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: Controls & Results */}
                    <div className="ta-col">
                        {!isResolved && isPending && (
                            <div className="ta-panel">
                                <h3 className="ta-panel-title"><i className="fas fa-play" /> Start Work</h3>
                                <button className="fw-btn fw-btn-dark w-full ta-start-btn" onClick={() => handleStatusUpdate('InProgress')} disabled={updatingStatus}>
                                    Activate Protocol
                                </button>
                            </div>
                        )}

                        {verif && (
                            <div className="ta-panel">
                                <h3 className="ta-panel-title"><i className="fas fa-shield-alt" /> Verification</h3>
                                <VerificationRow label="EXIF Validation" status={verif.exifCheck || verif.layer1Exif} />
                                <VerificationRow label="Vision Analysis" status={verif.labelCheck || verif.layer2Label} />
                                <VerificationRow label="Similarity Check" status={verif.imageSimilarityCheck || verif.layer3Hash} />
                            </div>
                        )}

                        {task.officerRemarks && (
                            <div className="ta-panel">
                                <h3 className="ta-panel-title"><i className="fas fa-comment" /> Officer Notes</h3>
                                <div className="ta-notes-box">{task.officerRemarks}</div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TaskAction;
