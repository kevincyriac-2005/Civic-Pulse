import React, { useEffect, useState } from "react";
import "../../styles/admin-variables.css";
import "../../styles/AdminUtilities.css";
import "./DepartmentManagement.css";
import config from "../../config";
import { toast } from 'react-toastify';

const DepartmentManagement = () => {
    const [departments, setDepartments] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentDepartment, setCurrentDepartment] = useState(null);

    const [formData, setFormData] = useState({
        name: "",
        description: ""
    });

    useEffect(() => {
        fetchDepartments();
    }, []);

    const fetchDepartments = () => {
        fetch(`${config.API_BASE_URL}/departments`)
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    setDepartments(data.data);
                } else {
                    console.error("Failed to fetch departments");
                }
            })
            .catch(err => console.error(err));
    };

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const openAddModal = () => {
        setIsEditing(false);
        setFormData({ name: "", description: "" });
        setShowModal(true);
    };

    const openEditModal = (department) => {
        setIsEditing(true);
        setCurrentDepartment(department);
        setFormData({
            name: department.name,
            description: department.description
        });
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            let url = `${config.API_BASE_URL}/departments`;
            let method = "POST";

            if (isEditing) {
                url = `${config.API_BASE_URL}/departments/${currentDepartment._id}`;
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
                fetchDepartments();
                toast.success(isEditing ? "Department updated successfully" : "Department created successfully");
            } else {
                toast.error(data.message || "Operation failed");
            }
        } catch (err) {
            console.error(err);
            toast.error("Error processing request");
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this department?")) return;
        try {
            await fetch(`${config.API_BASE_URL}/departments/${id}`, { method: "DELETE" });
            fetchDepartments();
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="dm-page">
            <h1 className="dm-title">Department Management</h1>

            <div className="dm-add-container">
                <button className="dm-btn approve" onClick={openAddModal}>+ Add Department</button>
            </div>

            <div className="dm-card">
                <div className="dm-table">
                    <div className="dm-row dm-header">
                        <span>Name</span>
                        <span>Description</span>
                        <span>Actions</span>
                    </div>

                    {departments.length === 0 && <div className="dm-row dm-empty-state">No departments found.</div>}

                    {departments.map(dept => (
                        <div className="dm-row" key={dept._id}>
                            <span>{dept.name}</span>
                            <span>{dept.description}</span>
                            <span className="dm-actions">
                                <button className="dm-btn" onClick={() => openEditModal(dept)}>Edit</button>
                                <button className="dm-btn danger" onClick={() => handleDelete(dept._id)}>Delete</button>
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {showModal && (
                <div className="modal-overlay admin-modal-overlay">
                    <div className="modal-content">
                        <h2>{isEditing ? "Edit" : "Add"} Department</h2>
                        <form onSubmit={handleSubmit}>
                            <div className="input-group">
                                <label>Name</label>
                                <input required name="name" value={formData.name} onChange={handleInputChange} />
                            </div>
                            <div className="input-group">
                                <label>Description</label>
                                <textarea className="dm-textarea-static" name="description" value={formData.description} onChange={handleInputChange} rows="3"></textarea>
                            </div>

                            <div className="modal-actions">
                                <button type="button" onClick={() => setShowModal(false)} className="dm-btn reject">Cancel</button>
                                <button type="submit" className="dm-btn approve">{isEditing ? "Update" : "Create"}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DepartmentManagement;
