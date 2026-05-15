import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import '../../styles/admin-variables.css';
import '../../styles/AdminUtilities.css';
import './ExportModal.css';

const ExportModal = ({ show, onClose }) => {
    const [status, setStatus] = useState('All');
    const [department, setDepartment] = useState('All');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [format, setFormat] = useState('csv');
    const [isExporting, setIsExporting] = useState(false);

    if (!show) return null;

    const handleExport = async (e) => {
        e.preventDefault();
        setIsExporting(true);

        try {
            const token = localStorage.getItem('token');
            const userStr = localStorage.getItem('user');
            const userObj = userStr ? JSON.parse(userStr) : null;
            const role = userObj ? (userObj.role || userObj.usertype) : null;

            if (role !== 'admin') {
                toast.error("Unauthorized: Export is restricted to Admin role.");
                setIsExporting(false);
                return;
            }

            // Construct Query String
            const queryParams = new URLSearchParams({ format });

            if (status !== 'All') queryParams.append('status', status);
            if (department !== 'All') queryParams.append('department', department);
            if (fromDate) queryParams.append('fromDate', fromDate);
            if (toDate) queryParams.append('toDate', toDate);

            // Fetch Blob Data
            const response = await axios.get(`http://localhost:5000/api/admin/export?${queryParams.toString()}`, {
                headers: { Authorization: `Bearer ${token}` },
                responseType: 'blob' // Critical for file downloads
            });

            // Create Download Link in Browser Memory
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;

            // Generate filename based on timestamp
            const timestamp = new Date().toISOString().split('T')[0];
            const extension = format === 'csv' ? 'csv' : 'pdf';
            link.setAttribute('download', `CivicPulse_Report_${timestamp}.${extension}`);

            // Trigger Download
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);

            toast.success("Report successfully exported!");
            onClose();

        } catch (error) {
            console.error("Export Error:", error);
            if (error.response && error.response.status === 404) {
                toast.warn("No complaints found for the selected filters.");
            } else if (error.response && error.response.status === 403) {
                toast.error("Access Denied. Admin privileges required.");
            } else {
                toast.error("Failed to generate report. Server might be busy.");
            }
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="em-overlay admin-modal-overlay">
            <div className="em-content">
                <div className="em-header admin-flex-between">
                    <h2>
                        <i className="fas fa-file-export em-header-icon"></i>
                        Export Complaint Report
                    </h2>
                    <button onClick={onClose} className="em-close-btn">
                        <i className="fas fa-times"></i>
                    </button>
                </div>

                <form onSubmit={handleExport} className="em-form">

                    <div className="form-group">
                        <label className="em-label">Status Filter</label>
                        <select
                            value={status} onChange={(e) => setStatus(e.target.value)}
                            className="em-select"
                        >
                            <option value="All">All Statuses</option>
                            <option value="Pending">Pending</option>
                            <option value="Assigned">Assigned</option>
                            <option value="InProgress">In Progress</option>
                            <option value="Resolved">Resolved</option>
                            <option value="Closed">Closed</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="em-label">Department Filter</label>
                        <select
                            value={department} onChange={(e) => setDepartment(e.target.value)}
                            className="em-select"
                        >
                            <option value="All">All Departments</option>
                            {/* Assuming Departments exist, we use open text for now or ideally fetch department map */}
                            <option value="Water Supply">Water Supply</option>
                            <option value="Roads and Transport">Roads and Transport</option>
                            <option value="Public Safety">Public Safety</option>
                            <option value="Sanitation">Sanitation</option>
                            <option value="Power">Power &amp; Electricity</option>
                            <option value="Healthcare">Healthcare</option>
                        </select>
                    </div>

                    <div className="em-date-row">
                        <div className="em-date-group form-group">
                            <label className="em-label">From Date</label>
                            <input
                                type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)}
                                className="em-date-input"
                            />
                        </div>
                        <div className="em-date-group form-group">
                            <label className="em-label">To Date</label>
                            <input
                                type="date" value={toDate} onChange={(e) => setToDate(e.target.value)}
                                min={fromDate}
                                className="em-date-input"
                            />
                        </div>
                    </div>

                    {/* Format Toggle */}
                    <div className="form-group">
                        <label className="em-label">Export Format</label>
                        <div className="em-format-row">
                            <label className={`em-format-label ${format === 'csv' ? 'em-format-label--active' : ''}`}>
                                <input type="radio" name="format" value="csv" checked={format === 'csv'} onChange={() => setFormat('csv')} />
                                <i className="fas fa-file-csv em-format-icon-csv"></i> CSV Spreadsheet
                            </label>
                            <label className={`em-format-label ${format === 'pdf' ? 'em-format-label--active' : ''}`}>
                                <input type="radio" name="format" value="pdf" checked={format === 'pdf'} onChange={() => setFormat('pdf')} />
                                <i className="fas fa-file-pdf em-format-icon-pdf"></i> PDF Document
                            </label>
                        </div>
                    </div>

                    <div className="em-footer">
                        <button type="button" onClick={onClose} className="em-btn-cancel">
                            Cancel
                        </button>
                        <button type="submit" disabled={isExporting} className="em-btn-submit">
                            {isExporting ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-download"></i>}
                            {isExporting ? 'Generating...' : 'Download Report'}
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );
};

export default ExportModal;
