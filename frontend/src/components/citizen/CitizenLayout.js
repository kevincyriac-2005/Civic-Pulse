import React, { useEffect, useState } from 'react';
import '../../styles/citizen-variables.css';
import '../../styles/CitizenUtilities.css';
import './CitizenDashboard.css';
import './CitizenLayout.css';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import config from '../../config';

const CitizenLayout = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')) || { name: 'Citizen', role: 'citizen' });

    useEffect(() => {
        const loadProfileIfNeeded = async () => {
            if (user && user.name) return; // already have name

            const token = localStorage.getItem('token');
            if (!token) return;

            try {
                const res = await fetch(`${config.API_BASE_URL}/citizens/me`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await res.json();
                if (data && data.success && data.user) {
                    setUser(data.user);
                    localStorage.setItem('user', JSON.stringify(data.user));
                }
            } catch (err) {
                console.error('Failed to load profile for header:', err);
            }
        };

        loadProfileIfNeeded();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
    };

    return (
        <div className="citizen-page">
            {/* Sidebar */}
            <aside className="citizen-sidebar">
                <div className="citizen-logo">
                    <i className="fas fa-building-columns"></i>
                    Civic-Pulse
                </div>

                <nav>
                    <NavLink to="/citizen" end className={({ isActive }) => isActive ? "citizen-nav-item active" : "citizen-nav-item"}>
                        <i className="fas fa-plus-circle"></i>
                        Report Issue
                    </NavLink>
                    <NavLink to="/citizen/history" className={({ isActive }) => isActive ? "citizen-nav-item active" : "citizen-nav-item"}>
                        <i className="fas fa-history"></i>
                        My Complaints
                    </NavLink>
                    <NavLink to="/citizen/map" className={({ isActive }) => isActive ? "citizen-nav-item active" : "citizen-nav-item"}>
                        <i className="fas fa-map-marked-alt"></i>
                        Complaint Map
                    </NavLink>
                    <NavLink to="/citizen/profile" className={({ isActive }) => isActive ? "citizen-nav-item active" : "citizen-nav-item"}>
                        <i className="fas fa-user-circle"></i>
                        Profile
                    </NavLink>
                    <div className="citizen-nav-item cl-logout-item" onClick={handleLogout}>
                        <i className="fas fa-sign-out-alt"></i>
                        Logout
                    </div>
                </nav>
            </aside>

            {/* Main Content */}
            <main className="citizen-content">
                <header className="citizen-header">
                    <h1>Welcome, {user.name}</h1>
                    <p>Track and report civic issues in your area.</p>
                </header>

                <div className="citizen-grid-container">
                    {/* This container needs to be handled by CSS grid in layout now, or just let Outlet handle it */}
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default CitizenLayout;
