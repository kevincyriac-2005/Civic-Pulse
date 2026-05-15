import React, { useState, useEffect } from 'react';
import '../../styles/admin-variables.css';
import './AdminSettings.css';

const AdminSettings = () => {
    const [notifications, setNotifications] = useState({
        newComplaintAlerts:       true,
        resolutionNotifications:  true,
        escalationAlerts:         true,
        dailySummaryReport:       false,
    });

    const [dataSettings, setDataSettings] = useState({
        exportFormat:       'PDF',
        retentionPeriod:    '90 days',
        complaintsPerPage:  '25',
        autoArchive:        false,
    });

    const [notifSaving, setNotifSaving]   = useState(false);
    const [dataSaving,  setDataSaving]    = useState(false);
    const [notifMsg,    setNotifMsg]      = useState(null);
    const [dataMsg,     setDataMsg]       = useState(null);

    /* ── Load from localStorage on mount ────────── */
    useEffect(() => {
        try {
            const savedNotif = localStorage.getItem('civic_pulse_notifications');
            if (savedNotif) setNotifications(prev => ({ ...prev, ...JSON.parse(savedNotif) }));

            const savedData = localStorage.getItem('civic_pulse_data_settings');
            if (savedData) setDataSettings(prev => ({ ...prev, ...JSON.parse(savedData) }));
        } catch (err) {
            console.warn('[AdminSettings] Could not load saved preferences');
        }
    }, []);

    const clearMsg = (setter, delay = 3000) =>
        setTimeout(() => setter(null), delay);

    /* ── Save notifications ─────────────────────── */
    const handleSaveNotifications = () => {
        setNotifSaving(true);
        setTimeout(() => {
            try {
                localStorage.setItem('civic_pulse_notifications', JSON.stringify(notifications));
                setNotifMsg({ type: 'success', text: 'Preferences saved.' });
            } catch {
                setNotifMsg({ type: 'error', text: 'Failed to save preferences.' });
            }
            setNotifSaving(false);
            clearMsg(setNotifMsg, 3000);
        }, 500);
    };

    /* ── Save data settings ─────────────────────── */
    const handleSaveDataSettings = () => {
        setDataSaving(true);
        setTimeout(() => {
            try {
                localStorage.setItem('civic_pulse_data_settings', JSON.stringify(dataSettings));
                setDataMsg({ type: 'success', text: 'Settings saved.' });
            } catch {
                setDataMsg({ type: 'error', text: 'Failed to save settings.' });
            }
            setDataSaving(false);
            clearMsg(setDataMsg, 3000);
        }, 500);
    };

    /* ── Render ─────────────────────────────────── */
    return (
        <div className="as-page">

            {/* Header */}
            <div className="as-header">
                <h1 className="as-page-title">System Settings</h1>
                <p className="as-subtitle">Platform configuration and preferences</p>
            </div>

            {/* Unified Settings Card */}
            <div className="as-card as-unified-card">
                <div className="as-settings-grid as-grid-unified">

                    {/* CARD 1 — Notification Preferences */}
                    <div className="as-section">
                    <h2 className="as-card-title">Notification Preferences</h2>

                    <div className="as-toggle-row">
                        <div className="as-toggle-info">
                            <span className="as-toggle-label">New Complaint Alerts</span>
                            <span className="as-toggle-desc">Receive alerts when new complaints are submitted</span>
                        </div>
                        <label className="as-toggle-switch">
                            <input
                                type="checkbox"
                                checked={notifications.newComplaintAlerts}
                                onChange={e => setNotifications(p => ({ ...p, newComplaintAlerts: e.target.checked }))}
                            />
                            <span className="as-toggle-slider" />
                        </label>
                    </div>

                    <div className="as-toggle-row">
                        <div className="as-toggle-info">
                            <span className="as-toggle-label">Resolution Notifications</span>
                            <span className="as-toggle-desc">Get notified when complaints are resolved</span>
                        </div>
                        <label className="as-toggle-switch">
                            <input
                                type="checkbox"
                                checked={notifications.resolutionNotifications}
                                onChange={e => setNotifications(p => ({ ...p, resolutionNotifications: e.target.checked }))}
                            />
                            <span className="as-toggle-slider" />
                        </label>
                    </div>

                    <div className="as-toggle-row">
                        <div className="as-toggle-info">
                            <span className="as-toggle-label">Escalation Alerts</span>
                            <span className="as-toggle-desc">Alert when complaints are flagged for review</span>
                        </div>
                        <label className="as-toggle-switch">
                            <input
                                type="checkbox"
                                checked={notifications.escalationAlerts}
                                onChange={e => setNotifications(p => ({ ...p, escalationAlerts: e.target.checked }))}
                            />
                            <span className="as-toggle-slider" />
                        </label>
                    </div>

                    <div className="as-toggle-row">
                        <div className="as-toggle-info">
                            <span className="as-toggle-label">Daily Summary Report</span>
                            <span className="as-toggle-desc">Receive daily analytics summary</span>
                        </div>
                        <label className="as-toggle-switch">
                            <input
                                type="checkbox"
                                checked={notifications.dailySummaryReport}
                                onChange={e => setNotifications(p => ({ ...p, dailySummaryReport: e.target.checked }))}
                            />
                            <span className="as-toggle-slider" />
                        </label>
                    </div>

                    <div className="as-form-action">
                        <button
                            className="as-btn-primary"
                            onClick={handleSaveNotifications}
                            disabled={notifSaving}
                        >
                            {notifSaving ? 'Saving…' : 'Save Preferences'}
                        </button>

                        {notifMsg && (
                            <div className={notifMsg.type === 'success' ? 'as-msg-success' : 'as-msg-error'}>
                                {notifMsg.text}
                            </div>
                        )}
                    </div>
                </div>

                    {/* CARD 2 — Data & Reports */}
                    <div className="as-section as-section-right">
                    <h2 className="as-card-title">Data &amp; Reports</h2>

                    <div className="as-field-row">
                        <label className="as-label" htmlFor="as-exportFormat">Default Export Format</label>
                        <select
                            id="as-exportFormat"
                            className="as-input as-select"
                            value={dataSettings.exportFormat}
                            onChange={e => setDataSettings(p => ({ ...p, exportFormat: e.target.value }))}
                        >
                            <option value="PDF">PDF</option>
                            <option value="CSV">CSV</option>
                            <option value="Excel">Excel</option>
                        </select>
                    </div>

                    <div className="as-field-row">
                        <label className="as-label" htmlFor="as-retention">Data Retention Period</label>
                        <select
                            id="as-retention"
                            className="as-input as-select"
                            value={dataSettings.retentionPeriod}
                            onChange={e => setDataSettings(p => ({ ...p, retentionPeriod: e.target.value }))}
                        >
                            <option value="30 days">30 days</option>
                            <option value="90 days">90 days</option>
                            <option value="180 days">180 days</option>
                            <option value="1 year">1 year</option>
                        </select>
                    </div>

                    <div className="as-field-row">
                        <label className="as-label" htmlFor="as-perPage">Complaints Per Page</label>
                        <select
                            id="as-perPage"
                            className="as-input as-select"
                            value={dataSettings.complaintsPerPage}
                            onChange={e => setDataSettings(p => ({ ...p, complaintsPerPage: e.target.value }))}
                        >
                            <option value="10">10</option>
                            <option value="25">25</option>
                            <option value="50">50</option>
                            <option value="100">100</option>
                        </select>
                    </div>

                    <div className="as-toggle-row as-field-row">
                        <div className="as-toggle-info">
                            <span className="as-toggle-label">Auto-Archive Resolved</span>
                            <span className="as-toggle-desc">Archive resolved complaints after retention period</span>
                        </div>
                        <label className="as-toggle-switch">
                            <input
                                type="checkbox"
                                checked={dataSettings.autoArchive}
                                onChange={e => setDataSettings(p => ({ ...p, autoArchive: e.target.checked }))}
                            />
                            <span className="as-toggle-slider" />
                        </label>
                    </div>

                    <div className="as-form-action">
                        <button
                            className="as-btn-primary"
                            onClick={handleSaveDataSettings}
                            disabled={dataSaving}
                        >
                            {dataSaving ? 'Saving…' : 'Save Settings'}
                        </button>

                        {dataMsg && (
                            <div className={dataMsg.type === 'success' ? 'as-msg-success' : 'as-msg-error'}>
                                {dataMsg.text}
                            </div>
                        )}
                    </div>
                    </div>
                </div>
            </div>

            {/* CARD 3 — System Information (full-width) */}
            <div className="as-card as-card-full">
                <h2 className="as-card-title">System Information</h2>
                <div className="as-info-grid">
                    <div className="as-info-item">
                        <span className="as-info-label">Platform</span>
                        <span className="as-info-value">Civic-Pulse</span>
                    </div>
                    <div className="as-info-item">
                        <span className="as-info-label">Version</span>
                        <span className="as-info-value">1.0.0</span>
                    </div>
                    <div className="as-info-item">
                        <span className="as-info-label">Stack</span>
                        <span className="as-info-value">MERN</span>
                    </div>
                    <div className="as-info-item">
                        <span className="as-info-label">Environment</span>
                        <span className="as-info-value">Development</span>
                    </div>
                    <div className="as-info-item">
                        <span className="as-info-label">Database</span>
                        <span className="as-info-value">MongoDB</span>
                    </div>
                    <div className="as-info-item">
                        <span className="as-info-label">Status</span>
                        <span className="as-info-value">
                            <span className="as-status-active">Operational</span>
                        </span>
                    </div>
                </div>
            </div>

        </div>
    );
};

export default AdminSettings;
