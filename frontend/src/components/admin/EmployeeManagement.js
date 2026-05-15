import React, { useCallback, useEffect, useState } from "react";
import "../../styles/admin-variables.css";
import "../../styles/AdminUtilities.css";
import "./EmployeeManagement.css";
import config from "../../config";
import { toast } from 'react-toastify';

const EmployeeManagement = () => {
    const [employees, setEmployees] = useState([]);
    const [filterRole, setFilterRole] = useState("field"); // 'field' or 'officer'
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [departments, setDepartments] = useState([]);

    const [formData, setFormData] = useState({
        name: "",
        email: "",
        password: "",
        role: "field",
        department: ""
    });

    const fetchDepartments = useCallback(() => {
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
    }, []);

    const fetchEmployees = useCallback(() => {
        const endpoint = filterRole === 'field' ? '/field-workers' : '/officers';
        fetch(`${config.API_BASE_URL}${endpoint}`)
            .then(res => res.json())
            .then(data => {
                setEmployees(data);
            })
            .catch(err => console.error(err));
    }, [filterRole]);

    useEffect(() => {
        fetchEmployees();
        fetchDepartments();
    }, [fetchEmployees, fetchDepartments]);

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const openAddModal = () => {
        setIsEditing(false);
        setFormData({ name: "", email: "", password: "", role: filterRole, department: "" });
        setShowModal(true);
    };

    const openEditModal = (employee) => {
        setIsEditing(true);
        setCurrentUser(employee);
        setFormData({
            name: employee.name,
            email: employee.email,
            role: employee.role,
            department: employee.department || "",
            password: ""
        });
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const endpoint = formData.role === 'field' ? '/field-workers' : '/officers';
            let url = `${config.API_BASE_URL}${endpoint}`;
            let method = "POST";
            let body = { ...formData };

            if (isEditing) {
                url = `${config.API_BASE_URL}${endpoint}/${currentUser._id}`;
                method = "PUT";
                delete body.password;
            }

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body)
            });

            const data = await res.json();

            if (res.ok) {
                setShowModal(false);
                fetchEmployees();
                toast.success(isEditing ? "Employee updated successfully" : "Employee created successfully");
            } else {
                toast.error(data.message || "Operation failed");
            }
        } catch (err) {
            console.error(err);
            toast.error("Error processing request");
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this employee?")) return;
        try {
            const endpoint = filterRole === 'field' ? '/field-workers' : '/officers';
            await fetch(`${config.API_BASE_URL}${endpoint}/${id}`, { method: "DELETE" });
            setEmployees(employees.filter(e => e._id !== id));
        } catch (err) {
            console.error(err);
        }
    };

    const filteredEmployees = employees; // Already filtered by backend fetch

    return (
        <div className="em-page">
            <h1 className="em-title">Employee Management</h1>

            <div className="em-tabs">
                <button
                    className={`em-btn ${filterRole === 'field' ? 'primary' : ''}`}
                    onClick={() => setFilterRole('field')}
                >
                    Field Workers
                </button>
                <button
                    className={`em-btn ${filterRole === 'officer' ? 'primary' : ''}`}
                    onClick={() => setFilterRole('officer')}
                >
                    Officers
                </button>
            </div>

            <div className="em-add-container">
                <button className="em-btn approve" onClick={openAddModal}>+ Add {filterRole === 'field' ? 'Field Worker' : 'Officer'}</button>
            </div>

            <div className="em-card">
                <div className="em-table">
                    <div className="em-row em-header">
                        <span>Name</span>
                        <span>Email</span>
                        <span>Department</span>
                        <span>Status</span>
                        <span>Actions</span>
                    </div>

                    {filteredEmployees.length === 0 && <div className="em-row em-empty-state">No {filterRole}s found.</div>}

                    {filteredEmployees.map(emp => (
                        <div className="em-row" key={emp._id}>
                            <span>{emp.name}</span>
                            <span>{emp.email}</span>
                            <span>{emp.department || "—"}</span>
                            <span>
                                <span className={`em-status ${emp.status}`}>{emp.status}</span>
                            </span>
                            <span className="em-actions">
                                <button className="em-btn" onClick={() => openEditModal(emp)}>Edit</button>
                                <button className="em-btn danger" onClick={() => handleDelete(emp._id)}>Delete</button>
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {showModal && (
                <div className="modal-overlay admin-modal-overlay"> {/* Replaced inline style with class */}
                    <div className="modal-content"> {/* Replaced inline style with class */}
                        <h2>{isEditing ? "Edit" : "Add"} {filterRole === 'field' ? 'Field Worker' : 'Officer'}</h2>
                        <form onSubmit={handleSubmit}>
                            <div className="input-group"> {/* Replaced inline style with class */}
                                <label>Name</label>
                                <input required name="name" value={formData.name} onChange={handleInputChange} /> {/* Removed inline style */}
                            </div>
                            <div className="input-group"> {/* Replaced inline style with class */}
                                <label>Email</label>
                                <input required type="email" name="email" value={formData.email} onChange={handleInputChange} /> {/* Removed inline style */}
                            </div>
                            {!isEditing && (
                                <div className="input-group"> {/* Replaced inline style with class */}
                                    <label>Password</label>
                                    <input required type="password" name="password" value={formData.password} onChange={handleInputChange} /> {/* Removed inline style */}
                                </div>
                            )}
                            <div className="input-group"> {/* Replaced inline style with class */}
                                <label>Department</label>
                                {formData.role === 'officer' || formData.role === 'field' ? (
                                    <select
                                        className="em-dept-select"
                                        name="department"
                                        value={formData.department}
                                        onChange={handleInputChange}
                                        required
                                    >
                                        <option value="">Select Department</option>
                                        {departments.map(dept => (
                                            <option key={dept._id} value={dept.name}>
                                                {dept.name}
                                            </option>
                                        ))}
                                    </select>
                                ) : (
                                    <input name="department" value={formData.department} onChange={handleInputChange} />
                                )}
                            </div>

                            {/* Internal role selection if they want to switch roles while adding, though limited by tab context usually */}
                            <div className="input-group"> {/* Replaced inline style with class */}
                                <label>Role</label>
                                <select name="role" value={formData.role} disabled={true}> {/* Disabled to enforce tab context */}
                                    <option value="field">Field Worker</option>
                                    <option value="officer">Officer</option>
                                </select>
                            </div>

                            <div className="modal-actions"> {/* Replaced inline style with class */}
                                <button type="button" onClick={() => setShowModal(false)} className="em-btn reject">Cancel</button>
                                <button type="submit" className="em-btn approve">{isEditing ? "Update" : "Create"}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

// Removed inline simple styles for modal
// const modalOverlayStyle = {
//     position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
//     backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
// };

// const modalContentStyle = {
//     backgroundColor: '#fff', padding: '20px', borderRadius: '8px', width: '400px', maxWidth: '90%'
// };

// const inputGroupStyle = { marginBottom: '15px' };
// const inputStyle = { width: '100%', padding: '8px', marginTop: '5px', borderRadius: '4px', border: '1px solid #ccc' };

export default EmployeeManagement;
