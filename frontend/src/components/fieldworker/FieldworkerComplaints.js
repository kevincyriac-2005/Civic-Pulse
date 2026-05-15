import React, { useState, useEffect } from 'react';
import Loader from '../common/Loader';
import config from '../../config';
import { resolveImageUrl } from '../../utils/imageUrl';
import '../../styles/fieldworker-variables.css';
import '../../styles/FieldworkerUtilities.css';
import './FieldworkerDashboard.css'; // Reusing dashboard styles for consistency
import './FieldworkerComplaints.css';

const FieldworkerComplaints = () => {
    const [complaints, setComplaints] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedImage, setSelectedImage] = useState(null); // For Image Modal


    useEffect(() => {
        fetchComplaints();
    }, []);

    const fetchComplaints = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                setError("Not authenticated");
                setLoading(false);
                return;
            }

            const res = await fetch(`${config.API_BASE_URL}/complaints`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await res.json();

            if (res.ok && data.success) {
                setComplaints(data.data || []);
            } else {
                setError(data.message || "Failed to fetch complaints");
            }
        } catch (err) {
            console.error("Error fetching complaints:", err);
            setError("Network error. Please try again.");
        } finally {
            setLoading(false);
        }
    };



    if (loading) return <Loader text="Fetching assigned tasks..." />;
    if (error) return <div className="error-message">Error: {error}</div>;

    return (
        <div className="fieldworker-card animate-fade-up">
            <h2>My Assigned Tasks</h2>
            {complaints.length === 0 ? (
                <p className="text-muted">No pending tasks assigned to you.</p>
            ) : (
                <div className="task-list">
                    {complaints.map(task => (
                        <div key={task._id} className="task-item fwc-task-item">
                            <div className="fwc-task-main">
                                {/* Image Thumbnail */}
                                {task.beforeImageUrl && (
                                    <div
                                        className="fwc-thumb-wrap"
                                        onClick={() => setSelectedImage(resolveImageUrl(task.beforeImageUrl))}
                                    >
                                        <img
                                            src={resolveImageUrl(task.beforeImageUrl)}
                                            alt="Task"
                                            className="fwc-thumb"
                                        />
                                        <div className="hover-overlay fwc-thumb-overlay">
                                            <i className="fas fa-expand fwc-thumb-overlay-icon"></i>
                                        </div>
                                    </div>
                                )}

                                <div className="fwc-task-content">
                                    <div className="fwc-task-header">
                                        <h3 className="fwc-task-title">{task.title}</h3>
                                        <span className={`status-badge ${task.status?.toLowerCase() || 'pending'}`}>
                                            {task.status}
                                        </span>
                                    </div>

                                    <p className="fwc-task-desc">
                                        {task.description}
                                    </p>

                                    {/* Expanded Details Grid */}
                                    <div className="fwc-info-grid">
                                        <div className="fwc-info-item">
                                            <span className="fwc-info-label">Reported By</span>
                                            <span className="fwc-info-value">
                                                <i className="fas fa-user fwc-info-icon fwc-info-icon-user"></i>
                                                {task.citizenId?.name || 'Unknown Citizen'}
                                            </span>
                                        </div>
                                        <div className="fwc-info-item">
                                            <span className="fwc-info-label">Assigned By</span>
                                            <span className="fwc-info-value">
                                                <i className="fas fa-user-shield fwc-info-icon fwc-info-icon-shield"></i>
                                                {task.officer_id?.name || 'System / Admin'}
                                            </span>
                                        </div>
                                        <div className="fwc-info-item">
                                            <span className="fwc-info-label">Assigned On</span>
                                            <span className="fwc-info-value">
                                                <i className="fas fa-clock fwc-info-icon fwc-info-icon-clock"></i>
                                                {task.assignedAt ? new Date(task.assignedAt).toLocaleString() : 'N/A'}
                                            </span>
                                        </div>
                                        <div className="fwc-info-item">
                                            <span className="fwc-info-label">Location</span>
                                            <span className="fwc-info-value">
                                                <i className="fas fa-map-marker-alt fwc-info-icon fwc-info-icon-location"></i>
                                                {task.report_location || 'Coordinates-only'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="fwc-actions">
                                        {task.location && task.location.coordinates && (
                                            <a
                                                href={`https://www.google.com/maps/search/?api=1&query=${task.location.coordinates[1]},${task.location.coordinates[0]}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="btn-action fwc-nav-link"
                                            >
                                                <i className="fas fa-directions"></i> Navigate
                                            </a>
                                        )}

                                        <button
                                            onClick={() => window.location.href = `/fieldworker/complaint/${task._id}`}
                                            className="btn-primary fwc-details-btn"
                                        >
                                            View Details
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Image Modal */}
            {selectedImage && (
                <div
                    className="fwc-image-modal"
                    onClick={() => setSelectedImage(null)}
                >
                    <img
                        src={resolveImageUrl(selectedImage)}
                        alt="Full View"
                        className="fwc-image-modal-img"
                        onClick={(e) => e.stopPropagation()}
                    />
                    <button
                        className="fwc-image-modal-close"
                        onClick={() => setSelectedImage(null)}
                    >
                        &times;
                    </button>
                </div>
            )}
        </div>
    );
};

export default FieldworkerComplaints;

