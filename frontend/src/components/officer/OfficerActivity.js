import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Navigate, useNavigate } from 'react-router-dom';
import config from '../../config';
import '../../styles/officer-variables.css';
import '../../styles/OfficerUtilities.css';
import './OfficerOverview.css';
import './OfficerActivity.css';

const OfficerActivity = () => {
    const [activityLogs, setActivityLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchActivityData = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) throw new Error('No authentication token found.');

                const userStr = localStorage.getItem('user');
                const userObj = userStr ? JSON.parse(userStr) : null;
                const role = userObj ? (userObj.role || userObj.usertype) : null;

                if (role !== 'officer') {
                    throw new Error('Unauthorized Access. Supervisor clearance required.');
                }

                const response = await axios.get(`${config.API_BASE_URL}/officers/activity`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                setActivityLogs(response.data);
                setLoading(false);
            } catch (err) {
                console.error("Activity log fetch error:", err);
                setError(err.response?.data?.message || err.message || "Failed to load activity logs.");
                setLoading(false);
            }
        };

        fetchActivityData();
    }, []);

    const userStr = localStorage.getItem('user');
    const userObj = userStr ? JSON.parse(userStr) : null;
    const userRole = userObj ? (userObj.role || userObj.usertype) : null;

    if (userRole !== 'officer') {
        return <Navigate to="/unauthorized" replace />;
    }

    if (loading) {
        return (
            <div className="dashboard-container">
                <div className="oa-loading-wrap">
                    <div className="spinner oa-loading-spinner">Loading Activity...</div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="dashboard-container">
                <div className="oa-error-box">
                    <i className="fas fa-exclamation-triangle oa-error-icon"></i>
                    <h3>Error Loading Activity Log</h3>
                    <p>{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="dashboard-container officer-dashboard-root">
            <header className="dashboard-header mb-4">
                <div className="header-title-wrapper">
                    <h1>Operations Activity Log</h1>
                    <p>Department-wide event audit trail</p>
                </div>
            </header>

            <div className="dashboard-panel panel-padding">
                <div className="table-header oa-header-block">
                    <h2 className="oa-title">
                        <i className="fas fa-history oa-title-icon"></i> Department Timeline
                    </h2>
                </div>

                <div className="table-responsive oa-scroll-wrap">
                    <table className="dashboard-table">
                        <thead className="oa-sticky-head">
                            <tr>
                                <th>Time</th>
                                <th>Incident ID</th>
                                <th>Action</th>
                                <th>Performed By</th>
                                <th>Remarks</th>
                            </tr>
                        </thead>
                        <tbody>
                            {activityLogs.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="oa-empty-cell">
                                        <i className="fas fa-clipboard-list oa-empty-icon"></i>
                                        No recent activity logged for this department.
                                    </td>
                                </tr>
                            ) : (
                                activityLogs.map((log) => (
                                    <tr key={log._id}>
                                        <td className="td-time text-slate-300 oa-time-cell">
                                            {new Intl.DateTimeFormat('en-US', {
                                                month: 'short', day: 'numeric',
                                                hour: '2-digit', minute: '2-digit'
                                            }).format(new Date(log.timestamp))}
                                        </td>
                                        <td className="td-id oa-click-id" onClick={() => log.complaintId && navigate(`/officer/complaint/${log.complaintId}`)}>
                                            {log.complaintShortId}
                                        </td>
                                        <td><ActionBadge actionType={log.actionType} /></td>
                                        <td className="td-text">
                                            <div className="oa-user-row">
                                                <div className="oa-user-avatar" style={{ background: log.performedRole === 'admin' ? '#8b5cf6' : log.performedRole === 'officer' ? '#3b82f6' : '#10b981' }}>
                                                    {log.performedByName.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="oa-user-meta">
                                                    <span className="oa-user-name">{log.performedByName}</span>
                                                    <span className="oa-user-role">{log.performedRole}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="td-text oa-remarks">{log.remarks}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

function ActionBadge({ actionType }) {
    let badgeClass = "oa-badge-default";
    let icon = "fa-circle";
    let label = actionType;

    switch (actionType) {
        case 'COMPLAINT_ASSIGNED':
        case 'COMPLAINT_REASSIGNED':
            badgeClass = "oa-badge-assigned";
            icon = "fa-user-check";
            label = "Worker Assigned";
            break;
        case 'STATUS_UPDATED':
            badgeClass = "oa-badge-updated";
            icon = "fa-sync-alt";
            label = "Status Update";
            break;
        case 'COMPLAINT_RESOLVED':
            badgeClass = "oa-badge-resolved";
            icon = "fa-check-double";
            label = "Issue Resolved";
            break;
        case 'HAZARD_FLAGGED':
            badgeClass = "oa-badge-flagged";
            icon = "fa-flag";
            label = "Safety Flag";
            break;
        default:
            badgeClass = "oa-badge-default";
            icon = "fa-info-circle";
    }

    return (
        <span className={`status-badge-inline ${badgeClass}`}>
            <i className={`fas ${icon}`}></i> {label}
        </span>
    );
}

export default OfficerActivity;
