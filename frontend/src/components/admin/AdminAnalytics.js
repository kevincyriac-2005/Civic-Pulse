import React, { useState, useEffect } from 'react';
import axios from 'axios';
import config from '../../config';
import '../../styles/admin-variables.css';
import '../../styles/AdminUtilities.css';
import './AdminAnalytics.css';

function SummaryCard({ title, value, icon, colorClass = "text-slate-700" }) {
    return (
        <div className="summary-card">
            <div className="card-content-wrapper">
                <div className="card-text">
                    <p>{title}</p>
                    <h3 className={colorClass}>{typeof value === 'number' ? value.toLocaleString() : value}</h3>
                </div>
                <div className={`card-icon ${colorClass}`}>
                    <svg className="icon-svg" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
                    </svg>
                </div>
            </div>
        </div>
    );
}

const AdminAnalytics = () => {
    const [analyticsData, setAnalyticsData] = useState(null);
    const [timeRange, setTimeRange] = useState('7d');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchAnalytics = async () => {
            setLoading(true);
            setError(null);
            try {
                const token = localStorage.getItem('token');
                const response = await axios.get(
                    `${config.API_BASE_URL}/admin/analytics`,
                    {
                        params: { range: timeRange },
                        headers: { Authorization: `Bearer ${token}` }
                    }
                );
                setAnalyticsData(response.data);
            } catch (err) {
                console.error('[AdminAnalytics] Fetch failed:', err);
                setError('Failed to load analytics data.');
            } finally {
                setLoading(false);
            }
        };

        fetchAnalytics();
    }, [timeRange]);

    if (loading) {
        return (
            <div className="dashboard-container admin-analytics-loading">
                Loading analytics...
            </div>
        );
    }

    if (error) {
        return (
            <div className="dashboard-container admin-analytics-error">
                Failed to load analytics. Please try again.
            </div>
        );
    }

    const trendData = analyticsData?.trendData ?? [];
    const categoryData = analyticsData?.categoryData ?? [];
    const maxTrendCount = trendData.length > 0 ? Math.max(1, ...trendData.map(d => d.count)) : 1;
    const maxCategoryCount = categoryData.length > 0 ? Math.max(1, ...categoryData.map(d => d.count)) : 1;

    return (
        <div className="dashboard-container">
            {/* Header with Time Selector */}
            <header className="dashboard-header">
                <div className="header-title-wrapper">
                    <h1>Platform Analytics</h1>
                    <p>Performance metrics and trend analysis</p>
                </div>
                <div className="time-selector mt-4 md:mt-0 analytics-time-selector">
                    <button className={`time-btn ${timeRange === '7d' ? 'active' : ''}`} onClick={() => setTimeRange('7d')}>7 Days</button>
                    <button className={`time-btn ${timeRange === '30d' ? 'active' : ''}`} onClick={() => setTimeRange('30d')}>30 Days</button>
                </div>
            </header>

            {/* KPI Cards */}
            <div className="dashboard-grid-4">
                <SummaryCard title="Avg Resolution" value={analyticsData?.avgResolution != null ? `${analyticsData.avgResolution} hrs` : 'N/A'} icon="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" colorClass="text-emerald-600" />
                <SummaryCard title="Escalation Rate" value={analyticsData?.escalationRate != null ? `${analyticsData.escalationRate}%` : 'N/A'} icon="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" colorClass="text-red-500" />
                <SummaryCard title="On-Time Resolution" value={analyticsData?.onTimeResolutionRate != null ? `${analyticsData.onTimeResolutionRate}%` : 'N/A'} icon="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" colorClass="text-blue-600" />
                <SummaryCard title="Compliance Index" value={analyticsData?.complianceScore != null ? `${analyticsData.complianceScore}%` : 'N/A'} icon="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" colorClass="text-amber-600" />
            </div>

            <div className="dashboard-grid-3">
                {/* Trend Chart (CSS based) */}
                <div className="dashboard-panel panel-padding col-span-1 lg-col-span-2">
                    <h2 className="panel-title panel-title-bordered">Incident Volume Trend</h2>

                    {trendData.length === 0 ? (
                        <div className="analytics-empty-state">
                            <span className="analytics-empty-state-icon">
                                📊
                            </span>
                            <span className="analytics-empty-state-text">
                                No incident data for this period
                            </span>
                        </div>
                    ) : (
                        <div className="chart-container">
                            <div className="chart-grid-lines">
                                <div className="grid-line"></div>
                                <div className="grid-line"></div>
                                <div className="grid-line"></div>
                                <div className="grid-line"></div>
                            </div>

                            {trendData.map((point, idx) => {
                                const heightPct = Math.max(5, (point.count / maxTrendCount) * 100);
                                return (
                                    <div key={idx} className="chart-bar-group">
                                        <div className="chart-bar-fill" style={{ height: `${heightPct}%` }}>
                                            <div className="chart-tooltip">{point.count} incidents</div>
                                        </div>
                                        <div className="chart-label">{point.label}</div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Horizontal Category Chart */}
                <div className="dashboard-panel panel-padding col-span-1 lg-col-span-1">
                    <h2 className="panel-title panel-title-bordered">Top Categories</h2>

                    {categoryData.length === 0 ? (
                        <div className="analytics-empty-state">
                            <span className="analytics-empty-state-icon">
                                📂
                            </span>
                            <span className="analytics-empty-state-text">
                                No category data for this period
                            </span>
                        </div>
                    ) : (
                        <div className="h-chart-container">
                            {categoryData.map((cat, idx) => {
                                const widthPct = Math.max(5, (cat.count / maxCategoryCount) * 100);
                                return (
                                    <div key={idx} className="h-chart-row">
                                        <div className="h-chart-label" title={cat.name}>{cat.name}</div>
                                        <div className="h-chart-track">
                                            <div className="h-chart-fill" style={{ width: `${widthPct}%` }}></div>
                                        </div>
                                        <div className="h-chart-value">{cat.count}</div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminAnalytics;
