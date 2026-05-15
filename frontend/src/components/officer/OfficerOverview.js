import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Navigate, useNavigate } from 'react-router-dom';
import config from '../../config';
import { getStatusLabel, normalizeStatus } from '../../utils/statusUtils';
import '../../styles/officer-variables.css';
import '../../styles/OfficerUtilities.css';
import './OfficerOverview.css';

const OfficerOverview = () => {
    const [data, setData] = useState(null);
    const [slaData, setSlaData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentTime, setCurrentTime] = useState(new Date());
    const navigate = useNavigate();

    // Live clock update
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) throw new Error('No authentication token found.');

                const userStr = localStorage.getItem('user');
                const userObj = userStr ? JSON.parse(userStr) : null;
                const role = userObj ? (userObj.role || userObj.usertype) : null;

                if (role !== 'officer') {
                    throw new Error('Unauthorized Access. Supervisor clearance required.');
                }

                const summaryReq = axios.get(`${config.API_BASE_URL}/officers/dashboard-summary`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                const slaReq = axios.get(`${config.API_BASE_URL}/officers/sla-summary`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                const [response, slaResponse] = await Promise.all([summaryReq, slaReq]);

                setData({
                    ...response.data,
                    officerName: userObj.name || 'Supervisor',
                    department: userObj.department || 'Operations'
                });

                setSlaData(slaResponse.data);

                setLoading(false);
            } catch (err) {
                console.error("Dashboard fetch error:", err);
                setError(err.response?.data?.message || err.message || "Failed to load operations dashboard.");
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    const userStr = localStorage.getItem('user');
    const userObj = userStr ? JSON.parse(userStr) : null;
    const userRole = userObj ? (userObj.role || userObj.usertype) : null;

    if (userRole !== 'officer') {
        return <Navigate to="/unauthorized" replace />;
    }

    if (loading) return <DashboardSkeleton />;
    if (error) return <ErrorFallback message={error} />;
    if (!data) return null;

    // Calculate Percentages for Workload Bars safely
    const totalStatus = data.statusBreakdown.open + data.statusBreakdown.inProgress + data.statusBreakdown.resolved;
    const openPct = totalStatus ? Math.round((data.statusBreakdown.open / totalStatus) * 100) : 0;
    const inProgressPct = totalStatus ? Math.round((data.statusBreakdown.inProgress / totalStatus) * 100) : 0;
    const resolvedPct = totalStatus ? Math.round((data.statusBreakdown.resolved / totalStatus) * 100) : 0;

    const formattedDate = new Intl.DateTimeFormat('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
    }).format(currentTime);

    return (
        <div className="dashboard-container officer-dashboard-root">
            {/* 1. Page Header */}
            <header className="dashboard-header">
                <div className="header-title-wrapper">
                    <h1>Officer Dashboard</h1>
                    <p>{data.department} | Operations Overview</p>
                </div>
                <div className="header-datetime officer-flex-between oo-header-datetime">
                    <span>{formattedDate}</span>
                </div>
            </header>

            {/* 1.5 SLA Monitoring Banner */}
            {slaData && (
                <div className="dashboard-panel panel-padding mb-4 oo-sla-panel" style={{ borderLeft: slaData.overdueCount > 0 ? '4px solid #ef4444' : '4px solid #10b981', background: slaData.overdueCount > 0 ? 'rgba(239, 68, 68, 0.05)' : 'rgba(15, 23, 42, 0.7)' }}>
                    <div className="officer-flex-between oo-sla-row">
                        <div>
                            <h2 className="panel-title oo-sla-title" style={{ color: slaData.overdueCount > 0 ? '#ef4444' : '#10b981' }}>
                                {slaData.overdueCount > 0 ? <i className="fas fa-exclamation-circle fa-beat-fade"></i> : <i className="fas fa-shield-check"></i>}
                                SLA Monitoring (&gt;{slaData.slaThresholdDays} Days)
                            </h2>
                            <p className="oo-sla-subtitle">Active Complaints Tracking & Overdue Detection</p>
                        </div>
                        <div className="oo-sla-metrics">
                            <div className="oo-sla-metric">
                                <p className="oo-sla-label">Total Active</p>
                                <h3 className="oo-sla-value">{slaData.totalActive}</h3>
                            </div>
                            <div className="oo-sla-metric oo-sla-overdue-wrap" style={{ background: slaData.overdueCount > 0 ? 'rgba(239, 68, 68, 0.1)' : 'transparent' }}>
                                <p className="oo-sla-label" style={{ color: slaData.overdueCount > 0 ? '#ef4444' : '#94a3b8' }}>Overdue Limit</p>
                                <h3 className="oo-sla-value oo-sla-overdue-value" style={{ color: slaData.overdueCount > 0 ? '#ef4444' : '#f8fafc' }}>{slaData.overdueCount}</h3>
                            </div>
                            <div className="oo-sla-metric">
                                <p className="oo-sla-label" style={{ color: slaData.highSeverityOverdue > 0 ? '#f87171' : '#94a3b8' }}>Critical Overdue</p>
                                <h3 className="oo-sla-value" style={{ color: slaData.highSeverityOverdue > 0 ? '#f87171' : '#f8fafc' }}>{slaData.highSeverityOverdue}</h3>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* 2. Top Summary Cards (KPIs) */}
            <div className="dashboard-grid-4">
                <SummaryCard title="Total Assigned" value={data.totalAssigned} icon="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                <SummaryCard title="Pending Review" value={data.pendingReview} icon="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" colorClass="text-amber-600" />
                <SummaryCard title="In Progress" value={data.inProgress} icon="M13 10V3L4 14h7v7l9-11h-7z" colorClass="text-blue-600" />
                <SummaryCard title="Resolved Today" value={data.resolvedToday} icon="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" colorClass="text-emerald-600" />
            </div>

            <div className="dashboard-grid-3 mt-4">

                {/* Left Panel: Field Worker Performance Snapshot */}
                <div className="dashboard-panel panel-padding col-span-1 lg-col-span-2">
                    <h2 className="panel-title">Field Worker Ground Operations</h2>
                    <div className="table-responsive">
                        <table className="dashboard-table">
                            <thead>
                                <tr>
                                    <th>Field Worker</th>
                                    <th>Active Tasks</th>
                                    <th>Completed Today</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.workerStats.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" className="oo-table-empty">
                                            No active field workers mapped to this department.
                                        </td>
                                    </tr>
                                ) : (
                                    data.workerStats.map((worker, idx) => (
                                        <tr key={idx}>
                                            <td className="td-text oo-td-strong">{worker.name}</td>
                                            <td><span className="badge-info status-badge oo-active-pill">{worker.activeTasks} Active</span></td>
                                            <td>{worker.completedToday}</td>
                                            <td className="td-time text-emerald-500">
                                                <i className="fas fa-circle oo-dot"></i> Active
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Right Panel: Department Workload Progress */}
                <div className="dashboard-panel panel-padding col-span-1 lg-col-span-1">
                    <h2 className="panel-title">Workload Resolution Rate</h2>
                    <div>
                        <ProgressBar label="Pending (Open)" percentage={openPct} count={data.statusBreakdown.open} colorClass="bg-amber-500" />
                        <ProgressBar label="In Progress" percentage={inProgressPct} count={data.statusBreakdown.inProgress} colorClass="bg-blue-500" />
                        <ProgressBar label="Resolved Pipeline" percentage={resolvedPct} count={data.statusBreakdown.resolved} colorClass="bg-emerald-500" />
                    </div>
                </div>
            </div>

            {/* Bottom Full Row: High Priority Complaints */}
            <div className="dashboard-grid-4 mt-4">
                <div className="dashboard-panel col-span-1 lg-col-span-4">
                    <div className="table-header oo-table-header">
                        <h2 className="oo-priority-title">
                            <i className="fas fa-exclamation-triangle"></i> Action Required: High Priority Open Incidents
                        </h2>
                    </div>
                    <div className="table-responsive">
                        <table className="dashboard-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Category</th>
                                    <th>Location</th>
                                    <th>Assigned Worker</th>
                                    <th>Status</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.highPriority.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="oo-table-empty-large">
                                            <i className="fas fa-check-circle oo-empty-icon"></i>
                                            No critical high-priority tasks pending in queue.
                                        </td>
                                    </tr>
                                ) : (
                                    data.highPriority.map((item, idx) => (
                                        <tr key={idx}>
                                            <td className="td-id">{item.complaintRef}</td>
                                            <td className="td-text">{item.category}</td>
                                            <td className="td-text td-truncate" title={item.location}>{item.location}</td>
                                            <td className="td-text">{item.assignedWorker}</td>
                                            <td>
                                                <StatusBadge status={item.status} />
                                            </td>
                                            <td>
                                                <button
                                                    className="btn btn-sm oo-triage-btn"
                                                    onClick={() => navigate(`/officer/complaint/${item.id}`)}
                                                >
                                                    Triage
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

/* --- Minimalist Reusable Components --- */

function SummaryCard({ title, value, icon, colorClass = "text-slate-700" }) {
    return (
        <div className="summary-card oo-summary-card">
            <div className="card-content-wrapper">
                <div className="card-text">
                    <p className="oo-summary-label">{title}</p>
                    <h3 className={`${colorClass} oo-summary-value`}>{typeof value === 'number' ? value.toLocaleString() : value}</h3>
                </div>
                <div className={`card-icon ${colorClass} oo-summary-icon-wrap`}>
                    <svg className="icon-svg oo-summary-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={icon} />
                    </svg>
                </div>
            </div>
        </div>
    );
}

function ProgressBar({ label, percentage, count, colorClass }) {
    return (
        <div className="progress-container oo-progress-container">
            <div className="progress-header officer-flex-between oo-progress-header">
                <span className="progress-label">{label}</span>
                <div className="progress-values">
                    <span className="progress-pct oo-progress-pct">{percentage}% </span>
                    <span className="progress-count oo-progress-count">({count})</span>
                </div>
            </div>
            <div className="progress-track oo-progress-track">
                <div className={`progress-fill ${colorClass} oo-progress-fill`} style={{ width: `${percentage}%` }}></div>
            </div>
        </div>
    );
}

function StatusBadge({ status }) {
    let colors = "badge-default";
    const normalizedStatus = normalizeStatus(status);

    switch (normalizedStatus) {
        case 'REPORTED':
            colors = "badge-warning";
            break;
        case 'ASSIGNED':
        case 'IN_PROGRESS':
            colors = "badge-info";
            break;
        case 'VERIFICATION_PENDING':
            colors = "badge-warning";
            break;
        case 'RESOLVED':
            colors = "badge-success";
            break;
        case 'REJECTED':
            colors = "badge-danger";
            break;
        default:
            colors = "badge-warning";
    }

    return (
        <span className={`status-badge ${colors} oo-status-badge`}>
            {getStatusLabel(normalizedStatus || status || 'REPORTED')}
        </span>
    );
}

function DashboardSkeleton() {
    return (
        <div className="skeleton-container oo-skeleton-wrap">
            <div className="skel-elem skel-h oo-skel-h"></div>
            <div className="skel-elem skel-sub oo-skel-sub"></div>
            <div className="dashboard-grid-4">
                {[1, 2, 3, 4].map(i => <div key={i} className="skel-elem skel-card oo-skel-card"></div>)}
            </div>
        </div>
    );
}

function ErrorFallback({ message }) {
    return (
        <div className="error-container oo-error-wrap">
            <div className="error-card oo-error-card">
                <i className="fas fa-exclamation-triangle oo-error-icon"></i>
                <h3 className="oo-error-title">System Error</h3>
                <p className="oo-error-message">{message}</p>
                <button onClick={() => window.location.reload()} className="oo-error-btn">
                    Retry Connection
                </button>
            </div>
        </div>
    );
}

export default OfficerOverview;
