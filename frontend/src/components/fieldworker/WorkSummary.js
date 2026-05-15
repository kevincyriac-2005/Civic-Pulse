import React, { useState, useEffect } from 'react';
import axios from 'axios';
import config from '../../config';
import Loader from '../common/Loader';
import { toast } from 'react-toastify';
import '../../styles/fieldworker-variables.css';
import '../../styles/FieldworkerUtilities.css';
import './FieldWorker.css';
import './WorkSummary.css';

const WorkSummary = () => {
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchSummary = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const response = await axios.get(`${config.API_BASE_URL}/field-workers/work-summary`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.success) {
                setSummary(response.data.summary);
            }
        } catch (error) {
            console.error("Error fetching work summary:", error);
            toast.error("Failed to load personal performance metrics");
            setSummary({
                totalAssigned: 0,
                totalCompleted: 0,
                pending: 0,
                avgCompletionTime: 0,
                lastCompleted: null
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSummary();
    }, []);

    if (loading || !summary) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader text="Generating performance summary..." />
            </div>
        );
    }

    const hasData = summary.totalAssigned > 0;
    const completionRate = hasData ? Math.round((summary.totalCompleted / summary.totalAssigned) * 100) : 0;

    return (
        <div className="fw-page-container">
            <div className="fw-max-width">
                <header className="fw-header-card ws-header-card">
                    <div>
                        <h2 className="fw-header-title ws-header-title">
                            <i className="fas fa-chart-pie text-emerald"></i> Work Summary
                        </h2>
                        <p className="fw-header-subtitle">Your personal execution performance metrics and accountability log.</p>
                    </div>
                </header>

                {!hasData && !loading ? (
                    <div className="ws-empty-card">
                        <div className="ws-empty-icon-wrap">
                            <i className="fas fa-folder-open ws-empty-icon"></i>
                        </div>
                        <h3 className="ws-empty-title">Insufficient Data</h3>
                        <p className="ws-empty-subtitle">There is no assigned task data to generate a summary.</p>
                    </div>
                ) : (
                    <div className="ws-stack">

                        {/* 1. Large Performance KPI Top Section */}
                        <div className="fw-grid-kpi ws-grid-kpi">
                            {/* Total Completed (Primary Focus) */}
                            <div className="fw-kpi-primary ws-kpi-primary">
                                <div className="fw-kpi-primary-header">
                                    <h2 className="ws-kpi-primary-title">Total Completed</h2>
                                    <div className="fw-kpi-icon-pill ws-kpi-pill">
                                        <i className="fas fa-check-double text-white"></i>
                                    </div>
                                </div>
                                <div className="ws-kpi-primary-body">
                                    <p className="fw-kpi-primary-value">{summary.totalCompleted}</p>
                                    <p className="fw-kpi-primary-subtitle ws-kpi-primary-subtitle">Lifetime successfully resolved tasks</p>
                                </div>
                                <i className="fas fa-medal fw-kpi-primary-bg-icon"></i>
                            </div>

                            {/* Avg Completion Time */}
                            <div className="fw-kpi-secondary group">
                                <div className="fw-kpi-secondary-header">
                                    <span>Avg Completion Time</span>
                                    <div className="fw-kpi-icon-purple">
                                        <i className="fas fa-stopwatch text-lg"></i>
                                    </div>
                                </div>
                                <div>
                                    <p className="fw-kpi-secondary-value">{summary.avgCompletionTime} <span className="ws-hours-label">hrs</span></p>
                                </div>
                            </div>

                            {/* Pending Tasks */}
                            <div className="fw-kpi-secondary group">
                                <div className="fw-kpi-secondary-header">
                                    <span>Currently Pending</span>
                                    <div className="fw-kpi-icon-blue">
                                        <i className="fas fa-tasks text-lg"></i>
                                    </div>
                                </div>
                                <p className="fw-kpi-secondary-value">{summary.pending}</p>
                            </div>

                            {/* Last Completed Date */}
                            <div className="fw-kpi-secondary group">
                                <div className="fw-kpi-secondary-header">
                                    <span>Last Resolution</span>
                                    <div className="fw-kpi-icon-emerald ws-last-icon-wrap">
                                        <i className="fas fa-calendar-check text-lg"></i>
                                    </div>
                                </div>
                                <div>
                                    <p className="ws-last-date">
                                        {summary.lastCompleted ? new Date(summary.lastCompleted).toLocaleDateString() : 'N/A'}
                                    </p>
                                    <p className="ws-last-caption">Most recent activity</p>
                                </div>
                            </div>
                        </div>

                        {/* 2. Progress Indicator Section */}
                        <div className="ws-progress-card">
                            <div className="ws-progress-head">
                                <div>
                                    <h3 className="ws-progress-title">Resolution Rate</h3>
                                    <p className="ws-progress-subtitle">Percentage of total assigned tasks successfully completed.</p>
                                </div>
                                <span className="ws-progress-pct">{completionRate}%</span>
                            </div>

                            {/* Horizontal Progress Bar */}
                            <div className="ws-progress-track">
                                <div
                                    className="ws-progress-fill"
                                    style={{ width: `${completionRate}%` }}
                                ></div>
                            </div>
                            <div className="ws-progress-foot">
                                <span>0 Tasks</span>
                                <span>{summary.totalAssigned} Total Assigned</span>
                            </div>
                        </div>

                    </div>
                )}
            </div>
        </div>
    );
};

export default WorkSummary;

