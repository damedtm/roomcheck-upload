import { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { uploadRoom } from "../../utils/api";

const DORMS = [
  "Alexander Hall",
  "Campbell South",
  "Campbell North",
  "Transitional Hall",
  "Dixon Hall",
  "Stewart Hall",
  "One University Place",
  "Walthall Lofts",
  "Courthouse Apartments",
];

function getErrorMessage(error) {
  if (!error) return "Upload failed. Please try again.";
  if (error.message?.includes('Failed to fetch')) return "Network error. Check your connection.";
  if (error.message?.includes('timeout')) return "Request timed out. Try again.";
  if (error.message?.includes('401') || error.message?.includes('403')) return "Session expired. Sign out and back in.";
  if (error.message) return error.message;
  return "Upload failed. Try again.";
}

export default function RAPage() {
  const { isAuthenticated, user, loading, logout } = useAuth();
  const [dorm, setDorm] = useState("");
  const [room, setRoom] = useState("");
  const [notes, setNotes] = useState("");
  const [residentName, setResidentName] = useState("");
  const [residentJNumber, setResidentJNumber] = useState("");
  const [residentEmail, setResidentEmail] = useState("");
  const [inspectionStatus, setInspectionStatus] = useState("");
  const [maintenanceIssues, setMaintenanceIssues] = useState([]);
  const [failureReasons, setFailureReasons] = useState([]);
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState(null);
  const [errors, setErrors] = useState({});
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [uploadedByName, setUploadedByName] = useState("");
  const [isEditingRAName, setIsEditingRAName] = useState(false);

  const uploadedByUserId = user?.username || user?.sub || "unknown";
  
  const getAuthToken = () => {
    if (user?.id_token) return user.id_token;
    if (user?.idToken) return user.idToken;
    if (user?.access_token) return user.access_token;
    console.error("No auth token found");
    return null;
  };

  const validateForm = () => {
    const newErrors = {};
    if (!uploadedByName.trim()) newErrors.uploadedByName = "Your name is required";
    if (!dorm) newErrors.dorm = "Please select a dorm";
    if (!room.trim()) newErrors.room = "Room number is required";
    if (!residentName.trim()) newErrors.residentName = "Resident name is required";
    if (!residentJNumber.trim()) newErrors.residentJNumber = "J-Number is required";
    else if (!/^J\d+$/i.test(residentJNumber.trim())) newErrors.residentJNumber = "J-Number must start with 'J' followed by numbers";
    if (!residentEmail.trim()) newErrors.residentEmail = "Resident email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(residentEmail.trim())) newErrors.residentEmail = "Invalid email address";
    if (!inspectionStatus) newErrors.inspectionStatus = "Please select inspection status";
    if (inspectionStatus === "Maintenance Concern" && maintenanceIssues.length === 0) newErrors.maintenanceIssues = "Select at least one maintenance issue";
    if (inspectionStatus === "Failed" && failureReasons.length === 0) newErrors.failureReasons = "Select at least one failure reason";
    if (files.length === 0) newErrors.files = "Select at least one image";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const fileToBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.replace(/^data:image\/\w+;base64,/, ""));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  // COMPLETELY REWRITTEN UPLOAD LOGIC
  const handleUpload = async () => {
    console.log("=== UPLOAD STARTED ===");
    
    if (!validateForm()) {
      setToast({ type: "error", message: "Fix errors before submitting" });
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const authToken = getAuthToken();
    if (!authToken) {
      setToast({ type: "error", message: "No auth token. Sign out and back in." });
      return;
    }

    setUploading(true);
    setToast(null);
    setUploadProgress({ current: 0, total: files.length });

    try {
      console.log(`Converting ${files.length} files to base64...`);
      const base64Images = await Promise.all(files.map(fileToBase64));
      console.log("All files converted to base64");
      
      const results = [];
      const failed = [];
      
      for (let i = 0; i < base64Images.length; i++) {
        console.log(`\n--- Uploading image ${i + 1} of ${base64Images.length} ---`);
        setUploadProgress({ current: i + 1, total: base64Images.length });
        
        try {
          // Build formData for THIS image
          const formData = {
            dorm: dorm,
            room: room,
            notes: notes,
            imageBase64: base64Images[i],
            uploadedByUserId: uploadedByUserId,
            uploadedByName: uploadedByName,
            residentName: residentName,
            residentJNumber: residentJNumber,
            residentEmail: residentEmail,
            inspectionStatus: inspectionStatus,
            maintenanceIssues: inspectionStatus === "Maintenance Concern" ? maintenanceIssues : [],
            failureReasons: inspectionStatus === "Failed" ? failureReasons : []
          };
          
          console.log(`Calling uploadRoom for image ${i + 1}`);
          const result = await uploadRoom(formData, authToken);
          
          console.log(`✓ Image ${i + 1} uploaded successfully:`, result);
          results.push(result);
          
        } catch (error) {
          console.error(`✗ Image ${i + 1} failed:`, error);
          failed.push({ index: i + 1, error: error.message });
        }
      }
      
      console.log("=== UPLOAD COMPLETE ===");
      console.log(`Successful: ${results.length}, Failed: ${failed.length}`);
      
      if (results.length > 0) {
        setToast({ 
          type: "success", 
          message: `Successfully uploaded ${results.length} of ${files.length} image(s)!` 
        });
        
        // Reset form
        setDorm("");
        setRoom("");
        setNotes("");
        setResidentName("");
        setResidentJNumber("");
        setResidentEmail("");
        setInspectionStatus("");
        setMaintenanceIssues([]);
        setFailureReasons([]);
        setFiles([]);
        setPreviews([]);
        setErrors({});
        
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      
      if (failed.length > 0) {
        const errorMsg = failed.length === files.length 
          ? "All uploads failed. Try again." 
          : `${failed.length} upload(s) failed`;
        setToast({ type: "error", message: errorMsg });
      }
      
    } catch (err) {
      console.error("Upload error:", err);
      setToast({ type: "error", message: getErrorMessage(err) });
    } finally {
      setUploading(false);
      setUploadProgress({ current: 0, total: 0 });
    }
  };

  const handleFileChange = (e) => {
    const selected = [...e.target.files];
    const validFiles = selected.filter(file => {
      if (!file.type.startsWith('image/')) {
        setToast({ type: "error", message: `${file.name} is not an image` });
        return false;
      }
      if (file.size > 5 * 1024 * 1024) {
        setToast({ type: "error", message: `${file.name} is too large (max 5MB)` });
        return false;
      }
      return true;
    });

    if (validFiles.length > 0) {
      setFiles(prev => [...prev, ...validFiles]);
      setPreviews(prev => [...prev, ...validFiles.map(f => URL.createObjectURL(f))]);
      if (errors.files) setErrors(prev => ({ ...prev, files: undefined }));
    }
  };

  const removePreview = (i) => {
    setFiles(prev => prev.filter((_, idx) => idx !== i));
    setPreviews(prev => prev.filter((_, idx) => idx !== i));
  };

  const toggleMaintenanceIssue = (issue) => {
    setMaintenanceIssues(prev => 
      prev.includes(issue) ? prev.filter(i => i !== issue) : [...prev, issue]
    );
    if (errors.maintenanceIssues) setErrors(prev => ({ ...prev, maintenanceIssues: undefined }));
  };

  const toggleFailureReason = (reason) => {
    setFailureReasons(prev =>
      prev.includes(reason) ? prev.filter(r => r !== reason) : [...prev, reason]
    );
    if (errors.failureReasons) setErrors(prev => ({ ...prev, failureReasons: undefined }));
  };

  const handleInspectionStatusChange = (status) => {
    setInspectionStatus(status);
    if (errors.inspectionStatus) setErrors(prev => ({ ...prev, inspectionStatus: undefined }));
    if (status !== "Maintenance Concern") {
      setMaintenanceIssues([]);
      setErrors(prev => ({ ...prev, maintenanceIssues: undefined }));
    }
    if (status !== "Failed") {
      setFailureReasons([]);
      setErrors(prev => ({ ...prev, failureReasons: undefined }));
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", flexDirection: "column", gap: "20px" }}>
        <div style={{ width: "50px", height: "50px", border: "4px solid #f3f3f3", borderTop: "4px solid #3498db", borderRadius: "50%", animation: "spin 1s linear infinite" }}></div>
        <div>Loading...</div>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!isAuthenticated) {
    window.location.href = "/login";
    return null;
  }

  return (
    <div style={{ background: "#f7f7f7", minHeight: "100vh", padding: "16px" }}>
      <div style={{ maxWidth: "800px", margin: "0 auto" }}>
        <h1 style={{ textAlign: "center", fontSize: "clamp(24px, 5vw, 32px)", margin: "0 0 8px 0" }}>RA Dashboard</h1>
        <h2 style={{ textAlign: "center", color: "#555", fontSize: "clamp(16px, 4vw, 20px)", margin: "0 0 16px 0", fontWeight: "400" }}>RoomCheck Reporting</h2>
        
        {toast && (
          <div style={{ padding: "12px", marginBottom: "16px", borderRadius: "6px", background: toast.type === "error" ? "#ffe5e5" : "#e5ffe8", border: toast.type === "error" ? "1px solid #ff9a9a" : "1px solid #8aff9a", color: toast.type === "error" ? "#c00" : "#0a0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px" }}>
              <span style={{ fontSize: "18px" }}>{toast.type === "error" ? "❌" : "✅"}</span>
              <span>{toast.message}</span>
            </div>
          </div>
        )}
        
        <div style={{ background: "white", padding: "16px", borderRadius: "8px", marginBottom: "16px" }}>
          <p style={{ color: "#666", margin: "0 0 12px 0", fontSize: "14px" }}>Logged in as {user?.attributes?.email || user?.email || user?.username}</p>
          
          {/* RA Name */}
          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", marginBottom: "6px", fontWeight: "500", fontSize: "14px" }}>Your Name (RA) <span style={{ color: "red" }}>*</span></label>
            {!isEditingRAName && uploadedByName ? (
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                <span style={{ color: "#333", fontSize: "15px" }}>{uploadedByName}</span>
                <button onClick={() => setIsEditingRAName(true)} style={{ padding: "6px 12px", background: "#e3f2fd", color: "#1976d2", border: "1px solid #1976d2", borderRadius: "4px", cursor: "pointer", fontSize: "13px" }}>Edit</button>
              </div>
            ) : (
              <div>
                <input
                  type="text"
                  value={uploadedByName}
                  onChange={(e) => {
                    setUploadedByName(e.target.value);
                    if (errors.uploadedByName && e.target.value.trim()) setErrors(prev => ({ ...prev, uploadedByName: undefined }));
                  }}
                  placeholder="Enter your full name"
                  style={{ padding: "10px", border: errors.uploadedByName ? "2px solid #f44336" : "1px solid #ddd", borderRadius: "4px", fontSize: "16px", width: "100%", boxSizing: "border-box", marginBottom: "8px" }}
                />
                {uploadedByName && <button onClick={() => setIsEditingRAName(false)} style={{ padding: "10px 16px", background: "#4caf50", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "14px", fontWeight: "500", width: "100%" }}>Save</button>}
              </div>
            )}
            {errors.uploadedByName && <p style={{ color: "#f44336", fontSize: "13px", marginTop: "4px", margin: "4px 0 0 0" }}>{errors.uploadedByName}</p>}
          </div>
          
          <hr style={{ margin: "16px 0", border: "none", borderTop: "1px solid #e0e0e0" }} />
          
          {/* Dorm */}
          <div style={{ marginBottom: "16px" }}>
            <label style={{ fontWeight: "500", fontSize: "14px", display: "block", marginBottom: "6px" }}>Dorm <span style={{ color: "red" }}>*</span></label>
            <select value={dorm} onChange={(e) => { setDorm(e.target.value); if (errors.dorm) setErrors(prev => ({ ...prev, dorm: undefined })); }} style={{ width: "100%", padding: "10px", border: errors.dorm ? "2px solid #f44336" : "1px solid #ddd", borderRadius: "4px", fontSize: "16px", boxSizing: "border-box" }}>
              <option value="">Select Dorm</option>
              {DORMS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            {errors.dorm && <p style={{ color: "#f44336", fontSize: "13px", margin: "4px 0 0 0" }}>{errors.dorm}</p>}
          </div>
          
          {/* Room */}
          <div style={{ marginBottom: "16px" }}>
            <label style={{ fontWeight: "500", fontSize: "14px", display: "block", marginBottom: "6px" }}>Room Number <span style={{ color: "red" }}>*</span></label>
            <input value={room} onChange={(e) => { setRoom(e.target.value); if (errors.room) setErrors(prev => ({ ...prev, room: undefined })); }} placeholder="e.g., 214E" style={{ width: "100%", padding: "10px", border: errors.room ? "2px solid #f44336" : "1px solid #ddd", borderRadius: "4px", fontSize: "16px", boxSizing: "border-box" }} />
            {errors.room && <p style={{ color: "#f44336", fontSize: "13px", margin: "4px 0 0 0" }}>{errors.room}</p>}
          </div>
          
          {/* Resident Info */}
          <h3 style={{ margin: "20px 0 12px 0", fontSize: "18px" }}>Resident Information</h3>
          
          <div style={{ marginBottom: "16px" }}>
            <label style={{ fontWeight: "500", fontSize: "14px", display: "block", marginBottom: "6px" }}>Resident Name <span style={{ color: "red" }}>*</span></label>
            <input value={residentName} onChange={(e) => { setResidentName(e.target.value); if (errors.residentName) setErrors(prev => ({ ...prev, residentName: undefined })); }} placeholder="Full name" style={{ width: "100%", padding: "10px", border: errors.residentName ? "2px solid #f44336" : "1px solid #ddd", borderRadius: "4px", fontSize: "16px", boxSizing: "border-box" }} />
            {errors.residentName && <p style={{ color: "#f44336", fontSize: "13px", margin: "4px 0 0 0" }}>{errors.residentName}</p>}
          </div>
          
          <div style={{ marginBottom: "16px" }}>
            <label style={{ fontWeight: "500", fontSize: "14px", display: "block", marginBottom: "6px" }}>J-Number <span style={{ color: "red" }}>*</span></label>
            <input value={residentJNumber} onChange={(e) => { setResidentJNumber(e.target.value); if (errors.residentJNumber) setErrors(prev => ({ ...prev, residentJNumber: undefined })); }} placeholder="e.g., J12345" style={{ width: "100%", padding: "10px", border: errors.residentJNumber ? "2px solid #f44336" : "1px solid #ddd", borderRadius: "4px", fontSize: "16px", boxSizing: "border-box" }} />
            {errors.residentJNumber && <p style={{ color: "#f44336", fontSize: "13px", margin: "4px 0 0 0" }}>{errors.residentJNumber}</p>}
          </div>
          
          <div style={{ marginBottom: "16px" }}>
            <label style={{ fontWeight: "500", fontSize: "14px", display: "block", marginBottom: "6px" }}>Resident Email <span style={{ color: "red" }}>*</span></label>
            <input type="email" value={residentEmail} onChange={(e) => { setResidentEmail(e.target.value); if (errors.residentEmail) setErrors(prev => ({ ...prev, residentEmail: undefined })); }} placeholder="student@university.edu" style={{ width: "100%", padding: "10px", border: errors.residentEmail ? "2px solid #f44336" : "1px solid #ddd", borderRadius: "4px", fontSize: "16px", boxSizing: "border-box" }} />
            {errors.residentEmail && <p style={{ color: "#f44336", fontSize: "13px", margin: "4px 0 0 0" }}>{errors.residentEmail}</p>}
          </div>
          
          {/* Inspection Status */}
          <h3 style={{ margin: "20px 0 8px 0", fontSize: "18px" }}>Inspection Status <span style={{ color: "red" }}>*</span></h3>
          {errors.inspectionStatus && <p style={{ color: "#f44336", fontSize: "13px", margin: "0 0 8px 0" }}>{errors.inspectionStatus}</p>}
          
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "12px" }}>
            <div onClick={() => handleInspectionStatusChange("Passed")} style={{ padding: "16px", borderRadius: "8px", background: inspectionStatus === "Passed" ? "#4caf50" : "#c8e6c9", color: "white", cursor: "pointer", fontWeight: "bold" }}>
              <div style={{ fontSize: "16px", marginBottom: "6px" }}>Room Passed</div>
              <div style={{ fontSize: "13px", opacity: 0.9 }}>The room was found in good condition. No violations, no cleanliness issues, and no maintenance concerns were observed.</div>
            </div>
            
            <div onClick={() => handleInspectionStatusChange("Failed")} style={{ padding: "16px", borderRadius: "8px", background: inspectionStatus === "Failed" ? "#f44336" : "#ffcdd2", color: "white", cursor: "pointer", fontWeight: "bold" }}>
              <div style={{ fontSize: "16px", marginBottom: "6px" }}>Room Failed</div>
              <div style={{ fontSize: "13px", opacity: 0.9 }}>The room was found in poor condition and did not meet the required cleanliness or safety standards.</div>
            </div>
            
            <div onClick={() => handleInspectionStatusChange("Maintenance Concern")} style={{ padding: "16px", borderRadius: "8px", background: inspectionStatus === "Maintenance Concern" ? "#ff9800" : "#ffe0b2", color: "white", cursor: "pointer", fontWeight: "bold" }}>
              <div style={{ fontSize: "16px", marginBottom: "6px" }}>Maintenance Concern</div>
              <div style={{ fontSize: "13px", opacity: 0.9 }}>The room requires maintenance attention. This may include mold,broken appliances, water damage, or HVAC issues.</div>
            </div>
          </div>
          
          {/* Conditional Fields */}
          {inspectionStatus === "Failed" && (
            <div style={{ marginTop: "16px" }}>
              <h3 style={{ margin: "0 0 8px 0", fontSize: "16px" }}>Failure Reasons <span style={{ color: "red" }}>*</span></h3>
              {errors.failureReasons && <p style={{ color: "#f44336", fontSize: "13px", margin: "0 0 8px 0" }}>{errors.failureReasons}</p>}
              <div style={{ background: "#fff3e0", padding: "12px", borderRadius: "6px", border: errors.failureReasons ? "2px solid #f44336" : "1px solid #ffb74d" }}>
                {["Room is dirty/messy", "Trash not removed", "Prohibited items", "Fire safety violations", "Unauthorized modifications", "Property damage", "Biohazard concerns", "Other cleanliness issues"].map(reason => (
                  <div key={reason} style={{ marginBottom: "8px" }}>
                    <label style={{ display: "flex", alignItems: "center", cursor: "pointer", color: "#333", fontSize: "14px" }}>
                      <input type="checkbox" checked={failureReasons.includes(reason)} onChange={() => toggleFailureReason(reason)} style={{ marginRight: "8px", cursor: "pointer" }} />
                      <span>{reason}</span>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {inspectionStatus === "Maintenance Concern" && (
            <div style={{ marginTop: "16px" }}>
              <h3 style={{ margin: "0 0 8px 0", fontSize: "16px" }}>Maintenance Issues <span style={{ color: "red" }}>*</span></h3>
              {errors.maintenanceIssues && <p style={{ color: "#f44336", fontSize: "13px", margin: "0 0 8px 0" }}>{errors.maintenanceIssues}</p>}
              <div style={{ background: "#fff3e0", padding: "12px", borderRadius: "6px", border: errors.maintenanceIssues ? "2px solid #f44336" : "1px solid #ffb74d" }}>
                {["Mold", "Broken appliances", "Water damage", "HVAC issues", "Electrical issues", "Pest concerns", "Plumbing issues", "Structural damage"].map(issue => (
                  <div key={issue} style={{ marginBottom: "8px" }}>
                    <label style={{ display: "flex", alignItems: "center", cursor: "pointer", color: "#333", fontSize: "14px" }}>
                      <input type="checkbox" checked={maintenanceIssues.includes(issue)} onChange={() => toggleMaintenanceIssue(issue)} style={{ marginRight: "8px", cursor: "pointer" }} />
                      <span>{issue}</span>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Notes */}
          <div style={{ marginTop: "16px" }}>
            <label style={{ fontWeight: "500", fontSize: "14px", display: "block", marginBottom: "6px" }}>Notes (Optional)</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Additional comments..." style={{ width: "100%", padding: "10px", border: "1px solid #ddd", borderRadius: "4px", minHeight: "80px", fontFamily: "inherit", fontSize: "14px", boxSizing: "border-box" }} />
          </div>
          
          {/* File Upload */}
          <div style={{ marginTop: "16px" }}>
            <label style={{ fontWeight: "500", fontSize: "14px", display: "block", marginBottom: "6px" }}>Images <span style={{ color: "red" }}>*</span></label>
            <input type="file" multiple accept="image/*" onChange={handleFileChange} style={{ display: "block", padding: "8px", border: errors.files ? "2px solid #f44336" : "1px solid #ddd", borderRadius: "4px", width: "100%", boxSizing: "border-box", fontSize: "14px" }} />
            {errors.files && <p style={{ color: "#f44336", fontSize: "13px", margin: "4px 0 0 0" }}>{errors.files}</p>}
            <p style={{ fontSize: "12px", color: "#666", margin: "4px 0 0 0" }}>Max 5MB per image</p>
          </div>
          
          {/* Previews */}
          {previews.length > 0 && (
            <div style={{ marginTop: "16px", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: "10px" }}>
              {previews.map((src, i) => (
                <div key={i} style={{ position: "relative", border: "1px solid #ddd", borderRadius: "6px", overflow: "hidden" }}>
                  <img src={src} alt={`preview ${i + 1}`} style={{ width: "100%", height: "100px", objectFit: "cover" }} />
                  <button onClick={() => removePreview(i)} style={{ position: "absolute", top: "4px", right: "4px", background: "white", border: "1px solid #ccc", borderRadius: "50%", cursor: "pointer", width: "24px", height: "24px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", fontWeight: "bold", padding: "0" }}>✕</button>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Progress */}
        {uploading && uploadProgress.total > 0 && (
          <div style={{ background: "white", padding: "16px", borderRadius: "8px", marginBottom: "12px", textAlign: "center" }}>
            <p style={{ marginBottom: "8px", color: "#666", fontSize: "14px", margin: "0 0 8px 0" }}>Uploading {uploadProgress.current} of {uploadProgress.total}...</p>
            <div style={{ width: "100%", height: "8px", background: "#e0e0e0", borderRadius: "4px", overflow: "hidden" }}>
              <div style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%`, height: "100%", background: "#1976d2", transition: "width 0.3s ease" }}></div>
            </div>
          </div>
        )}
        
        {/* Buttons */}
        <button onClick={handleUpload} disabled={uploading} style={{ width: "100%", padding: "14px", background: uploading ? "#999" : "#1976d2", color: "white", border: "none", borderRadius: "6px", cursor: uploading ? "not-allowed" : "pointer", fontSize: "16px", fontWeight: "500", boxSizing: "border-box" }}>
          {uploading ? "Uploading..." : "Upload"}
        </button>
        
        <button onClick={logout} style={{ width: "100%", marginTop: "12px", padding: "12px", border: "1px solid #444", background: "white", borderRadius: "6px", cursor: "pointer", fontSize: "14px", boxSizing: "border-box" }}>Sign out</button>
      </div>
    </div>
  );
}
