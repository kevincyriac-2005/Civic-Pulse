import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.heat'; // Implicitly binds to L.heatLayer

export default function HeatmapLayer({ data }) {
    const map = useMap();

    useEffect(() => {
        if (!data || data.length === 0) {
            console.warn('[HeatmapLayer] No coordinate data available — heatmap will not render');
            return;
        }

        // Convert API data to Leaflet format: [lat, lng, intensity]
        const heatData = data
            .filter(item => item.location && item.location.coordinates && item.location.coordinates.length >= 2)
            .map(item => {
                // GeoJSON format is [longitude, latitude]
                const [lng, lat] = item.location.coordinates;

                /* 
                   Geospatial Intensity Logic:
                   - The API returns 'severity' as a number between 1 and 5.
                   - leaflet.heat expects 'intensity' values roughly normalized between 0 and 1.
                   - We divide severity by 5 to achieve this ratio (e.g., severity 5 = 1.0 intensity).
                   - If severity is missing from the payload, we default to 2.5 (0.5 intensity)
                     as a safe midpoint.
                */
                const severity = item.severity || 2.5;
                const intensity = Math.min(Math.max(severity / 5, 0), 1);

                return [lat, lng, intensity];
            });

        if (heatData.length === 0) {
            console.warn('[HeatmapLayer] No coordinate data available — heatmap will not render');
            return;
        }

        // Initialize leaflet.heat layer with custom analytic settings
        const heatLayer = L.heatLayer(heatData, {
            radius: 25,
            blur: 20,
            maxZoom: 17,
            gradient: {
                0.2: 'blue',
                0.4: 'lime',
                0.6: 'yellow',
                0.8: 'orange',
                1.0: 'red'
            }
        });

        // Inject the compiled heat layer over the parent MapContainer context
        heatLayer.addTo(map);

        // Cleanup function runs on layer toggle (unmount) or data refresh.
        // Prevents nasty WebGL memory leaks and duplicate overlapping layer paints.
        return () => {
            map.removeLayer(heatLayer);
        };
    }, [data, map]);

    return null; // This is a logic-only component rendering directly via canvas bindings
}
