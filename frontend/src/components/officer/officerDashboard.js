import React, { useState, useEffect } from 'react';
import config from '../../config';
import { toast } from 'react-toastify';
import './officerDashboard.css';
import './OfficerDashboardPage.css';

const OfficerDashboard = () => {
    // We can rely on context or pass props, but for now getting user again or assuming layout handles auth
    // But specific to this page:
    const [stats, setStats] = useState({ pending: 0, resolved: 0 }); // Placeholder
    const [form, setForm] = useState({ title: '', description: '', image: null, categoryId: '' });
    const [categories, setCategories] = useState([]);

    // Recent activity just for dashboard view
    const [recentActivity, setRecentActivity] = useState([]);

    useEffect(() => {
        fetchCategories();
        // fetchRecentActivity();
    }, []);

    const fetchCategories = async () => {
        try {
            const res = await fetch(`${config.API_BASE_URL}/categories`);
            const data = await res.json();
            if (data.success) {
                setCategories(data.data);
            }
        } catch (err) {
            console.error("Failed to fetch categories", err);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e) => {
        setForm(prev => ({ ...prev, image: e.target.files[0] }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        // Simulate adding response
        toast.success("Complaint submitted successfully!");
        setForm({ title: '', description: '', image: null, categoryId: '' });
    };

    return (
        <div className="officer-grid">
            {/* Left Column: Form */}
            <div className="grid-left">
                <div className="officer-card animate-fade-up">
                    <h2>Report a New Issue</h2>
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label>Issue Title</label>
                            <input
                                name="title"
                                className="officer-input"
                                placeholder="e.g. Broken Pipe"
                                value={form.title}
                                onChange={handleInputChange}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>Category</label>
                            <select
                                name="categoryId"
                                className="officer-input odp-category-select"
                                value={form.categoryId}
                                onChange={handleInputChange}
                                required
                            >
                                <option value="">Select a Category</option>
                                {categories.map(cat => (
                                    <option key={cat._id} value={cat._id}>{cat.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Description</label>
                            <textarea
                                name="description"
                                className="officer-input"
                                placeholder="Describe the issue details and location..."
                                value={form.description}
                                onChange={handleInputChange}
                                required
                            ></textarea>
                        </div>
                        <div className="form-group">
                            <label>Upload Image</label>
                            <div className="file-upload-box">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                    className="odp-file-hidden"
                                    id="file-upload"
                                />
                                <label htmlFor="file-upload" className="odp-file-label">
                                    <i className="fas fa-cloud-upload-alt fa-2x odp-upload-icon"></i>
                                    <p className="odp-upload-text">
                                        {form.image ? form.image.name : "Click to upload image"}
                                    </p>
                                </label>
                            </div>
                        </div>
                        <button type="submit" className="btn-submit">Submit Complaint</button>
                    </form>
                </div>
            </div>

            {/* Right Column: Info / Stats */}
            <div className="grid-right">

            </div>
        </div>
    );
};

export default OfficerDashboard;
