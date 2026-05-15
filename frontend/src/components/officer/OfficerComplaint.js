import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import Loader from '../common/Loader';
import config from '../../config';
import { resolveImageUrl } from '../../utils/imageUrl';
import { getStatusColor, getStatusLabel, normalizeStatus } from '../../utils/statusUtils';
import '../../styles/officer-variables.css';
import '../../styles/OfficerUtilities.css';
import './officerDashboard.css';
import './OfficerComplaint.css';

const TAB_CONFIG = [
    { key: 'All', label: 'All Complaints', slug: '' },
    { key: 'REPORTED', label: 'Pending', slug: 'pending' },
    { key: 'ASSIGNED', label: 'Assigned', slug: 'assigned' },
    { key: 'IN_PROGRESS', label: 'In Progress', slug: 'inprogress' },
    { key: 'VERIFICATION_PENDING', label: 'Pending Review', slug: 'review' },
    { key: 'RESOLVED', label: 'Resolved', slug: 'resolved' },
    { key: 'REJECTED', label: 'Rejected', slug: 'rejected' }
];

const TAB_BADGE_CLASS = {
    All: 'all',
    REPORTED: 'pending',
    ASSIGNED: 'assigned',
    IN_PROGRESS: 'inprogress',
    VERIFICATION_PENDING: 'review',
    RESOLVED: 'resolved',
    REJECTED: 'rejected'
};

const getTabFromParam = (param) => {
    if (!param) return 'All';

    const map = {
        pending: 'REPORTED',
        assigned: 'ASSIGNED',
        inprogress: 'IN_PROGRESS',
        review: 'VERIFICATION_PENDING',
        resolved: 'RESOLVED',
        rejected: 'REJECTED'
    };

    return map[param.toLowerCase()] || 'All';
};

const OfficerComplaint = () => {
    const { status } = useParams();
    const navigate = useNavigate();
    const [complaints, setComplaints] = useState([]);
    const [fieldWorkers, setFieldWorkers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedWorker, setSelectedWorker] = useState({});
    const [errorMsg, setErrorMsg] = useState('');

    const activeTab = getTabFromParam(status);

    useEffect(() => {
        const init = async () => {
            const officer = await fetchOfficerProfile();
            if (officer?.department) {
                fetchFieldWorkers(officer.department);
            } else {
                fetchFieldWorkers();
            }
            fetchComplaints();
        };

        init();
    }, []);

    const fetchOfficerProfile = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return null;

            const res = await fetch(`${config.API_BASE_URL}/officers/me`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                return data.user;
            }
        } catch (err) {
            console.error('Failed to fetch officer profile', err);
        }
        return null;
    };

    const fetchComplaints = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                setErrorMsg('Not authenticated. Please log in as an officer.');
                setComplaints([]);
                setLoading(false);
                return;
            }

            const res = await fetch(`${config.API_BASE_URL}/complaints`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            let data = null;
            try {
                data = await res.json();
            } catch (e) {
                data = null;
            }

            if (!res.ok) {
                console.error('Fetch complaints failed', res.status, data);
                setErrorMsg((data && data.message) ? data.message : `API error ${res.status}`);
                setComplaints([]);
                setLoading(false);
                return;
            }

            if (data?.success) {
                if (data.debug) console.log('Server Debug:', data.debug);
                setComplaints(data.data || []);
            } else {
                setErrorMsg(data?.message || 'No complaints returned');
                setComplaints([]);
            }
        } catch (err) {
            console.error('Failed to fetch complaints', err);
            setErrorMsg('Failed to fetch complaints (see console)');
            setComplaints([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchFieldWorkers = async (department) => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${config.API_BASE_URL}/field-workers`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });
            const data = await res.json();

            let workers = [];
            if (Array.isArray(data)) {
                workers = data;
            } else if (Array.isArray(data?.data)) {
                workers = data.data;
            }

            if (department) {
                workers = workers.filter((worker) => worker.department === department);
            }

            setFieldWorkers(workers);
        } catch (err) {
            console.error('Failed to fetch field workers', err);
        }
    };

    const handleWorkerSelect = (complaintId, workerId) => {
        setSelectedWorker((prev) => ({
            ...prev,
            [complaintId]: workerId
        }));
    };

    const handleAssign = async (complaintId, currentWorkerId = null) => {
        const workerId = selectedWorker[complaintId];
        if (!workerId) {
            toast.warning('Please select a field worker first.');
            return;
        }
        if (currentWorkerId && workerId === currentWorkerId) {
            toast.info('Select a different field worker to reassign.');
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${config.API_BASE_URL}/schedules`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    complaint_id: complaintId,
                    employee_id: workerId,
                    officerRemarks: currentWorkerId ? 'Reassigned by Officer' : 'Assigned by Officer',
                    assignedAt: new Date()
                })
            });
            const data = await res.json();
            if (data.success) {
                toast.success(currentWorkerId ? 'Field Worker Reassigned Successfully!' : 'Field Worker Assigned Successfully!');
                setSelectedWorker((prev) => {
                    const next = { ...prev };
                    delete next[complaintId];
                    return next;
                });
                fetchComplaints();
            } else {
                toast.error(data.message || 'Assignment failed');
            }
        } catch (err) {
            console.error('Assignment error:', err);
            toast.error('Error assigning field worker');
        }
    };

    const getCount = (statusKey) => {
        if (statusKey === 'All') return complaints.length;
        return complaints.filter((complaint) => normalizeStatus(complaint.status) === statusKey).length;
    };

    const handleTabClick = (tabKey) => {
        const tab = TAB_CONFIG.find((item) => item.key === tabKey);
        if (!tab || tab.key === 'All') {
            navigate('/officer/complaints');
            return;
        }
        navigate(`/officer/complaints/${tab.slug}`);
    };

    const displayedComplaints = activeTab === 'All'
        ? complaints
        : complaints.filter((complaint) => normalizeStatus(complaint.status) === activeTab);

    if (loading) return <Loader text="Fetching complaints..." />;

    if (errorMsg) return <div className="oc-error"><strong>Error:</strong> {errorMsg}</div>;

    return (
        <div className="officer-card animate-fade-up">
            <h2>Complaint Management</h2>

            <div className="officer-tabs oc-tabs">
                {TAB_CONFIG.map((tab) => (
                    <button
                        key={tab.key}
                        className={`officer-tab ${activeTab === tab.key ? 'active' : ''}`}
                        onClick={() => handleTabClick(tab.key)}
                    >
                        {tab.label}
                        {getCount(tab.key) > 0 && (
                            <span className={`tab-badge oc-tab-badge-${TAB_BADGE_CLASS[tab.key]}`}>
                                {getCount(tab.key)}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            <div className="complaint-list">
                {displayedComplaints.length === 0 && (
                    <p className="text-muted">
                        No complaints found with status: <strong>{activeTab === 'All' ? 'All Complaints' : getStatusLabel(activeTab)}</strong>.
                    </p>
                )}

                {displayedComplaints.map((item) => {
                    const normalizedStatus = normalizeStatus(item.status);
                    const isPendingReview = normalizedStatus === 'VERIFICATION_PENDING';
                    const isClosed = normalizedStatus === 'RESOLVED' || normalizedStatus === 'REJECTED';

                    return (
                        <div className="complaint-item oc-complaint-item" key={item._id}>
                            <div className="oc-row-main">
                                <div className="oc-images">
                                    <div>
                                        <span className="oc-image-label">Before</span>
                                        {item.beforeImageUrl ? (
                                            <img
                                                src={resolveImageUrl(item.beforeImageUrl)}
                                                alt="Issue Before"
                                                className="complaint-img oc-before-img"
                                            />
                                        ) : (
                                            <div className="oc-before-placeholder"></div>
                                        )}
                                    </div>
                                    {['VERIFICATION_PENDING', 'RESOLVED'].includes(normalizedStatus) && item.afterImageUrl && (
                                        <div>
                                            <span className="oc-image-label-resolved">
                                                {isPendingReview ? 'After (Pending Review)' : 'After (Resolved)'}
                                            </span>
                                            <img
                                                src={resolveImageUrl(item.afterImageUrl)}
                                                alt="Issue After"
                                                className="complaint-img oc-after-img"
                                            />
                                        </div>
                                    )}
                                </div>

                                <div className="complaint-info oc-info">
                                    <div className="officer-flex-between oc-header-row">
                                        <h3 className="oc-title">{item.title}</h3>
                                        <div className="oc-header-actions">
                                            <span
                                                className="oc-status-pill"
                                                style={{
                                                    background: `${getStatusColor(normalizedStatus)}22`,
                                                    color: getStatusColor(normalizedStatus),
                                                    border: `1px solid ${getStatusColor(normalizedStatus)}44`
                                                }}
                                            >
                                                {getStatusLabel(normalizedStatus)}
                                            </span>
                                            <div className="oc-status-actions">
                                                <button
                                                    className="oc-view-btn-mini"
                                                    onClick={() => navigate(`/officer/complaint/${item._id}`)}
                                                >
                                                    View
                                                </button>
                                                {isPendingReview && (
                                                    <button
                                                        className="oc-review-btn-mini animate-pulse"
                                                        onClick={() => navigate(`/officer/complaint/${item._id}`)}
                                                    >
                                                        Review
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <p className="oc-description">{item.description}</p>

                                    <div className="oc-meta-grid">
                                        <span>
                                            <i className="fas fa-map-marker-alt"></i>{' '}
                                            {item.address || item.report_location || (item.location?.coordinates
                                                ? `Lat: ${item.location.coordinates[1].toFixed(4)}, Long: ${item.location.coordinates[0].toFixed(4)}`
                                                : 'Location not available')}
                                        </span>
                                        <span>
                                            <i className="fas fa-calendar"></i>{' '}
                                            {new Date(item.createdAt).toLocaleDateString('en-GB').replace(/\//g, '-')}
                                        </span>
                                        <span><i className="fas fa-hashtag"></i> {item.complaintId || item._id}</span>
                                        <span><i className="fas fa-user"></i> {item.citizenId?.name || 'Unknown Citizen'}</span>
                                        <span><i className="fas fa-tag"></i> {item.issueType}</span>
                                    </div>

                                    <div className="oc-assignment-box">
                                        {item.employee_id && !isClosed ? (
                                            <div className="oc-assigned-wrap">
                                                <div className="oc-assigned-row">
                                                    <i className="fas fa-check-circle"></i>
                                                    <span>Assigned to: <strong>{item.employee_id.name}</strong></span>
                                                </div>
                                                <button
                                                    className="officer-tab oc-change-btn"
                                                    onClick={() => setSelectedWorker((prev) => ({ ...prev, [item._id]: 'reassign' }))}
                                                >
                                                    Change Worker
                                                </button>
                                            </div>
                                        ) : null}

                                        {(!item.employee_id || selectedWorker[item._id]) && !isClosed && (
                                            <div className={`oc-assign-controls ${item.employee_id ? 'oc-assign-controls-reassign' : ''}`}>
                                                <select
                                                    className="officer-input oc-worker-select"
                                                    value={selectedWorker[item._id] === 'reassign' ? '' : (selectedWorker[item._id] || '')}
                                                    onChange={(e) => handleWorkerSelect(item._id, e.target.value)}
                                                >
                                                    <option value="">
                                                        -- {item.employee_id ? 'Select New Worker (or Cancel)' : 'Select Field Worker'} --
                                                    </option>
                                                    {fieldWorkers.map((worker) => (
                                                        <option key={worker._id} value={worker._id}>
                                                            {worker.name} ({worker.department})
                                                        </option>
                                                    ))}
                                                </select>
                                                <button
                                                    className="btn-submit oc-assign-btn"
                                                    onClick={() => handleAssign(item._id, item.employee_id?._id)}
                                                >
                                                    {item.employee_id ? 'Re-Assign' : 'Assign'}
                                                </button>
                                                {item.employee_id && (
                                                    <button
                                                        className="officer-tab oc-cancel-btn"
                                                        onClick={() => setSelectedWorker((prev) => {
                                                            const next = { ...prev };
                                                            delete next[item._id];
                                                            return next;
                                                        })}
                                                    >
                                                        Cancel
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default OfficerComplaint;
