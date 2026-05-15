import React, { useState, useEffect } from 'react';
import Loader from '../common/Loader';
import config from '../../config';
import '../../styles/officer-variables.css';
import '../../styles/OfficerUtilities.css';
import './officerDashboard.css';
import './MyTeam.css';

const MyTeam = () => {
    const [workers, setWorkers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchTeam = async () => {
            try {
                const token = localStorage.getItem('token');
                // 1. Get Officer Profile to know Department
                const profileRes = await fetch(`${config.API_BASE_URL}/officers/me`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const profileData = await profileRes.json();

                if (!profileData.success) {
                    throw new Error("Failed to fetch profile");
                }

                const dept = profileData.user.department;

                // 2. Get All Field Workers (filtered by Officer's Dept)
                const workersRes = await fetch(`${config.API_BASE_URL}/field-workers`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const workersData = await workersRes.json();

                let allWorkers = [];
                if (Array.isArray(workersData)) allWorkers = workersData;
                else if (workersData.data) allWorkers = workersData.data;

                // Filter by department
                const myTeam = allWorkers.filter(w => w.department === dept);
                setWorkers(myTeam);

            } catch (err) {
                console.error("Error fetching team:", err);
                setError("Failed to load team data.");
            } finally {
                setLoading(false);
            }
        };

        fetchTeam();
    }, []);

    if (loading) return <Loader text="Loading your team..." />;
    if (error) return <div className="mt-error">{error}</div>;

    return (
        <div className="officer-card animate-fade-up">
            <h2>My Team (Field Workers)</h2>

            {workers.length === 0 ? (
                <p className="text-muted">No field workers found in your department.</p>
            ) : (
                <div className="mt-grid">
                    {workers.map(worker => (
                        <div key={worker._id} className="mt-card">
                            <div className="mt-avatar">
                                {worker.name.charAt(0)}
                            </div>
                            <div>
                                <h4 className="mt-name">{worker.name}</h4>
                                <p className="mt-dept">
                                    <i className="fas fa-id-badge mt-dept-icon"></i>
                                    {worker.department}
                                </p>
                                <div className="mt-status-wrap">
                                    <span className="status-badge resolved mt-status">Active</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default MyTeam;

