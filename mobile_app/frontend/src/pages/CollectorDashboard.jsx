import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { collectorApi, authApi } from "../api";
import { useAuth } from "../context/AuthContext";
import LocationPicker from "../components/LocationPicker";
// LocationPicker removed — using Google Maps links/embeds instead
import "styles/Dashboard.css";

export default function CollectorDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [availableItems, setAvailableItems] = useState([]);
  const [acceptedItems, setAcceptedItems] = useState([]);

  const [loadingAvailable, setLoadingAvailable] = useState(true);
  const [loadingAccepted, setLoadingAccepted] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [showLocationForm, setShowLocationForm] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsForm, setSettingsForm] = useState({ name: "", phone: "", referred_by: "" });
  const [referralCode, setReferralCode] = useState("");
  // removed gettingLocation state (unused)
  const [selectedItemLocation, setSelectedItemLocation] = useState(null);
  const [selectedItemForRoute, setSelectedItemForRoute] = useState(null);

  // `location` state removed — collector location is managed via `collectorLocation` and device geolocation
  const [collectorLocation, setCollectorLocation] = useState(null);
  const [setDeviceLocation] = useState(null);
  const [location, setLocation] = useState({
    latitude: "",
    longitude: "",
    search_radius_km: 10,
    areaName: "",
  });
  const [gettingLocation, setGettingLocation] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    refreshAll();
    loadCollectorLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadCollectorLocation = async () => {
    try {
      const res = await collectorApi.getLocation(user.id);
      setCollectorLocation(res.data);
    } catch (err) {
      // Location not set yet
      setCollectorLocation(null);
    }
  };

  const getLocationName = async (latitude, longitude) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
        {
          headers: {
            'Accept': 'application/json',
          }
        }
      );
      const data = await response.json();
      const address = data.address || {};
      
      // Build location name from address components
      const areaName = address.suburb || address.neighbourhood || address.village || address.town || address.city || "Unknown Area";
      const city = address.city || address.town || "";
      
      return city ? `${areaName}, ${city}` : areaName;
    } catch (error) {
      console.error("Error getting location name:", error);
      return "Location fetched";
    }
  };

  const handleGetCurrentLocation = async () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }

    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const areaName = await getLocationName(latitude, longitude);
        
        setLocation({
          ...location,
          latitude: latitude.toFixed(6),
          longitude: longitude.toFixed(6),
          areaName: areaName,
        });
        setDeviceLocation({ latitude, longitude });
        setGettingLocation(false);
      },
      (error) => {
        setGettingLocation(false);
        let errorMessage = "Unable to get your location.";
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "Permission denied. Please enable location access in your browser settings.";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Location information is unavailable.";
            break;
          case error.TIMEOUT:
            errorMessage = "The request to get user location timed out.";
            break;
          default:
            errorMessage = error.message;
        }
        alert(errorMessage);
      }
    );
  };

  const handleSetLocation = async (e) => {
    e.preventDefault();
    const lat = parseFloat(location.latitude);
    const lng = parseFloat(location.longitude);
    const radius = parseFloat(location.search_radius_km || 10);

    if (isNaN(lat) || lat < -90 || lat > 90 || isNaN(lng) || lng < -180 || lng > 180 || isNaN(radius) || radius <= 0) {
      alert("Invalid input.");
      return;
    }

    let areaName = location.areaName;
    
    // If area name is empty, reverse geocode to get it
    if (!areaName || areaName.trim() === "") {
      areaName = await getLocationName(lat, lng);
    }

    try {
      await collectorApi.setLocation(user.id, { latitude: lat, longitude: lng, search_radius_km: radius, area_name: areaName });
      alert("Location updated!");
      setShowLocationForm(false);
      setLocation({ latitude: "", longitude: "", search_radius_km: 10, areaName: "" });
      await loadCollectorLocation();
      await refreshAll();
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to update location");
    }
  };

  const handleLocationPickerSelect = async (pickedLocation) => {
    let areaName = pickedLocation.areaName;
    
    // If area name is empty, reverse geocode to get it
    if (!areaName || areaName.trim() === "") {
      areaName = await getLocationName(pickedLocation.latitude, pickedLocation.longitude);
    }

    setLocation({
      latitude: pickedLocation.latitude,
      longitude: pickedLocation.longitude,
      areaName: areaName,
      search_radius_km: 10,
    });

    try {
      await collectorApi.setLocation(user.id, {
        latitude: pickedLocation.latitude,
        longitude: pickedLocation.longitude,
        search_radius_km: 10,
        area_name: areaName,
      });
      alert("Location updated successfully!");
      setShowLocationForm(false);
      setLocation({ latitude: "", longitude: "", search_radius_km: 10, areaName: "" });
      await loadCollectorLocation();
      await refreshAll();
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to update location");
    }
  };

  const openSettings = () => {
    (async () => {
      try {
        const res = await authApi.getProfile(user.id);
        const profile = res.data || res;
        setSettingsForm({ name: profile.name || user?.name || "", phone: profile.phone || user?.phone || "", referred_by: profile.referred_by || "" });
        setReferralCode(profile.referral_code || user?.referral_code || "");
      } catch (err) {
        setSettingsForm({ name: user?.name || "", phone: user?.phone || "", referred_by: user?.referred_by || "" });
      }
      setShowSettings(true);
    })();
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      await authApi.updateProfile(user.id, settingsForm);
      const updatedUser = { ...user, ...settingsForm };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      alert('Profile updated');
      setShowSettings(false);
      window.location.reload();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to update profile');
    }
  };

  const refreshAll = async () => {
    setIsRefreshing(true);

    // Use prefetched lists if available for instant UI
    try {
      const prefAvail = localStorage.getItem('prefetch_collector_available');
      const prefAccepted = localStorage.getItem('prefetch_collector_accepted');
      if (prefAvail) {
        setAvailableItems(JSON.parse(prefAvail));
        localStorage.removeItem('prefetch_collector_available');
        setLoadingAvailable(false);
      } else {
        setLoadingAvailable(true);
      }
      if (prefAccepted) {
        setAcceptedItems(JSON.parse(prefAccepted));
        localStorage.removeItem('prefetch_collector_accepted');
        setLoadingAccepted(false);
      } else {
        setLoadingAccepted(true);
      }
    } catch (e) {
      setLoadingAvailable(true);
      setLoadingAccepted(true);
    }

    await Promise.all([
      loadAvailable(),
      loadAccepted(),
    ]);

    setIsRefreshing(false);
  };

  const loadAvailable = async () => {
    try {
      const res = await collectorApi.getAvailableItems(user.id);
      setAvailableItems(Array.isArray(res.data?.items) ? res.data.items : []);
    } catch (err) {
      console.error("Error loading available:", err);
      setAvailableItems([]);
    } finally {
      setLoadingAvailable(false);
    }
  };

  const loadAccepted = async () => {
    try {
      const res = await collectorApi.getMyAcceptedItems(user.id);
      setAcceptedItems(Array.isArray(res.data?.items) ? res.data.items : []);
    } catch (err) {
      console.error("Error loading accepted:", err);
      setAcceptedItems([]);
    } finally {
      setLoadingAccepted(false);
    }
  };

  // Debug: log accepted items to help verify coordinates exist
  useEffect(() => {
    try {
      console.log('CollectorDashboard: acceptedItems', acceptedItems);
    } catch (e) {
      // ignore
    }
  }, [acceptedItems]);

  const handleAccept = async (itemId) => {
    if (!window.confirm("Accept this item?")) return;
    try {
      await collectorApi.acceptItem(itemId, user.id);
      alert("Item accepted!");
      await refreshAll();
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to accept");
    }
  };

  const handleCompleteCollection = async (itemId) => {
    const weightStr = window.prompt("Actual weight in kg (required):", "");
    if (weightStr === null) return;

    const weight = parseFloat(weightStr.trim());
    if (isNaN(weight) || weight <= 0) {
      alert("Enter a valid positive number.");
      return;
    }

    if (!window.confirm(`Complete with ${weight} kg?`)) return;

    try {
      await collectorApi.completeCollection(itemId, user.id, weight);
      alert("Completed!");
      await refreshAll();
    } catch (err) {
      let msg = "Failed to complete";
      if (err.response?.data?.detail) {
        msg = typeof err.response.data.detail === "string"
          ? err.response.data.detail
          : JSON.stringify(err.response.data.detail);
      }
      alert(msg);
    }
  };

  // handleSetLocation removed (not used)

  // Collector location is now set via device or manual API; LocationPicker removed

  const openRouteMap = (item) => {
    if (!collectorLocation || !item.address) {
      alert("Collector location or delivery address not available");
      return;
    }
    setSelectedItemForRoute(item);
  };

  const handleLogout = () => {
    logout();
    navigate("/collector");
  };

  const openImage = (url) => setSelectedImage(url);
  const closeImage = () => setSelectedImage(null);

  // Helper to normalize latitude/longitude from different shapes
  const getLatLngFrom = (obj) => {
    if (!obj) return { lat: null, lng: null };
    if (obj.latitude !== undefined && obj.longitude !== undefined) return { lat: Number(obj.latitude), lng: Number(obj.longitude) };
    if (obj.lat !== undefined && obj.lng !== undefined) return { lat: Number(obj.lat), lng: Number(obj.lng) };
    if (obj.coordinates && (obj.coordinates.lat !== undefined || obj.coordinates.lng !== undefined)) return { lat: Number(obj.coordinates.lat), lng: Number(obj.coordinates.lng) };
    return { lat: null, lng: null };
  };

  // Initialize small route map inside modal when an item is selected for route
  useEffect(() => {
    if (!selectedItemForRoute) return;
    const coll = getLatLngFrom(collectorLocation);
    const L = window.L;
    if (!L) {
      console.warn('Leaflet not available for route map');
      return;
    }

    const container = document.getElementById('route-map-container');
    if (!container) return;

    // Clear previous map content
    container.innerHTML = '';

    const sell = getLatLngFrom(selectedItemForRoute.address || selectedItemForRoute);
    const sellLat = sell.lat;
    const sellLng = sell.lng;

    // If pickup coordinates are not available, show message instead of blank map
    if (!sellLat || !sellLng) {
      container.style.display = 'flex';
      container.style.alignItems = 'center';
      container.style.justifyContent = 'center';
      container.innerHTML = '<div style="color:#666;padding:16px">Pickup coordinates not available for this item.</div>';
      return;
    }

    const collLat = coll.lat;
    const collLng = coll.lng;

    try {
      const map = L.map(container).setView([sellLat, sellLng], 13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      // Delay adding markers and route until map panes are ready (prevents appendChild undefined)
      let routeTimer = setTimeout(() => {
        try {
          try { map.invalidateSize(); } catch (e) {}

          // Always show seller marker
          L.marker([sellLat, sellLng]).addTo(map).bindPopup(selectedItemForRoute.seller_name || 'Pickup');

          const drawRoute = (fromLat, fromLng) => {
            try {
              const pts = [[fromLat, fromLng], [sellLat, sellLng]];
              const routeLine = L.polyline(pts, { color: 'blue', weight: 4, opacity: 0.7 }).addTo(map);
              try { map.fitBounds(routeLine.getBounds(), { padding: [40, 40] }); } catch (e) { map.setView([sellLat, sellLng], 13); }
            } catch (e) {
              try { map.setView([sellLat, sellLng], 13); } catch (_) {}
            }
          };

          if (collLat && collLng) {
            // We have stored collector location: show it and draw route
            L.marker([collLat, collLng]).addTo(map).bindPopup('You (Collector)');
            drawRoute(collLat, collLng);
          } else if (navigator.geolocation) {
            // Try to get device location for a better origin
            let didFinish = false;
            const success = (pos) => {
              if (didFinish) return; didFinish = true;
              const { latitude: dLat, longitude: dLng } = pos.coords;
              if (isFinite(dLat) && isFinite(dLng)) {
                L.marker([dLat, dLng]).addTo(map).bindPopup('Your device location');
                drawRoute(dLat, dLng);
              } else {
                map.setView([sellLat, sellLng], 13);
              }
            };
            const failure = () => {
              if (didFinish) return; didFinish = true;
              map.setView([sellLat, sellLng], 13);
            };
            try {
              navigator.geolocation.getCurrentPosition(success, failure, { timeout: 8000, enableHighAccuracy: false });
              // Ensure fallback if geolocation hangs
              setTimeout(() => { if (!didFinish) failure(); }, 9000);
            } catch (e) {
              failure();
            }
          } else {
            // No collector and no geolocation: just center on seller
            map.setView([sellLat, sellLng], 13);
          }
        } catch (e) {
          console.error('Error adding markers to route map', e);
        }
      }, 250);

      return () => {
        try { clearTimeout(routeTimer); } catch (e) {}
        try { map.remove(); } catch (e) { /* ignore */ }
      };
    } catch (err) {
      console.error('Error initializing route map', err);
    }
  }, [selectedItemForRoute, collectorLocation]);

  const isLoading = loadingAvailable || loadingAccepted;

  return (
    <div className="dashboard-container">
      {/* HEADER */}
      <header className="dashboard-header collector-header">
        <div className="dashboard-header-content">
          <div className="header-left" style={{display: 'flex', alignItems: 'center', gap: 12}}>
            <button className="menu-icon" onClick={() => setShowMenu(true)} aria-label="Open menu" style={{background: 'none', border: 'none', fontSize: 28, padding: '0 8px 0 0', cursor: 'pointer', marginRight: 0}}>
              <span style={{display: 'inline-block', lineHeight: 1}}>&#9776;</span>
            </button>
            <div className="header-logo">🚚 Ridit</div>
            <div>
              <div style={{ fontSize: 13 }}>Collector Dashboard</div>
              <div style={{ fontSize: 11, opacity: 0.85 }}>Active pickups</div>
            </div>
          </div>
          <div className="header-right" style={{display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'flex-end', flex: 1}}>
            <div className="user-info">
              <div className="user-name">{user?.name || "Collector"}</div>
              <div className="user-role">Collector</div>
              {(() => {
                const c = getLatLngFrom(collectorLocation);
                const hasCoord = c.lat && c.lng;
                return hasCoord ? (
                  <div style={{fontSize: "11px", color: "#ffd700", marginTop: "4px", fontWeight: "500"}}>
                    📍 {collectorLocation?.area_name || `${c.lat.toFixed(2)}, ${c.lng.toFixed(2)}`}
                    {collectorLocation?.search_radius_km && <div style={{fontSize: "10px", marginTop: "2px"}}>Radius: {collectorLocation.search_radius_km} km</div>}
                  </div>
                ) : (
                  <button 
                    onClick={() => setShowLocationForm(true)}
                    style={{
                      fontSize: "11px",
                      color: "#999",
                      marginTop: "4px",
                      fontWeight: "500",
                      background: "none",
                      border: "1px solid #666",
                      borderRadius: "4px",
                      padding: "4px 8px",
                      cursor: "pointer",
                      transition: "all 0.2s"
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.background = "#555";
                      e.target.style.color = "#fff";
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = "none";
                      e.target.style.color = "#999";
                    }}
                  >
                    📍 Set Location
                  </button>
                );
              })()}
            </div>
          </div>
        </div>
        {/* Sidebar menu */}
        <div className={`sidebar-menu${showMenu ? ' open' : ''}`} style={{position: 'fixed', top: 0, left: showMenu ? 0 : '-260px', height: '100%', width: 260, background: '#fff', boxShadow: showMenu ? '0 0 24px rgba(0,0,0,0.18)' : 'none', zIndex: 2000, transition: 'left 0.3s cubic-bezier(0.4,0,0.2,1)'}}>
          <button onClick={() => setShowMenu(false)} aria-label="Close menu" style={{background: 'none', border: 'none', fontSize: 28, padding: 16, cursor: 'pointer', width: '100%', textAlign: 'right'}}>&#10005;</button>
          <div style={{display: 'flex', flexDirection: 'column', gap: 0, marginTop: 16}}>
            <button className="menu-item" style={{padding: '18px 24px', border: 'none', background: 'none', textAlign: 'left', fontSize: 17, color: '#333', borderBottom: '1px solid #f0f0f0', cursor: 'pointer'}} onClick={() => { setShowMenu(false); openSettings(); }}>Settings</button>
            <button className="menu-item" style={{padding: '18px 24px', border: 'none', background: 'none', textAlign: 'left', fontSize: 17, color: '#333', borderBottom: '1px solid #f0f0f0', cursor: 'pointer'}} onClick={() => { setShowMenu(false); setShowLocationForm(true); }}>Set Location</button>
            <button className="menu-item" style={{padding: '18px 24px', border: 'none', background: 'none', textAlign: 'left', fontSize: 17, color: '#333', borderBottom: '1px solid #f0f0f0', cursor: 'pointer'}} onClick={async () => {
              setShowMenu(false);
              const code = referralCode || (user?.referral_code || '');
              if (!code) { alert('No referral code available'); return; }
              const link = `${window.location.origin}/register?ref=${code}`;
              try {
                if (navigator.share) {
                  await navigator.share({ title: 'Join Ridit', text: 'Register on Ridit using my referral', url: link });
                } else {
                  await navigator.clipboard.writeText(link);
                  alert('Referral link copied to clipboard');
                }
              } catch (err) {
                try { await navigator.clipboard.writeText(link); alert('Referral link copied to clipboard'); } catch (_) { alert(link); }
              }
            }}>Share</button>
            <button className="menu-item" style={{padding: '18px 24px', border: 'none', background: 'none', textAlign: 'left', fontSize: 17, color: '#333', borderBottom: 'none', cursor: 'pointer'}} onClick={() => { setShowMenu(false); handleLogout(); }}>Logout</button>
          </div>
        </div>
      </header>

      {/* LOCATION MODAL */}
      {showLocationForm && (
        <div className="modal-overlay">
              <div className="modal-card" style={{ maxWidth: "700px", maxHeight: "90vh", overflow: "auto" }}>
                <h3 style={{ marginTop: 0 }}>📍 Update Your Location</h3>
                <p style={{fontSize: "13px", color: "#7f8c8d", marginBottom: "15px"}}>
                  Set your collector location so nearby items are visible to you within your search radius
                </p>
                <div style={{ padding: 8 }}>
                  {/* Get Current Location Button */}
                  <div style={{ marginBottom: 16 }}>
                    <button 
                      className="btn-primary" 
                      onClick={handleGetCurrentLocation}
                      disabled={gettingLocation}
                      style={{ width: "100%" }}
                    >
                      {gettingLocation ? "📍 Getting Location..." : "📍 Get Current Location"}
                    </button>
                  </div>

                  {/* Manual Location Form */}
                  {location.latitude && (
                    <form onSubmit={handleSetLocation} style={{ marginBottom: 16, padding: 12, background: "#f9f9f9", borderRadius: 8, border: "1px solid #ddd" }}>
                      <div style={{ marginBottom: 12 }}>
                        <label style={{ display: "block", marginBottom: 4, fontSize: "0.9em", fontWeight: 500 }}>Latitude</label>
                        <input 
                          type="number" 
                          step="0.0001"
                          value={location.latitude}
                          onChange={(e) => setLocation({...location, latitude: e.target.value})}
                          style={{ width: "100%", padding: "8px", border: "1px solid #ccc", borderRadius: "4px", fontSize: "0.9em" }}
                        />
                      </div>

                      <div style={{ marginBottom: 12 }}>
                        <label style={{ display: "block", marginBottom: 4, fontSize: "0.9em", fontWeight: 500 }}>Longitude</label>
                        <input 
                          type="number" 
                          step="0.0001"
                          value={location.longitude}
                          onChange={(e) => setLocation({...location, longitude: e.target.value})}
                          style={{ width: "100%", padding: "8px", border: "1px solid #ccc", borderRadius: "4px", fontSize: "0.9em" }}
                        />
                      </div>

                      <div style={{ marginBottom: 12 }}>
                        <label style={{ display: "block", marginBottom: 4, fontSize: "0.9em", fontWeight: 500 }}>Area Name</label>
                        <input 
                          type="text"
                          value={location.areaName}
                          onChange={(e) => setLocation({...location, areaName: e.target.value})}
                          style={{ width: "100%", padding: "8px", border: "1px solid #ccc", borderRadius: "4px", fontSize: "0.9em" }}
                          placeholder="e.g., Downtown, Central District"
                        />
                      </div>

                      <div style={{ marginBottom: 12 }}>
                        <label style={{ display: "block", marginBottom: 4, fontSize: "0.9em", fontWeight: 500 }}>Search Radius (km)</label>
                        <input 
                          type="number" 
                          step="1"
                          min="1"
                          value={location.search_radius_km}
                          onChange={(e) => setLocation({...location, search_radius_km: parseInt(e.target.value) || 10})}
                          style={{ width: "100%", padding: "8px", border: "1px solid #ccc", borderRadius: "4px", fontSize: "0.9em" }}
                        />
                      </div>

                      <button 
                        type="submit" 
                        className="btn-success"
                        style={{ width: "100%", marginTop: 8 }}
                      >
                        ✓ Save Location
                      </button>
                    </form>
                  )}

                  {/* LocationPicker for Interactive Map Selection */}
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: "0.95em", fontWeight: 600, marginBottom: 8 }}>Or select location on map:</div>
                    <LocationPicker 
                      onLocationSelect={handleLocationPickerSelect}
                      initialLocation={collectorLocation} 
                    />
                  </div>

                  {/* Current Saved Location Display */}
                  {collectorLocation && collectorLocation.latitude && collectorLocation.longitude && (
                    <div style={{ background: 'rgba(52,152,219,0.06)', padding: 10, borderRadius: 6, marginBottom: 12 }}>
                      <div style={{ fontSize: 13, color: '#2c3e50', fontWeight: 600 }}>📍 Saved Location:</div>
                      {collectorLocation.area_name && (
                        <div style={{ fontSize: 13, color: '#27ae60', fontWeight: 600, marginTop: 6 }}>
                          {collectorLocation.area_name}
                        </div>
                      )}
                      <div style={{ fontSize: 12, color: '#2980b9', marginTop: 6 }}>📌 {collectorLocation.latitude.toFixed(6)}, {collectorLocation.longitude.toFixed(6)}</div>
                      {collectorLocation.search_radius_km && <div style={{ fontSize: 12, color: '#2980b9', marginTop: 4 }}>📏 Search radius: {collectorLocation.search_radius_km} km</div>}
                    </div>
                  )}
                </div>
                <button 
                  type="button" 
                  className="btn-secondary" 
                  onClick={() => {
                    setShowLocationForm(false);
                    setLocation({ latitude: "", longitude: "", search_radius_km: 10, areaName: "" });
                  }}
                  style={{ width: "100%", marginTop: "15px" }}
                >
                  Close
                </button>
              </div>
        </div>
      )}

      {showSettings && (
        <div className="modal-overlay" onClick={() => setShowSettings(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <h3>Your Settings</h3>
            <form onSubmit={handleSaveSettings}>
              <input value={settingsForm.name} onChange={e => setSettingsForm({...settingsForm, name: e.target.value})} placeholder="Full name" />
              <input value={settingsForm.phone} onChange={e => setSettingsForm({...settingsForm, phone: e.target.value})} placeholder="Mobile" />
              <input value={settingsForm.referred_by} onChange={e => setSettingsForm({...settingsForm, referred_by: e.target.value})} placeholder="Referred by (optional)" />
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowSettings(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* IMAGE MODAL */}
      {selectedImage && (
        <div className="image-modal-overlay" onClick={closeImage}>
          <div className="image-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="image-modal-close" onClick={closeImage}>×</button>
            <img src={selectedImage} alt="Full size item" className="image-modal-image" />
          </div>
        </div>
      )}

      {/* ITEM LOCATION MODAL */}
      {selectedItemLocation && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: "700px", maxHeight: "90vh", overflow: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ marginTop: 0 }}>{selectedItemLocation.seller_name} – {selectedItemLocation.category} – Pickup Location</h3>
              <button 
                type="button" 
                className="btn-secondary" 
                onClick={() => setSelectedItemLocation(null)}
                style={{ padding: "4px 8px", fontSize: "18px" }}
              >
                ✕
              </button>
            </div>
            {(() => {
              const s = getLatLngFrom(selectedItemLocation.address || selectedItemLocation);
              if (s.lat && s.lng) {
                const src = `https://www.google.com/maps?q=${s.lat},${s.lng}&z=16&output=embed`;
                return (
                  <div style={{ height: 350, borderRadius: 8, overflow: 'hidden', border: '1px solid #ddd' }}>
                    <iframe title="item-map" src={src} style={{ width: '100%', height: '100%', border: 0 }} />
                  </div>
                );
              }
              return <div style={{ padding: 12, color: '#666' }}>Pickup coordinates not available</div>;
            })()}
            <div style={{ marginTop: 16, padding: 12, background: "#f5f5f5", borderRadius: 8 }}>
              <div style={{ fontSize: "0.9em", fontWeight: 600, marginBottom: 8 }}>📍 Address</div>
              <div>{selectedItemLocation.address?.street}</div>
              <div>{selectedItemLocation.address?.city}, {selectedItemLocation.address?.zip_code}</div>
              {selectedItemLocation.address?.coordinates && (
                <div style={{ marginTop: 8, fontSize: "0.85em", color: "#666" }}>
                  <div>Lat: {selectedItemLocation.address.coordinates.lat?.toFixed(6)}</div>
                  <div>Lng: {selectedItemLocation.address.coordinates.lng?.toFixed(6)}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ROUTE MAP MODAL */}
      {selectedItemForRoute && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: "800px", maxHeight: "90vh", overflow: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ marginTop: 0 }}>🗺️ Route to {selectedItemForRoute.seller_name}</h3>
              <button 
                type="button" 
                className="btn-secondary" 
                onClick={() => setSelectedItemForRoute(null)}
                style={{ padding: "4px 8px", fontSize: "18px" }}
              >
                ✕
              </button>
            </div>

            <div style={{ height: "400px", marginBottom: 16, border: "1px solid #ddd", borderRadius: "8px", overflow: "hidden" }} id="route-map-container" />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              <div style={{ padding: 12, background: "#e3f2fd", borderRadius: 8 }}>
                <div style={{ fontSize: "0.9em", fontWeight: 600, marginBottom: 8 }}>📍 Your Location (Collector)</div>
                {(() => {
                  const c = getLatLngFrom(collectorLocation);
                  return (
                    <>
                      <div>{collectorLocation?.area_name || (c.lat && c.lng ? `${c.lat.toFixed(6)}, ${c.lng.toFixed(6)}` : "Your current area")}</div>
                      <div style={{ fontSize: "0.85em", color: "#666", marginTop: 4 }}>
                        {c.lat && c.lng ? (
                          <>
                            Lat: {c.lat.toFixed(6)}<br/>
                            Lng: {c.lng.toFixed(6)}
                          </>
                        ) : (
                          <span style={{ color: '#999' }}>Coordinates not set</span>
                        )}
                      </div>
                    </>
                  );
                })()}
              </div>

              <div style={{ padding: 12, background: "#fce4ec", borderRadius: 8 }}>
                <div style={{ fontSize: "0.9em", fontWeight: 600, marginBottom: 8 }}>📍 Pickup Location</div>
                <div>{selectedItemForRoute.address?.street}</div>
                <div>{selectedItemForRoute.address?.city}</div>
                <div style={{ fontSize: "0.85em", color: "#666", marginTop: 4 }}>
                  Lat: {selectedItemForRoute.address?.coordinates?.lat?.toFixed(6)}<br/>
                  Lng: {selectedItemForRoute.address?.coordinates?.lng?.toFixed(6)}
                </div>
              </div>
            </div>

            <div style={{ padding: 12, background: "#f5f5f5", borderRadius: 8 }}>
              <div style={{ fontSize: "0.9em", fontWeight: 600, marginBottom: 8 }}>📦 Item Details</div>
              <div><strong>{selectedItemForRoute.category}</strong> from {selectedItemForRoute.seller_name}</div>
              <div style={{ fontSize: "0.9em", marginTop: 4 }}>{selectedItemForRoute.description}</div>
              {selectedItemForRoute.pickup_slot && (
                <div style={{ marginTop: 8, padding: "8px", background: "#fff", borderRadius: "4px" }}>
                  <strong>🕐 Scheduled:</strong> {selectedItemForRoute.pickup_slot.date} {selectedItemForRoute.pickup_slot.start_time}
                </div>
              )}
            </div>

            <button 
              type="button" 
              className="btn-primary" 
              onClick={() => {
                const collCoord = getLatLngFrom(collectorLocation);
                const sellCoord = getLatLngFrom(selectedItemForRoute.address || selectedItemForRoute);
                if (!sellCoord.lat || !sellCoord.lng) { alert('Pickup location not available'); return; }

                // If collector location is available, open directions from collector -> pickup
                // Otherwise open Google Maps directions with destination only so Maps uses device location as origin
                let mapsUrl;
                if (collCoord.lat && collCoord.lng) {
                  mapsUrl = `https://www.google.com/maps/dir/${collCoord.lat},${collCoord.lng}/${sellCoord.lat},${sellCoord.lng}`;
                } else {
                  mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${sellCoord.lat},${sellCoord.lng}&travelmode=driving`;
                }
                window.open(mapsUrl, '_blank');
              }}
              style={{ width: "100%", marginTop: 16 }}
            >
              🗺️ Open in Google Maps
            </button>

            <button 
              type="button" 
              className="btn-secondary" 
              onClick={() => setSelectedItemForRoute(null)}
              style={{ width: "100%", marginTop: 8 }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* MAIN CONTENT */}
      <div className="dashboard-main">
        {/* ACCEPTED ITEMS */}
        <div className="dashboard-section">
          <h2 className="section-title">My Accepted (Pending Collection)</h2>

          {loadingAccepted ? (
            <div className="items-grid skeleton-grid">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="item-card skeleton">
                  <div className="skeleton-thumbnail" />
                  <div className="skeleton-text long" />
                  <div className="skeleton-text medium" />
                  <div className="skeleton-text short" />
                  <div className="skeleton-actions" />
                </div>
              ))}
            </div>
          ) : acceptedItems.length === 0 ? (
            <div className="empty-state">
              <p>No accepted items yet</p>
              <small>Accepted items appear here until collected</small>
            </div>
          ) : (
            <div className="items-grid">
              {acceptedItems.map((item) => (
                <div key={item.id} className="item-card accepted-item">
                  <div className="item-card-header">
                    <span className="item-category">{item.category || "Unknown"}</span>
                    <span className="item-status accepted">Accepted</span>
                  </div>

                  {item.image_url && (
                    <div className="item-thumbnail-container">
                      <img
                        src={item.image_url}
                        alt={item.category || "Item"}
                        className="item-thumbnail"
                        onClick={() => openImage(item.image_url)}
                        onError={(e) => { e.target.style.display = "none"; }}
                      />
                    </div>
                  )}

                  <h3>{(item.seller_name || "Seller")} – {item.category || "Item"}</h3>
                  <p>{item.description || "No description"}</p>

                  <div className="seller-info-box">
                    <div>📞 {item.seller_phone || "N/A"}</div>
                  </div>

                  {item.address && (
                    <div className="seller-info-box" style={{ marginTop: 8 }}>
                      <div style={{ fontSize: "0.9em", fontWeight: 500, marginBottom: 4 }}>📍 Pickup Location</div>
                      <div>{item.address.street}</div>
                      <div>{item.address.city}, {item.address.zip_code}</div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                        <button 
                          className="btn-secondary btn-small" 
                          onClick={() => setSelectedItemLocation(item)}
                          style={{ flex: 1 }}
                        >
                          🗺️ View on Map
                        </button>
                        {item.address?.coordinates?.lat && item.address?.coordinates?.lng && (
                          <button
                            className="btn-primary btn-small"
                            onClick={async () => {
                              // ensure we have collector location loaded before opening route
                              if (!collectorLocation) {
                                await loadCollectorLocation();
                              }
                              openRouteMap(item);
                            }}
                            style={{ flex: 1 }}
                          >
                            🧭 View Route
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {item.pickup_slot && (
                    <div className="seller-info-box" style={{ marginTop: 8 }}>
                      <div style={{ fontSize: "0.9em", fontWeight: 500, marginBottom: 4 }}>🕐 Scheduled Collection</div>
                      <div>{item.pickup_slot.date}</div>
                      <div>{item.pickup_slot.start_time} - {item.pickup_slot.end_time}</div>
                    </div>
                  )}

                  <div className="item-meta">
                    <div>₹{item.estimated_price ?? "?"}</div>
                  </div>

                  <div className="item-actions">
                    <button className="btn-success btn-small" onClick={() => handleCompleteCollection(item.id)}>
                      Mark as Collected
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* AVAILABLE ITEMS */}
        <div className="dashboard-section">
          <h2 className="section-title">Available Nearby Items</h2>

          {loadingAvailable ? (
            <div className="items-grid skeleton-grid">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="item-card skeleton">
                  <div className="skeleton-thumbnail" />
                  <div className="skeleton-text long" />
                  <div className="skeleton-text medium" />
                  <div className="skeleton-text short" />
                  <div className="skeleton-actions" />
                </div>
              ))}
            </div>
          ) : availableItems.length === 0 ? (
            <div className="empty-state">
              <p>No available items nearby</p>
              <small>Increase radius or wait for new items</small>
            </div>
          ) : (
            <div className="items-grid">
              {availableItems.map((item) => (
                <div key={item.id} className="item-card">
                  <div className="item-card-header">
                    <span className="item-category">{item.category || "Unknown"}</span>
                  </div>

                  {item.image_url && (
                    <div className="item-thumbnail-container">
                      <img
                        src={item.image_url}
                        alt={item.category || "Item"}
                        className="item-thumbnail"
                        onClick={() => openImage(item.image_url)}
                        onError={(e) => { e.target.style.display = "none"; }}
                      />
                    </div>
                  )}

                  <h3>{(item.seller_name || "Seller")} – {item.category || "Item"}</h3>
                  <p>{item.description || "No description"}</p>

                  <div className="item-meta">
                    <div>₹{item.estimated_price ?? "?"}</div>
                  </div>

                  <div className="item-actions">
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn-success btn-small" onClick={() => handleAccept(item.id)} style={{ flex: 1 }}>
                        Accept
                      </button>
                      {item.address?.coordinates?.lat && item.address?.coordinates?.lng && (
                        <button
                          className="btn-primary btn-small"
                          onClick={async () => {
                            if (!collectorLocation) await loadCollectorLocation();
                            openRouteMap(item);
                          }}
                          style={{ flex: 1 }}
                        >
                          🧭 View Route
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}