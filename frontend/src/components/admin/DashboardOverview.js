import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Navigate } from 'react-router-dom';
import ExportModal from './ExportModal';
import { getStatusColor, getStatusLabel } from '../../utils/statusUtils';
import config from '../../config';
import '../../styles/admin-variables.css';
import '../../styles/AdminUtilities.css';
import './DashboardOverview.css';

const relativeTime = (dateStr) => {
    const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`;
    return `${Math.floor(diff / 86400)} day ago`;
};

const DashboardOverview = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [showExportModal, setShowExportModal] = useState(false);

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

                const res = await axios.get(`${config.API_BASE_URL}/admin/dashboard-summary`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                if (res.data.success) {
                    setData(res.data.data);
                } else {
                    throw new Error('Failed to load dashboard data.');
                }
            } catch (err) {
                console.error("Dashboard fetch error:", err);
                setError(err.response?.data?.message || err.message || "Failed to load dashboard data.");
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    // Role check
    const userRole = localStorage.getItem('role') || 'admin';
    if (userRole !== 'admin') {
        return <Navigate to="/unauthorized" replace />;
    }

    if (loading) return <DashboardSkeleton />;
    if (error) return <ErrorFallback message={error} />;
    if (!data) return null;

    // Calculate percentages for progress bars
    const total = data.totalComplaints || 1;
    const openPct = Math.round(((data.open || 0) / total) * 100);
    const inProgressPct = Math.round(((data.inProgress || 0) / total) * 100);
    const resolvedPct = Math.round(((data.resolved || 0) / total) * 100);

    // Format Date for Header
    const formattedDate = new Intl.DateTimeFormat('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
    }).format(currentTime);
    return (
        <div className="dashboard-container">

            {/* 1. Page Header */}
            <header className="dashboard-header">
                <div className="header-title-wrapper">
                    <h1>Dashboard Overview</h1>
                    <p>System-wide civic operations summary</p>
                </div>
                <div className="header-datetime admin-flex-between header-datetime-gap">
                    <span>{formattedDate}</span>

                    {/* Render Export Button Only for Admins */}
                    {userRole === 'admin' && (
                        <button
                            onClick={() => setShowExportModal(true)}
                            className="admin-export-btn"
                        >
                            <i className="fas fa-file-export"></i> Export Report
                        </button>
                    )}
                </div>
            </header>

            {/* Render the Export Modal */}
            <ExportModal show={showExportModal} onClose={() => setShowExportModal(false)} />

            {/* 2. Top Summary Cards */}
            <div className="dashboard-grid-4">
                <SummaryCard title="Total Complaints" value={data.totalComplaints} icon="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                <SummaryCard title="Open Complaints" value={data.open} icon="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" colorClass="text-amber-600" />
                <SummaryCard title="Resolved Complaints" value={data.resolved} icon="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" colorClass="text-emerald-600" />
                <SummaryCard title="Active Officers" value={data.activeOfficers} icon="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" colorClass="text-blue-600" />
            </div>

            <div className="dashboard-grid-3">

                {/* 3. Quick Insights - Status Distribution (Left) */}
                <div className="dashboard-panel panel-padding col-span-1 lg-col-span-1">
                    <h2 className="panel-title">Status Distribution</h2>

                    <div>
                        <ProgressBar label="Open" percentage={openPct} count={data.open} colorClass="bg-amber-500" />
                        <ProgressBar label="In Progress" percentage={inProgressPct} count={data.inProgress} colorClass="bg-blue-500" />
                        <ProgressBar label="Resolved" percentage={resolvedPct} count={data.resolved} colorClass="bg-emerald-500" />
                    </div>
                </div>

                {/* 3. Quick Insights - Department Load (Right) */}
                <div className="dashboard-panel panel-padding col-span-1 lg-col-span-2">
                    <h2 className="panel-title">Department Load</h2>
                    <div>
                        {data.departmentStats.map((dept, idx) => {
                            const maxCount = Math.max(...data.departmentStats.map(d => d.count));
                            const barWidth = Math.max(5, Math.round((dept.count / maxCount) * 100));

                            return (
                                <div key={idx} className="dept-row">
                                    <div className="dept-name" title={dept.name}>{dept.name}</div>
                                    <div className="dept-bar-wrapper">
                                        <div className="dept-bar-fill" style={{ width: `${barWidth}%` }}></div>
                                    </div>
                                    <div className="dept-count">{dept.count}</div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className="dashboard-grid-4">

                {/* 4. Recent Activity Section */}
                <div className="dashboard-panel col-span-1 lg-col-span-3">
                    <div className="table-header">
                        <h2>Recent Activity</h2>
                    </div>
                    <div className="table-responsive">
                        <table className="dashboard-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Category</th>
                                    <th>Location</th>
                                    <th>Status</th>
                                    <th>Time</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.recentComplaints.map((item, idx) => (
                                    <tr key={idx}>
                                        <td className="td-id">{item.id}</td>
                                        <td className="td-text">{item.category}</td>
                                        <td className="td-text td-truncate" title={item.location}>{item.location}</td>
                                        <td>
                                            <StatusBadge status={item.status} />
                                        </td>
                                        <td className="td-time">{relativeTime(item.createdTime)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* 5. System Health Indicator */}
                <div className="dashboard-panel panel-padding col-span-1 lg-col-span-1 health-panel">
                    <h2 className="panel-title panel-title-bordered">System Health</h2>

                    <div className="health-list">
                        <div className="health-item admin-flex-between">
                            <span className="health-label">API Status</span>
                            <div className="health-value-wrapper">
                                <span className={`status-dot ${data.systemHealth.apiStatus === 'online' ? 'bg-emerald-500 animate-pulse-dot' : 'bg-red-500'}`}></span>
                                <span className="health-value-text">{data.systemHealth.apiStatus}</span>
                            </div>
                        </div>

                        <div className="health-item admin-flex-between">
                            <span className="health-label">Database</span>
                            <span className="health-value-text text-success">Connected</span>
                        </div>

                        <div className="health-item admin-flex-between">
                            <span className="health-label">Total Users</span>
                            <span className="health-value-text">{(data.totalUsers || 0).toLocaleString()}</span>
                        </div>

                        <div className="health-item admin-flex-between">
                            <span className="health-label">Citizens</span>
                            <span className="health-value-text">{(data.totalCitizens || 0).toLocaleString()}</span>
                        </div>

                        <div className="health-item admin-flex-between">
                            <span className="health-label">Field Workers</span>
                            <span className="health-value-text">{(data.totalFieldWorkers || 0).toLocaleString()}</span>
                        </div>
                    </div>

                    <div className="health-footer">
                        Last Sync: {new Date(data.systemHealth.lastSync).toLocaleTimeString()}
                    </div>
                </div>

            </div>
        </div>
    );
};

/* --- Subcomponents for clean structure --- */

function SummaryCard({ title, value, icon, colorClass = "text-slate-700" }) {
    return (
        <div className="summary-card">
            <div className="card-content-wrapper">
                <div className="card-text">
                    <p>{title}</p>
                    <h3 className={colorClass}>{typeof value === 'number' ? value.toLocaleString() : value}</h3>
                </div>
                <div className={`card-icon ${colorClass}`}>
                    <svg className="icon-svg" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
                    </svg>
                </div>
            </div>
        </div>
    );
}

function ProgressBar({ label, percentage, count, colorClass }) {
    return (
        <div className="progress-container">
            <div className="progress-header admin-flex-between">
                <span className="progress-label">{label}</span>
                <div className="progress-values">
                    <span className="progress-pct">{percentage}%</span>
                    <span className="progress-count">({count})</span>
                </div>
            </div>
            <div className="progress-track">
                <div className={`progress-fill ${colorClass}`} style={{ width: `${percentage}%` }}></div>
            </div>
        </div>
    );
}

function StatusBadge({ status }) {
    return (
        <span
            className="status-badge admin-badge-sm"
            style={{ backgroundColor: getStatusColor(status), color: '#fff' }}
        >
            {getStatusLabel(status)}
        </span>
    );
}

function DashboardSkeleton() {
    return (
        <div className="skeleton-container">
            <div className="skel-elem skel-h"></div>
            <div className="skel-elem skel-sub"></div>

            <div className="dashboard-grid-4">
                {[1, 2, 3, 4].map(i => <div key={i} className="skel-elem skel-card"></div>)}
            </div>

            <div className="dashboard-grid-3">
                <div className="skel-elem skel-panel-tall col-span-1 lg-col-span-1"></div>
                <div className="skel-elem skel-panel-tall col-span-1 lg-col-span-2"></div>
            </div>

            <div className="skel-elem skel-panel-wide"></div>
        </div>
    );
}

function ErrorFallback({ message }) {
    return (
        <div className="error-container">
            <div className="error-card">
                <div className="error-icon-wrapper">
                    <svg className="error-svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                </div>
                <h3 className="error-title">System Error</h3>
                <p className="error-msg">{message}</p>
                <button onClick={() => window.location.reload()} className="error-btn">
                    Retry Connection
                </button>
            </div>
        </div>
    );
}

export default DashboardOverview;
