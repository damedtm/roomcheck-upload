// ViewUploads.jsx - ENHANCED VERSION
// Added: Bulk delete, advanced filters, date range, PDF export

import React, { useState } from "react";
import { bulkDeleteUploads } from "../../utils/api";
import { CONFIG } from "../../config/config";
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export default function ViewUploads({
  uploads,
  search,
  setSearch,
  page,
  setPage,
  PER_PAGE,
  onDelete,
  deleting,
  idToken
}) {
  const [sortInspection, setSortInspection] = useState("none");
  const [sortDate, setSortDate] = useState("newest");
  const [modalImage, setModalImage] = useState(null);
  
  // Bulk selection
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(null);
  
  // Advanced filters
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);

  // Bulk selection handlers
  const toggleSelectAll = () => {
    if (selectedItems.size === paginated.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(paginated.map((_, idx) => idx)));
    }
  };

  const toggleSelectItem = (index) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedItems(newSelected);
  };

  // Bulk delete handler
  const handleBulkDelete = async () => {
    const itemsToDelete = paginated.filter((_, idx) => selectedItems.has(idx));
    
    if (itemsToDelete.length === 0) {
      alert("No items selected");
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete ${itemsToDelete.length} item(s)?\n\nThis action cannot be undone.`
    );
    
    if (!confirmed) return;

    setBulkDeleting(true);
    setBulkProgress({ current: 0, total: itemsToDelete.length });

    try {
      const results = await bulkDeleteUploads(
        itemsToDelete,
        idToken,
        (progress) => setBulkProgress(progress)
      );

      if (results.failed.length > 0) {
        alert(
          `Bulk delete completed:\n\n` +
          `✓ Successful: ${results.successful.length}\n` +
          `✗ Failed: ${results.failed.length}\n\n` +
          `Failed items:\n${results.failed.map(f => 
            `- ${f.upload.dorm} ${f.upload.room}: ${f.error}`
          ).join('\n')}`
        );
      } else {
        alert(`✓ Successfully deleted ${results.successful.length} item(s)`);
      }

      // Refresh the page to reflect deletions
      window.location.reload();
    } catch (err) {
      alert(`✗ Bulk delete failed\n\n${err.message}`);
    } finally {
      setBulkDeleting(false);
      setBulkProgress(null);
      setSelectedItems(new Set());
    }
  };

  // PDF Export
  const exportToPDF = () => {
    const doc = new jsPDF();
    
    // Title
    doc.setFontSize(18);
    doc.text('Room Inspection Report', 14, 20);
    
    // Metadata
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);
    doc.text(`Total Reports: ${filtered.length}`, 14, 34);
    
    // Table
    const tableData = filtered.map(u => [
      u.dorm,
      u.room,
      u.inspectionStatus || 'Not Set',
      u.residentName || 'Unknown',
      u.uploadedByName || 'Unknown',
      new Date(u.uploadedAt).toLocaleDateString()
    ]);
    
    doc.autoTable({
      startY: 40,
      head: [['Dorm', 'Room', 'Status', 'Resident', 'RA', 'Date']],
      body: tableData,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [41, 128, 185] }
    });
    
    doc.save(`inspection-report-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // Delete handler with debug logs
  const handleDeleteUpload = async (upload) => {
    console.log("Upload object:", upload);

    if (
      !window.confirm(
        `Are you sure you want to delete the upload for ${upload.dorm} Room ${upload.room}?`
      )
    ) {
      return;
    }

    try {
      await onDelete(upload);
    } catch (err) {
      console.error("Delete failed:", err);
      alert("Failed to delete upload: " + err.message);
    }
  };

  // Filtering with advanced filters
  let filtered = uploads.filter((u) => {
    const term = search.toLowerCase();
    const matchesSearch = 
      u.room?.toLowerCase().includes(term) ||
      u.residentName?.toLowerCase().includes(term) ||
      u.residentEmail?.toLowerCase().includes(term) ||
      u.notes?.toLowerCase().includes(term);
    
    if (!matchesSearch) return false;
    
    // Status filter
    if (statusFilter !== "all" && u.inspectionStatus !== statusFilter) {
      return false;
    }
    
    // Date range filter
    if (dateFrom && new Date(u.uploadedAt) < new Date(dateFrom)) {
      return false;
    }
    if (dateTo && new Date(u.uploadedAt) > new Date(dateTo + 'T23:59:59')) {
      return false;
    }
    
    return true;
  });

  // Sorting
  let sorted = [...filtered];
  sorted.sort((a, b) => {
    // First, sort by inspection status if selected
    if (sortInspection !== "none") {
      const aMatch = a.inspectionStatus === sortInspection ? 1 : 0;
      const bMatch = b.inspectionStatus === sortInspection ? 1 : 0;
      
      if (aMatch !== bMatch) {
        return bMatch - aMatch;
      }
    }

    // Then sort by date (secondary sort)
    const dateA = new Date(a.uploadedAt);
    const dateB = new Date(b.uploadedAt);
    return sortDate === "newest" ? dateB - dateA : dateA - dateB;
  });

  // Pagination
  const start = (page - 1) * PER_PAGE;
  const paginated = sorted.slice(start, start + PER_PAGE);
  const totalPages = Math.ceil(sorted.length / PER_PAGE);

  return (
    <div style={{ width: "100%", overflowX: "auto" }}>
      {/* Search and Filters */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
          <input
            type="text"
            placeholder="Search reports..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              padding: 10,
              width: 300,
              borderRadius: 6,
              border: "1px solid #ccc",
              fontSize: 14
            }}
          />

          <select
            value={sortInspection}
            onChange={(e) => setSortInspection(e.target.value)}
            style={{
              padding: 10,
              borderRadius: 6,
              border: "1px solid #ccc",
              fontSize: 14
            }}
          >
            <option value="none">Sort by Inspection</option>
            <option value="Passed">Passed First</option>
            <option value="Failed">Failed First</option>
            <option value="Maintenance Concern">Maintenance First</option>
          </select>

          <select
            value={sortDate}
            onChange={(e) => setSortDate(e.target.value)}
            style={{
              padding: 10,
              borderRadius: 6,
              border: "1px solid #ccc",
              fontSize: 14
            }}
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
          </select>
          
          {CONFIG.FEATURES.ADVANCED_FILTERS && (
            <button
              onClick={() => setShowFilters(!showFilters)}
              style={{
                padding: "10px 16px",
                borderRadius: 6,
                border: "1px solid #ccc",
                background: showFilters ? "#e3f2fd" : "white",
                cursor: "pointer",
                fontSize: 14
              }}
            >
              {showFilters ? "Hide Filters" : "Advanced Filters"}
            </button>
          )}
        </div>
        
        {/* Advanced Filters Panel */}
        {showFilters && CONFIG.FEATURES.ADVANCED_FILTERS && (
          <div style={{
            background: "#f5f5f5",
            padding: 15,
            borderRadius: 6,
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            marginBottom: 10
          }}>
            <div>
              <label style={{ display: "block", fontSize: 12, marginBottom: 4 }}>
                From Date
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                style={{
                  padding: 8,
                  borderRadius: 4,
                  border: "1px solid #ccc",
                  fontSize: 14
                }}
              />
            </div>
            
            <div>
              <label style={{ display: "block", fontSize: 12, marginBottom: 4 }}>
                To Date
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                style={{
                  padding: 8,
                  borderRadius: 4,
                  border: "1px solid #ccc",
                  fontSize: 14
                }}
              />
            </div>
            
            <div>
              <label style={{ display: "block", fontSize: 12, marginBottom: 4 }}>
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{
                  padding: 8,
                  borderRadius: 4,
                  border: "1px solid #ccc",
                  fontSize: 14
                }}
              >
                <option value="all">All Statuses</option>
                <option value="Passed">Passed</option>
                <option value="Failed">Failed</option>
                <option value="Maintenance Concern">Maintenance Concern</option>
              </select>
            </div>
            
            <button
              onClick={() => {
                setDateFrom("");
                setDateTo("");
                setStatusFilter("all");
              }}
              style={{
                padding: "8px 16px",
                borderRadius: 4,
                border: "1px solid #ccc",
                background: "white",
                cursor: "pointer",
                fontSize: 14,
                alignSelf: "flex-end"
              }}
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>

      {/* Bulk Actions Bar */}
      {CONFIG.FEATURES.BULK_DELETE && selectedItems.size > 0 && (
        <div style={{
          background: "#e3f2fd",
          padding: 12,
          borderRadius: 6,
          marginBottom: 15,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <span style={{ fontSize: 14, fontWeight: 500 }}>
            {selectedItems.size} item(s) selected
          </span>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={() => setSelectedItems(new Set())}
              style={{
                padding: "6px 12px",
                borderRadius: 4,
                border: "1px solid #ccc",
                background: "white",
                cursor: "pointer",
                fontSize: 13
              }}
            >
              Clear Selection
            </button>
            <button
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
              style={{
                padding: "6px 12px",
                borderRadius: 4,
                border: "none",
                background: bulkDeleting ? "#9ca3af" : "#dc2626",
                color: "white",
                cursor: bulkDeleting ? "not-allowed" : "pointer",
                fontSize: 13,
                fontWeight: 500
              }}
            >
              {bulkDeleting ? "Deleting..." : "Delete Selected"}
            </button>
          </div>
        </div>
      )}
      
      {/* Bulk Delete Progress */}
      {bulkProgress && (
        <div style={{
          background: "white",
          padding: 16,
          borderRadius: 8,
          marginBottom: 15,
          textAlign: "center"
        }}>
          <p style={{ marginBottom: 8, color: "#666", fontSize: 14 }}>
            Deleting {bulkProgress.current} of {bulkProgress.total}...
          </p>
          <div style={{
            width: "100%",
            height: 8,
            background: "#e0e0e0",
            borderRadius: 4,
            overflow: "hidden"
          }}>
            <div style={{
              width: `${(bulkProgress.current / bulkProgress.total) * 100}%`,
              height: "100%",
              background: "#1976d2",
              transition: "width 0.3s ease"
            }}></div>
          </div>
        </div>
      )}

      {/* Export Buttons */}
      <div style={{ 
        marginBottom: 15, 
        display: "flex", 
        justifyContent: "flex-end",
        gap: 10
      }}>
        <button
          onClick={exportToPDF}
          disabled={filtered.length === 0}
          style={{
            padding: "8px 16px",
            background: filtered.length === 0 ? "#ccc" : "#e74c3c",
            color: "white",
            border: "none",
            borderRadius: 6,
            cursor: filtered.length === 0 ? "not-allowed" : "pointer",
            fontSize: 13,
            fontWeight: 500
          }}
        >
          Export to PDF ({filtered.length})
        </button>
      </div>

      {/* Table */}
      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "separate",
            borderSpacing: "0 10px",
            minWidth: "1000px"
          }}
        >
          <thead>
            <tr style={{ textAlign: "left", fontWeight: 600 }}>
              {CONFIG.FEATURES.BULK_DELETE && (
                <th style={{ padding: 12 }}>
                  <input
                    type="checkbox"
                    checked={selectedItems.size === paginated.length && paginated.length > 0}
                    onChange={toggleSelectAll}
                    style={{ cursor: "pointer", width: 16, height: 16 }}
                  />
                </th>
              )}
              <th style={{ padding: 12 }}>Actions</th>
              <th style={{ padding: 12 }}>RA</th>
              <th style={{ padding: 12 }}>Dorm</th>
              <th style={{ padding: 12 }}>Room</th>
              <th style={{ padding: 12 }}>Resident</th>
              <th style={{ padding: 12 }}>Inspection</th>
              <th style={{ padding: 12 }}>Issues</th>
              <th style={{ padding: 12 }}>Notes</th>
              <th style={{ padding: 12 }}>Uploaded</th>
            </tr>
          </thead>

          <tbody>
            {paginated.map((u, index) => (
              <tr
                key={index}
                style={{
                  background: selectedItems.has(index) ? "#e3f2fd" : "white",
                  borderRadius: 8,
                  boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
                }}
              >
                {CONFIG.FEATURES.BULK_DELETE && (
                  <td style={{ padding: 12 }}>
                    <input
                      type="checkbox"
                      checked={selectedItems.has(index)}
                      onChange={() => toggleSelectItem(index)}
                      style={{ cursor: "pointer", width: 16, height: 16 }}
                    />
                  </td>
                )}
                
                {/* Actions */}
                <td style={{ padding: 12 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, width: 120 }}>
                    <button
                      onClick={() => setModalImage(u.imageUrl)}
                      style={{
                        padding: "6px 10px",
                        background: "#2563eb",
                        color: "white",
                        borderRadius: 4,
                        border: "none",
                        cursor: "pointer",
                        fontSize: 12,
                        fontWeight: 500
                      }}
                    >
                      View Image
                    </button>
                    <button
                      onClick={() => window.open(u.downloadUrl)}
                      style={{
                        padding: "6px 10px",
                        background: "#16a34a",
                        color: "white",
                        borderRadius: 4,
                        border: "none",
                        cursor: "pointer",
                        fontSize: 12,
                        fontWeight: 500
                      }}
                    >
                      Download
                    </button>
                    <button
                      onClick={() => handleDeleteUpload(u)}
                      disabled={deleting}
                      style={{
                        padding: "6px 10px",
                        background: deleting ? "#9ca3af" : "#dc2626",
                        color: "white",
                        borderRadius: 4,
                        border: "none",
                        cursor: deleting ? "not-allowed" : "pointer",
                        fontSize: 12,
                        fontWeight: 500
                      }}
                    >
                      {deleting ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </td>

                {/* RA Name */}
                <td style={{ padding: 12 }}>{u.uploadedByName || "Unknown"}</td>
                <td style={{ padding: 12 }}>{u.dorm}</td>
                <td style={{ padding: 12 }}>{u.room}</td>

                {/* Resident */}
                <td style={{ padding: 12 }}>
                  <div style={{ fontWeight: 600 }}>{u.residentName}</div>
                  <div style={{ fontSize: 12, color: "#555" }}>{u.residentEmail}</div>
                  <div style={{ fontSize: 12, color: "#777" }}>{u.residentJNumber}</div>
                </td>

                {/* Inspection Status */}
                <td style={{ padding: 12 }}>
                  <span
                    style={{
                      padding: "6px 12px",
                      borderRadius: 6,
                      background:
                        u.inspectionStatus === "Passed"
                          ? "#16a34a22"
                          : u.inspectionStatus === "Failed"
                          ? "#dc262622"
                          : "#f59e0b22",
                      color:
                        u.inspectionStatus === "Passed"
                          ? "#166534"
                          : u.inspectionStatus === "Failed"
                          ? "#991b1b"
                          : "#92400e",
                      fontWeight: 600,
                      fontSize: 13,
                      display: "inline-block"
                    }}
                  >
                    {u.inspectionStatus || "Not Set"}
                  </span>
                </td>

                {/* Issues */}
                <td style={{ padding: 12 }}>
                  {u.maintenanceIssues && u.maintenanceIssues.length > 0
                    ? u.maintenanceIssues.join(", ")
                    : "None"}
                </td>

                {/* Notes */}
                <td style={{ padding: 12, maxWidth: 200 }}>{u.notes || "-"}</td>

                {/* Date */}
                <td style={{ padding: 12, whiteSpace: "nowrap" }}>
                  {new Date(u.uploadedAt).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* No Results */}
      {paginated.length === 0 && (
        <div style={{
          background: "white",
          padding: 40,
          borderRadius: 8,
          textAlign: "center",
          color: "#666"
        }}>
          <p style={{ fontSize: 16, margin: 0 }}>
            {search || dateFrom || dateTo || statusFilter !== "all"
              ? "No results found for your filters."
              : "No uploads yet."}
          </p>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{
          marginTop: 20,
          display: "flex",
          justifyContent: "center",
          gap: 10,
          alignItems: "center"
        }}>
          <button
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
            style={{
              padding: "8px 12px",
              borderRadius: 6,
              border: "1px solid #ccc",
              background: page === 1 ? "#eee" : "white",
              cursor: page === 1 ? "not-allowed" : "pointer",
              fontSize: 14
            }}
          >
            Prev
          </button>

          <span style={{ padding: "8px 12px", fontSize: 14 }}>
            Page {page} of {totalPages}
          </span>

          <button
            disabled={page === totalPages}
            onClick={() => setPage(page + 1)}
            style={{
              padding: "8px 12px",
              borderRadius: 6,
              border: "1px solid #ccc",
              background: page === totalPages ? "#eee" : "white",
              cursor: page === totalPages ? "not-allowed" : "pointer",
              fontSize: 14
            }}
          >
            Next
          </button>
        </div>
      )}

      {/* Image Modal */}
      {modalImage && (
        <div
          onClick={() => setModalImage(null)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.8)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            cursor: "pointer",
            zIndex: 9999
          }}
        >
          <img
            src={modalImage}
            alt="Full View"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: "90%",
              maxHeight: "90%",
              borderRadius: 8,
              boxShadow: "0 0 20px rgba(0,0,0,0.5)",
              cursor: "default"
            }}
          />
          <button
            onClick={() => setModalImage(null)}
            style={{
              position: "absolute",
              top: 20,
              right: 20,
              padding: "10px 20px",
              background: "white",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
              fontSize: 16,
              fontWeight: 600
            }}
          >
            ✕ Close
          </button>
        </div>
      )}
    </div>
  );
}
