import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../../styles/admin-variables.css';
import './AdminProfile.css';
import config from '../../config';

const AdminProfile = () => {
    const [profile, setProfile] = useState({
        firstName: '',
        lastName: '',
        username: '',
        usertype: '',
        createdAt: null,
    });

    const [profileForm, setProfileForm] = useState({
        firstName: '',
        lastName: '',
    });

    const [passwordForm, setPasswordForm] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });

    const [loading, setLoading]               = useState(true);
    const [profileSaving, setProfileSaving]   = useState(false);
    const [passwordSaving, setPasswordSaving] = useState(false);
    const [profileMsg, setProfileMsg]         = useState(null);
    const [passwordMsg, setPasswordMsg]       = useState(null);

    /* ── Fetch on mount ─────────────────────────── */
    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await axios.get(
                    `${config.API_BASE_URL}/admin/profile`,
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                setProfile(res.data);
                setProfileForm({
                    firstName: res.data.firstName || '',
                    lastName:  res.data.lastName  || '',
                });
            } catch (err) {
                console.error('[AdminProfile] Failed to load profile', err);
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, []);

    /* ── Helpers ────────────────────────────────── */
    const getInitials = () => {
        const f = profile.firstName?.[0] || '';
        const l = profile.lastName?.[0]  || '';
        return (f + l).toUpperCase() || 'AD';
    };

    const clearMsg = (setter, delay = 3000) =>
        setTimeout(() => setter(null), delay);

    /* ── Save profile ───────────────────────────── */
    const handleProfileSave = async (e) => {
        e.preventDefault();
        setProfileSaving(true);
        setProfileMsg(null);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.put(
                `${config.API_BASE_URL}/admin/profile`,
                { firstName: profileForm.firstName, lastName: profileForm.lastName },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setProfile(prev => ({ ...prev, ...res.data }));
            setProfileMsg({ type: 'success', text: 'Profile updated successfully.' });
            clearMsg(setProfileMsg, 3000);
        } catch (err) {
            const msg = err.response?.data?.message || 'Failed to update profile.';
            setProfileMsg({ type: 'error', text: msg });
            clearMsg(setProfileMsg, 3000);
        } finally {
            setProfileSaving(false);
        }
    };

    /* ── Change password ────────────────────────── */
    const handlePasswordSave = async (e) => {
        e.preventDefault();
        setPasswordMsg(null);

        if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
            setPasswordMsg({ type: 'error', text: 'All password fields are required.' });
            clearMsg(setPasswordMsg, 4000);
            return;
        }
        if (passwordForm.newPassword.length < 8) {
            setPasswordMsg({ type: 'error', text: 'Password must be at least 8 characters.' });
            clearMsg(setPasswordMsg, 4000);
            return;
        }
        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            setPasswordMsg({ type: 'error', text: 'Passwords do not match.' });
            clearMsg(setPasswordMsg, 4000);
            return;
        }

        setPasswordSaving(true);
        try {
            const token = localStorage.getItem('token');
            await axios.put(
                `${config.API_BASE_URL}/admin/profile`,
                { currentPassword: passwordForm.currentPassword, newPassword: passwordForm.newPassword },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setPasswordMsg({ type: 'success', text: 'Password changed successfully.' });
            setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
            clearMsg(setPasswordMsg, 4000);
        } catch (err) {
            const msg = err.response?.data?.message || 'Failed to change password.';
            setPasswordMsg({ type: 'error', text: msg });
            clearMsg(setPasswordMsg, 4000);
        } finally {
            setPasswordSaving(false);
        }
    };

    /* ── Render ─────────────────────────────────── */
    if (loading) {
        return <div className="ap-loading">Loading profile…</div>;
    }

    return (
        <div className="ap-page">

            {/* Header */}
            <div className="ap-header">
                <h1 className="ap-title">My Profile</h1>
                <p className="ap-subtitle">Manage your account information and security</p>
            </div>

            {/* Unified Card */}
            <div className="ap-card ap-unified-card">
                <div className="ap-grid ap-grid-unified">

                    {/* LEFT — Profile Information */}
                    <div className="ap-section">
                    <h2 className="ap-card-title">Profile Information</h2>

                    {/* Avatar + display */}
                    <div className="ap-profile-info">
                        <div className="ap-avatar">{getInitials()}</div>
                        <span className="ap-profile-name">
                            {profile.firstName || profile.lastName
                                ? `${profile.firstName} ${profile.lastName}`.trim()
                                : '—'}
                        </span>
                        <span className="ap-profile-email">{profile.username || '—'}</span>
                        <span className="ap-role-badge">
                            {profile.usertype ? profile.usertype.charAt(0).toUpperCase() + profile.usertype.slice(1) : 'Admin'}
                        </span>
                    </div>

                    <div className="ap-divider" />

                    {/* Editable form */}
                    <form onSubmit={handleProfileSave} className="ap-form">
                        <div className="ap-form-group">
                            <label className="ap-label" htmlFor="ap-firstName">First Name</label>
                            <input
                                id="ap-firstName"
                                className="ap-input"
                                type="text"
                                value={profileForm.firstName}
                                onChange={e => setProfileForm(p => ({ ...p, firstName: e.target.value }))}
                                placeholder="Enter first name"
                            />
                        </div>

                        <div className="ap-form-group">
                            <label className="ap-label" htmlFor="ap-lastName">Last Name</label>
                            <input
                                id="ap-lastName"
                                className="ap-input"
                                type="text"
                                value={profileForm.lastName}
                                onChange={e => setProfileForm(p => ({ ...p, lastName: e.target.value }))}
                                placeholder="Enter last name"
                            />
                        </div>

                        <div className="ap-form-group">
                            <label className="ap-label" htmlFor="ap-email">Email Address</label>
                            <input
                                id="ap-email"
                                className="ap-input ap-input-readonly"
                                type="text"
                                value={profile.username || ''}
                                readOnly
                                tabIndex={-1}
                            />
                            <span className="ap-input-note">Email address cannot be changed</span>
                        </div>

                        <div className="ap-form-action">
                            <button
                                type="submit"
                                className="ap-btn-primary"
                                disabled={profileSaving}
                            >
                                {profileSaving ? 'Saving…' : 'Save Profile'}
                            </button>

                            {profileMsg && (
                                <div className={profileMsg.type === 'success' ? 'ap-msg-success' : 'ap-msg-error'}>
                                    {profileMsg.text}
                                </div>
                            )}
                        </div>
                    </form>
                </div>

                    {/* RIGHT — Security */}
                    <div className="ap-section ap-section-right">
                    <h2 className="ap-card-title">Change Password</h2>

                    {/* Read-only security info */}
                    <div className="ap-security-row">
                        <div className="ap-security-item">
                            <span className="ap-security-label">Last Login</span>
                            <span className="ap-security-value">Current session</span>
                        </div>
                        <div className="ap-security-item">
                            <span className="ap-security-label">Account Status</span>
                            <span className="ap-security-value">
                                <span className="ap-status-active">Active</span>
                            </span>
                        </div>
                    </div>

                    <div className="ap-divider" />

                    <form onSubmit={handlePasswordSave} className="ap-form">
                        <div className="ap-form-group">
                            <label className="ap-label" htmlFor="ap-currentPw">Current Password</label>
                            <input
                                id="ap-currentPw"
                                className="ap-input"
                                type="password"
                                value={passwordForm.currentPassword}
                                onChange={e => setPasswordForm(p => ({ ...p, currentPassword: e.target.value }))}
                                placeholder="Enter current password"
                                autoComplete="current-password"
                            />
                        </div>

                        <div className="ap-form-group">
                            <label className="ap-label" htmlFor="ap-newPw">New Password</label>
                            <input
                                id="ap-newPw"
                                className="ap-input"
                                type="password"
                                value={passwordForm.newPassword}
                                onChange={e => setPasswordForm(p => ({ ...p, newPassword: e.target.value }))}
                                placeholder="Minimum 8 characters"
                                autoComplete="new-password"
                            />
                        </div>

                        <div className="ap-form-group">
                            <label className="ap-label" htmlFor="ap-confirmPw">Confirm New Password</label>
                            <input
                                id="ap-confirmPw"
                                className="ap-input"
                                type="password"
                                value={passwordForm.confirmPassword}
                                onChange={e => setPasswordForm(p => ({ ...p, confirmPassword: e.target.value }))}
                                placeholder="Re-enter new password"
                                autoComplete="new-password"
                            />
                        </div>

                        <div className="ap-form-action">
                            <button
                                type="submit"
                                className="ap-btn-primary"
                                disabled={passwordSaving}
                            >
                                {passwordSaving ? 'Changing…' : 'Change Password'}
                            </button>

                            {passwordMsg && (
                                <div className={passwordMsg.type === 'success' ? 'ap-msg-success' : 'ap-msg-error'}>
                                    {passwordMsg.text}
                                </div>
                            )}
                        </div>
                    </form>
                    </div>
                </div>
            </div>

            {/* Bottom info panel */}
            <div className="ap-info-panel">
                <h3 className="ap-info-title">Account Details</h3>
                <div className="ap-info-grid">
                    <div className="ap-info-item">
                        <span className="ap-info-label">Username</span>
                        <span className="ap-info-value">{profile.username || '—'}</span>
                    </div>
                    <div className="ap-info-item">
                        <span className="ap-info-label">Role</span>
                        <span className="ap-info-value">{profile.usertype ? profile.usertype.charAt(0).toUpperCase() + profile.usertype.slice(1) : '—'}</span>
                    </div>
                    <div className="ap-info-item">
                        <span className="ap-info-label">Member Since</span>
                        <span className="ap-info-value">
                            {profile.createdAt
                                ? new Date(profile.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
                                : 'N/A'}
                        </span>
                    </div>
                    <div className="ap-info-item">
                        <span className="ap-info-label">Status</span>
                        <span className="ap-info-value">
                            <span className="ap-status-active">Active</span>
                        </span>
                    </div>
                </div>
            </div>

        </div>
    );
};

export default AdminProfile;
