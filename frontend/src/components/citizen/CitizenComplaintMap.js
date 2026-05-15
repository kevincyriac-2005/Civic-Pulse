import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import config from '../../config';
import '../../styles/citizen-variables.css';
import '../../styles/CitizenUtilities.css';
import 'leaflet/dist/leaflet.css';
import './CitizenComplaintMap.css';

/* ── Fix Leaflet default marker icon path issue with bundlers ── */
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

/* ── Color-coded marker icons by status ── */
const createColorIcon = (color) => new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const statusIconMap = {
    'Pending': createColorIcon('red'),
    'Open': createColorIcon('red'),
    'Assigned': createColorIcon('orange'),
    'InProgress': createColorIcon('orange'),
    'Scheduled': createColorIcon('orange'),
    'Resolved': createColorIcon('green'),
    'Resolved - Pending Officer Review': createColorIcon('yellow'),
    'Rejected': createColorIcon('grey'),
};

const getMarkerIcon = (status) => statusIconMap[status] || createColorIcon('blue');

/* ── Component to fly to user's location ── */
const FlyToUser = ({ position }) => {
    const map = useMap();
    useEffect(() => {
        if (position) {
            map.flyTo(position, 14, { duration: 1.5 });
        }
    }, [position, map]);
    return null;
};

/* ── Main Component ── */
const CitizenComplaintMap = () => {
    const [complaints, setComplaints] = useState([]);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState('');
    const [userPos, setUserPos] = useState(null);
    const [nearbyOnly, setNearbyOnly] = useState(false);

    // Kerala fallback center
    const defaultCenter = [9.462, 76.547];
    const mapCenter = userPos || defaultCenter;

    useEffect(() => {
        // Get user location
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => setUserPos([pos.coords.latitude, pos.coords.longitude]),
                () => console.log('Geolocation denied, using default center.')
            );
        }
        fetchMapComplaints();
    }, []);

    const fetchMapComplaints = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) { setErrorMsg('Not authenticated.'); setLoading(false); return; }

            const res = await fetch(`${config.API_BASE_URL}/complaints/map`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();

            if (res.ok && data.success) {
                setComplaints(data.complaints || []);
            } else {
                setErrorMsg(data.message || 'Failed to load map data.');
            }
        } catch (err) {
            console.error('Map data fetch error:', err);
            setErrorMsg('Network error. Could not load complaints.');
        } finally {
            setLoading(false);
        }
    };

    // Haversine filter for nearby complaints (5km radius)
    const filteredComplaints = useMemo(() => {
        if (!nearbyOnly || !userPos) return complaints;

        const haversine = (lat1, lon1, lat2, lon2) => {
            const R = 6371e3;
            const toRad = (v) => (v * Math.PI) / 180;
            const dLat = toRad(lat2 - lat1);
            const dLon = toRad(lon2 - lon1);
            const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
            return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        };

        return complaints.filter(c => {
            const coords = c.location?.coordinates;
            if (!coords || coords.length < 2) return false;
            const dist = haversine(userPos[0], userPos[1], coords[1], coords[0]);
            return dist <= 5000; // 5km
        });
    }, [complaints, nearbyOnly, userPos]);

    const getStatusColor = (status) => {
        const map = {
            'Pending': '#ef4444', 'Open': '#ef4444',
            'Assigned': '#f97316', 'InProgress': '#f97316', 'Scheduled': '#f97316',
            'Resolved': '#10b981',
            'Resolved - Pending Officer Review': '#eab308',
            'Rejected': '#6b7280'
        };
        return map[status] || '#3b82f6';
    };

    return (
        <div className="ccm-wrap">
            {/* Controls Overlay */}
            <div className="ccm-controls">
                <button
                    onClick={() => setNearbyOnly(!nearbyOnly)}
                    disabled={!userPos}
                    className="ccm-nearby-btn"
                    style={{
                        background: nearbyOnly ? 'rgba(16, 185, 129, 0.9)' : 'rgba(15, 23, 42, 0.9)',
                        cursor: userPos ? 'pointer' : 'not-allowed',
                        opacity: userPos ? 1 : 0.5
                    }}
                >
                    <i className="fas fa-location-crosshairs ccm-nearby-icon"></i>
                    {nearbyOnly ? 'Showing Nearby (5km)' : 'Show Nearby Only'}
                </button>

                <div className="ccm-count-pill">
                    {loading ? '...' : `${filteredComplaints.length} complaint${filteredComplaints.length !== 1 ? 's' : ''}`}
                </div>
            </div>

            {/* Legend */}
            <div className="ccm-legend">
                <div className="ccm-legend-title">Legend</div>
                {[
                    { label: 'Open / Pending', color: '#ef4444' },
                    { label: 'Assigned / In Progress', color: '#f97316' },
                    { label: 'Resolved', color: '#10b981' },
                    { label: 'Pending Review', color: '#eab308' },
                ].map(item => (
                    <div key={item.label} className="ccm-legend-row">
                        <span className="ccm-legend-dot" style={{ background: item.color }}></span>
                        {item.label}
                    </div>
                ))}
            </div>

            {/* Error Overlay */}
            {errorMsg && (
                <div className="ccm-error">
                    <i className="fas fa-exclamation-triangle ccm-error-icon"></i>
                    {errorMsg}
                </div>
            )}

            {/* Map */}
            <MapContainer
                center={mapCenter}
                zoom={userPos ? 14 : 10}
                className="ccm-map"
                zoomControl={true}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {userPos && <FlyToUser position={userPos} />}

                {/* User Location Marker */}
                {userPos && (
                    <Marker position={userPos} icon={new L.Icon({
                        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png',
                        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
                        iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
                    })}>
                        <Popup>
                            <div className="ccm-user-popup">Your Location</div>
                        </Popup>
                    </Marker>
                )}

                {/* Complaint Markers */}
                {filteredComplaints.map(c => {
                    const coords = c.location?.coordinates;
                    if (!coords || coords.length < 2) return null;
                    const lat = coords[1];
                    const lng = coords[0];

                    return (
                        <Marker key={c._id} position={[lat, lng]} icon={getMarkerIcon(c.status)}>
                            <Popup maxWidth={280} minWidth={200}>
                                <div className="ccm-popup">
                                    <div className="ccm-popup-head">
                                        <strong className="ccm-popup-title">{c.issueType || 'General'}</strong>
                                        <span className="ccm-popup-status" style={{
                                            background: `${getStatusColor(c.status)}22`,
                                            color: getStatusColor(c.status),
                                            border: `1px solid ${getStatusColor(c.status)}44`
                                        }}>
                                            {c.status}
                                        </span>
                                    </div>
                                    <p className="ccm-popup-desc">
                                        {c.title || c.description?.substring(0, 80) || 'No description'}
                                    </p>
                                    <div className="ccm-popup-meta">
                                        <div><i className="fas fa-map-pin ccm-popup-meta-icon"></i> {c.address || 'GPS Location'}</div>
                                        <div><i className="fas fa-calendar ccm-popup-meta-icon"></i> {new Date(c.createdAt).toLocaleDateString()}</div>
                                    </div>
                                </div>
                            </Popup>
                        </Marker>
                    );
                })}
            </MapContainer>
        </div>
    );
};

export default CitizenComplaintMap;
