import React, { useEffect, useRef, useState } from 'react';
import "../styles/LocationPicker.css";

export default function LocationPicker({ onLocationSelect, initialLocation = null, readOnly = false }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const deviceMarkerRef = useRef(null);
  const [latlng, setLatlng] = useState(() => {
    if (initialLocation && typeof initialLocation.latitude === 'number') {
      return { lat: initialLocation.latitude, lng: initialLocation.longitude };
    }
    if (initialLocation && typeof initialLocation.lat === 'number') {
      return { lat: initialLocation.lat, lng: initialLocation.lng };
    }
    return { lat: 0, lng: 0 };
  });
  const [deviceLocation, setDeviceLocation] = useState(null);

  // Get device current location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = Number(pos.coords.latitude);
          const lng = Number(pos.coords.longitude);
          setDeviceLocation({ lat, lng });
        },
        (err) => {
          console.log('Could not get device location:', err.message);
        },
        { timeout: 10000, enableHighAccuracy: false }
      );
    }
  }, []);

  useEffect(() => {
    // wait for Leaflet to be available globally as L (included via public/index.html)
    if (typeof window === 'undefined' || !window.L) return;
    const L = window.L;
    if (mapInstanceRef.current) return;

    mapInstanceRef.current = L.map(mapRef.current).setView([latlng.lat || 13.0827, latlng.lng || 80.2707], latlng.lat && latlng.lng ? 13 : 5);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(mapInstanceRef.current);

    // Add device location marker (blue dot with accuracy circle if available)
    if (deviceLocation && deviceLocation.lat && deviceLocation.lng) {
      const blueIcon = L.icon({
        iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSI4IiBmaWxsPSIjMjE5OGM3IiBzdHJva2U9IiNmZmYiIHN0cm9rZS13aWR0aD0iMiIvPjxjaXJjbGUgY3g9IjEyIiBjeT0iMTIiIHI9IjQiIGZpbGw9IiNmZmYiLz48L3N2Zz4=',
        iconSize: [24, 24],
        iconAnchor: [12, 12],
        popupAnchor: [0, -12]
      });
      deviceMarkerRef.current = L.marker([deviceLocation.lat, deviceLocation.lng], { icon: blueIcon })
        .addTo(mapInstanceRef.current)
        .bindPopup('📍 Your Current Location');
    }

    // Add selected location marker
    if (latlng.lat && latlng.lng) {
      markerRef.current = L.marker([latlng.lat, latlng.lng]).addTo(mapInstanceRef.current);
    }

    if (!readOnly) {
      mapInstanceRef.current.on('click', function(e) {
        const { lat, lng } = e.latlng;
        setLatlng({ lat, lng });
        if (markerRef.current) markerRef.current.setLatLng([lat, lng]);
        else markerRef.current = L.marker([lat, lng]).addTo(mapInstanceRef.current);
      });
    }

    return () => {
      try { mapInstanceRef.current.remove(); } catch (e) {}
      mapInstanceRef.current = null;
    };
  }, [deviceLocation]);

  const handleConfirm = async () => {
    if (!onLocationSelect) return;
    const payload = { latitude: Number(latlng.lat), longitude: Number(latlng.lng), areaName: '' };
    onLocationSelect(payload);
  };

  return (
    <div>
      <div style={{ height: 360 }} ref={mapRef} id="location-picker-map" />
      <div style={{ fontSize: "12px", color: "#666", marginTop: 8, padding: "8px", background: "#f5f5f5", borderRadius: "4px" }}>
        <div style={{ marginBottom: 4 }}>📍 <strong>Blue dot</strong> = Your current location</div>
        <div>📌 <strong>Red pin</strong> = Selected location (click map to change)</div>
      </div>
      {!readOnly && (
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button className="btn-primary" type="button" onClick={handleConfirm}>Confirm Location</button>
        </div>
      )}
    </div>
  );
}
