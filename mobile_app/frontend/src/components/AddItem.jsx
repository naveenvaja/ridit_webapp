import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { sellerApi } from "../api";
import { useAuth } from "../context/AuthContext";
import LocationPicker from "./LocationPicker";
import "../styles/AddItem.css";
import { storage } from "../firebase";
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from "firebase/storage";

export default function AddItem() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [estimatedPrice, setEstimatedPrice] = useState(null);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  
  const [formData, setFormData] = useState({
    category: "plastic",
    quantity: "",
    description: "",
    image_url: "",
    address: {
      street: "",
      city: "",
      zip_code: "",
      coordinates: { lat: 0, lng: 0 },
    },
    pickup_slot: {
      date: "",
      start_time: "",
      end_time: "",
    },
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleAddressChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      address: {
        ...formData.address,
        [name]: value,
      },
    });
  };

  const handleSlotChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      pickup_slot: {
        ...formData.pickup_slot,
        [name]: value,
      },
    });
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Cost-saving: enforce a client-side max file size to avoid very large uploads
    const MAX_FILE_BYTES = 3 * 1024 * 1024; // 3 MB
    if (file.size > MAX_FILE_BYTES) {
      if (!window.confirm('Selected image is larger than 3 MB. It will be compressed before upload but large originals increase storage costs. Continue?')) {
        return;
      }
    }
    // Immediate preview with data URL (fast, never blocks)
    const reader = new FileReader();
    reader.onload = (ev) => {
      setFormData({ ...formData, image_url: ev.target.result });
      
      // Async: attempt resize + cloud upload in background
      (async () => {
        try {
          const img = new Image();
          img.onload = async () => {
            try {
              // Generate smaller size (resize for bandwidth and storage savings)
              const canvas = document.createElement('canvas');
              // target max dimension reduced for cost-savings
              const MAX_DIM = 640; // px
              const scale = Math.min(1, MAX_DIM / Math.max(img.width, img.height));
              canvas.width = Math.round(img.width * scale);
              canvas.height = Math.round(img.height * scale);
              const ctx = canvas.getContext('2d');
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

              // Use slightly lower quality to reduce bytes further
              const WEBP_QUALITY = 0.75;
              const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', WEBP_QUALITY));
              if (!blob) return;

              // Try Firebase upload
              const userId = user?.id || 'anon';
              const filename = `${userId}_${Date.now()}.webp`;
              const storagePath = `items/${userId}/${filename}`;
              const storageReference = storageRef(storage, storagePath);
              const metadata = { contentType: 'image/webp', cacheControl: 'public, max-age=31536000' };

              const uploadTask = uploadBytesResumable(storageReference, blob, metadata);
              uploadTask.on('state_changed', 
                (snapshot) => {
                  const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
                  setUploadProgress(pct);
                },
                (err) => console.warn('Firebase upload failed (using local fallback):', err),
                async () => {
                  try {
                    const url = await getDownloadURL(uploadTask.snapshot.ref);
                    // Update to cloud URL on success
                    setFormData(prev => ({ ...prev, image_url: url }));
                    setUploadProgress(100);
                  } catch (e) {
                    console.warn('Could not get download URL, keeping local fallback');
                  }
                }
              );
            } catch (err) {
              console.warn('Image optimization failed, using local fallback:', err);
            }
          };
          img.onerror = () => console.warn('Image load error');
          img.src = ev.target.result;
        } catch (err) {
          console.warn('Background upload error:', err);
        }
      })();
    };
    reader.readAsDataURL(file);
  };

  const calculatePrice = () => {
    const prices = {
      plastic: 15,
      paper: 10,
      metal: 40,
      ewaste: 60,
    };
    const price = prices[formData.category] * (parseFloat(formData.quantity) || 0);
    setEstimatedPrice(price);
  };

  const handleUseDeviceLocation = () => {
    if (!navigator.geolocation) { alert('Geolocation not supported'); return; }
    navigator.geolocation.getCurrentPosition((pos) => {
      const lat = Number(pos.coords.latitude);
      const lng = Number(pos.coords.longitude);
      setFormData(prev => ({
        ...prev,
        address: {
          ...prev.address,
          coordinates: { lat, lng }
        }
      }));
      setShowLocationPicker(false);
    }, (err) => { alert('Unable to get device location: ' + (err.message || err.code)); }, { timeout: 10000 });
  };
  const handleLocationPickerSelect = (pickedLocation) => {
    setFormData({
      ...formData,
      address: {
        ...formData.address,
        coordinates: {
          lat: pickedLocation.latitude,
          lng: pickedLocation.longitude,
        },
      },
    });
    setShowLocationPicker(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!formData.quantity || !formData.description || !formData.image_url) {
      setError("Please fill all required fields and upload an image");
      setLoading(false);
      return;
    }

    try {
      const response = await sellerApi.addItem(user.id, formData);
      alert(`Item added successfully! Estimated price: ₹${response.data.estimated_price}`);
      navigate("/seller/dashboard");
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to add item");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="add-item-container">
      <header className="dashboard-header">
        <div className="dashboard-header-content">
          <div className="header-left">
            <div className="header-logo">♻️ Ridit</div>
            <div>
              <div style={{ fontSize: '12px', opacity: 0.9 }}>Add Waste Item</div>
            </div>
          </div>
          <div className="header-right">
            <button
              type="button"
              onClick={() => navigate("/seller/dashboard")}
              className="btn-secondary"
            >
              ← Back
            </button>
          </div>
        </div>
      </header>

      <div className="dashboard-main">
        <div className="form-container">
          {error && (
            <div className="alert alert-danger">
              <span>⚠️</span> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="add-item-form">
            <div className="form-card">
              <div className="card-header">
                <h2>📦 Item Details</h2>
              </div>

              <div className="form-group">
                <label>Waste Category *</label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="form-input"
                >
                  <option value="plastic">♻️ Plastic</option>
                  <option value="paper">📄 Paper</option>
                  <option value="metal">⚙️ Metal</option>
                  <option value="ewaste">💻 E-Waste</option>
                </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                    <label>Weight (kg) *</label>
                    <input
                      type="number"
                      name="quantity"
                      value={formData.quantity}
                      onChange={handleChange}
                      placeholder="e.g., 50"
                      step="0.1"
                      required
                      className="form-input"
                    />
                </div>
                <div className="form-group">
                  <label>&nbsp;</label>
                  <button
                    type="button"
                    onClick={calculatePrice}
                    className="btn-secondary btn-full"
                  >
                    📊 Calculate Price
                  </button>
                </div>
              </div>

              {estimatedPrice !== null && (
                <div className="estimated-price">
                  <div className="price-value">₹{estimatedPrice.toFixed(2)}</div>
                  <p className="price-note">(Final price may vary based on actual weight)</p>
                </div>
              )}

              <div className="form-group">
                <label>Description *</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Describe the waste material (min 10 characters)"
                  minLength="10"
                  required
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label>Upload Image *</label>
                <div className="file-input-wrapper">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    required
                    className="file-input"
                  />
                  <span className="file-input-label">
                    📸 Choose Image or Drag & Drop
                  </span>
                </div>
                {uploadProgress > 0 && uploadProgress < 100 && (
                  <div style={{ marginTop: '10px' }}>
                    <div style={{ fontSize: '12px', marginBottom: '5px', color: '#666' }}>
                      Uploading... {uploadProgress}%
                    </div>
                    <div style={{ width: '100%', height: '6px', backgroundColor: '#e0e0e0', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${uploadProgress}%`, height: '100%', backgroundColor: '#667eea', transition: 'width 0.2s' }} />
                    </div>
                  </div>
                )}
                {formData.image_url && (
                  <div className="image-preview">
                    <img src={formData.image_url} alt="Preview" />
                  </div>
                )}
              </div>
            </div>

            <div className="form-card">
              <div className="card-header">
                <h2>📍 Pickup Location</h2>
              </div>

              <div className="form-group">
                <label>Street Address</label>
                <input
                  type="text"
                  name="street"
                  value={formData.address.street}
                  onChange={handleAddressChange}
                  placeholder="Enter street address"
                  className="form-input"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>City *</label>
                  <input
                    type="text"
                    name="city"
                    value={formData.address.city}
                    onChange={handleAddressChange}
                    placeholder="Enter city"
                    required
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label>Zip Code</label>
                  <input
                    type="text"
                    name="zip_code"
                    value={formData.address.zip_code}
                    onChange={handleAddressChange}
                    placeholder="Enter zip code"
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>📍 Location (Click to Select on Map)</label>
                <button 
                  type="button"
                  onClick={() => setShowLocationPicker(true)}
                  style={{
                    width: "100%",
                    padding: "12px",
                    background: "linear-gradient(135deg, #667eea, #764ba2)",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    fontWeight: "600",
                    cursor: "pointer",
                    marginBottom: "10px",
                    fontSize: "14px",
                    transition: "all 0.3s ease"
                  }}
                  onMouseOver={(e) => e.target.style.transform = "translateY(-2px)"}
                  onMouseOut={(e) => e.target.style.transform = "translateY(0)"}
                >
                  🗺️ Open Location Picker
                </button>
                {formData.address.coordinates.lat !== 0 && (
                  <div style={{ 
                    background: "rgba(52, 152, 219, 0.1)", 
                    padding: "10px", 
                    borderRadius: "6px",
                    fontSize: "12px",
                    color: "#3498db"
                  }}>
                    <div><strong>Latitude:</strong> {formData.address.coordinates.lat.toFixed(6)}</div>
                    <div><strong>Longitude:</strong> {formData.address.coordinates.lng.toFixed(6)}</div>
                  </div>
                )}
              </div>
            </div>

            <div className="form-card">
              <div className="card-header">
                <h2>🕐 Pickup Schedule</h2>
              </div>

              <div className="form-group">
                <label>Preferred Date *</label>
                <input
                  type="date"
                  name="date"
                  value={formData.pickup_slot.date}
                  onChange={handleSlotChange}
                  required
                  className="form-input"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Start Time *</label>
                  <input
                    type="time"
                    name="start_time"
                    value={formData.pickup_slot.start_time}
                    onChange={handleSlotChange}
                    required
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label>End Time *</label>
                  <input
                    type="time"
                    name="end_time"
                    value={formData.pickup_slot.end_time}
                    onChange={handleSlotChange}
                    required
                    className="form-input"
                  />
                </div>
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" disabled={loading} className="btn-primary btn-large">
                {loading ? '⏳ Adding Item...' : '✓ Add Item'}
              </button>
              <button
                type="button"
                onClick={() => navigate("/seller/dashboard")}
                className="btn-secondary btn-large"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Location Picker Modal */}
      {showLocationPicker && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: "700px", maxHeight: "90vh", overflow: "auto" }}>
            <h3 style={{ marginTop: 0 }}>Select Pickup Location</h3>
            <div style={{ padding: 8 }}>
              <p>Choose how to set the pickup coordinates:</p>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <button className="btn-primary" onClick={handleUseDeviceLocation} style={{ flex: 1 }}>Use Device Location</button>
                <button className="btn-secondary" onClick={() => window.open('https://www.google.com/maps', '_blank')} style={{ flex: 1 }}>Open Google Maps</button>
              </div>
              <div style={{ marginTop: 8 }}>
                <LocationPicker onLocationSelect={handleLocationPickerSelect} initialLocation={{ latitude: formData.address.coordinates.lat || 0, longitude: formData.address.coordinates.lng || 0 }} />
              </div>
              <p style={{ marginTop: 12, color: '#666' }}>You can click on the map and press Confirm Location to set coordinates.</p>
            </div>
            <button 
              type="button" 
              className="btn-secondary" 
              onClick={() => setShowLocationPicker(false)}
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
