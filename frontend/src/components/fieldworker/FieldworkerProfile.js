import React, { useState, useEffect } from 'react';
import config from '../../config';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import '../../styles/fieldworker-variables.css';
import '../../styles/FieldworkerUtilities.css';
import './FieldworkerDashboard.css';
import './FieldworkerProfile.css';

const FieldworkerProfile = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')) || { name: 'Loading...', email: '...', role: 'fieldworker' });
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({ name: '', password: '' });

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) {
                    navigate('/login');
                    return;
                }

                const res = await fetch(`${config.API_BASE_URL}/field-workers/me`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                const data = await res.json();
                if (data.success) {
                    setUser(data.user);
                    localStorage.setItem('user', JSON.stringify(data.user));
                }
            } catch (error) {
                console.error("Failed to fetch profile:", error);
            }
        };

        fetchProfile();
    }, [navigate]);

    const toggleEdit = () => {
        setEditForm({ name: user.name, password: '' });
        setIsEditing(!isEditing);
    };

    const handleEditChange = (e) => {
        setEditForm({ ...editForm, [e.target.name]: e.target.value });
    };

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${config.API_BASE_URL}/field-workers/me`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(editForm)
            });
            const data = await res.json();
            if (data.success) {
                setUser(data.user);
                localStorage.setItem('user', JSON.stringify(data.user));
                setIsEditing(false);
                toast.success('Profile updated successfully!');
            } else {
                toast.error(data.message || 'Update failed');
            }
        } catch (error) {
            console.error("Update error:", error);
            toast.error('Server error');
        }
    };

    const displayName = (user && (user.name || user.email || ''));

    return (
        <div className="fieldworker-card animate-fade-up">
            <div className="fwp-head-row">
                <h2>My Profile</h2>
                <button onClick={toggleEdit} className="fwp-edit-btn">
                    <i className={`fas ${isEditing ? 'fa-times' : 'fa-edit'}`}></i> {isEditing ? 'Cancel' : 'Edit'}
                </button>
            </div>

            {!isEditing ? (
                <>
                    <div className="fwp-profile-top">
                        <div className="fwp-avatar">
                            {(displayName || '?').charAt(0).toUpperCase()}
                        </div>
                        <h3 className="fwp-user-name">{user.name || user.email || 'Unknown'}</h3>
                        <p className="fwp-user-email">{user.email}</p>
                        <span className="status-badge active fwp-role-badge">Field Worker</span>
                    </div>

                    <div className="form-group">
                        <label>Full Name</label>
                        <div className="fieldworker-input">{user.name}</div>
                    </div>
                    <div className="form-group">
                        <label>Email Address</label>
                        <div className="fieldworker-input">{user.email}</div>
                    </div>
                    <div className="form-group">
                        <label>Role</label>
                        <div className="fieldworker-input fwp-role-text">{user.role}</div>
                    </div>
                </>
            ) : (
                <form onSubmit={handleUpdateProfile}>
                    <div className="form-group">
                        <label>Full Name</label>
                        <input
                            name="name"
                            className="fieldworker-input"
                            value={editForm.name}
                            onChange={handleEditChange}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label>New Password (leave blank to keep current)</label>
                        <input
                            name="password"
                            type="password"
                            className="fieldworker-input"
                            placeholder="••••••••"
                            value={editForm.password}
                            onChange={handleEditChange}
                        />
                    </div>
                    <button type="submit" className="btn-submit">
                        Save Changes
                    </button>
                </form>
            )}
        </div>
    );
};

export default FieldworkerProfile;
