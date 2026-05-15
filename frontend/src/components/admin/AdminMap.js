import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import axios from 'axios';
import L from 'leaflet';
import HeatmapLayer from './HeatmapLayer';
import '../../styles/admin-variables.css';
import '../../styles/AdminUtilities.css';
import './AdminMap.css';
import 'leaflet/dist/leaflet.css';

// Fix for default Leaflet marker icons not rendering gracefully in Webpack bundles
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
    iconUrl: require('leaflet/dist/images/marker-icon.png'),
    shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const AdminMap = () => {
    const [incidents, setIncidents] = useState([]);

    // Toggle Logic State (Heatmap defaults to ON, Markers OFF to reduce clutter)
    const [showHeatmap, setShowHeatmap] = useState(true);
    const [showMarkers, setShowMarkers] = useState(false);

    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchGeospatialData = async () => {
            setLoading(true);
            try {
                const token = localStorage.getItem('token');

                // Actual Axios integration pointing to the defined civic map coordinate API endpoint
                const response = await axios.get('http://localhost:5000/api/admin/heatmap', {
                    headers: { Authorization: `Bearer ${token}` }
                });

                if (response.data && response.data.length > 0) {
                    setIncidents(response.data);
                } else {
                    console.info('[AdminMap] No complaints found for heatmap — map will be empty');
                    setIncidents([]);
                }
            } catch (error) {
                console.warn('[AdminMap] Failed to fetch heatmap data — rendering empty heatmap');
                setIncidents([]);
            } finally {
                setLoading(false);
            }
        };

        fetchGeospatialData();
    }, []);

    // Utility Component to automatically center the map on the data bounds
    const MapBoundsFit = ({ data }) => {
        const map = useMap();

        useEffect(() => {
            if (data && data.length > 0) {
                // Extract all valid [lat, lng] points
                const bounds = data
                    .filter(item => item.location && item.location.coordinates && item.location.coordinates.length >= 2)
                    .map(item => [item.location.coordinates[1], item.location.coordinates[0]]);

                if (bounds.length > 0) {
                    // Fit the map to exactly contain these points, with a small padding
                    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
                }
            }
        }, [data, map]);

        return null;
    };

    // Default fallback center if no data
    const fallbackCenter = [40.730610, -73.945242];

    return (
        <div className="dashboard-container fade-in map-page">

            {/* Map Canvas Binding Area - Full Bleed */}
            <div className="dashboard-panel map-canvas">

                {/* Floating Glassmorphism UI Overlay (Top Left) */}
                <div className="map-info-overlay">
                    <h1 className="map-info-title">
                        <i className="fas fa-globe-americas map-info-title-icon"></i>
                        Geospatial Analytics
                    </h1>
                    <p className="map-info-subtitle">Live anomaly detection and density analytics across civic sectors.</p>
                </div>

                {/* Floating Layer Controls Overlay (Top Right) */}
                <div className="map-controls-overlay">

                    {/* View Markers Switch */}
                    <div className="form-check form-switch custom-switch map-toggle-row">
                        <input
                            className="form-check-input mb-0 map-toggle-input"
                            type="checkbox"
                            checked={showMarkers}
                            onChange={(e) => setShowMarkers(e.target.checked)}
                            id="toggleMarkers"
                        />
                        <label className="form-check-label text-light mb-0 map-toggle-label" htmlFor="toggleMarkers">
                            Show Markers
                        </label>
                    </div>

                    {/* View Heatmap Switch */}
                    <div className="form-check form-switch custom-switch map-toggle-row">
                        <input
                            className="form-check-input mb-0 map-toggle-input"
                            type="checkbox"
                            checked={showHeatmap}
                            onChange={(e) => setShowHeatmap(e.target.checked)}
                            id="toggleHeatmap"
                        />
                        <label className="form-check-label text-light mb-0 map-toggle-label" htmlFor="toggleHeatmap">
                            Show Heatmap
                        </label>
                    </div>
                </div>

                {loading ? (
                    <div className="map-loading">
                        <div className="spinner-border text-primary shadow-sm map-loading-spinner"></div>
                        <span className="map-loading-text">Booting Geospatial Engine...</span>
                    </div>
                ) : (
                    // maxBounds creates boundary boxes so users cannot pan arbitrarily into blank ocean
                    <MapContainer
                        center={fallbackCenter}
                        zoom={13}
                        minZoom={3}
                        maxBounds={[
                            [-90, -180],
                            [90, 180]
                        ]}
                        maxBoundsViscosity={1.0}
                        className="map-leaflet-container"
                    >

                        {/* Auto-Centering logic bounds hook */}
                        <MapBoundsFit data={incidents} />

                        {/* Carto Dark Matter Base Layer ensures UI harmony with the Government portal mode. noWrap prevents map repeating */}
                        <TileLayer
                            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                            noWrap={true}
                        />

                        {/* Density Heatmap Layer Overlay */}
                        {showHeatmap && <HeatmapLayer data={incidents} />}

                        {/* Standard Marker Layer Overlay */}
                        {showMarkers && incidents.map((incident, idx) => (
                            <Marker
                                key={idx}
                                // Leaflet requires [latitude, longitude] natively
                                position={[incident.location.coordinates[1], incident.location.coordinates[0]]}
                            >
                                <Popup>
                                    <div className="map-popup-inner">
                                        <strong className="map-popup-title">
                                            {incident.title}
                                        </strong>
                                        <div className="map-popup-severity-row">
                                            <span className="map-popup-severity-label">Severity Rating:</span>
                                            <span
                                                className="map-popup-severity-badge"
                                                style={{
                                                    background: incident.severity >= 4 ? '#ef4444' : incident.severity === 3 ? '#f59e0b' : '#3b82f6'
                                                }}
                                            >
                                                {incident.severity}/5
                                            </span>
                                        </div>
                                    </div>
                                </Popup>
                            </Marker>
                        ))}
                    </MapContainer>
                )}
            </div>
        </div>
    );
};

export default AdminMap;
