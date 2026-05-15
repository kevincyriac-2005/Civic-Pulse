import React from 'react';
import { Link } from 'react-router-dom';
import './Unauthorized.css';

/**
 * Unauthorized Component
 * A simple, clean fallback UI displayed when an authenticated user attempts 
 * to visit a route restricted to another role (e.g. Citizen trying to hit /admin).
 */
const Unauthorized = () => {
    return (
        <div className="unauthorized-container">
            <div className="unauthorized-card">
                <div className="unauthorized-icon-wrapper">
                    {/* Security or alert icon. Standard FontAwesome used if available in project */}
                    <i className="fas fa-shield-halved unauthorized-icon"></i>
                </div>
                <h1 className="unauthorized-heading">403 - Access Denied</h1>
                <p className="unauthorized-text">
                    Oops! You do not have the necessary permissions to view this page.
                </p>
                <Link to="/" className="unauthorized-button">
                    Return to Dashboard
                </Link>
            </div>
        </div>
    );
};

export default Unauthorized;
