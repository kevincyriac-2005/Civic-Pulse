import React, { useState, useEffect } from 'react';
import config from '../../config';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import '../../styles/citizen-variables.css';
import '../../styles/CitizenUtilities.css';
import './CitizenDashboard.css';
import './CitizenProfile.css';

const CitizenProfile = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')) || { name: 'Loading...', email: '...', role: 'citizen' });
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

                const res = await fetch(`${config.API_BASE_URL}/citizens/me`, {
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
            const res = await fetch(`${config.API_BASE_URL}/citizens/me`, {
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
        <div className="citizen-card animate-fade-up">
            <div className="cp-head">
                <h2>My Profile</h2>
                <button onClick={toggleEdit} className="cp-edit-btn">
                    <i className={`fas ${isEditing ? 'fa-times' : 'fa-edit'}`}></i> {isEditing ? 'Cancel' : 'Edit'}
                </button>
            </div>

            {!isEditing ? (
                <>
                    <div className="cp-summary">
                        <div className="cp-avatar">
                            {(displayName || '?').charAt(0).toUpperCase()}
                        </div>
                        <h3 className="cp-name">{user.name || user.email || 'Unknown'}</h3>
                        <p className="cp-email">{user.email}</p>
                        <span className="status-badge resolved cp-verified-badge">Verified Citizen</span>
                    </div>

                    <div className="form-group">
                        <label>Full Name</label>
                        <div className="citizen-input">{user.name}</div>
                    </div>
                    <div className="form-group">
                        <label>Email Address</label>
                        <div className="citizen-input">{user.email}</div>
                    </div>
                    <div className="form-group">
                        <label>Role</label>
                        <div className="citizen-input cp-capitalize">{user.role}</div>
                    </div>
                </>
            ) : (
                <form onSubmit={handleUpdateProfile}>
                    <div className="form-group">
                        <label>Full Name</label>
                        <input
                            name="name"
                            className="citizen-input"
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
                            className="citizen-input"
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

export default CitizenProfile;
