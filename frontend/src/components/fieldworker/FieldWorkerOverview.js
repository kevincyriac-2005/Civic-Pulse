import React, { useState, useEffect } from 'react';
import axios from 'axios';
import config from '../../config';
import { useNavigate } from 'react-router-dom';
import Loader from '../common/Loader';
import { toast } from 'react-toastify';
import '../../styles/fieldworker-variables.css';
import '../../styles/FieldworkerUtilities.css';

import './FieldWorker.css';
import './FieldWorkerOverview.css';

const FieldWorkerOverview = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchOverviewStats = async () => {
            try {
                setLoading(true);
                const token = localStorage.getItem('token');
                const response = await axios.get(`${config.API_BASE_URL}/field-workers/overview`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                if (response.data.success) {
                    setStats(response.data.summary);
                }
            } catch (error) {
                console.error("Error fetching overview stats:", error);
                toast.error("Failed to load dashboard metrics");
            } finally {
                setLoading(false);
            }
        };

        fetchOverviewStats();
    }, []);

    if (loading || !stats) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader text="Loading execution metrics..." />
            </div>
        );
    }

    const todayString = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const progressPercent = stats.assignedToday > 0 ? Math.round((stats.completedToday / stats.assignedToday) * 100) : 100;
    // Calculate stroke dash offset for the circle (Circumference of r=24 is roughly 150)
    const circleOffset = 150 - (150 * progressPercent) / 100;

    return (
        <div className="fw-page-container">
            <div className="fw-max-width">

                {/* 1. Full-width Header Banner */}
                <header className="fw-header-card">
                    <div>
                        <h1 className="fw-header-title">Field Operations Panel</h1>
                        <p className="fw-header-subtitle">Assigned Task Execution & Monitoring</p>
                        <div className="fw-header-date">
                            <i className="fas fa-calendar-alt"></i>
                            {todayString}
                        </div>
                    </div>

                    {/* Circular Completion Percentage */}
                    <div className="fw-progress-widget">
                        <div className="fwo-progress-text">
                            <p className="fw-progress-label">Daily Progress</p>
                            <p className="fw-progress-value">{progressPercent}%</p>
                        </div>
                        <div className="fwo-progress-ring-wrap">
                            <svg className="fw-progress-svg">
                                <circle cx="28" cy="28" r="24" strokeWidth="5" fill="transparent" className="fw-progress-bg" />
                                <circle
                                    cx="28" cy="28" r="24"
                                    strokeWidth="5"
                                    fill="transparent"
                                    strokeDasharray="150"
                                    strokeDashoffset={circleOffset}
                                    className="fw-progress-stroke"
                                />
                            </svg>
                        </div>
                    </div>
                </header>

                {/* 2. KPI Grid (1 Large Primary, 3 Smaller Secondary) */}
                <div className="fw-grid-kpi">

                    {/* Primary Card - Pending Tasks */}
                    <div className="fw-kpi-primary fwo-kpi-clickable" onClick={() => navigate('/fieldworker/tasks')}>
                        <div className="fw-kpi-primary-header">
                            <h2>Action Required</h2>
                            <div className="fw-kpi-icon-pill">
                                <i className="fas fa-exclamation-circle text-white"></i>
                            </div>
                        </div>
                        <div className="fwo-kpi-primary-body">
                            <p className="fw-kpi-primary-value">{stats.pendingTasks}</p>
                            <p className="fw-kpi-primary-subtitle">Pending Tasks Requiring Execution</p>
                        </div>
                        <i className="fas fa-exclamation-circle fw-kpi-primary-bg-icon"></i>
                    </div>

                    {/* Secondary Cards */}
                    <div className="fw-kpi-secondary group">
                        <div className="fw-kpi-secondary-header">
                            <span>In Progress</span>
                            <div className="fw-kpi-icon-purple">
                                <i className="fas fa-tools text-lg"></i>
                            </div>
                        </div>
                        <p className="fw-kpi-secondary-value">{stats.inProgress}</p>
                    </div>

                    <div className="fw-kpi-secondary group">
                        <div className="fw-kpi-secondary-header">
                            <span>Completed Today</span>
                            <div className="fw-kpi-icon-emerald">
                                <i className="fas fa-check-double text-lg"></i>
                            </div>
                        </div>
                        <p className="fw-kpi-secondary-value">{stats.completedToday}</p>
                    </div>

                    <div className="fw-kpi-secondary group">
                        <div className="fw-kpi-secondary-header">
                            <span className="fwo-urgent-label">Urgent / SLA</span>
                            <div className="fw-kpi-icon-blue fwo-kpi-icon-urgent">
                                <i className="fas fa-fire text-lg"></i>
                            </div>
                        </div>
                        <p className="fw-kpi-secondary-value">{stats.highSeverityPending}</p>
                    </div>
                </div>

                {/* 3. Task List Section Link */}
                <div>
                    <div className="fw-section-header">
                        <h2 className="fw-section-title">Task Execution Queue</h2>
                        <button className="fw-btn-text" onClick={() => navigate('/fieldworker/tasks')}>
                            View All Active Tasks &rarr;
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default FieldWorkerOverview;

