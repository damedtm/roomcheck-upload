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

  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);

  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState(null);

  const uploadedByUserId = auth.user?.profile?.sub;
  const uploadedByName = `${auth.user?.profile?.given_name} ${auth.user?.profile?.family_name}`;

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
    setFiles((prev) => [...prev, ...selected]);
    setPreviews((prev) => [
      ...prev,
      ...selected.map((f) => URL.createObjectURL(f)),
    ]);
  };

  const removePreview = (i) => {
    setFiles((prev) => prev.filter((_, idx) => idx !== i));
    setPreviews((prev) => prev.filter((_, idx) => idx !== i));
  };

  const toggleIssue = (issue) => {
    setMaintenanceIssues((prev) =>
      prev.includes(issue)
        ? prev.filter((i) => i !== issue)
        : [...prev, issue]
    );
  };

  const handleUpload = async () => {
    if (
      !dorm ||
      !room ||
      !inspectionStatus ||
      !residentName ||
      !residentJNumber ||
      !residentEmail
    ) {
      setToast({
        type: "error",
        message: "Please fill all required fields.",
      });
      return;
    }

    if (files.length === 0) {
      setToast({
        type: "error",
        message: "Please select at least one image.",
      });
      return;
    }

    setUploading(true);

    try {
      const base64Images = await Promise.all(files.map(fileToBase64));

      await Promise.all(
        base64Images.map((img) =>
          fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              dorm,
              room,
              notes,
              imageBase64: img,
              uploadedByUserId,
              uploadedByName,
              residentName,
              residentJNumber,
              residentEmail,
              inspectionStatus,
              maintenanceIssues,
            }),
          })
        )
      );

      setToast({ type: "success", message: "Upload successful!" });

      setDorm("");
      setRoom("");
      setNotes("");
      setResidentName("");
      setResidentJNumber("");
      setResidentEmail("");
      setInspectionStatus("");
      setMaintenanceIssues([]);
      setFiles([]);
      setPreviews([]);
    } catch (err) {
      console.error(err);
      setToast({ type: "error", message: "Upload failed." });
    } finally {
      setUploading(false);
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

<h2 style={{ textAlign: "center", marginTop: "10px", color: "#333" }}>
  Hey {auth.user?.profile?.given_name}
</h2>

        {toast && (
          <div
            style={{
              padding: "12px",
              marginBottom: "20px",
              borderRadius: "6px",
              background:
                toast.type === "error" ? "#ffe5e5" : "#e5ffe8",
              border:
                toast.type === "error"
                  ? "1px solid #ff9a9a"
                  : "1px solid #8aff9a",
            }}
          >
            {toast.message}
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
          <p style={{ color: "#666" }}>Logged in as {uploadedByName}</p>

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
              <label>Dorm </label>
              <select
                value={dorm}
                onChange={(e) => setDorm(e.target.value)}
                style={{ width: "100%" }}
              >
                <option value="">Select Dorm</option>
                {DORMS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label>Room Number</label>
              <input
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                placeholder="e.g., 214E"
                style={{ width: "100%" }}
              />
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
              <label>Resident Name </label>
              <input
                value={residentName}
                onChange={(e) => setResidentName(e.target.value)}
                style={{ width: "100%" }}
              />
            </div>

            <div>
              <label>J-Number </label>
              <input
                value={residentJNumber}
                onChange={(e) => setResidentJNumber(e.target.value)}
                style={{ width: "100%" }}
              />
            </div>

            <div style={{ gridColumn: "1 / span 2" }}>
              <label>Resident Email </label>
              <input
                value={residentEmail}
                onChange={(e) => setResidentEmail(e.target.value)}
                style={{ width: "100%" }}
              />
            </div>
          </div>

          {/* Inspection Status */}
          <h3 style={{ marginTop: "20px" }}>Inspection Status, please select one:</h3>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: "16px",
            }}
          >
            {/* PASSED */}
            <div
              onClick={() => setInspectionStatus("Passed")}
              style={{
                padding: "20px",
                borderRadius: "8px",
                background:
                  inspectionStatus === "Passed" ? "#4caf50" : "#c8e6c9",
                color: "white",
                cursor: "pointer",
                fontWeight: "bold",
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
              onClick={() => setInspectionStatus("Failed")}
              style={{
                padding: "20px",
                borderRadius: "8px",
                background:
                  inspectionStatus === "Failed" ? "#f44336" : "#ffcdd2",
                color: "white",
                cursor: "pointer",
                fontWeight: "bold",
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
              onClick={() => setInspectionStatus("Maintenance Concern")}
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

          {/* Maintenance Issues */}
          {inspectionStatus === "Maintenance Concern" && (
            <div style={{ marginTop: "20px" }}>
              <h3>Maintenance Issues</h3>

              {[
                "Mold",
                "Broken appliances",
                "Water damage",
                "HVAC issues",
                "Electrical issues",
                "Pest concerns",
              ].map((issue) => (
                <div key={issue}>
                  <label>
                    <input
                      type="checkbox"
                      checked={maintenanceIssues.includes(issue)}
                      onChange={() => toggleIssue(issue)}
                    />
                    {" " + issue}
                  </label>
                </div>
              ))}

              <div style={{ marginTop: "10px" }}>
                <label>Other</label>
                <input
                  type="text"
                  onBlur={(e) => {
                    if (e.target.value.trim()) {
                      toggleIssue(e.target.value.trim());
                      e.target.value = "";
                    }
                  }}
                  placeholder="Type and press enter"
                  style={{ width: "100%" }}
                />
              </div>
            </div>
          )}

          {/* Notes */}
          <div style={{ marginTop: "20px" }}>
            <label>Notes (Optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={{ width: "100%" }}
            />
          </div>

          {/* File Upload */}
          <div style={{ marginTop: "20px" }}>
            <label>Choose Images </label>
            <input type="file" multiple accept="image/*" onChange={handleFileChange} />
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
                    alt="preview"
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
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upload Button */}
        <button
          onClick={handleUpload}
          disabled={uploading}
          style={{
            width: "100%",
            padding: "14px",
            background: "#1976d2",
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            opacity: uploading ? 0.6 : 1,
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
          }}
        >
          Sign out
        </button>
      </div>
    </div>
  );
}


