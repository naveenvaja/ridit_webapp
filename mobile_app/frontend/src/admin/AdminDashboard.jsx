import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "styles/Admin.css";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [items, setItems] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [q, setQ] = useState("");
  const [error, setError] = useState("");
  const [tab, setTab] = useState("users"); // users, items, subscriptions
  const [showMenu, setShowMenu] = useState(false); // sidebar menu for mobile
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [editUser, setEditUser] = useState(null);
  const [showEditUser, setShowEditUser] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", phone: "", referred_by: "" });
  const [createForm, setCreateForm] = useState({ name: "", email: "", phone: "", password: "", user_type: "seller" });
  const [editingItemWeight, setEditingItemWeight] = useState(null);
  const [editingItemWeightValue, setEditingItemWeightValue] = useState("");
  const [loadingItemUpdate, setLoadingItemUpdate] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState(null);
  const [showImageModal, setShowImageModal] = useState(false);

  const API_BASE = process.env.REACT_APP_API_URL || "https://ridit-frontend.onrender.com";

  useEffect(() => {
    const userType = localStorage.getItem("user_type");
    const token = localStorage.getItem("token");
    if (userType !== "admin" || !token) {
      navigate("/admin/login");
      return;
    }

    fetchUsers();
    fetchItems();
    fetchSubscriptions();
  }, []);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/admin/users`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      const data = await res.json();
      setUsers(Object.values(data || {}));
      setError("");
    } catch (err) {
      setError(`Failed to fetch users: ${err.message}`);
    }
  };

  const fetchItems = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/admin/items`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      const data = await res.json();
      setItems(Object.values(data || {}));
      setError("");
    } catch (err) {
      setError(`Failed to fetch items: ${err.message}`);
    }
  };

  const fetchSubscriptions = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/admin/subscriptions`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      const data = await res.json();
      setSubscriptions(Array.isArray(data) ? data : []);
      setError("");
    } catch (err) {
      setError(`Failed to fetch subscriptions: ${err.message}`);
    }
  };

  const activateSubscription = async (collectorId) => {
    const days = prompt("Enter days valid (default 30):", "30");
    if (days === null) return;
    
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/admin/subscriptions/${collectorId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ collector_id: collectorId, plan_type: "basic", days_valid: parseInt(days) })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      setError("");
      await fetchSubscriptions();
    } catch (err) {
      setError(`Failed to activate subscription: ${err.message}`);
    }
  };

  const cancelSubscription = async (collectorId) => {
    if (!window.confirm("Cancel this subscription?")) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/admin/subscriptions/${collectorId}`, { 
        method: "DELETE", 
        headers: { Authorization: `Bearer ${token}` } 
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      setError("");
      await fetchSubscriptions();
    } catch (err) {
      setError(`Failed to cancel subscription: ${err.message}`);
    }
  };

  const deleteUser = async (userId) => {
    if (!window.confirm("Delete this user? This action cannot be undone.")) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/admin/user/${userId}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      setError("");
      await fetchUsers();
    } catch (err) {
      setError(`Failed to delete user: ${err.message}`);
    }
  };

  const openSettings = (user) => {
    setEditUser(user);
    setEditForm({ name: user.name || "", phone: user.phone || "", referred_by: user.referred_by || "" });
    setShowEditUser(true);
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    if (!editUser) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/admin/user/${editUser.id || editUser}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(editForm)
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`HTTP ${res.status}: ${txt}`);
      }
      setShowEditUser(false);
      setEditUser(null);
      setError("");
      await fetchUsers();
      alert('User updated successfully');
    } catch (err) {
      setError(`Failed to update user: ${err.message}`);
    }
  };

  const deleteItem = async (itemId) => {
    if (!window.confirm("Delete this item? This action cannot be undone.")) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/admin/item/${itemId}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      setError("");
      await fetchItems();
    } catch (err) {
      setError(`Failed to delete item: ${err.message}`);
    }
  };

  const handleEditItemWeight = (item) => {
    setEditingItemWeight(item);
    setEditingItemWeightValue(item.actual_weight || "");
  };

  const handleUpdateItemWeight = async () => {
    if (!editingItemWeight || !editingItemWeightValue || parseFloat(editingItemWeightValue) <= 0) {
      setError("Please enter a valid weight in kg");
      return;
    }

    setLoadingItemUpdate(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/admin/item/${editingItemWeight.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ actual_weight: parseFloat(editingItemWeightValue) })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      setError("");
      setEditingItemWeight(null);
      setEditingItemWeightValue("");
      await fetchItems();
      alert("Item weight updated successfully");
    } catch (err) {
      setError(`Failed to update item weight: ${err.message}`);
    } finally {
      setLoadingItemUpdate(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!createForm.name || !createForm.email || !createForm.phone || !createForm.password) {
      setError("All fields required");
      return;
    }
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/admin/users/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(createForm)
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      const data = await res.json();
      setError("");
      setCreateForm({ name: "", email: "", phone: "", password: "", user_type: "seller" });
      setShowCreateUser(false);
      await fetchUsers();
      alert(`User created successfully: ${data.user_id}`);
    } catch (err) {
      setError(`Failed to create user: ${err.message}`);
    }
  };

  const logout = () => { localStorage.clear(); navigate("/admin/login"); };

  const filteredUsers = users.filter(u => {
    if (!q) return true;
    const s = q.toLowerCase();
    return (u.name || "").toLowerCase().includes(s) || (u.email || "").toLowerCase().includes(s) || (u.phone || "").includes(s);
  });

  const filteredItems = items.filter(it => {
    if (!q) return true;
    const s = q.toLowerCase();
    return (it.seller_name || "").toLowerCase().includes(s) || (it.category || "").toLowerCase().includes(s);
  });


  return (
    <div className="admin-container">
      <header className="dashboard-header admin-header" style={{position: 'relative'}}>
        <div className="dashboard-header-content" style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12}}>
          <div className="header-left" style={{display: 'flex', alignItems: 'center', gap: 12}}>
            <button className="menu-icon" onClick={() => setShowMenu(true)} aria-label="Open menu" style={{background: 'none', border: 'none', fontSize: 28, padding: '0 8px 0 0', cursor: 'pointer', marginRight: 0}}>
              <span style={{display: 'inline-block', lineHeight: 1}}>&#9776;</span>
            </button>
            <div className="brand-logo">A</div>
            <div>
              <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                Ridit Admin <span className="admin-badge">Official</span>
              </div>
              <div className="small muted">Manage users, items, subscriptions</div>
            </div>
          </div>
          <div className="header-right" style={{display: 'flex', alignItems: 'center', gap: 8, flex: 1, justifyContent: 'flex-end'}}>
            <input className="form-input" placeholder="Search" value={q} onChange={e => setQ(e.target.value)} style={{maxWidth: 140}} />
          </div>
        </div>
        {/* Sidebar menu */}
        <div className={`sidebar-menu${showMenu ? ' open' : ''}`} style={{position: 'fixed', top: 0, left: showMenu ? 0 : '-260px', height: '100%', width: 260, background: '#fff', boxShadow: showMenu ? '0 0 24px rgba(0,0,0,0.18)' : 'none', zIndex: 2000, transition: 'left 0.3s cubic-bezier(0.4,0,0.2,1)'}}>
          <button onClick={() => setShowMenu(false)} aria-label="Close menu" style={{background: 'none', border: 'none', fontSize: 28, padding: 16, cursor: 'pointer', width: '100%', textAlign: 'right'}}>&#10005;</button>
          <div style={{display: 'flex', flexDirection: 'column', gap: 0, marginTop: 16}}>
            <button className="menu-item" style={{padding: '18px 24px', border: 'none', background: 'none', textAlign: 'left', fontSize: 17, color: tab === 'users' ? '#1976d2' : '#333', borderBottom: '1px solid #f0f0f0', cursor: 'pointer', fontWeight: tab === 'users' ? 600 : 400}} onClick={() => { setTab('users'); setShowMenu(false); }}>Users</button>
            <button className="menu-item" style={{padding: '18px 24px', border: 'none', background: 'none', textAlign: 'left', fontSize: 17, color: tab === 'items' ? '#1976d2' : '#333', borderBottom: '1px solid #f0f0f0', cursor: 'pointer', fontWeight: tab === 'items' ? 600 : 400}} onClick={() => { setTab('items'); setShowMenu(false); }}>Items</button>
            <button className="menu-item" style={{padding: '18px 24px', border: 'none', background: 'none', textAlign: 'left', fontSize: 17, color: tab === 'subscriptions' ? '#1976d2' : '#333', borderBottom: '1px solid #f0f0f0', cursor: 'pointer', fontWeight: tab === 'subscriptions' ? 600 : 400}} onClick={() => { setTab('subscriptions'); setShowMenu(false); }}>Subscriptions</button>
            <div style={{borderBottom: '1px solid #f0f0f0'}}></div>
            <button className="menu-item" style={{padding: '18px 24px', border: 'none', background: 'none', textAlign: 'left', fontSize: 17, color: '#333', borderBottom: '1px solid #f0f0f0', cursor: 'pointer'}} onClick={() => { setShowMenu(false); /* openSettings(); */ alert('Settings coming soon'); }}>Settings</button>
            <button className="menu-item" style={{padding: '18px 24px', border: 'none', background: 'none', textAlign: 'left', fontSize: 17, color: '#333', borderBottom: '1px solid #f0f0f0', cursor: 'pointer'}} onClick={() => { setShowMenu(false); fetchUsers(); fetchItems(); fetchSubscriptions(); }}>Refresh</button>
            <button className="menu-item" style={{padding: '18px 24px', border: 'none', background: 'none', textAlign: 'left', fontSize: 17, color: '#333', borderBottom: 'none', cursor: 'pointer'}} onClick={() => { setShowMenu(false); logout(); }}>Logout</button>
          </div>
        </div>
      </header>

      {error && (
        <div style={{ marginBottom: 16, padding: 12, background: "#fee", border: "1px solid #f88", borderRadius: 8, color: "#d32f2f" }}>
          <strong>Error:</strong> {error}
        </div>
      )}


      {/* Mobile-friendly: Tabs moved to sidebar menu */}

      {tab === "users" && (
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3>Users ({filteredUsers.length})</h3>
          <button className="btn secondary" onClick={() => setShowCreateUser(!showCreateUser)}>
            {showCreateUser ? "Cancel" : "Create User"}
          </button>
        </div>

        {showCreateUser && (
          <form onSubmit={handleCreateUser} style={{ marginBottom: 20, padding: 16, background: "#f5f5f5", borderRadius: 8 }}>
            <h4>Create New User</h4>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Name</label>
              <input className="form-input" type="text" placeholder="Full name" value={createForm.name} onChange={e => setCreateForm({...createForm, name: e.target.value})} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Email</label>
              <input className="form-input" type="email" placeholder="Email address" value={createForm.email} onChange={e => setCreateForm({...createForm, email: e.target.value})} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Phone</label>
              <input className="form-input" type="tel" placeholder="Phone number" value={createForm.phone} onChange={e => setCreateForm({...createForm, phone: e.target.value})} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Password</label>
              <input className="form-input" type="password" placeholder="Password" value={createForm.password} onChange={e => setCreateForm({...createForm, password: e.target.value})} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>User Type</label>
              <select className="form-input" value={createForm.user_type} onChange={e => setCreateForm({...createForm, user_type: e.target.value})}>
                <option value="seller">Seller</option>
                <option value="collector">Collector</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <button type="submit" className="btn">Create User</button>
          </form>
        )}

        {/* Mobile-friendly: Only show user name and type, tap to view details */}
        <div className="user-list-mobile">
          {filteredUsers.map((u, i) => (
            <div key={u.id || i} className="user-list-item-mobile" style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 12px', borderBottom: '1px solid #eee', cursor: 'pointer'}} onClick={() => { setEditUser(u); setShowEditUser(true); }}>
              <div style={{fontWeight: 600, fontSize: 16}}>{u.name}</div>
              <div style={{fontSize: 14, color: '#1976d2', fontWeight: 500}}>{u.user_type}</div>
            </div>
          ))}
        </div>
      </div>
      )}

      {showEditUser && editUser && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 1000
        }} onClick={() => setShowEditUser(false)}>
          <div className="card" style={{ maxWidth: 340, width: '95%', margin: 8, padding: 18 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <h3 style={{fontSize: 18, margin: 0}}>User Details</h3>
              <button type="button" className="btn secondary" style={{fontSize: 16, padding: '2px 10px'}} onClick={() => setShowEditUser(false)}>✕</button>
            </div>
            <div style={{marginBottom: 10}}><strong>Name:</strong> {editUser.name}</div>
            <div style={{marginBottom: 10}}><strong>Email:</strong> {editUser.email}</div>
            <div style={{marginBottom: 10}}><strong>Phone:</strong> {editUser.phone}</div>
            <div style={{marginBottom: 10}}><strong>Type:</strong> {editUser.user_type}</div>
            <div style={{marginBottom: 10}}><strong>Referred By:</strong> {editUser.referred_by || '-'}</div>
            {/* Only show details and delete option for mobile user popup */}
            <div style={{marginTop: 10, display: 'flex', justifyContent: 'flex-end'}}>
              <button className="btn danger" style={{fontSize: 15, padding: '6px 16px'}} onClick={() => { deleteUser(editUser.id || editUser); setShowEditUser(false); }}>Delete User</button>
            </div>
            {/* Only one delete button shown below */}
          </div>
        </div>
      )}

      {tab === "items" && (
      <div className="card">
        <h3>Items ({filteredItems.length})</h3>
        {/* Mobile-friendly: Only show seller name and item type, tap to view details */}
        <div className="item-list-mobile">
          {filteredItems.map((it, idx) => (
            <div key={it.id || idx} className="item-list-item-mobile" style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 12px', borderBottom: '1px solid #eee', cursor: 'pointer'}} onClick={() => setSelectedItem(it)}>
              <div style={{fontWeight: 600, fontSize: 16}}>{it.seller_name}</div>
              <div style={{fontSize: 14, color: '#1976d2', fontWeight: 500}}>{it.category}</div>
            </div>
          ))}
        </div>
      </div>
      )}

      {tab === "subscriptions" && (
      <div className="card">
        <h3>Collector Subscriptions</h3>
        {/* Mobile-friendly: Only show collector name and status, tap to view details */}
        <div className="subscription-list-mobile">
          {subscriptions.map((sub, idx) => (
            <div key={sub.collector_id || idx} className="subscription-list-item-mobile" style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 12px', borderBottom: '1px solid #eee', cursor: 'pointer'}} onClick={() => setSelectedSubscription(sub)}>
              <div style={{fontWeight: 600, fontSize: 16}}>{sub.collector_name}</div>
              <div style={{fontSize: 14, color: sub.status === 'active' ? 'green' : 'red', fontWeight: 500}}>{sub.status}</div>
            </div>
          ))}
        </div>
      </div>
      )}
  
      {/* Subscription details popup modal */}
      {selectedSubscription && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 1000
        }} onClick={() => setSelectedSubscription(null)}>
          <div className="card" style={{ maxWidth: 340, width: '95%', margin: 8, padding: 18 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <h3 style={{fontSize: 18, margin: 0}}>Subscription Details</h3>
              <button type="button" className="btn secondary" style={{fontSize: 16, padding: '2px 10px'}} onClick={() => setSelectedSubscription(null)}>✕</button>
            </div>
            <div style={{marginBottom: 10}}><strong>Collector:</strong> {selectedSubscription.collector_name || "N/A"}</div>
            <div style={{marginBottom: 10}}><strong>Email:</strong> {selectedSubscription.email || "N/A"}</div>
            <div style={{marginBottom: 10}}><strong>Phone:</strong> {selectedSubscription.phone || "N/A"}</div>
            <div style={{marginBottom: 10}}><strong>Status:</strong> <span style={{color: selectedSubscription.status === 'active' ? 'green' : 'red'}}>{selectedSubscription.status}</span></div>
            <div style={{marginBottom: 10}}><strong>Plan:</strong> {selectedSubscription.plan_type || "N/A"}</div>
            <div style={{marginBottom: 10}}><strong>Expiry:</strong> {selectedSubscription.expiry_date ? new Date(selectedSubscription.expiry_date).toLocaleDateString() : "N/A"}</div>
            <div style={{marginTop: 10, display: 'flex', justifyContent: 'flex-end', gap: 8}}>
              {selectedSubscription.status === 'inactive' && (
                <button className="btn secondary" onClick={() => { activateSubscription(selectedSubscription.collector_id); setSelectedSubscription(null); }}>Activate</button>
              )}
              {selectedSubscription.status === 'active' && (
                <button className="btn danger" onClick={() => { cancelSubscription(selectedSubscription.collector_id); setSelectedSubscription(null); }}>Cancel</button>
              )}
            </div>
          </div>
        </div>
      )}

      {selectedItem && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 1000
        }} onClick={() => setSelectedItem(null)}>
          <div className="card" style={{ maxWidth: 340, width: '95%', margin: 8, padding: 18 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <h3 style={{fontSize: 18, margin: 0}}>Item Details</h3>
              <button type="button" className="btn secondary" style={{fontSize: 16, padding: '2px 10px'}} onClick={() => setSelectedItem(null)}>✕</button>
            </div>
            {selectedItem.image_url && (
              <img 
                src={selectedItem.image_url} 
                alt={selectedItem.category || "Item"} 
                style={{ width: "100%", height: 180, objectFit: "cover", borderRadius: 8, marginBottom: 12, cursor: 'pointer' }} 
                onClick={() => setShowImageModal(true)}
                title="Tap to enlarge"
              />
            )}
                  {/* Big image popup modal */}
                  {showImageModal && selectedItem && selectedItem.image_url && (
                    <div style={{
                      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
                      background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center",
                      zIndex: 3000
                    }} onClick={() => setShowImageModal(false)}>
                      <img 
                        src={selectedItem.image_url} 
                        alt={selectedItem.category || "Item"} 
                        style={{ maxWidth: '95vw', maxHeight: '85vh', borderRadius: 12, boxShadow: '0 4px 32px #0008' }}
                        onClick={e => e.stopPropagation()}
                      />
                      <button 
                        onClick={() => setShowImageModal(false)}
                        style={{position: 'fixed', top: 18, right: 18, background: '#fff', border: 'none', borderRadius: '50%', fontSize: 28, width: 44, height: 44, cursor: 'pointer', boxShadow: '0 2px 8px #0004', zIndex: 3100}}
                        aria-label="Close image"
                      >✕</button>
                    </div>
                  )}
            <div style={{marginBottom: 10}}><strong>Seller:</strong> {selectedItem.seller_name || "N/A"}</div>
            <div style={{marginBottom: 10}}><strong>Category:</strong> {selectedItem.category || "N/A"}</div>
            <div style={{marginBottom: 10}}><strong>Quantity:</strong> {selectedItem.quantity || "N/A"}</div>
            <div style={{marginBottom: 10}}><strong>Price:</strong> ₹{selectedItem.estimated_price || "N/A"}</div>
            <div style={{marginBottom: 10}}><strong>Status:</strong> {selectedItem.status || "N/A"}</div>
            <div style={{marginBottom: 10}}><strong>Address:</strong> {selectedItem.address ? (typeof selectedItem.address === 'object' ? `${selectedItem.address.street || ''}, ${selectedItem.address.city || ''}, ${selectedItem.address.zip_code || ''}`.trim().replace(/,\s*,/g, ',') : selectedItem.address) : "N/A"}</div>
            <div style={{marginBottom: 10}}><strong>Description:</strong> {selectedItem.description || "No description"}</div>
            <div style={{marginBottom: 10}}><strong>Posted:</strong> {selectedItem.posted_date ? new Date(selectedItem.posted_date).toLocaleDateString() : "N/A"}</div>
            <div style={{marginTop: 10, display: 'flex', justifyContent: 'flex-end'}}>
              <button className="btn danger" style={{fontSize: 15, padding: '6px 16px'}} onClick={() => { deleteItem(selectedItem.id || selectedItem); setSelectedItem(null); }}>Delete Item</button>
            </div>
          </div>
        </div>
      )}

      {editingItemWeight && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 1000
        }} onClick={() => setEditingItemWeight(null)}>
          <div className="card" style={{ maxWidth: 400, margin: 16 }} onClick={e => e.stopPropagation()}>
            <div style={{ marginBottom: 16 }}>
              <h3>Edit Item Weight</h3>
              <p className="muted">{editingItemWeight.seller_name || "Item"} - {editingItemWeight.category}</p>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", marginBottom: 6, fontWeight: 600 }}>Weight (kg)</label>
              <input 
                type="number" 
                step="0.1"
                min="0"
                className="form-input" 
                value={editingItemWeightValue} 
                onChange={e => setEditingItemWeightValue(e.target.value)}
                placeholder="Enter weight in kilograms"
              />
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" className="btn secondary" onClick={() => setEditingItemWeight(null)}>Cancel</button>
              <button type="button" className="btn" onClick={handleUpdateItemWeight} disabled={loadingItemUpdate}>
                {loadingItemUpdate ? "Updating..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
