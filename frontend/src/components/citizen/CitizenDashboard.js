import React, { useState, useEffect, useRef, useMemo } from 'react';
import config from '../../config';
import '../../styles/citizen-variables.css';
import '../../styles/CitizenUtilities.css';
import './CitizenDashboard.css';
import './CitizenDashboardPage.css';
import EXIF from 'exif-js';
import Webcam from 'react-webcam';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Fix for Leaflet marker icons in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
    iconUrl: require('leaflet/dist/images/marker-icon.png'),
    shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

// Helper component to recenter map when coords change
// Helper component to recenter map when coords change
function RecenterMap({ lat, lng }) {
    const map = useMap();

    // Fix map rendering issues on load/resize (once)
    useEffect(() => {
        setTimeout(() => {
            map.invalidateSize();
        }, 100);
    }, [map]);

    // Update view when coordinates change
    useEffect(() => {
        map.setView([lat, lng]);
    }, [lat, lng, map]);

    return null;
}

const CitizenDashboard = () => {
    const [form, setForm] = useState({
        title: '',
        description: '',
        imageUrl: '', // Base64 string
        latitude: '',
        longitude: ''
    });
    const [imagePreview, setImagePreview] = useState(null);
    const [loading, setLoading] = useState(false);
    const [gpsStatus, setGpsStatus] = useState("Locating...");
    // Statuses: "Locating...", "Locked (GPS)", "Locked (Image)", "Refining...", "Error", "Not Supported"
    const [accuracy, setAccuracy] = useState(null);
    const [isMobile, setIsMobile] = useState(false);
    const [captureSource, setCaptureSource] = useState('unknown');
    const [locationWarning, setLocationWarning] = useState(null);
    const [acceptApproxLocation, setAcceptApproxLocation] = useState(false);

    // 1. Device Detection on Mount
    const [watchId, setWatchId] = useState(null);
    const [usingImageLocation, setUsingImageLocation] = useState(false);
    const [deviceCoords, setDeviceCoords] = useState(null); // BACKGROUND GPS STORAGE


    // Lock to prevent GPS from overwriting Manual/Image location
    const locationLockRef = useRef(false);

    useEffect(() => {
        const checkMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        setIsMobile(checkMobile);
        setCaptureSource(checkMobile ? 'live' : 'desktop');

        return () => {
            if (watchId) navigator.geolocation.clearWatch(watchId);
        };
    }, []);

    // Marker Ref for Draggable Logic
    const markerRef = useRef(null);

    // Drag Event Handler
    const eventHandlers = useMemo(
        () => ({
            dragend() {
                const marker = markerRef.current;
                if (marker != null) {
                    const { lat, lng } = marker.getLatLng();
                    setForm(prev => ({
                        ...prev,
                        latitude: lat.toFixed(6),
                        longitude: lng.toFixed(6)
                    }));

                    locationLockRef.current = true; // LOCK GPS on Manual Drag
                    setGpsStatus("Manual Adjustment");
                    setAccuracy(5); // Treat manual pin as high accuracy
                    setAcceptApproxLocation(false); // Clear approx flag since user manually set it
                }
            },
        }),
        [],
    );

    // 2. Get HTML5 Geolocation (High Accuracy)
    const getLocation = () => {
        // NOTE: We do NOT return early if usingImageLocation.
        // We WANT this running in the background to keep 'deviceCoords' fresh.

        if ("geolocation" in navigator) {
            // Only start watch if not already watching (prevent duplicates)
            if (watchId) return;

            setGpsStatus("Locating...");
            const id = navigator.geolocation.watchPosition(
                (position) => {
                    const { latitude, longitude, accuracy } = position.coords;

                    // 1. ALWAYS store the latest device location in background
                    const safeLat = latitude.toFixed(6);
                    const safeLng = longitude.toFixed(6);
                    setDeviceCoords({ latitude: safeLat, longitude: safeLng, accuracy });

                    // 2. Only update the Visible Form if not locked (Visual override)
                    if (!locationLockRef.current) {
                        setAccuracy(accuracy);
                        setForm(prev => ({
                            ...prev,
                            latitude: safeLat,
                            longitude: safeLng
                        }));

                        const threshold = isMobile ? 20 : 100;
                        if (accuracy <= threshold) {
                            setGpsStatus("Locked (Device GPS)");
                        } else if (!isMobile && accuracy > 100) {
                            setGpsStatus("Approximate (IP-Based)");
                        } else {
                            setGpsStatus("Refining...");
                        }
                    }
                },
                (error) => {
                    console.error("Error getting location:", error);
                    if (!locationLockRef.current) {
                        setGpsStatus("Error");
                        setAccuracy(null);
                    }
                },
                {
                    enableHighAccuracy: true,
                    timeout: 20000,
                    maximumAge: 0
                }
            );
            setWatchId(id);
        } else {
            setGpsStatus("Not Supported");
            setAccuracy(null);
        }
    };

    useEffect(() => {
        getLocation();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isMobile]); // Remove usingImageLocation dependency so it doesn't restart

    // Reset the "accept approximate" checkbox when gpsStatus changes
    useEffect(() => {
        if (!gpsStatus.includes("Approximate")) {
            setAcceptApproxLocation(false);
        }
    }, [gpsStatus]);

    // Helper: Convert DMS to Decimal
    const toDecimal = (number) => {
        return number[0].numerator + number[1].numerator / (60 * number[1].denominator) + number[2].numerator / (3600 * number[2].denominator);
    };

    const extractGPS = (file) => {
        EXIF.getData(file, function () {
            const lat = EXIF.getTag(this, "GPSLatitude");
            const lon = EXIF.getTag(this, "GPSLongitude");
            const latRef = EXIF.getTag(this, "GPSLatitudeRef");
            const lonRef = EXIF.getTag(this, "GPSLongitudeRef");

            if (lat && lon && latRef && lonRef) {
                let latitude = toDecimal(lat);
                let longitude = toDecimal(lon);

                if (latRef === "S") latitude = -latitude;
                if (lonRef === "W") longitude = -longitude;

                console.log("Extracted GPS from Image:", latitude, longitude);

                // Update Form with Trusted Image Location
                setForm(prev => ({
                    ...prev,
                    latitude: latitude.toFixed(6),
                    longitude: longitude.toFixed(6)
                }));

                setUsingImageLocation(true); // Stop device GPS updates
                locationLockRef.current = true; // LOCK GPS
                setGpsStatus("Locked (Image Metadata)");
                setAccuracy(5); // Treat as high accuracy
                setLocationWarning(null); // Clear any previous warning
                // DO NOT STOP WATCH (navigator.geolocation.clearWatch)
                // Keep it backgrounded!
            } else {
                console.log("No GPS data found in image.");

                setUsingImageLocation(false);

                // If user manually adjusted, don't overwrite with device GPS
                if (gpsStatus === "Manual Adjustment") {
                    console.log("Preserving Manual Location despite missing EXIF");
                    // We keep locationLockRef.current = true (implicitly, since we don't set it to false)
                    if (!isMobile) {
                        const msg = "⚠️ Image lacks GPS data. Keeping your manually pinned location.";
                        toast.info(msg);
                        setLocationWarning(msg);
                    }
                } else {
                    // Fallback to Device GPS
                    locationLockRef.current = false; // UNLOCK GPS

                    if (deviceCoords) {
                        // Instant Restore from Background Data
                        setForm(prev => ({
                            ...prev,
                            latitude: deviceCoords.latitude,
                            longitude: deviceCoords.longitude
                        }));
                        setAccuracy(deviceCoords.accuracy);

                        const threshold = isMobile ? 20 : 100;
                        if (deviceCoords.accuracy <= threshold) {
                            setGpsStatus("Locked (Device GPS)");
                        } else {
                            setGpsStatus("Approximate (IP-Based)");
                        }
                    } else {
                        // Only show "Locating" if we really have no data yet
                        setGpsStatus("Locating...");
                    }

                    // If on PC and no EXIF data, warn user
                    if (!isMobile) {
                        const msg = "⚠️ CAUTION: No GPS data found in this image. Switched to Device Live Location (Approximate).";
                        toast.warning(msg);
                        setLocationWarning(msg);
                    } else {
                        setLocationWarning(null);
                    }
                }
            }
        });
    };

    const compressImage = (file) => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 800;
                    const scaleSize = MAX_WIDTH / img.width;
                    canvas.width = MAX_WIDTH;
                    canvas.height = img.height * scaleSize;

                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                    const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
                    resolve(dataUrl);
                };
            };
        });
    };

    const webcamRef = React.useRef(null);
    const [isCapturing, setIsCapturing] = useState(false);
    const [cameraError, setCameraError] = useState(null);

    const captureWebcam = React.useCallback(() => {
        const imageSrc = webcamRef.current.getScreenshot();
        setForm(prev => ({ ...prev, imageUrl: imageSrc }));
        setImagePreview(imageSrc);
        setIsCapturing(false);
        setCameraError(null);
        // Live camera usually implies current device location, so we stick to device GPS
        setUsingImageLocation(false);
        getLocation();
    }, [webcamRef]);

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (file) {
            try {
                // 1. Extract GPS (Priority)
                extractGPS(file);

                // 2. Compress Image
                const compressedBase64 = await compressImage(file);
                setImagePreview(compressedBase64);
                setForm(prev => ({ ...prev, imageUrl: compressedBase64 }));
            } catch (error) {
                console.error("Image processing failed:", error);
                toast.error("Failed to process image.");
            }
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Allow submission if we have a locked signal (Device or Image)
        const isLocked = gpsStatus.includes("Locked");
        const isAccurateEnough = accuracy && accuracy < 200;
        const isRefining = gpsStatus === "Refining...";
        const isApproxAllowed = gpsStatus.includes("Approximate") && acceptApproxLocation;

        const canProceed = isLocked || isAccurateEnough || isRefining || isApproxAllowed;

        if (!canProceed) {
            toast.warning("Cannot submit: No valid location found. Please wait for GPS or upload an image with location data.");
            return;
        }

        if (!form.imageUrl) {
            toast.warning("Evidence is required. Please take a photo or upload an image.");
            return;
        }

        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                toast.error("You are not logged in. Please sign in to report an issue.");
                window.location.href = '/login';
                return;
            }

            // Construct Payload with Metadata
            const payload = {
                title: form.title,
                description: form.description,
                imageUrl: form.imageUrl,
                location: {
                    type: 'Point',
                    coordinates: [parseFloat(form.longitude), parseFloat(form.latitude)] // GeoJSON is [Long, Lat]
                },
                captureSource: captureSource,
                address: `Lat: ${form.latitude}, Long: ${form.longitude} (${gpsStatus})`
            };

            const res = await fetch(`${config.API_BASE_URL}/complaints`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });
            const data = await res.json();

            if (res.ok) {
                toast.success("Complaint Submitted Successfully! 🚀");
                setForm({ title: '', description: '', imageUrl: '', latitude: '', longitude: '' });
                setImagePreview(null);
                setCaptureSource(isMobile ? 'live' : 'desktop');
                setUsingImageLocation(false);
                locationLockRef.current = false; // UNLOCK
                getLocation(); // Re-lock location for next report
            } else {
                toast.error(data.message || "Failed to submit complaint");
            }
        } catch (err) {
            console.error("Submission error:", err);
            toast.error("Server error. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="citizen-grid">
            <div className="citizen-card animate-fade-up">
                <h2>Report Issue</h2>
                <form onSubmit={handleSubmit}>

                    {/* Title */}
                    <div className="form-group">
                        <label>Issue Title</label>
                        <input
                            name="title"
                            className="citizen-input"
                            value={form.title}
                            onChange={handleInputChange}
                            placeholder="e.g. Pothole on Main St"
                            required
                        />
                    </div>

                    {/* Description */}
                    <div className="form-group">
                        <label>Description</label>
                        <textarea
                            name="description"
                            className="citizen-input"
                            value={form.description}
                            onChange={handleInputChange}
                            placeholder="Describe the issue..."
                            required
                        />
                    </div>

                    {/* Image Upload - Conditional on GPS */}
                    <div className="form-group">
                        <div className="cd-upload-head">
                            <label>
                                Upload Evidence
                                {captureSource === 'gallery' ?
                                    <span className="status-badge cd-mode-badge cd-mode-badge-gallery">Gallery Mode</span> :
                                    (captureSource === 'live' ?
                                        <span className="status-badge resolved cd-mode-badge">Live Camera</span> :
                                        <span className="status-badge pending cd-mode-badge">File Upload</span>
                                    )
                                }
                            </label>

                            {/* Mode Toggles (New UI) */}
                            <div className="toggle-group">
                                {/* Option 1: Live/Camera */}
                                <button
                                    type="button"
                                    className={`toggle-btn ${captureSource === 'live' ? 'active' : ''}`}
                                    onClick={() => {
                                        setCaptureSource('live');
                                        setIsCapturing(true);
                                        setImagePreview(null);
                                        setForm(prev => ({ ...prev, imageUrl: '' }));

                                        // INSTANT SWITCH LOGIC
                                        setUsingImageLocation(false);
                                        locationLockRef.current = false; // UNLOCK
                                        setLocationWarning(null);

                                        if (deviceCoords) {
                                            // Instant Restore from Background Data
                                            setForm(prev => ({
                                                ...prev,
                                                latitude: deviceCoords.latitude,
                                                longitude: deviceCoords.longitude
                                            }));
                                            setAccuracy(deviceCoords.accuracy);

                                            const threshold = isMobile ? 20 : 100;
                                            if (deviceCoords.accuracy <= threshold) {
                                                setGpsStatus("Locked (Device GPS)");
                                            } else {
                                                setGpsStatus("Approximate (IP-Based)");
                                            }
                                        } else {
                                            // Only if real cold start
                                            getLocation();
                                        }

                                        // RED WARNING for PC Users on Live Camera
                                        if (!isMobile) {
                                            setLocationWarning("⚠️ CAUTION: PC Location is IP-based and often inaccurate. Please verify your address manually in the details field.");
                                        }
                                    }}
                                >
                                    <span>{isMobile ? '📸 Live Camera' : '📷 Laptop Camera'}</span>
                                </button>

                                {/* Option 2: File/Gallery */}
                                <button
                                    type="button"
                                    className={`toggle-btn ${captureSource !== 'live' ? 'active' : ''}`} // Simplification: If not live, it's file/gallery
                                    onClick={() => {
                                        setCaptureSource(isMobile ? 'gallery' : 'desktop');
                                        setUsingImageLocation(false);
                                        locationLockRef.current = false; // UNLOCK initially
                                        getLocation();
                                    }}
                                >
                                    <span>{isMobile ? '🖼️ Gallery Upload' : '📁 File Upload'}</span>
                                </button>
                            </div>
                        </div>

                        {/* Webcam View */}
                        {!isMobile && captureSource === 'live' && isCapturing && (
                            <div className="cd-webcam-wrap">
                                <p className="cd-webcam-title">Live Camera Preview:</p>
                                {cameraError ? (
                                    <div className="cd-camera-error">
                                        <p><strong>Camera Error:</strong> {cameraError}</p>
                                        <ul className="cd-camera-error-list">
                                            <li>Check if browser permission is allowed (Address bar icon).</li>
                                            <li>Ensure no other app (Zoom/Teams) is using the camera.</li>
                                            <li>Try using a different browser (Chrome/Edge).</li>
                                        </ul>
                                        <button
                                            type="button"
                                            onClick={() => setCameraError(null)}
                                            className="cd-camera-action-btn"
                                        >
                                            Retry
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                // Mock Data for Testing
                                                const mockImg = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";
                                                setForm(prev => ({ ...prev, imageUrl: mockImg }));
                                                setImagePreview(mockImg);
                                                setIsCapturing(false);
                                                setCameraError(null);
                                            }}
                                            className="cd-camera-action-btn cd-camera-action-btn-secondary"
                                        >
                                            Simulate Camera (Dev Test)
                                        </button>
                                    </div>
                                ) : (
                                    <Webcam
                                        audio={false}
                                        ref={webcamRef}
                                        screenshotFormat="image/jpeg"
                                        width="100%"
                                        className="cd-webcam-feed"
                                        onUserMedia={() => console.log("Webcam started successfully")}
                                        onUserMediaError={(err) => {
                                            console.error("Webcam failed to start:", err);
                                            setCameraError(err.name + ": " + err.message);
                                        }}
                                    />
                                )}
                                {!cameraError && (
                                    <button
                                        type="button"
                                        onClick={captureWebcam}
                                        className="btn-submit cd-capture-btn"
                                    >
                                        Capture Photo
                                    </button>
                                )}
                            </div>
                        )}


                        {/* File Input (Mobile Live, Desktop File, or Gallery) */}
                        {(isMobile || captureSource !== 'live' || !isCapturing) && (
                            <input
                                key={captureSource}
                                type="file"
                                accept="image/*"
                                capture={(isMobile && captureSource !== 'gallery') ? "environment" : undefined}
                                onChange={handleFileChange}
                                style={{ display: (captureSource === 'live' && !isMobile && imagePreview) ? 'none' : 'block' }} // Hide input if webcam image taken
                                required={!imagePreview}
                            />
                        )}

                        {!gpsStatus.includes("Locked") && gpsStatus !== "Refining..." && (
                            <small className="cd-warning-note">
                                ⚠️ Establish Location to enable camera. {gpsStatus}
                            </small>
                        )}

                        {captureSource === 'gallery' && (
                            <small className="cd-gallery-note">
                                Note: We will attempt to extract exact GPS location from your photo metadata.
                            </small>
                        )}

                        {imagePreview && (
                            <div className="cd-preview-wrap">
                                <img src={imagePreview} alt="Preview" className="cd-preview-image" />
                                {!isMobile && captureSource === 'live' && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsCapturing(true);
                                            setImagePreview(null);
                                            setForm(prev => ({ ...prev, imageUrl: '' }));
                                        }}
                                        className="cd-retake-btn"
                                    >
                                        Retake
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Auto-Detected Maps */}
                    {form.latitude && form.longitude && (
                        <div className="form-group">
                            <label>
                                Location Data:
                                <span
                                    className="cd-location-status"
                                    style={{ color: gpsStatus.includes("Locked") ? 'green' : 'orange' }}
                                >
                                    {gpsStatus}
                                </span>
                            </label>

                            {locationWarning && (
                                <div
                                    className="cd-location-warning"
                                    style={{
                                    backgroundColor: locationWarning.includes("CAUTION") ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                                    border: locationWarning.includes("CAUTION") ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(245, 158, 11, 0.3)',
                                    color: locationWarning.includes("CAUTION") ? '#ef4444' : '#f59e0b',
                                    fontWeight: locationWarning.includes("CAUTION") ? 'bold' : 'normal'
                                }}
                                >
                                    {locationWarning}
                                </div>
                            )}

                            {/* If location is approximate (e.g., IP-based), require user acknowledgement to proceed */}
                            {gpsStatus.includes("Approximate") && (
                                <div className="cd-approx-wrap">
                                    <input
                                        id="acceptApprox"
                                        type="checkbox"
                                        checked={acceptApproxLocation}
                                        onChange={(e) => setAcceptApproxLocation(e.target.checked)}
                                    />
                                    <label htmlFor="acceptApprox" className="cd-approx-label">
                                        I understand this location is approximate (IP-based) and I accept submitting with this accuracy.
                                    </label>
                                </div>
                            )}

                            <div className="location-row cd-location-row">
                                <input className="citizen-input" value={form.latitude} readOnly />
                                <input className="citizen-input" value={form.longitude} readOnly />
                            </div>
                            {gpsStatus === "Error" && <p className="cd-gps-error">GPS Error. Enable Location Services.</p>}

                            <div className="cd-map-wrap">
                                <div className="cd-map-pin-hint">
                                    ✨ Drag the pin to adjust location
                                </div>
                                <MapContainer
                                    center={[parseFloat(form.latitude), parseFloat(form.longitude)]}
                                    zoom={15}
                                    className="cd-map-canvas"
                                >
                                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                    <Marker
                                        draggable={true}
                                        eventHandlers={eventHandlers}
                                        position={[parseFloat(form.latitude), parseFloat(form.longitude)]}
                                        ref={markerRef}>
                                        <Popup>
                                            {gpsStatus.includes("Manual") ? "Pinned Location (Manual)" : "Incident Location"}
                                        </Popup>
                                    </Marker>
                                    <RecenterMap lat={parseFloat(form.latitude)} lng={parseFloat(form.longitude)} />
                                </MapContainer>
                                <small className="cd-map-note">
                                    {usingImageLocation ? "📍 Using exact location from image metadata." : "📡 Using device GPS. Upload a photo with location data for better precision."}
                                </small>
                            </div>
                        </div>
                    )}

                    {/* Submit Button - Disabled if no valid location */}
                    {(() => {
                        const isLocked = gpsStatus.includes("Locked");
                        const isRefining = gpsStatus === "Refining...";
                        const isAccurateEnough = accuracy && accuracy < 200;
                        const isApproxAllowed = gpsStatus.includes("Approximate") && acceptApproxLocation;
                        const canSubmit = isLocked || isRefining || isAccurateEnough || isApproxAllowed;

                        return (
                            <button
                                type="submit"
                                className="btn-submit"
                                disabled={loading || !canSubmit}
                                style={{
                                    opacity: (loading || !canSubmit) ? 0.6 : 1,
                                    cursor: (loading || !canSubmit) ? 'not-allowed' : 'pointer'
                                }}
                            >
                                {loading ? 'Submitting...' : 'Submit Report'}
                            </button>
                        );
                    })()}
                </form>
            </div>
        </div>
    );
};

export default CitizenDashboard;
