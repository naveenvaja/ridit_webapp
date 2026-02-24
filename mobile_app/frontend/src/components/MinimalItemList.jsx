import React, { useState } from "react";

const items = [
  { id: 1, title: "Item A", location: "Delhi", distance: 5.2, status: "Pending" },
  { id: 2, title: "Item B", location: "Noida", distance: 12.1, status: "Pending" },
  { id: 3, title: "Item C", location: "Gurgaon", distance: 8.7, status: "Pending" },
];

function ItemList() {
  const [processingId, setProcessingId] = useState(null);
  const [alert, setAlert] = useState(null);
  const [confirmId, setConfirmId] = useState(null);

  const handleApprove = (id) => {
    setConfirmId(id);
  };

  const confirmApprove = (id) => {
    setProcessingId(id);
    setConfirmId(null);
    setTimeout(() => {
      setProcessingId(null);
      setAlert({ type: "success", msg: "Item approved!" });
    }, 1200);
  };

  return (
    <div className="container">
      <header className="header">Admin Panel</header>
      {alert && (
        <div className={`alert ${alert.type}`}>{alert.msg}</div>
      )}
      <div className="item-list">
        {items.map((item) => {
          const disabled = item.distance > 10;
          return (
            <div className="item-card" key={item.id}>
              <div className="item-main">
                <div>
                  <div className="item-title">{item.title}</div>
                  <div className="item-meta">
                    <span>{item.location}</span> · <span>{item.distance} km</span>
                  </div>
                  <div className="item-status">{item.status}</div>
                  {disabled && (
                    <div className="item-warning">Outside service area</div>
                  )}
                </div>
                <button
                  className="approve-btn"
                  disabled={disabled || processingId === item.id}
                  onClick={() => handleApprove(item.id)}
                >
                  {processingId === item.id ? "Approving..." : "Approve"}
                </button>
              </div>
              {confirmId === item.id && (
                <div className="confirm-popup">
                  <div>Approve this item?</div>
                  <button className="confirm-btn" onClick={() => confirmApprove(item.id)}>
                    Yes
                  </button>
                  <button className="cancel-btn" onClick={() => setConfirmId(null)}>
                    Cancel
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ItemList;
