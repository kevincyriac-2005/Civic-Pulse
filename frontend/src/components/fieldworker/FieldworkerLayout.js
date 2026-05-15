import React from 'react';
import './FieldworkerDashboard.css';
import './FieldworkerLayout.css';
import '../../styles/fieldworker-variables.css';
import '../../styles/FieldworkerUtilities.css';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';

const FieldworkerLayout = () => {
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('user')) || { name: 'Fieldworker', role: 'fieldworker' };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
    };

    return (
        <div className="fieldworker-page fieldworker-theme">
            {/* Sidebar */}
            <aside className="fieldworker-sidebar">
                <div className="fieldworker-logo">
                    <i className="fas fa-building-columns"></i>
                    Civic-Pulse
                </div>

                <nav>
                    <NavLink to="/fieldworker" end className={({ isActive }) => isActive ? "fieldworker-nav-item active" : "fieldworker-nav-item"}>
                        <i className="fas fa-home"></i>
                        Dashboard
                    </NavLink>
                    <NavLink to="/fieldworker/tasks" className={({ isActive }) => isActive ? "fieldworker-nav-item active" : "fieldworker-nav-item"}>
                        <i className="fas fa-tasks"></i>
                        My Tasks
                    </NavLink>
                    <NavLink to="/fieldworker/history" className={({ isActive }) => isActive ? "fieldworker-nav-item active" : "fieldworker-nav-item"}>
                        <i className="fas fa-history"></i>
                        Task History
                    </NavLink>
                    <NavLink to="/fieldworker/summary" className={({ isActive }) => isActive ? "fieldworker-nav-item active" : "fieldworker-nav-item"}>
                        <i className="fas fa-chart-pie"></i>
                        Work Summary
                    </NavLink>
                    <NavLink to="/fieldworker/profile" className={({ isActive }) => isActive ? "fieldworker-nav-item active" : "fieldworker-nav-item"}>
                        <i className="fas fa-user-circle"></i>
                        Profile
                    </NavLink>
                    <div className="fieldworker-nav-item fieldworker-nav-item-logout" onClick={handleLogout}>
                        <i className="fas fa-sign-out-alt"></i>
                        Logout
                    </div>
                </nav>
            </aside>

            {/* Main Content */}
            <main className="fieldworker-content">
                <header className="fieldworker-header">
                    <h1>Welcome, {user.name}</h1>
                    <p>Track and resolve assigned field tasks.</p>
                </header>

                <div className="fieldworker-grid-container">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default FieldworkerLayout;
