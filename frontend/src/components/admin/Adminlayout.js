import React, { useState, useEffect } from 'react';
import '../../styles/admin-variables.css';
import '../../styles/AdminUtilities.css';
import './AdminDashboard.css';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import config from '../../config';

const AdminDashboard = () => {
  const [showComplaintsMenu, setShowComplaintsMenu] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [adminProfile, setAdminProfile] = useState({
    firstName: 'Admin',
    lastName: 'User',
    username: ''
  });
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const res = await axios.get(
          `${config.API_BASE_URL}/admin/profile`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setAdminProfile(res.data);
      } catch (err) {
        console.warn('[AdminLayout] Could not load admin profile');
      }
    };
    fetchProfile();
  }, []);

  const initials = [
    adminProfile.firstName?.[0] || 'A',
    adminProfile.lastName?.[0]  || 'D'
  ].join('').toUpperCase();

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/admin') return 'Dashboard Overview';
    if (path.includes('/admin/complaints')) return 'Complaint Management';
    if (path.includes('/admin/citizens')) return 'Citizen Database';
    if (path.includes('/admin/employees')) return 'Employee Directory';
    if (path.includes('/admin/categories')) return 'Category Config';
    if (path.includes('/admin/departments')) return 'Department Operations';
    if (path.includes('/admin/analytics')) return 'System Analytics';
    if (path.includes('/admin/map')) return 'Live Intelligence Map';
    if (path.includes('/admin/settings')) return 'System Settings';
    return 'Admin Control Panel';
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    navigate('/login');
  };

  return (
    <div className="admin-dashboard admin-theme">
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div className="sidebar-header">
          <a href="/" className="sidebar-brand">
            <i className="fas fa-satellite-dish"></i>
            <span>Civic-Pulse Admin</span>
          </a>
        </div>

        <nav className="sidebar-nav">
          <NavLink to="/admin" end className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
            <i className="fas fa-th-large"></i>
            <span>Dashboard</span>
          </NavLink>
          {/* Complaints Submenu */}
          <div className="nav-item-group">
            <div
              className={`nav-item nav-item-trigger ${showComplaintsMenu ? 'active' : ''}`}
              onClick={() => setShowComplaintsMenu(!showComplaintsMenu)}
            >
              <div className="nav-item-inner">
                <i className="fas fa-exclamation-circle"></i>
                <span>Complaints</span>
              </div>
              <i className={`fas fa-chevron-${showComplaintsMenu ? 'down' : 'right'} nav-item-chevron`}></i>
            </div>

            {showComplaintsMenu && (
              <div className="sidebar-submenu">
                <NavLink to="/admin/complaints" end className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
                  <i className="fas fa-list"></i>
                  <span>All Complaints</span>
                </NavLink>
              </div>
            )}
          </div>

          <NavLink to="/admin/citizens" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
            <i className="fas fa-users"></i>
            <span>Citizen Management</span>
          </NavLink>

          <NavLink to="/admin/employees" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
            <i className="fas fa-user-tie"></i>
            <span>Employee Management</span>
          </NavLink>

          <NavLink to="/admin/categories" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
            <i className="fas fa-list-alt"></i>
            <span>Category Management</span>
          </NavLink>
          <NavLink to="/admin/departments" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
            <i className="fas fa-building"></i>
            <span>Departments</span>
          </NavLink>

          <NavLink to="/admin/analytics" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
            <i className="fas fa-chart-line"></i>
            <span>Analytics</span>
          </NavLink>
          <NavLink to="/admin/map" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
            <i className="fas fa-map-marked-alt"></i>
            <span>Live Map</span>
          </NavLink>
          <NavLink to="/admin/settings" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
            <i className="fas fa-cog"></i>
            <span>Settings</span>
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <div
            className="user-profile profile-trigger"
            onClick={() => setShowProfileMenu(!showProfileMenu)}
          >
            <div className="avatar">{initials}</div>
            <div className="user-info">
              <h6>{adminProfile.firstName} {adminProfile.lastName}</h6>
              <span>{adminProfile.usertype ? adminProfile.usertype.charAt(0).toUpperCase() + adminProfile.usertype.slice(1) : 'Admin'}</span>
            </div>
            <i className={`fas fa-chevron-${showProfileMenu ? 'up' : 'down'} nav-item-chevron`}></i>

            {showProfileMenu && (
              <div className="profile-dropdown">
                <button
                  onClick={() => {
                    navigate('/admin/profile');
                    setShowProfileMenu(false);
                  }}
                  className="dropdown-btn"
                >
                  <i className="fas fa-user"></i>
                  <span>My Profile</span>
                </button>
                <button
                  onClick={handleLogout}
                  className="dropdown-btn dropdown-btn--danger"
                >
                  <i className="fas fa-sign-out-alt"></i>
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="admin-main">
        {/* Top Header */}
        <header className="admin-header">
          <div className="header-title">
            <h2>{getPageTitle()}</h2>
          </div>

          <div className="header-actions">
            <div className="search-bar">
              <i className="fas fa-search"></i>
              <input type="text" placeholder="Search incidents, users..." />
            </div>

            <button className="icon-btn">
              <i className="fas fa-bell"></i>
              <span className="badge-dot"></span>
            </button>
            <button className="icon-btn">
              <i className="fas fa-envelope"></i>
            </button>
          </div>
        </header>

        {/* Dashboard Content - Rendered by child routes */}
        <Outlet />
      </main>
    </div>
  );
};

export default AdminDashboard;
