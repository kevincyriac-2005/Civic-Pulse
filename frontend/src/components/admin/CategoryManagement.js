import React, { useEffect, useState } from "react";
import "../../styles/admin-variables.css";
import "../../styles/AdminUtilities.css";
import "./CategoryManagement.css";
import config from "../../config";
import { toast } from 'react-toastify';

const CategoryManagement = () => {
    const [categories, setCategories] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentCategory, setCurrentCategory] = useState(null);

    const [formData, setFormData] = useState({
        name: "",
        description: "",
        department: ""
    });

    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = () => {
        fetch(`${config.API_BASE_URL}/categories`)
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    setCategories(data.data);
                } else {
                    console.error("Failed to fetch categories");
                }
            })
            .catch(err => console.error(err));
    };

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const openAddModal = () => {
        setIsEditing(false);
        setFormData({ name: "", description: "", department: "" });
        setShowModal(true);
    };

    const openEditModal = (category) => {
        setIsEditing(true);
        setCurrentCategory(category);
        setFormData({
            name: category.name,
            description: category.description,
            department: category.department
        });
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            let url = `${config.API_BASE_URL}/categories`;
            let method = "POST";

            if (isEditing) {
                url = `${config.API_BASE_URL}/categories/${currentCategory._id}`;
                method = "PUT";
            }

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            });

            const data = await res.json();

            if (res.ok) {
                setShowModal(false);
                fetchCategories();
                toast.success(isEditing ? "Category updated successfully" : "Category created successfully");
            } else {
                toast.error(data.message || "Operation failed");
            }
        } catch (err) {
            console.error(err);
            toast.error("Error processing request");
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this category?")) return;
        try {
            await fetch(`${config.API_BASE_URL}/categories/${id}`, { method: "DELETE" });
            fetchCategories();
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="cm-page">
            <h1 className="cm-title">Category Management</h1>

            <div className="cm-add-container">
                <button className="cm-btn approve" onClick={openAddModal}>+ Add Category</button>
            </div>

            <div className="cm-card">
                <div className="cm-table">
                    <div className="cm-row cm-header">
                        <span>Name</span>
                        <span>Description</span>
                        <span>Department</span>
                        <span>Actions</span>
                    </div>

                    {categories.length === 0 && <div className="cm-row cm-empty-state">No categories found.</div>}

                    {categories.map(cat => (
                        <div className="cm-row" key={cat._id}>
                            <span>{cat.name}</span>
                            <span>{cat.description}</span>
                            <span>{cat.department}</span>
                            <span className="cm-actions">
                                <button className="cm-btn" onClick={() => openEditModal(cat)}>Edit</button>
                                <button className="cm-btn danger" onClick={() => handleDelete(cat._id)}>Delete</button>
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {showModal && (
                <div className="modal-overlay admin-modal-overlay">
                    <div className="modal-content">
                        <h2>{isEditing ? "Edit" : "Add"} Category</h2>
                        <form onSubmit={handleSubmit}>
                            <div className="input-group">
                                <label>Name</label>
                                <input required name="name" value={formData.name} onChange={handleInputChange} />
                            </div>
                            <div className="input-group">
                                <label>Description</label>
                                <textarea className="cm-textarea-static" name="description" value={formData.description} onChange={handleInputChange} rows="3"></textarea>
                            </div>
                            <div className="input-group">
                                <label>Department</label>
                                <input required name="department" value={formData.department} onChange={handleInputChange} />
                            </div>

                            <div className="modal-actions">
                                <button type="button" onClick={() => setShowModal(false)} className="cm-btn reject">Cancel</button>
                                <button type="submit" className="cm-btn approve">{isEditing ? "Update" : "Create"}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CategoryManagement;
