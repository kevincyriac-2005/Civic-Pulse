import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import config from '../../config';
import Loader from '../common/Loader';
import { toast } from 'react-toastify';
import '../../styles/fieldworker-variables.css';
import '../../styles/FieldworkerUtilities.css';
import './FieldWorker.css';
import './TaskHistory.css';

const TaskHistoryCard = ({ task }) => {
    const navigate = useNavigate();
    // Style logic for trust layer and severity
    let badgeClass = 'fw-badge-normal';
    if (task.severity === 'High' || task.severity === 'Critical') badgeClass = 'fw-badge-critical';
    if (task.severity === 'Medium') badgeClass = 'fw-badge-elevated';

    const isVerified = task.trustLevel === 'Verified';

    return (
        <div className="fw-task-card group">
            <div className="fw-task-strip" style={{ backgroundColor: badgeClass === 'fw-badge-critical' ? '#ef4444' : badgeClass === 'fw-badge-elevated' ? '#f97316' : '#10b981' }}></div>
            <div className="fw-task-content">
                <div className="fw-task-header">
                    <div>
                        <h3 className="fw-task-title">{task.category}</h3>
                        <p className="fw-task-id">#{task.complaintId}</p>
                    </div>
                    <div className="thc-header-right">
                        <span className={`fw-badge ${badgeClass}`}>{task.severity}</span>
                        {isVerified && (
                            <span className="thc-verified-chip">
                                <i className="fas fa-shield-check"></i> Verified
                            </span>
                        )}
                    </div>
                </div>

                <p className="fw-task-desc thc-desc">
                    {task.description || "No description provided."}
                </p>

                <div className="fw-task-meta-grid thc-meta-grid">
                    <div className="fw-meta-item">
                        <i className="fas fa-calendar-check fw-meta-icon text-emerald"></i>
                        <span>{new Date(task.resolvedAt).toLocaleDateString()}</span>
                    </div>
                    <div className="fw-meta-item">
                        <i className="fas fa-clipboard-list fw-meta-icon"></i>
                        <span className="fw-meta-text thc-meta-text">{task.completionNotes}</span>
                    </div>
                </div>

                {task.officerRemarks && (
                    <div className="thc-remarks-box">
                        <p className="thc-remarks-label">Officer Remarks</p>
                        <p className="thc-remarks-text">{task.officerRemarks}</p>
                    </div>
                )}

                <div className="fw-task-actions">
                    <div className="fw-status-indicator">
                        <i className="fas fa-check-circle text-emerald thc-status-icon"></i>
                        <span className="fw-status-text fw-status-text-emerald">Resolved Execution</span>
                    </div>

                    <div className="thc-actions">
                        <button
                            onClick={() => navigate(`/fieldworker/task/${task._id}`)}
                            className="fw-btn fw-btn-dark thc-view-btn"
                        >
                            <i className="fas fa-eye" /> View Details
                        </button>
                        {task.location && task.location.lat && (
                            <a
                                href={`https://www.google.com/maps/dir/?api=1&destination=${task.location.lat},${task.location.lng}`}
                                target="_blank"
                                rel="noreferrer"
                                className="fw-btn fw-btn-dark thc-map-btn"
                                title="Execution Coordinates"
                            >
                                <i className="fas fa-map-marker-alt"></i>
                            </a>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const TaskHistory = () => {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });

    const fetchHistory = async (pageToFetch = 1) => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const response = await axios.get(`${config.API_BASE_URL}/field-workers/task-history?page=${pageToFetch}&limit=10`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.success) {
                setTasks(response.data.historictasks);
                setPagination(response.data.pagination);
            }
        } catch (error) {
            console.error("Error fetching task history:", error);
            toast.error("Failed to load task history logs");
            setTasks([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHistory(1);
    }, []);

    const handleNextPage = () => {
        if (pagination.page < pagination.pages) fetchHistory(pagination.page + 1);
    };

    const handlePrevPage = () => {
        if (pagination.page > 1) fetchHistory(pagination.page - 1);
    };

    if (loading && tasks.length === 0) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader text="Retrieving execution history..." />
            </div>
        );
    }

    return (
        <div className="fw-page-container">
            <div className="fw-max-width">
                <header className="fw-header-card th-header-card">
                    <div>
                        <h2 className="fw-header-title th-header-title">
                            <i className="fas fa-history text-emerald"></i> Execution History
                        </h2>
                        <p className="fw-header-subtitle">Immutable audit log of successfully resolved municipal operations.</p>
                    </div>
                </header>

                {tasks.length === 0 ? (
                    <div className="th-empty-card">
                        <div className="th-empty-icon-wrap">
                            <i className="fas fa-archive th-empty-icon"></i>
                        </div>
                        <h3 className="th-empty-title">No Completed Tasks Yet</h3>
                        <p className="th-empty-subtitle">Your successfully resolved operations will be logged here.</p>
                    </div>
                ) : (
                    <>
                        <div className="fw-grid-tasks">
                            {tasks.map(task => (
                                <TaskHistoryCard key={task._id} task={task} />
                            ))}
                        </div>

                        {/* Pagination Controls */}
                        {pagination.pages > 1 && (
                            <div className="th-pagination">
                                <button
                                    onClick={handlePrevPage}
                                    disabled={pagination.page === 1}
                                    className={`fw-btn ${pagination.page === 1 ? 'fw-btn-disabled' : 'fw-btn-dark'}`}
                                >
                                    &larr; Previous
                                </button>
                                <span className="th-page-label">
                                    Page {pagination.page} of {pagination.pages}
                                </span>
                                <button
                                    onClick={handleNextPage}
                                    disabled={pagination.page === pagination.pages}
                                    className={`fw-btn ${pagination.page === pagination.pages ? 'fw-btn-disabled' : 'fw-btn-dark'}`}
                                >
                                    Next &rarr;
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default TaskHistory;

