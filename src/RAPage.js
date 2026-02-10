import { useState } from "react";
import { useAuth } from "react-oidc-context";

const API_URL = "https://ndd3vawb71.execute-api.us-east-2.amazonaws.com/prod/upload";
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

// Helper function to get user-friendly error messages
function getErrorMessage(error, response) {
  if (!error) return "Upload failed. Please try again.";
  
  // Network errors
  if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
    return "Network error. Please check your internet connection and try again.";
  }
  
  // Timeout errors
  if (error.message?.includes('timeout')) {
    return "Request timed out. The server took too long to respond. Please try again.";
  }

  // HTTP status errors
  if (error.message?.includes('status: 400')) {
    return "Invalid data sent to server. Please check all fields and try again.";
  }
  
  if (error.message?.includes('status: 401') || error.message?.includes('status: 403')) {
    return "Your session has expired. Please sign out and sign back in.";
  }
  
  if (error.message?.includes('status: 413')) {
    return "One or more images are too large. Please use smaller images (under 10MB each).";
  }
  
  if (error.message?.includes('status: 500')) {
    return "Server error. This might be a temporary issue. Please try again in a moment.";
  }
  
  if (error.message?.includes('status: 503')) {
    return "Service temporarily unavailable. Please try again in a few minutes.";
  }
  
  // Generic error with message
  if (error.message) {
    return error.message;
  }
  
  return "Upload failed. Please try again or contact support if the issue persists.";
}

export default function RAPage() {
  const auth = useAuth();
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
  
  // Manual RA name entry
  const [uploadedByName, setUploadedByName] = useState("");
  const [isEditingRAName, setIsEditingRAName] = useState(false);

  const uploadedByUserId = auth.user?.profile?.sub;

  // Validation function
  const validateForm = () => {
    const newErrors = {};

    if (!uploadedByName.trim()) {
      newErrors.uploadedByName = "Your name is required";
    }

    if (!dorm) {
      newErrors.dorm = "Please select a dorm";
    }

    if (!room.trim()) {
      newErrors.room = "Room number is required";
    }

    if (!residentName.trim()) {
      newErrors.residentName = "Resident name is required";
    }

    if (!residentJNumber.trim()) {
      newErrors.residentJNumber = "J-Number is required";
    } else if (!/^J\d+$/i.test(residentJNumber.trim())) {
      newErrors.residentJNumber = "J-Number must start with 'J' followed by numbers (e.g., J12345)";
    }

    if (!residentEmail.trim()) {
      newErrors.residentEmail = "Resident email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(residentEmail.trim())) {
      newErrors.residentEmail = "Please enter a valid email address";
    }

    if (!inspectionStatus) {
      newErrors.inspectionStatus = "Please select an inspection status";
    }

    if (inspectionStatus === "Maintenance Concern" && maintenanceIssues.length === 0) {
      newErrors.maintenanceIssues = "Please select at least one maintenance issue";
    }

    if (inspectionStatus === "Failed" && failureReasons.length === 0) {
      newErrors.failureReasons = "Please select at least one reason for failure";
    }

    if (files.length === 0) {
      newErrors.files = "Please select at least one image";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Convert file → Base64
  const fileToBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () =>
        resolve(reader.result.replace(/^data:image\/\w+;base64,/, ""));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleFileChange = (e) => {
    const selected = [...e.target.files];
    
    // Validate file types
    const validFiles = selected.filter(file => {
      if (!file.type.startsWith('image/')) {
        setToast({
          type: "error",
          message: `${file.name} is not an image file`,
        });
        return false;
      }
      // Check file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        setToast({
          type: "error",
          message: `${file.name} is too large. Maximum size is 10MB`,
        });
        return false;
      }
      return true;
    });

    if (validFiles.length > 0) {
      setFiles((prev) => [...prev, ...validFiles]);
      setPreviews((prev) => [
        ...prev,
        ...validFiles.map((f) => URL.createObjectURL(f)),
      ]);
      // Clear file error if files are added
      if (errors.files) {
        setErrors(prev => ({ ...prev, files: undefined }));
      }
    }
  };

  const removePreview = (i) => {
    setFiles((prev) => prev.filter((_, idx) => idx !== i));
    setPreviews((prev) => prev.filter((_, idx) => idx !== i));
  };

  const toggleMaintenanceIssue = (issue) => {
    setMaintenanceIssues((prev) =>
      prev.includes(issue)
        ? prev.filter((i) => i !== issue)
        : [...prev, issue]
    );
    if (errors.maintenanceIssues) {
      setErrors(prev => ({ ...prev, maintenanceIssues: undefined }));
    }
  };

  const toggleFailureReason = (reason) => {
    setFailureReasons((prev) =>
      prev.includes(reason)
        ? prev.filter((r) => r !== reason)
        : [...prev, reason]
    );
    if (errors.failureReasons) {
      setErrors(prev => ({ ...prev, failureReasons: undefined }));
    }
  };

  const uploadSingleImage = async (imageBase64, imageIndex, totalImages) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dorm,
          room,
          notes,
          imageBase64,
          uploadedByUserId,
          uploadedByName,
          residentName,
          residentJNumber,
          residentEmail,
          inspectionStatus,
          maintenanceIssues: inspectionStatus === "Maintenance Concern" ? maintenanceIssues : [],
          failureReasons: inspectionStatus === "Failed" ? failureReasons : [],
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // Try to get error details from response body
      let errorData = null;
      try {
        errorData = await response.json();
      } catch (e) {
        // Response might not be JSON
      }

      if (!response.ok) {
        const errorMessage = errorData?.message || errorData?.error || `HTTP error! status: ${response.status}`;
        throw new Error(errorMessage);
      }

      return errorData;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new Error('Request timed out after 30 seconds. Please try again.');
      }
      
      throw error;
    }
  };

  const handleUpload = async () => {
    // Validate form
    if (!validateForm()) {
      setToast({
        type: "error",
        message: "Please fix the errors below before submitting.",
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setUploading(true);
    setToast(null);
    setUploadProgress({ current: 0, total: files.length });

    try {
      const base64Images = await Promise.all(files.map(fileToBase64));
      
      // Upload images one at a time with progress tracking
      const results = [];
      for (let i = 0; i < base64Images.length; i++) {
        setUploadProgress({ current: i + 1, total: base64Images.length });
        
        try {
          const result = await uploadSingleImage(base64Images[i], i, base64Images.length);
          results.push(result);
        } catch (error) {
          // If one image fails, show which one and stop
          throw new Error(`Failed to upload image ${i + 1} of ${base64Images.length}: ${error.message}`);
        }
      }
      
      setToast({ 
        type: "success", 
        message: `Upload successful! ${files.length} image${files.length > 1 ? 's' : ''} uploaded.` 
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
      setUploadProgress({ current: 0, total: 0 });
      
      window.scrollTo({ top: 0, behavior: 'smooth' });
      
    } catch (err) {
      console.error("Upload error:", err);
      const friendlyMessage = getErrorMessage(err);
      
      setToast({ 
        type: "error", 
        message: friendlyMessage
      });
      
      setUploadProgress({ current: 0, total: 0 });
    } finally {
      setUploading(false);
    }
  };

  const handleInspectionStatusChange = (status) => {
    setInspectionStatus(status);
    if (errors.inspectionStatus) {
      setErrors(prev => ({ ...prev, inspectionStatus: undefined }));
    }
    if (status !== "Maintenance Concern") {
      setMaintenanceIssues([]);
      setErrors(prev => ({ ...prev, maintenanceIssues: undefined }));
    }
    if (status !== "Failed") {
      setFailureReasons([]);
      setErrors(prev => ({ ...prev, failureReasons: undefined }));
    }
  };

  if (!auth.isAuthenticated) return <p>Loading...</p>;

  return (
    <div style={{ background: "#f7f7f7", minHeight: "100vh", padding: "40px" }}>
      <div style={{ maxWidth: "800px", margin: "0 auto" }}>
        <h1 style={{ textAlign: "center" }}>RA Dashboard</h1>
        <h2 style={{ textAlign: "center", color: "#555" }}>
          RoomCheck Reporting
        </h2>
        
        {toast && (
          <div
            style={{
              padding: "12px",
              marginBottom: "20px",
              borderRadius: "6px",
              background: toast.type === "error" ? "#ffe5e5" : "#e5ffe8",
              border: toast.type === "error" ? "1px solid #ff9a9a" : "1px solid #8aff9a",
              color: toast.type === "error" ? "#c00" : "#0a0",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "18px" }}>
                {toast.type === "error" ? "❌" : "✅"}
              </span>
              <span>{toast.message}</span>
            </div>
          </div>
        )}
        
        <div
          style={{
            background: "white",
            padding: "20px",
            borderRadius: "8px",
            marginBottom: "20px",
          }}
        >
          <p style={{ color: "#666" }}>Logged in as {auth.user.profile.email}</p>
          
          {/* Manual RA Name Entry */}
          <div style={{ marginTop: "12px", marginBottom: "12px" }}>
            <label style={{ display: "block", marginBottom: "6px", fontWeight: "500" }}>
              Uploaded By <span style={{ color: "red" }}>*</span>
            </label>
            {!isEditingRAName && uploadedByName ? (
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <span style={{ color: "#333", fontSize: "15px" }}>
                  {uploadedByName}
                </span>
                <button
                  onClick={() => setIsEditingRAName(true)}
                  style={{
                    padding: "6px 12px",
                    background: "#e3f2fd",
                    color: "#1976d2",
                    border: "1px solid #1976d2",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "13px",
                  }}
                >
                  Edit Name
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <input
                  type="text"
                  value={uploadedByName}
                  onChange={(e) => {
                    setUploadedByName(e.target.value);
                    if (errors.uploadedByName && e.target.value.trim()) {
                      setErrors(prev => ({ ...prev, uploadedByName: undefined }));
                    }
                  }}
                  placeholder="Enter your full name"
                  style={{ 
                    flex: 1, 
                    padding: "8px",
                    border: errors.uploadedByName ? "2px solid #f44336" : "1px solid #ddd",
                    borderRadius: "4px"
                  }}
                />
                {uploadedByName && (
                  <button
                    onClick={() => setIsEditingRAName(false)}
                    style={{
                      padding: "8px 16px",
                      background: "#4caf50",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                    }}
                  >
                    Save
                  </button>
                )}
              </div>
            )}
            {errors.uploadedByName && (
              <p style={{ color: "#f44336", fontSize: "13px", marginTop: "4px" }}>
                {errors.uploadedByName}
              </p>
            )}
          </div>
          
          <hr style={{ margin: "20px 0" }} />
          
          {/* Dorm + Room */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "16px",
            }}
          >
            <div>
              <label style={{ fontWeight: "500" }}>
                Dorm <span style={{ color: "red" }}>*</span>
              </label>
              <select
                value={dorm}
                onChange={(e) => {
                  setDorm(e.target.value);
                  if (errors.dorm && e.target.value) {
                    setErrors(prev => ({ ...prev, dorm: undefined }));
                  }
                }}
                style={{ 
                  width: "100%",
                  padding: "8px",
                  border: errors.dorm ? "2px solid #f44336" : "1px solid #ddd",
                  borderRadius: "4px"
                }}
              >
                <option value="">Select Dorm</option>
                {DORMS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
              {errors.dorm && (
                <p style={{ color: "#f44336", fontSize: "13px", marginTop: "4px" }}>
                  {errors.dorm}
                </p>
              )}
            </div>
            <div>
              <label style={{ fontWeight: "500" }}>
                Room Number <span style={{ color: "red" }}>*</span>
              </label>
              <input
                value={room}
                onChange={(e) => {
                  setRoom(e.target.value);
                  if (errors.room && e.target.value.trim()) {
                    setErrors(prev => ({ ...prev, room: undefined }));
                  }
                }}
                placeholder="e.g., 214E"
                style={{ 
                  width: "100%",
                  padding: "8px",
                  border: errors.room ? "2px solid #f44336" : "1px solid #ddd",
                  borderRadius: "4px"
                }}
              />
              {errors.room && (
                <p style={{ color: "#f44336", fontSize: "13px", marginTop: "4px" }}>
                  {errors.room}
                </p>
              )}
            </div>
          </div>
          
          {/* Resident Info */}
          <h3 style={{ marginTop: "20px" }}>Resident Information</h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "16px",
            }}
          >
            <div>
              <label style={{ fontWeight: "500" }}>
                Resident Name <span style={{ color: "red" }}>*</span>
              </label>
              <input
                value={residentName}
                onChange={(e) => {
                  setResidentName(e.target.value);
                  if (errors.residentName && e.target.value.trim()) {
                    setErrors(prev => ({ ...prev, residentName: undefined }));
                  }
                }}
                placeholder="Full name"
                style={{ 
                  width: "100%",
                  padding: "8px",
                  border: errors.residentName ? "2px solid #f44336" : "1px solid #ddd",
                  borderRadius: "4px"
                }}
              />
              {errors.residentName && (
                <p style={{ color: "#f44336", fontSize: "13px", marginTop: "4px" }}>
                  {errors.residentName}
                </p>
              )}
            </div>
            <div>
              <label style={{ fontWeight: "500" }}>
                J-Number <span style={{ color: "red" }}>*</span>
              </label>
              <input
                value={residentJNumber}
                onChange={(e) => {
                  setResidentJNumber(e.target.value);
                  if (errors.residentJNumber && e.target.value.trim()) {
                    setErrors(prev => ({ ...prev, residentJNumber: undefined }));
                  }
                }}
                placeholder="e.g., J12345"
                style={{ 
                  width: "100%",
                  padding: "8px",
                  border: errors.residentJNumber ? "2px solid #f44336" : "1px solid #ddd",
                  borderRadius: "4px"
                }}
              />
              {errors.residentJNumber && (
                <p style={{ color: "#f44336", fontSize: "13px", marginTop: "4px" }}>
                  {errors.residentJNumber}
                </p>
              )}
            </div>
            <div style={{ gridColumn: "1 / span 2" }}>
              <label style={{ fontWeight: "500" }}>
                Resident Email <span style={{ color: "red" }}>*</span>
              </label>
              <input
                type="email"
                value={residentEmail}
                onChange={(e) => {
                  setResidentEmail(e.target.value);
                  if (errors.residentEmail && e.target.value.trim()) {
                    setErrors(prev => ({ ...prev, residentEmail: undefined }));
                  }
                }}
                placeholder="student@university.edu"
                style={{ 
                  width: "100%",
                  padding: "8px",
                  border: errors.residentEmail ? "2px solid #f44336" : "1px solid #ddd",
                  borderRadius: "4px"
                }}
              />
              {errors.residentEmail && (
                <p style={{ color: "#f44336", fontSize: "13px", marginTop: "4px" }}>
                  {errors.residentEmail}
                </p>
              )}
            </div>
          </div>
          
          {/* Inspection Status */}
          <h3 style={{ marginTop: "20px" }}>
            Inspection Status <span style={{ color: "red" }}>*</span>
          </h3>
          {errors.inspectionStatus && (
            <p style={{ color: "#f44336", fontSize: "13px", marginBottom: "8px" }}>
              {errors.inspectionStatus}
            </p>
          )}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: "16px",
            }}
          >
            {/* PASSED */}
            <div
              onClick={() => handleInspectionStatusChange("Passed")}
              style={{
                padding: "20px",
                borderRadius: "8px",
                background: inspectionStatus === "Passed" ? "#4caf50" : "#c8e6c9",
                color: "white",
                cursor: "pointer",
                fontWeight: "bold",
                border: errors.inspectionStatus && !inspectionStatus ? "2px solid #f44336" : "none",
              }}
            >
              <div style={{ fontSize: "18px", marginBottom: "8px" }}>
                Room Passed Inspection
              </div>
              <div style={{ fontSize: "14px", opacity: 0.9 }}>
                The room was found in good condition. No violations, no
                cleanliness issues, and no maintenance concerns were observed.
                No further action is required.
              </div>
            </div>
            
            {/* FAILED */}
            <div
              onClick={() => handleInspectionStatusChange("Failed")}
              style={{
                padding: "20px",
                borderRadius: "8px",
                background: inspectionStatus === "Failed" ? "#f44336" : "#ffcdd2",
                color: "white",
                cursor: "pointer",
                fontWeight: "bold",
                border: errors.inspectionStatus && !inspectionStatus ? "2px solid #f44336" : "none",
              }}
            >
              <div style={{ fontSize: "18px", marginBottom: "8px" }}>
                Room Failed Inspection
              </div>
              <div style={{ fontSize: "14px", opacity: 0.9 }}>
                The room was found in poor condition and did not meet the
                required cleanliness or safety standards. The resident will
                automatically receive a notification that they failed their room
                check.
              </div>
            </div>
            
            {/* MAINTENANCE */}
            <div
              onClick={() => handleInspectionStatusChange("Maintenance Concern")}
              style={{
                padding: "20px",
                borderRadius: "8px",
                background:
                  inspectionStatus === "Maintenance Concern"
                    ? "#ff9800"
                    : "#ffe0b2",
                color: "white",
                cursor: "pointer",
                fontWeight: "bold",
                border: errors.inspectionStatus && !inspectionStatus ? "2px solid #f44336" : "none",
              }}
            >
              <div style={{ fontSize: "18px", marginBottom: "8px" }}>
                Room Has Maintenance Concerns
              </div>
              <div style={{ fontSize: "14px", opacity: 0.9 }}>
                The room requires maintenance attention. This may include mold,
                broken appliances, water damage, HVAC issues, pest concerns, or
                electrical issues.
              </div>
            </div>
          </div>
          
          {/* Failure Reasons */}
          {inspectionStatus === "Failed" && (
            <div style={{ marginTop: "20px" }}>
              <h3>
                Reasons for Failure <span style={{ color: "red" }}>*</span>
              </h3>
              {errors.failureReasons && (
                <p style={{ color: "#f44336", fontSize: "13px", marginBottom: "8px" }}>
                  {errors.failureReasons}
                </p>
              )}
              <div style={{ 
                background: "#fff3e0", 
                padding: "16px", 
                borderRadius: "6px",
                border: errors.failureReasons ? "2px solid #f44336" : "1px solid #ffb74d"
              }}>
                {[
                  "Room is dirty/messy",
                  "Trash not removed",
                  "Prohibited items present",
                  "Fire safety violations",
                  "Unauthorized modifications",
                  "Damage to university property",
                  "Biohazard concerns",
                  "Other cleanliness issues",
                ].map((reason) => (
                  <div key={reason} style={{ marginBottom: "8px" }}>
                    <label style={{ 
                      display: "flex", 
                      alignItems: "center", 
                      cursor: "pointer",
                      color: "#333"
                    }}>
                      <input
                        type="checkbox"
                        checked={failureReasons.includes(reason)}
                        onChange={() => toggleFailureReason(reason)}
                        style={{ marginRight: "8px", cursor: "pointer" }}
                      />
                      {reason}
                    </label>
                  </div>
                ))}
                <div style={{ marginTop: "10px" }}>
                  <label style={{ color: "#333", fontWeight: "500" }}>Other (specify)</label>
                  <input
                    type="text"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.target.value.trim()) {
                        toggleFailureReason(e.target.value.trim());
                        e.target.value = "";
                      }
                    }}
                    onBlur={(e) => {
                      if (e.target.value.trim()) {
                        toggleFailureReason(e.target.value.trim());
                        e.target.value = "";
                      }
                    }}
                    placeholder="Type and press enter"
                    style={{ 
                      width: "100%", 
                      padding: "8px",
                      border: "1px solid #ddd",
                      borderRadius: "4px",
                      marginTop: "4px"
                    }}
                  />
                </div>
              </div>
            </div>
          )}
          
          {/* Maintenance Issues */}
          {inspectionStatus === "Maintenance Concern" && (
            <div style={{ marginTop: "20px" }}>
              <h3>
                Maintenance Issues <span style={{ color: "red" }}>*</span>
              </h3>
              {errors.maintenanceIssues && (
                <p style={{ color: "#f44336", fontSize: "13px", marginBottom: "8px" }}>
                  {errors.maintenanceIssues}
                </p>
              )}
              <div style={{ 
                background: "#fff3e0", 
                padding: "16px", 
                borderRadius: "6px",
                border: errors.maintenanceIssues ? "2px solid #f44336" : "1px solid #ffb74d"
              }}>
                {[
                  "Mold",
                  "Broken appliances",
                  "Water damage",
                  "HVAC issues",
                  "Electrical issues",
                  "Pest concerns",
                  "Plumbing issues",
                  "Structural damage",
                ].map((issue) => (
                  <div key={issue} style={{ marginBottom: "8px" }}>
                    <label style={{ 
                      display: "flex", 
                      alignItems: "center", 
                      cursor: "pointer",
                      color: "#333"
                    }}>
                      <input
                        type="checkbox"
                        checked={maintenanceIssues.includes(issue)}
                        onChange={() => toggleMaintenanceIssue(issue)}
                        style={{ marginRight: "8px", cursor: "pointer" }}
                      />
                      {issue}
                    </label>
                  </div>
                ))}
                <div style={{ marginTop: "10px" }}>
                  <label style={{ color: "#333", fontWeight: "500" }}>Other (specify)</label>
                  <input
                    type="text"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.target.value.trim()) {
                        toggleMaintenanceIssue(e.target.value.trim());
                        e.target.value = "";
                      }
                    }}
                    onBlur={(e) => {
                      if (e.target.value.trim()) {
                        toggleMaintenanceIssue(e.target.value.trim());
                        e.target.value = "";
                      }
                    }}
                    placeholder="Type and press enter"
                    style={{ 
                      width: "100%", 
                      padding: "8px",
                      border: "1px solid #ddd",
                      borderRadius: "4px",
                      marginTop: "4px"
                    }}
                  />
                </div>
              </div>
            </div>
          )}
          
          {/* Notes */}
          <div style={{ marginTop: "20px" }}>
            <label style={{ fontWeight: "500" }}>Notes (Optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional comments or observations..."
              style={{ 
                width: "100%",
                padding: "8px",
                border: "1px solid #ddd",
                borderRadius: "4px",
                minHeight: "80px",
                fontFamily: "inherit"
              }}
            />
          </div>
          
          {/* File Upload */}
          <div style={{ marginTop: "20px" }}>
            <label style={{ fontWeight: "500" }}>
              Choose Images <span style={{ color: "red" }}>*</span>
            </label>
            <input 
              type="file" 
              multiple 
              accept="image/*" 
              onChange={handleFileChange}
              style={{ 
                display: "block",
                marginTop: "8px",
                padding: "8px",
                border: errors.files ? "2px solid #f44336" : "1px solid #ddd",
                borderRadius: "4px",
                width: "100%"
              }}
            />
            {errors.files && (
              <p style={{ color: "#f44336", fontSize: "13px", marginTop: "4px" }}>
                {errors.files}
              </p>
            )}
            <p style={{ fontSize: "13px", color: "#666", marginTop: "4px" }}>
              Maximum file size: 10MB per image
            </p>
          </div>
          
          {/* Previews */}
          {previews.length > 0 && (
            <div
              style={{
                marginTop: "20px",
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
                gap: "12px",
              }}
            >
              {previews.map((src, i) => (
                <div
                  key={i}
                  style={{
                    position: "relative",
                    border: "1px solid #ddd",
                    borderRadius: "6px",
                    overflow: "hidden",
                  }}
                >
                  <img
                    src={src}
                    alt={`preview ${i + 1}`}
                    style={{
                      width: "100%",
                      height: "120px",
                      objectFit: "cover",
                    }}
                  />
                  <button
                    onClick={() => removePreview(i)}
                    style={{
                      position: "absolute",
                      top: "4px",
                      right: "4px",
                      background: "white",
                      border: "1px solid #ccc",
                      borderRadius: "50%",
                      cursor: "pointer",
                      width: "24px",
                      height: "24px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "16px",
                      fontWeight: "bold",
                    }}
                    aria-label="Remove image"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Upload Progress */}
        {uploading && uploadProgress.total > 0 && (
          <div style={{
            background: "white",
            padding: "16px",
            borderRadius: "8px",
            marginBottom: "12px",
            textAlign: "center"
          }}>
            <p style={{ marginBottom: "8px", color: "#666" }}>
              Uploading image {uploadProgress.current} of {uploadProgress.total}...
            </p>
            <div style={{
              width: "100%",
              height: "8px",
              background: "#e0e0e0",
              borderRadius: "4px",
              overflow: "hidden"
            }}>
              <div style={{
                width: `${(uploadProgress.current / uploadProgress.total) * 100}%`,
                height: "100%",
                background: "#1976d2",
                transition: "width 0.3s ease"
              }}></div>
            </div>
          </div>
        )}
        
        {/* Upload Button */}
        <button
          onClick={handleUpload}
          disabled={uploading}
          style={{
            width: "100%",
            padding: "14px",
            background: uploading ? "#999" : "#1976d2",
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor: uploading ? "not-allowed" : "pointer",
            fontSize: "16px",
            fontWeight: "500",
          }}
        >
          {uploading ? "Uploading..." : "Upload"}
        </button>
        
        {/* Sign Out */}
        <button
          onClick={() => auth.removeUser()}
          style={{
            width: "100%",
            marginTop: "12px",
            padding: "12px",
            border: "1px solid #444",
            background: "white",
            borderRadius: "6px",
            cursor: "pointer",
            fontSize: "14px",
          }}
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
