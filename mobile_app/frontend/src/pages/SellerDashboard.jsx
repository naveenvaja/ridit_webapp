import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { sellerApi, authApi } from "../api";
import { useAuth } from "../context/AuthContext";
import LocationPicker from "../components/LocationPicker";
import "styles/Dashboard.css";

export default function SellerDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [settingsForm, setSettingsForm] = useState({ name: "", phone: "", referred_by: "" });
  const [referralCode, setReferralCode] = useState("");
  const [sellerLocation, setSellerLocation] = useState(null);
  const [deviceLocation, setDeviceLocation] = useState(null);
  const [showMenu, setShowMenu] = useState(false);

  // Auto-fetch device location when location form opens
  useEffect(() => {
    if (!showLocationPicker) return;
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = Number(pos.coords.latitude);
          const lng = Number(pos.coords.longitude);
          setDeviceLocation({ latitude: lat, longitude: lng });
        },
        (err) => {
          console.log('Could not get device location:', err.message);
          setDeviceLocation(null);
        },
        { timeout: 10000, enableHighAccuracy: false }
      );
    }
  }, [showLocationPicker]);

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    // Use prefetched items if available for instant UI
    try {
      const pref = localStorage.getItem('prefetch_seller_items');
      if (pref) {
        setItems(JSON.parse(pref));
        localStorage.removeItem('prefetch_seller_items');
      }
    } catch (e) {
      // ignore
    }
    fetchItems();
    loadSellerLocation();
  }, [user, statusFilter]);

  const loadSellerLocation = async () => {
    try {
      const res = await sellerApi.getLocation(user.id);
      setSellerLocation(res.data);
    } catch (err) {
      // Location not set yet
      setSellerLocation(null);
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

  const handleLocationPickerSelect = async (pickedLocation) => {
    let areaName = pickedLocation.areaName;
    
    // If area name is empty, reverse geocode to get it
    if (!areaName || areaName.trim() === "") {
      areaName = await getLocationName(pickedLocation.latitude, pickedLocation.longitude);
    }

    try {
      await sellerApi.setLocation(user.id, { 
        latitude: pickedLocation.latitude, 
        longitude: pickedLocation.longitude, 
        area_name: areaName 
      });
      alert('Location saved successfully!');
      setShowLocationPicker(false);
      await loadSellerLocation();
      fetchItems();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to save location');
    }
  };

  const openSettings = () => {
    (async () => {
      try {
        const res = await authApi.getProfile(user.id);
        const profile = res.data || res; // support both shapes
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
      // update local copy
      const updatedUser = { ...user, ...settingsForm };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      alert('Profile updated');
      setShowSettings(false);
      window.location.reload();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to update profile');
    }
  };

  const fetchItems = async () => {
    setLoading(true);
    try {
      const response = await sellerApi.getItems(user.id, statusFilter);
      setItems(response.data.items || []);
    } catch (error) {
      console.error("Failed to fetch items:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelItem = async (itemId) => {
    if (!window.confirm("Are you sure you want to cancel this item?")) {
      return;
    }

    try {
      await sellerApi.cancelItem(itemId);
      alert("Item cancelled successfully");
      fetchItems();
    } catch (error) {
      alert("Failed to cancel item");
    }
  };

  const handleDeleteItem = async (itemId) => {
    if (!window.confirm("Delete this item permanently? This cannot be undone.")) {
      return;
    }

    try {
      await sellerApi.deleteItem(itemId);
      alert("Item deleted successfully");
      fetchItems();
    } catch (error) {
      alert(error.response?.data?.detail || "Failed to delete item");
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="dashboard-header-content">
          <div className="header-left" style={{display: 'flex', alignItems: 'center', gap: 12}}>
            <button className="menu-icon" onClick={() => setShowMenu(true)} aria-label="Open menu" style={{background: 'none', border: 'none', fontSize: 28, padding: '0 8px 0 0', cursor: 'pointer', marginRight: 0}}>
              <span style={{display: 'inline-block', lineHeight: 1}}>&#9776;</span>
            </button>
            <div className="header-logo">♻️ Ridit</div>
            <div>
              <div style={{ fontSize: '12px', opacity: 0.9 }}>Seller Dashboard</div>
            </div>
          </div>
          <div className="header-right" style={{display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'flex-end', flex: 1}}>
            <button onClick={() => navigate("/seller/add-item")} className="btn-primary" style={{marginRight: 0, minWidth: 90, padding: '8px 16px'}}>
              + Add Item
            </button>
          </div>
                {/* Sidebar menu */}
                <div className={`sidebar-menu${showMenu ? ' open' : ''}`} style={{position: 'fixed', top: 0, left: showMenu ? 0 : '-260px', height: '100%', width: 260, background: '#fff', boxShadow: showMenu ? '0 0 24px rgba(0,0,0,0.18)' : 'none', zIndex: 2000, transition: 'left 0.3s cubic-bezier(0.4,0,0.2,1)'}}>
                  <button onClick={() => setShowMenu(false)} aria-label="Close menu" style={{background: 'none', border: 'none', fontSize: 28, padding: 16, cursor: 'pointer', width: '100%', textAlign: 'right'}}>&#10005;</button>
                  <div style={{display: 'flex', flexDirection: 'column', gap: 0, marginTop: 16}}>
                    <button className="menu-item" style={{padding: '18px 24px', border: 'none', background: 'none', textAlign: 'left', fontSize: 17, color: '#333', borderBottom: '1px solid #f0f0f0', cursor: 'pointer'}} onClick={() => { setShowMenu(false); openSettings(); }}>Settings</button>
                    <button className="menu-item" style={{padding: '18px 24px', border: 'none', background: 'none', textAlign: 'left', fontSize: 17, color: '#333', borderBottom: '1px solid #f0f0f0', cursor: 'pointer'}} onClick={() => { setShowMenu(false); setShowLocationPicker(true); }}>Update Location</button>
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
          </div> {/* Closing div for dashboard-header-content */}
        {/* Add CSS for menu dropdown and items (can be moved to Dashboard.css)
        .dashboard-menu-dropdown {
          position: absolute;
          right: 0;
          top: 48px;
          background: #fff;
          box-shadow: 0 4px 16px rgba(0,0,0,0.15);
          border-radius: 8px;
          z-index: 100;
          min-width: 180px;
          display: flex;
          flex-direction: column;
        }
        .menu-item {
          padding: 14px 18px;
          background: none;
          border: none;
          text-align: left;
          font-size: 16px;
          color: #333;
          cursor: pointer;
          border-bottom: 1px solid #f0f0f0;
          transition: background 0.2s;
        }
        .menu-item:last-child {
          border-bottom: none;
        }
        .menu-item:hover {
          background: #f6f8fa;
        }
        {/* End of menu CSS comment block */}
      </header>

      <div className="dashboard-main">
        <div className="dashboard-section">
          <div className="section-header">
            <h2 className="section-title">Your Waste Listings</h2>
            <div className="section-controls">
              <div className="filter-group">
                <button
                  className={`filter-btn ${!statusFilter ? 'active' : ''}`}
                  onClick={() => setStatusFilter(null)}
                >
                  All
                </button>
                <button
                  className={`filter-btn ${statusFilter === 'pending' ? 'active' : ''}`}
                  onClick={() => setStatusFilter('pending')}
                >
                  Pending
                </button>
                <button
                  className={`filter-btn ${statusFilter === 'accepted' ? 'active' : ''}`}
                  onClick={() => setStatusFilter('accepted')}
                >
                  Accepted
                </button>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="loading">
              <div className="spinner"></div>
              Loading your items...
            </div>
          ) : items.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📦</div>
              <h3 className="empty-title">No waste items yet</h3>
              <p className="empty-description">Start by adding your first waste item for collection</p>
              <button onClick={() => navigate("/seller/add-item")} className="btn-primary">
                Add Your First Item
              </button>
            </div>
          ) : (
            <div className="items-grid">
              {items.map((item) => (
                <div key={item.id} className="item-card">
                  <div className="item-card-header">
                    <span className="item-category">{item.category}</span>
                    <span className={`item-status ${item.status}`}>{item.status}</span>
                  </div>

                  {item.image_url && (
                    <div className="item-thumbnail-container" style={{ marginBottom: 12, cursor: "pointer" }}>
                      <img
                        src={item.image_url}
                        alt={item.category}
                        className="item-thumbnail"
                        onClick={() => setSelectedImage(item.image_url)}
                        onError={(e) => { e.target.style.display = "none"; }}
                        style={{ width: "100%", height: 180, objectFit: "cover", borderRadius: 8 }}
                      />
                    </div>
                  )}

                  <h3 className="item-title">{item.description || 'Waste Item'}</h3>
                  <p className="item-description">
                    {item.description || 'No description provided'}
                  </p>
                  <div className="item-meta">
                    <div className="meta-item">
                      <span className="meta-label">Weight (kg)</span>
                      <span className="meta-value">{item.quantity}</span>
                    </div>
                    <div className="meta-item">
                      <span className="meta-label">Price</span>
                      <span className="meta-value">₹{item.estimated_price}</span>
                    </div>
                    <div className="meta-item">
                      <span className="meta-label">Location</span>
                      <span className="meta-value">{item.address?.city || 'N/A'}</span>
                    </div>
                    {item.collector_name && (
                      <div className="meta-item">
                        <span className="meta-label">Collector</span>
                        <span className="meta-value">{item.collector_name}</span>
                      </div>
                    )}
                    {item.collector_phone && (
                      <div className="meta-item">
                        <span className="meta-label">Collector Contact</span>
                        <span className="meta-value">{item.collector_phone}</span>
                      </div>
                    )}
                  </div>
                  <div className="item-actions">
                    {item.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleCancelItem(item.id)}
                          className="btn-danger btn-small"
                        >
                          Cancel
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      className="btn-danger btn-small"
                    >
                      Delete
                    </button>
                    {item.status === 'collected' && item.final_price && (
                      <button className="btn-success btn-small" disabled>
                        ✓ Completed
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedImage && (
        <div className="image-modal-overlay" onClick={() => setSelectedImage(null)}>
          <div className="image-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="image-modal-close" onClick={() => setSelectedImage(null)}>×</button>
            <img src={selectedImage} alt="Full size item" className="full-size-image" />
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

      {showLocationPicker && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: "700px", maxHeight: "90vh", overflow: "auto" }}>
            <h3 style={{marginTop: 0}}>📍 Set Your Business Location</h3>
            <p style={{fontSize: "13px", color: "#7f8c8d", marginBottom: "15px"}}>
              Items will only be visible to collectors within 10km of your location
            </p>
            <div style={{ padding: 8 }}>
              {/* Auto-detected Device Location */}
              {deviceLocation && (
                <div style={{ background: 'rgba(76, 175, 80, 0.1)', padding: 12, borderRadius: 8, marginBottom: 16, border: "1px solid #4caf50" }}>
                  <div style={{ fontSize: 13, color: '#2c3e50', fontWeight: 600, marginBottom: 8 }}>✓ Your Current Location (Auto-detected):</div>
                  <div style={{ fontSize: 12, color: '#27ae60', marginBottom: 4 }}>Latitude: {deviceLocation.latitude.toFixed(6)}</div>
                  <div style={{ fontSize: 12, color: '#27ae60', marginBottom: 8 }}>Longitude: {deviceLocation.longitude.toFixed(6)}</div>
                  <button 
                    className="btn-success" 
                    onClick={async () => {
                      try {
                        await sellerApi.setLocation(user.id, { latitude: deviceLocation.latitude, longitude: deviceLocation.longitude, area_name: '' });
                        alert('Location saved successfully!');
                        setShowLocationPicker(false);
                        setDeviceLocation(null);
                        await loadSellerLocation();
                        fetchItems();
                      } catch (err) {
                        alert(err.response?.data?.detail || 'Failed to save location');
                      }
                    }}
                    style={{ width: "100%" }}
                  >
                    ✓ Save This Location
                  </button>
                </div>
              )}

              {/* LocationPicker for Manual Adjustment */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: "0.95em", fontWeight: 600, marginBottom: 8 }}>Or select different location on map:</div>
                <LocationPicker 
                  onLocationSelect={handleLocationPickerSelect}
                  initialLocation={sellerLocation} 
                />
              </div>

              {/* Current Saved Location Display */}
              {sellerLocation && sellerLocation.latitude && sellerLocation.longitude && (
                <div style={{ background: 'rgba(52,152,219,0.06)', padding: 10, borderRadius: 6, marginBottom: 12 }}>
                  <div style={{ fontSize: 13, color: '#2c3e50', fontWeight: 600 }}>📍 Saved Location:</div>
                  {sellerLocation.area_name && (
                    <div style={{ fontSize: 13, color: '#27ae60', fontWeight: 600, marginTop: 6 }}>
                      {sellerLocation.area_name}
                    </div>
                  )}
                  <div style={{ fontSize: 12, color: '#2980b9', marginTop: 6 }}>📌 {sellerLocation.latitude.toFixed(6)}, {sellerLocation.longitude.toFixed(6)}</div>
                </div>
              )}
            </div>
            <button 
              type="button" 
              className="btn-secondary" 
              onClick={() => {
                setShowLocationPicker(false);
                setDeviceLocation(null);
              }}
              style={{ width: "100%", marginTop: "15px" }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
