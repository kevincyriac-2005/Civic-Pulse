import React, { useState, useEffect } from 'react';
import axios from 'axios';
import config from '../../config';
import TaskCard from './TaskCard';
import Loader from '../common/Loader';
import { toast } from 'react-toastify';
import '../../styles/fieldworker-variables.css';
import '../../styles/FieldworkerUtilities.css';
import './FieldWorker.css';
import './MyTasks.css';

const MyTasks = () => {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchTasks = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const response = await axios.get(`${config.API_BASE_URL}/field-workers/tasks`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.success) {
                setTasks(response.data.activeTasks);
            }
        } catch (error) {
            console.error("Error fetching tasks:", error);
            toast.error("Failed to load task assignments");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTasks();
    }, []);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader text="Loading execution protocols..." />
            </div>
        );
    }

    return (
        <div className="fw-page-container">
            <div className="fw-max-width">
                <header className="fw-header-card myt-header-card">
                    <div>
                        <h2 className="fw-header-title myt-header-title">
                            <i className="fas fa-layer-group text-blue"></i> My Tasks
                        </h2>
                        <p className="fw-header-subtitle">Detailed list of your assigned municipal operations.</p>
                    </div>
                </header>

                {tasks.length === 0 ? (
                    <div className="myt-empty-card">
                        <div className="myt-empty-icon-wrap">
                            <i className="fas fa-clipboard-check myt-empty-icon"></i>
                        </div>
                        <h3 className="myt-empty-title">Queue Empty</h3>
                        <p className="myt-empty-subtitle">You have no active assignments mapped to your profile.</p>
                    </div>
                ) : (
                    <div className="fw-grid-tasks">
                        {tasks.map(task => (
                            <TaskCard
                                key={task._id}
                                task={task}
                                onRefresh={fetchTasks}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default MyTasks;

