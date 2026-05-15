import React, { useState } from 'react';
import './officerDashboard.css';
import '../../styles/officer-variables.css';
import '../../styles/OfficerUtilities.css';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';

const OfficerLayout = () => {
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('user')) || { name: 'Officer', role: 'officer' };
    const [showComplaintsMenu, setShowComplaintsMenu] = useState(true); // Default open

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
    };

    return (
        <div className="officer-page officer-theme">
            {/* Sidebar */}
            <aside className="officer-sidebar">
                <div className="officer-logo">
                    <i className="fas fa-building-columns"></i>
                    Civic-Pulse
                </div>

                <nav>
                    <NavLink to="/officer" end className={({ isActive }) => isActive ? "officer-nav-item active" : "officer-nav-item"}>
                        <i className="fas fa-home"></i>
                        Dashboard
                    </NavLink>
                    {/* Collapsible Complaints Menu */}
                    <div className="officer-nav-group">
                        <div
                            className={`officer-nav-item ${showComplaintsMenu ? 'active' : ''}`}
                            onClick={() => setShowComplaintsMenu(!showComplaintsMenu)}
                            
                        >
                            <div className="officer-nav-item-inner">
                                <i className="fas fa-list"></i>
                                <span>Complaints</span>
                            </div>
                            <i className={`fas fa-chevron-${showComplaintsMenu ? 'down' : 'right'} officer-nav-chevron`}></i>
                        </div>

                        {showComplaintsMenu && (
                            <div className="officer-submenu">
                                <NavLink to="/officer/complaints" end className={({ isActive }) => isActive ? "officer-nav-item active" : "officer-nav-item"}>
                                    <i className="fas fa-layer-group officer-submenu-icon"></i>
                                    <span>All Complaints</span>
                                </NavLink>
                                <NavLink to="/officer/complaints/pending" className={({ isActive }) => isActive ? "officer-nav-item active" : "officer-nav-item"}>
                                    <i className="fas fa-clock officer-submenu-icon"></i>
                                    <span>Pending</span>
                                </NavLink>
                                <NavLink to="/officer/complaints/assigned" className={({ isActive }) => isActive ? "officer-nav-item active" : "officer-nav-item"}>
                                    <i className="fas fa-user-check officer-submenu-icon"></i>
                                    <span>Assigned</span>
                                </NavLink>
                                <NavLink to="/officer/complaints/inprogress" className={({ isActive }) => isActive ? "officer-nav-item active" : "officer-nav-item"}>
                                    <i className="fas fa-spinner officer-submenu-icon"></i>
                                    <span>In Progress</span>
                                </NavLink>
                                <NavLink to="/officer/complaints/review" className={({ isActive }) => isActive ? "officer-nav-item active" : "officer-nav-item"}>
                                    <i className="fas fa-clipboard-check officer-submenu-icon"></i>
                                    <span>Pending Review</span>
                                </NavLink>
                                <NavLink to="/officer/complaints/resolved" className={({ isActive }) => isActive ? "officer-nav-item active" : "officer-nav-item"}>
                                    <i className="fas fa-check-circle officer-submenu-icon"></i>
                                    <span>Resolved</span>
                                </NavLink>
                            </div>
                        )}
                    </div>
                    <NavLink to="/officer/team" className={({ isActive }) => isActive ? "officer-nav-item active" : "officer-nav-item"}>
                        <i className="fas fa-users"></i>
                        My Team
                    </NavLink>
                    <NavLink to="/officer/analytics" className={({ isActive }) => isActive ? "officer-nav-item active" : "officer-nav-item"}>
                        <i className="fas fa-chart-line"></i>
                        Analytics
                    </NavLink>
                    <NavLink to="/officer/reports" className={({ isActive }) => isActive ? "officer-nav-item active" : "officer-nav-item"}>
                        <i className="fas fa-file-export"></i>
                        Reports
                    </NavLink>
                    <NavLink to="/officer/activity" className={({ isActive }) => isActive ? "officer-nav-item active" : "officer-nav-item"}>
                        <i className="fas fa-history"></i>
                        Activity Log
                    </NavLink>
                    <NavLink to="/officer/profile" className={({ isActive }) => isActive ? "officer-nav-item active" : "officer-nav-item"}>
                        <i className="fas fa-user-circle"></i>
                        Profile
                    </NavLink>
                    <div className="officer-nav-item officer-nav-item-logout" onClick={handleLogout}>
                        <i className="fas fa-sign-out-alt"></i>
                        Logout
                    </div>
                </nav>
            </aside>

            {/* Main Content */}
            <main className="officer-content">
                <header className="officer-header">
                    <h1>Welcome, {user.name}</h1>
                    <p>Manage and resolve civic issues in your area.</p>
                </header>

                <div className="officer-grid-container">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default OfficerLayout;
