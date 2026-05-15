import React, { useState } from 'react';
import config from '../../config';
import { toast } from 'react-toastify';
import '../../styles/officer-variables.css';
import '../../styles/OfficerUtilities.css';
import './CreateComplaint.css';

const CreateComplaint = ({ onCreated, onCancel }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const token = localStorage.getItem('token');
            // Try to get geolocation if permitted
            let latitude = null;
            let longitude = null;
            if (navigator.geolocation) {
                try {
                    const pos = await new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej));
                    latitude = pos.coords.latitude;
                    longitude = pos.coords.longitude;
                } catch (err) {
                    // Geolocation denied or failed; continue without coords
                }
            }

            const payload = { title, description, imageUrl, latitude, longitude };

            if (token) {
                const res = await fetch(`${config.API_BASE_URL}/complaints`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify(payload)
                });
                const data = await res.json();
                if (data.success) {
                    onCreated && onCreated(data.data);
                    return;
                } else {
                    toast.error(data.message || 'Failed to create complaint');
                }
            } else {
                // No backend token — return a local mock complaint for frontend development
                const mock = {
                    _id: `local-${Date.now()}`,
                    complaintId: `TMP-${Date.now()}`,
                    title,
                    description,
                    beforeImageUrl: imageUrl,
                    report_latitude: latitude,
                    report_longitude: longitude,
                    issueType: 'General',
                    status: 'Pending',
                    createdAt: new Date().toISOString()
                };
                onCreated && onCreated(mock);
            }
        } catch (err) {
            console.error('Create complaint error', err);
            toast.error('Error creating complaint');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="cc-form">
            <h3 className="cc-title">New Complaint</h3>
            <label>Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)} required />

            <label>Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={4} />

            <label>Image URL (optional)</label>
            <input value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://..." />

            <div className="cc-actions officer-flex-between">
                <button type="button" onClick={onCancel} disabled={submitting} className="cc-btn">Cancel</button>
                <button type="submit" disabled={submitting || !title} className="cc-btn">{submitting ? 'Creating...' : 'Create'}</button>
            </div>
        </form>
    );
};

export default CreateComplaint;
