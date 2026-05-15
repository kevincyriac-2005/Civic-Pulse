import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Navigate, useNavigate } from 'react-router-dom';
import config from '../../config';
import '../../styles/officer-variables.css';
import '../../styles/OfficerUtilities.css';
import './OfficerOverview.css';
import './OfficerProfile.css';

const StatCard = ({ title, value, unit, icon, colorClass = "text-slate-200" }) => (
    <div className="dashboard-panel op-stat-card">
        <p className="op-stat-title">{title}</p>
        <div className="op-stat-value-row">
            <h3 className={`${colorClass} op-stat-value`}>
                {typeof value === 'number' ? value.toLocaleString() : value}
            </h3>
            {unit && <span className="op-stat-unit">{unit}</span>}
        </div>
        <div className="op-stat-icon-wrap">
            <i className={`fas ${icon} op-stat-icon`}></i>
        </div>
    </div>
);

const ActionBadge = ({ actionType }) => {
    let icon = "fa-circle";
    let label = actionType;

    switch (actionType) {
        case 'COMPLAINT_ASSIGNED':
        case 'COMPLAINT_REASSIGNED':
            icon = "fa-user-check";
            label = "Assigned";
            break;
        case 'STATUS_UPDATED':
            icon = "fa-sync-alt";
            label = "Status Update";
            break;
        case 'COMPLAINT_RESOLVED':
            icon = "fa-check-double";
            label = "Resolved";
            break;
        case 'HAZARD_FLAGGED':
            icon = "fa-flag";
            label = "Safety Flag";
            break;
        default:
            icon = "fa-info-circle";
    }

    return (
        <span className={`status-badge-profile op-action-badge`}>
            <i className={`fas ${icon}`}></i> {label}
        </span>
    );
};

const OfficerProfile = () => {
    const [profileData, setProfileData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Edit State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [editForm, setEditForm] = useState({ name: '', phone: '' });
    const [passwordForm, setPasswordForm] = useState({ password: '', confirmPassword: '' });
    const [updateStatus, setUpdateStatus] = useState({ loading: false, error: null, success: null });

    const navigate = useNavigate();

    useEffect(() => {
        const fetchProfileData = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) throw new Error('No authentication token found.');

                const response = await axios.get(`${config.API_BASE_URL}/officers/me`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                if (response.data.success) {
                    setProfileData(response.data.user);
                } else {
                    throw new Error("Failed to load profile.");
                }
                setLoading(false);
            } catch (err) {
                console.error("Profile fetch error:", err);
                setError(err.response?.data?.message || err.message || "Failed to load profile.");
                setLoading(false);
            }
        };

        fetchProfileData();
    }, []);

    // Form Handlers
    const handleEditSubmit = async (e) => {
        e.preventDefault();
        setUpdateStatus({ loading: true, error: null, success: null });
        try {
            const token = localStorage.getItem('token');
            const response = await axios.put(`${config.API_BASE_URL}/officers/me`, editForm, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.success) {
                setUpdateStatus({ loading: false, error: null, success: "Profile updated successfully!" });
                setProfileData(prev => ({ ...prev, name: editForm.name || prev.name, phone: editForm.phone || prev.phone }));
                setTimeout(() => {
                    setIsEditModalOpen(false);
                    setUpdateStatus({ loading: false, error: null, success: null });
                }, 1500);

                // Update local storage name if present
                try {
                    const userObj = JSON.parse(localStorage.getItem('user'));
                    if (userObj) {
                        userObj.name = editForm.name || userObj.name;
                        localStorage.setItem('user', JSON.stringify(userObj));
                    }
                } catch (e) {
                    console.error("Local storage update parse error:", e);
                }
            }
        } catch (err) {
            setUpdateStatus({ loading: false, error: err.response?.data?.message || err.message || "Failed to update profile", success: null });
        }
    };

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        setUpdateStatus({ loading: true, error: null, success: null });

        if (passwordForm.password !== passwordForm.confirmPassword) {
            return setUpdateStatus({ loading: false, error: "Passwords do not match", success: null });
        }
        if (passwordForm.password.length < 6) {
            return setUpdateStatus({ loading: false, error: "Password must be at least 6 characters", success: null });
        }

        try {
            const token = localStorage.getItem('token');
            const response = await axios.put(`${config.API_BASE_URL}/officers/me`, { password: passwordForm.password }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.success) {
                setUpdateStatus({ loading: false, error: null, success: "Password updated successfully!" });
                setPasswordForm({ password: '', confirmPassword: '' });
                setTimeout(() => {
                    setIsPasswordModalOpen(false);
                    setUpdateStatus({ loading: false, error: null, success: null });
                }, 1500);
            }
        } catch (err) {
            setUpdateStatus({ loading: false, error: err.response?.data?.message || err.message || "Failed to update password", success: null });
        }
    };

    const openEditModal = () => {
        setEditForm({ name: profileData.name || '', phone: profileData.phone || '' });
        setIsEditModalOpen(true);
        setUpdateStatus({ loading: false, error: null, success: null });
    };

    const openPasswordModal = () => {
        setPasswordForm({ password: '', confirmPassword: '' });
        setIsPasswordModalOpen(true);
        setUpdateStatus({ loading: false, error: null, success: null });
    };

    const userStr = localStorage.getItem('user');
    let userRole = null;
    try {
        userRole = userStr ? JSON.parse(userStr).role : null;
    } catch (e) {
        console.error("Local storage load parse error:", e);
    }

    if (userRole && userRole !== 'officer' && userRole !== 'admin') {
        return <Navigate to="/unauthorized" replace />;
    }

    if (loading) {
        return (
            <div className="dashboard-container">
                <div className="op-loading-wrap">
                    <div className="spinner op-loading-spinner">Loading Identity...</div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="dashboard-container">
                <div className="op-error-box">
                    <i className="fas fa-exclamation-triangle op-error-icon"></i>
                    <h3>Error Loading Profile</h3>
                    <p>{error}</p>
                </div>
            </div>
        );
    }

    if (!profileData) return null;

    return (
        <div className="dashboard-container officer-dashboard-root animate-fade-up">
            <header className="dashboard-header mb-4">
                <div className="header-title-wrapper">
                    <h1>Identity & Credentials</h1>
                    <p>Department Supervisor Clearance</p>
                </div>
            </header>

            <div className="dashboard-grid-4 mb-4">
                {/* 1. Profile Header Section (Identity Card) spans 2 cols */}
                <div className="dashboard-panel col-span-1 lg-col-span-2 op-id-card">
                    <div className="officer-flex-between op-id-row">
                        <div className="op-id-left">
                            <div className="op-id-avatar">
                                {profileData.name ? profileData.name.charAt(0).toUpperCase() : '?'}
                            </div>
                            <div>
                                <h2 className="op-id-name">{profileData.name}</h2>
                                <p className="op-id-email">{profileData.email}</p>
                                <span className="op-id-role-badge">
                                    Department Supervisor
                                </span>
                            </div>
                        </div>
                        <div className="op-id-actions">
                            <button onClick={openEditModal} className="form-submit-btn op-ghost-btn op-inline-btn">
                                <i className="fas fa-edit"></i> Edit Profile
                            </button>
                        </div>
                    </div>
                </div>

                {/* 2. Department Information Section spans 2 cols */}
                <div className="dashboard-panel col-span-1 lg-col-span-2 op-assignment-card">
                    <h3 className="op-section-title">Assignment Details</h3>
                    <div className="op-assignment-grid">
                        <div>
                            <p className="op-k-label">Officer ID</p>
                            <p className="op-k-value op-k-mono">{profileData.officerId}</p>
                        </div>
                        <div>
                            <p className="op-k-label">Department</p>
                            <p className="op-k-value">{profileData.department}</p>
                        </div>
                        <div>
                            <p className="op-k-label">Assigned Region</p>
                            <p className="op-k-value">{profileData.region}</p>
                        </div>
                        <div>
                            <p className="op-k-label">Joining Date</p>
                            <p className="op-k-value">
                                {profileData.joiningDate && !isNaN(new Date(profileData.joiningDate))
                                    ? new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(profileData.joiningDate))
                                    : 'Not Available'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* 3. Performance Snapshot Section */}
            <h3 className="op-snapshot-title">Performance Snapshot</h3>
            <div className="dashboard-grid-4 mb-4">
                <StatCard
                    title="Avg Resolution"
                    value={profileData.performanceStats?.avgResolutionTime || 0}
                    unit="hrs"
                    icon="fa-clock"
                    colorClass="text-blue-400"
                />
                <StatCard
                    title="Closure Rate"
                    value={profileData.performanceStats?.closureRate || 0}
                    unit="%"
                    icon="fa-chart-pie"
                    colorClass="text-emerald-400"
                />
                <StatCard
                    title="Overdue Cases"
                    value={profileData.performanceStats?.overdueCount || 0}
                    icon="fa-exclamation-circle"
                    colorClass={(profileData.performanceStats?.overdueCount || 0) > 0 ? "text-red-400" : "text-slate-300"}
                />
                <StatCard
                    title="Total Resolved"
                    value={profileData.performanceStats?.totalResolved || 0}
                    icon="fa-check-double"
                    colorClass="text-slate-200"
                />
            </div>

            <div className="dashboard-grid-4 mb-4">
                {/* 4. Recent Activity Section */}
                <div className="dashboard-panel col-span-1 lg-col-span-3">
                    <div className="table-header op-table-header">
                        <h2 className="op-table-title">
                            <i className="fas fa-list-ul op-table-title-icon"></i> Recent Operations Log
                        </h2>
                    </div>
                    <div className="table-responsive">
                        <table className="dashboard-table op-table-full">
                            <tbody>
                                {(profileData.recentActivity || []).length === 0 ? (
                                    <tr>
                                        <td colSpan="3" className="op-table-empty">No recent activity found.</td>
                                    </tr>
                                ) : (
                                    (profileData.recentActivity || []).map(log => (
                                        <tr key={log.id}>
                                            <td className="op-cell-time">
                                                {log.timestamp && !isNaN(new Date(log.timestamp))
                                                    ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(log.timestamp))
                                                    : 'Just now'}
                                            </td>
                                            <td className="op-cell-id">#{log.complaintRef}</td>
                                            <td className="op-cell-action">
                                                <ActionBadge actionType={log.action} />
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    {(profileData.recentActivity || []).length > 0 && (
                        <div className="op-table-footer">
                            <button onClick={() => navigate('/officer/activity')} className="op-link-btn">View Full History &rarr;</button>
                        </div>
                    )}
                </div>

                {/* 5. Account Settings Section */}
                <div className="dashboard-panel col-span-1 flex flex-col op-settings-panel">
                    <h3 className="op-settings-title">Account Settings</h3>

                    <button onClick={openPasswordModal} className="form-submit-btn op-ghost-btn op-settings-btn">
                        <span><i className="fas fa-lock op-settings-icon"></i> Change Password</span>
                        <i className="fas fa-chevron-right op-chevron"></i>
                    </button>

                    <button onClick={openEditModal} className="form-submit-btn op-ghost-btn op-settings-btn">
                        <span><i className="fas fa-envelope op-settings-icon"></i> Contact Info</span>
                        <i className="fas fa-chevron-right op-chevron"></i>
                    </button>

                    <button
                        onClick={() => { localStorage.removeItem('token'); localStorage.removeItem('user'); navigate('/'); window.location.reload(); }}
                        className="form-submit-btn op-signout-btn">
                        <i className="fas fa-sign-out-alt op-signout-icon"></i> Sign Out
                    </button>
                </div>
            </div>

            {/* Edit Profile Modal */}
            {isEditModalOpen && (
                <div className="officer-modal-overlay op-modal-overlay">
                    <div className="dashboard-panel animate-fade-up op-modal-card">
                        <h2 className="op-modal-title">Edit Profile</h2>
                        <form onSubmit={handleEditSubmit}>
                            <div className="op-modal-field">
                                <label className="op-modal-label">Full Name</label>
                                <input
                                    type="text"
                                    className="op-modal-input"
                                    value={editForm.name}
                                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="op-modal-field op-modal-field-lg">
                                <label className="op-modal-label">Phone Number</label>
                                <input
                                    type="text"
                                    className="op-modal-input"
                                    value={editForm.phone}
                                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                                />
                            </div>

                            {updateStatus.error && <p className="op-msg-error">{updateStatus.error}</p>}
                            {updateStatus.success && <p className="op-msg-success">{updateStatus.success}</p>}

                            <div className="op-modal-actions">
                                <button type="button" onClick={() => setIsEditModalOpen(false)} className="op-btn-cancel">Cancel</button>
                                <button type="submit" disabled={updateStatus.loading} className="form-submit-btn op-btn-submit op-btn-primary">
                                    {updateStatus.loading ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Change Password Modal */}
            {isPasswordModalOpen && (
                <div className="officer-modal-overlay op-modal-overlay">
                    <div className="dashboard-panel animate-fade-up op-modal-card">
                        <h2 className="op-modal-title">Change Password</h2>
                        <form onSubmit={handlePasswordSubmit}>
                            <div className="op-modal-field">
                                <label className="op-modal-label">New Password</label>
                                <input
                                    type="password"
                                    className="op-modal-input"
                                    value={passwordForm.password}
                                    onChange={(e) => setPasswordForm({ ...passwordForm, password: e.target.value })}
                                    required
                                    minLength="6"
                                />
                            </div>
                            <div className="op-modal-field op-modal-field-lg">
                                <label className="op-modal-label">Confirm New Password</label>
                                <input
                                    type="password"
                                    className="op-modal-input"
                                    value={passwordForm.confirmPassword}
                                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                                    required
                                />
                            </div>

                            {updateStatus.error && <p className="op-msg-error">{updateStatus.error}</p>}
                            {updateStatus.success && <p className="op-msg-success">{updateStatus.success}</p>}

                            <div className="op-modal-actions">
                                <button type="button" onClick={() => setIsPasswordModalOpen(false)} className="op-btn-cancel">Cancel</button>
                                <button type="submit" disabled={updateStatus.loading} className="form-submit-btn op-btn-submit op-btn-warning">
                                    {updateStatus.loading ? 'Updating...' : 'Update Password'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
};

export default OfficerProfile;
