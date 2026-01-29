import React from "react";

export default function AdminLayout({ sidebar, children }) {
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f7f7f7" }}>
      {sidebar}

      <div style={{ flex: 1, padding: "40px" }}>
        {children}
      </div>
    </div>
  );
}
