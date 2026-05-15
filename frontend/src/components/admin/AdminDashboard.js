import React, { useState } from 'react';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('dashboard');


  return (
    <div className="dashboard-content">


      {/* Recent Activity */}
      <div className="recent-activity">
        <div className="section-header admin-flex-between">
          <h3>Recent Incidents</h3>
        </div>

        <div className="activity-list">
          {/* Placeholder for recent incidents */}
          <p>No recent incidents to display.</p>
        </div>

      </div>
    </div>


  );
};

export default AdminDashboard;
