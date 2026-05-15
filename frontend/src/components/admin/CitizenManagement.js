import React, { useEffect, useState } from "react";
import "../../styles/admin-variables.css";
import "./CitizenManagement.css";
import config from "../../config";

const CitizenManagement = () => {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    fetch(`${config.API_BASE_URL}/citizens?role=citizen`) // Updated endpoint
      .then(res => res.json())
      .then(data => setUsers(data))
      .catch(err => console.error(err));
  }, []);

  const formatDate = (date) => {
    if (!date) return "—";
    const d = new Date(date);
    return isNaN(d) ? "—" : d.toLocaleDateString();
  };

  const handleApprove = async (id) => {
    try {
      await fetch(`${config.API_BASE_URL}/citizens/${id}/approve`, { method: "PUT" });
      setUsers(users.map(u => u._id === id ? { ...u, status: "active" } : u));
    } catch (err) {
      console.error("Error approving user:", err);
    }
  };

  const handleReject = async (id) => {
    try {
      await fetch(`${config.API_BASE_URL}/citizens/${id}/reject`, { method: "PUT" });
      setUsers(users.map(u => u._id === id ? { ...u, status: "rejected" } : u));
    } catch (err) {
      console.error("Error rejecting user:", err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;
    try {
      await fetch(`${config.API_BASE_URL}/citizens/${id}`, { method: "DELETE" });
      setUsers(users.filter(u => u._id !== id));
    } catch (err) {
      console.error("Error deleting user:", err);
    }
  };

  return (
    <div className="um-page">
      <h1 className="um-title">Citizen Management</h1>

      <div className="um-card">
        <div className="um-table">

          {/* Header */}
          <div className="um-row um-header">
            <span>Name</span>
            <span>Email</span>
            <span>Role</span>
            <span>Status</span>
            <span>Joined</span>
            <span>Actions</span>
          </div>

          {/* Empty State */}
          {users.length === 0 && (
            <div className="um-row um-empty-state um-empty-row">
              No citizens found.
            </div>
          )}

          {/* Rows */}
          {users.map(user => (
            <div className="um-row" key={user._id}>
              <span>{user.name}</span>
              <span>{user.email}</span>
              <span className="capitalize">{user.role}</span>

              <span>
                <span className={`um-status ${user.status}`}>
                  {user.status}
                </span>
              </span>

              <span>{formatDate(user.createdAt)}</span>

              <span className="um-actions">
                {user.status === 'pending' && (
                  <>
                    <button className="um-btn approve" onClick={() => handleApprove(user._id)}>Approve</button>
                    <button className="um-btn reject" onClick={() => handleReject(user._id)}>Reject</button>
                  </>
                )}
                <button className="um-btn danger" onClick={() => handleDelete(user._id)}>Delete</button>
              </span>
            </div>
          ))}

        </div>
      </div>
    </div>
  );
};

export default CitizenManagement;
