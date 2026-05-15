import React from 'react';
import './Loader.css';

/**
 * Reusable Loader Component
 * 
 * Purpose: Provides a standardized, non-blocking visual feedback mechanism 
 * during asynchronous operations (e.g., API calls, data fetching). 
 * 
 * UX Benefit: Prevents the UI from feeling "frozen" and explicitly informs 
 * the user of ongoing background processes.
 * 
 * @param {string} text - Optional text to display below the spinner.
 */
const Loader = ({ text = "Loading..." }) => {
    return (
        <div className="loader-container">
            <div className="loader-spinner"></div>
            <p className="loader-text">{text}</p>
        </div>
    );
};

export default Loader;
