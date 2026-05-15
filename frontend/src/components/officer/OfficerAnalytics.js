import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Navigate } from 'react-router-dom';
import config from '../../config';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import '../../styles/officer-variables.css';
import '../../styles/OfficerUtilities.css';
import './OfficerOverview.css'; // Leverage existing dashboard styles
import './OfficerAnalytics.css';

const OfficerAnalytics = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) throw new Error('No authentication token found.');

                const response = await axios.get(`${config.API_BASE_URL}/officers/analytics`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                setData(response.data);
                setLoading(false);
            } catch (err) {
                console.error("Analytics fetch error:", err);
                setError(err.response?.data?.message || err.message || "Failed to load analytics.");
                setLoading(false);
            }
        };

        fetchAnalytics();
    }, []);

    const userStr = localStorage.getItem('user');
    const userObj = userStr ? JSON.parse(userStr) : null;
    const userRole = userObj ? (userObj.role || userObj.usertype) : null;

    if (userRole !== 'officer') {
        return <Navigate to="/unauthorized" replace />;
    }

    if (loading) return <AnalyticsSkeleton />;
    if (error) return <ErrorFallback message={error} />;
    if (!data) return null;

    // Check if we actually have data to show (e.g., brand new account)
    const hasData = data.monthlyTrend && data.monthlyTrend.some(m => m.count > 0) || data.activeCount > 0 || data.closureRate > 0;

    return (
        <div className="dashboard-container officer-dashboard-root">
            <header className="dashboard-header">
                <div className="header-title-wrapper">
                    <h1>Performance Analytics</h1>
                    <p>Department Efficiency Metrics</p>
                </div>
            </header>

            {!hasData ? (
                <div className="dashboard-panel panel-padding oa-empty-panel">
                    <i className="fas fa-chart-pie oa-empty-icon"></i>
                    <h3>Insufficient Data</h3>
                    <p className="oa-empty-text">As complaints are assigned to you and resolved by your team, analytics will populate here.</p>
                </div>
            ) : (
                <>
                    {/* 1. KPI Cards */}
                    <div className="dashboard-grid-3 mb-4 oa-kpi-grid">
                        <SummaryCard
                            title="Avg Resolution Time"
                            value={`${data.avgResolutionTime.toLocaleString()} hrs`}
                            icon="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                            colorClass="text-amber-500"
                        />
                        <SummaryCard
                            title="Closure Rate"
                            value={`${data.closureRate}%`}
                            icon="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                            colorClass="text-emerald-500"
                        />
                        <SummaryCard
                            title="Active Complaints"
                            value={data.activeCount}
                            icon="M13 10V3L4 14h7v7l9-11h-7z"
                            colorClass="text-blue-500"
                        />
                    </div>

                    {/* 2. Monthly Trend Chart */}
                    <div className="dashboard-grid-4">
                        <div className="dashboard-panel panel-padding col-span-1 lg-col-span-4">
                            <h2 className="panel-title">6-Month Incident Volume Trend</h2>

                            <div className="oa-chart-wrap">
                                <ResponsiveContainer>
                                    <LineChart data={data.monthlyTrend} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                        <XAxis
                                            dataKey="month"
                                            stroke="#64748b"
                                            tick={{ fill: '#94a3b8' }}
                                            axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                                            tickLine={false}
                                        />
                                        <YAxis
                                            stroke="#64748b"
                                            tick={{ fill: '#94a3b8' }}
                                            axisLine={false}
                                            tickLine={false}
                                            allowDecimals={false}
                                        />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: 'rgba(15, 23, 42, 0.9)',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                borderRadius: '8px',
                                                color: '#f8fafc'
                                            }}
                                            itemStyle={{ color: '#3b82f6' }}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="count"
                                            stroke="#3b82f6"
                                            strokeWidth={3}
                                            dot={{ r: 4, fill: '#0f172a', stroke: '#3b82f6', strokeWidth: 2 }}
                                            activeDot={{ r: 6, fill: '#3b82f6', stroke: '#fff' }}
                                            animationDuration={1500}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

/* --- Reusable Components (Matching OfficerOverview visually) --- */

function SummaryCard({ title, value, icon, colorClass = "text-slate-700" }) {
    return (
        <div className="summary-card oa-summary-card">
            <div className="card-content-wrapper">
                <div className="card-text">
                    <p className="oa-summary-label">{title}</p>
                    <h3 className={`${colorClass} oa-summary-value`}>{value}</h3>
                </div>
                <div className={`card-icon ${colorClass} oa-summary-icon-wrap`}>
                    <svg className="icon-svg oa-summary-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={icon} />
                    </svg>
                </div>
            </div>
        </div>
    );
}

function AnalyticsSkeleton() {
    return (
        <div className="skeleton-container oa-skeleton-wrap">
            <div className="skel-elem skel-h oa-skel-h"></div>
            <div className="dashboard-grid-3">
                {[1, 2, 3].map(i => <div key={i} className="skel-elem skel-card oa-skel-card"></div>)}
            </div>
            <div className="skel-elem oa-skel-chart"></div>
        </div>
    );
}

function ErrorFallback({ message }) {
    return (
        <div className="error-container oa-error-wrap">
            <div className="error-card oa-error-card">
                <i className="fas fa-exclamation-triangle oa-error-icon"></i>
                <h3 className="oa-error-title">Analytics Engine Error</h3>
                <p className="oa-error-message">{message}</p>
                <button onClick={() => window.location.reload()} className="oa-error-btn">
                    Retry Connection
                </button>
            </div>
        </div>
    );
}

export default OfficerAnalytics;
