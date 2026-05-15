import React, { useState } from 'react';
import axios from 'axios';
import { Navigate } from 'react-router-dom';
import config from '../../config';
import { toast } from 'react-toastify';
import '../../styles/officer-variables.css';
import '../../styles/OfficerUtilities.css';
import './OfficerOverview.css';
import './OfficerReports.css';

const OfficerReports = () => {
    const [filters, setFilters] = useState({
        status: 'All',
        fromDate: '',
        toDate: '',
        format: 'csv'
    });
    const [isExporting, setIsExporting] = useState(false);

    // Strict Role Redirection
    const userStr = localStorage.getItem('user');
    const userObj = userStr ? JSON.parse(userStr) : null;
    const userRole = userObj ? (userObj.role || userObj.usertype) : null;

    if (userRole !== 'officer') {
        return <Navigate to="/unauthorized" replace />;
    }

    const handleFilterChange = (e) => {
        setFilters({ ...filters, [e.target.name]: e.target.value });
    };

    const handleGenerateReport = async (e) => {
        e.preventDefault();
        setIsExporting(true);

        try {
            const token = localStorage.getItem('token');
            if (!token) throw new Error("No authentication token found.");

            // Build query params
            const queryParams = new URLSearchParams();
            queryParams.append('format', filters.format);
            if (filters.status !== 'All') queryParams.append('status', filters.status);
            if (filters.fromDate) queryParams.append('fromDate', filters.fromDate);
            if (filters.toDate) queryParams.append('toDate', filters.toDate);

            const url = `${config.API_BASE_URL}/officers/reports?${queryParams.toString()}`;

            const response = await axios.get(url, {
                headers: { Authorization: `Bearer ${token}` },
                responseType: 'blob' // Critical to handle file generation
            });

            // Handle Blob download
            const blob = new Blob([response.data], {
                type: filters.format === 'csv' ? 'text/csv' : 'application/pdf'
            });
            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;

            // Extract filename from response headers or fallback
            const disposition = response.headers['content-disposition'];
            let filename = `Officer_Report_${Date.now()}.${filters.format}`;
            if (disposition && disposition.indexOf('filename=') !== -1) {
                const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
                const matches = filenameRegex.exec(disposition);
                if (matches != null && matches[1]) {
                    filename = matches[1].replace(/['"]/g, '');
                }
            }

            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.remove();

            toast.success(`${filters.format.toUpperCase()} Report generated successfully.`);

        } catch (err) {
            console.error("Export Error:", err);

            // Because responseType is 'blob', error responses are also blobs. We must read it.
            if (err.response && err.response.data && err.response.data.type === 'application/json') {
                const textData = await err.response.data.text();
                const errorObj = JSON.parse(textData);
                toast.error(errorObj.message || "Failed to generate report.");
            } else {
                toast.error("Failed to generate report. Please check your connection.");
            }
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="dashboard-container officer-dashboard-root">
            <header className="dashboard-header mb-4">
                <div className="header-title-wrapper">
                    <h1>Department Reports</h1>
                    <p>Secure Export Module</p>
                </div>
            </header>

            <div className="dashboard-grid-3">
                <div className="dashboard-panel panel-padding col-span-1 lg-col-span-2">
                    <h2 className="panel-title">Report Configuration</h2>

                    <form onSubmit={handleGenerateReport} className="or-form">

                        <div className="or-grid">
                            {/* Status Filter */}
                            <div className="form-group or-form-group">
                                <label className="or-label or-label-strong">Record Status</label>
                                <select
                                    name="status"
                                    value={filters.status}
                                    onChange={handleFilterChange}
                                    className="or-select"
                                >
                                    <option value="All">All Statuses</option>
                                    <option value="Pending">Pending</option>
                                    <option value="Assigned">Assigned</option>
                                    <option value="InProgress">In Progress</option>
                                    <option value="Resolved">Resolved</option>
                                </select>
                            </div>

                            {/* Export Format */}
                            <div className="form-group or-form-group">
                                <label className="or-label or-label-strong">Export Format</label>
                                <select
                                    name="format"
                                    value={filters.format}
                                    onChange={handleFilterChange}
                                    className="or-select"
                                >
                                    <option value="csv">Standard CSV File (.csv)</option>
                                    <option value="pdf">Structured PDF Table (.pdf)</option>
                                </select>
                            </div>
                        </div>

                        {/* Date Range */}
                        <div className="or-date-wrap or-grid">
                            <div className="form-group or-form-group">
                                <label className="or-label">From Date (Optional)</label>
                                <input
                                    type="date"
                                    name="fromDate"
                                    value={filters.fromDate}
                                    onChange={handleFilterChange}
                                    className="or-date-input"
                                />
                            </div>
                            <div className="form-group or-form-group">
                                <label className="or-label">To Date (Optional)</label>
                                <input
                                    type="date"
                                    name="toDate"
                                    value={filters.toDate}
                                    onChange={handleFilterChange}
                                    className="or-date-input"
                                />
                            </div>
                        </div>

                        <div className="or-submit-wrap">
                            <button
                                type="submit"
                                disabled={isExporting}
                                className="or-submit-btn"
                                style={{ background: isExporting ? '#475569' : '#3b82f6', cursor: isExporting ? 'not-allowed' : 'pointer' }}
                            >
                                {isExporting ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-download"></i>}
                                {isExporting ? 'Generating Document...' : `Generate ${filters.format.toUpperCase()} Report`}
                            </button>
                        </div>
                    </form>

                </div>

                {/* Info Panel side-card */}
                <div className="dashboard-panel panel-padding col-span-1">
                    <h2 className="panel-title">Security Notice</h2>
                    <div className="or-notice-box">
                        <p className="or-notice-text">
                            <i className="fas fa-shield-alt or-notice-icon"></i>
                            Your reporting profile is strictly sandboxed. You are only permitted to export incident records explicitly assigned to you or originating from your parent department umbrella.
                        </p>
                    </div>

                    <h3 className="or-columns-title">Included Columns:</h3>
                    <ul className="or-columns-list">
                        <li>Complaint ID Identifier</li>
                        <li>Incident Category</li>
                        <li>Live Status Code</li>
                        <li>Mapped Field Worker</li>
                        <li>Severity Ranking</li>
                        <li>Creation Timestamp</li>
                        <li>Resolution Timestamp</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default OfficerReports;
