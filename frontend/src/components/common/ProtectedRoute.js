import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

/**
 * ProtectedRoute Component
 * This is a clean wrapper to secure React Router routes based on user roles.
 * It checks if a user is logged in, validates JSON integrity, and verifies their role.
 * 
 * @param {Array} allowedRoles - An array of roles (strings) permitted to access the route.
 */
const ProtectedRoute = ({ allowedRoles }) => {
    let user = null;

    // 1. Defensively parse localStorage data to prevent JSON errors from crashing the app
    try {
        const userString = localStorage.getItem('user');
        if (userString) {
            user = JSON.parse(userString);
        }
    } catch (error) {
        console.error("Local storage token is corrupted. Clearing user scope.", error);
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        // Fallthrough: 'user' remains null, leading to login redirection
    }

    // 2. Not Authenticated? Redirect to Login instantly.
    // Replace=true ensures the user can't hit the back button to bypass login.
    const token = localStorage.getItem('token');
    if (!user || !token) {
        return <Navigate to="/login" replace />;
    }

    // 3. Authenticated but Authorization check:
    // Ensure the user actually has a defined role AND that role is included in our allowed roles map.
    if (!user.role || !allowedRoles.includes(user.role)) {
        return <Navigate to="/unauthorized" replace />;
    }

    // 4. Role validated! Let React Router render the nested children inside this wrapper.
    return <Outlet />;
};

export default ProtectedRoute;
