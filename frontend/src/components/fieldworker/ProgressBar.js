import React from 'react';
import '../../styles/fieldworker-variables.css';
import '../../styles/FieldworkerUtilities.css';
import './ProgressBar.css';

const ProgressBar = ({ assignedToday, completedToday }) => {
    const percentage = assignedToday > 0
        ? Math.round((completedToday / assignedToday) * 100)
        : 100; // If nothing assigned, you are 100% complete for the day technically.

    const boundedPercentage = Math.min(Math.max(percentage, 0), 100);

    return (
        <div className="fwpb-card">
            <h3 className="fwpb-title">Today's Execution Progress</h3>

            <div className="fwpb-head">
                <span className="fwpb-label">Completion</span>
                <span className="fwpb-value">{boundedPercentage}%</span>
            </div>

            <div className="fwpb-track">
                <div
                    className="fwpb-fill"
                    style={{ width: `${boundedPercentage}%` }}
                ></div>
            </div>

            <div className="fwpb-foot">
                <span>{assignedToday} Tasks Assigned</span>
                <span>{completedToday} Tasks Completed</span>
            </div>
        </div>
    );
};

export default ProgressBar;
