import { useState, useMemo, useEffect } from "react";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { fromCognitoIdentityPool } from "@aws-sdk/credential-providers";
import { useAuth } from "react-oidc-context";

const REGION = "us-east-2";
const BUCKET_NAME = "roomcheck-photos-damianohajunwa";
const TABLE_NAME = "RoomUploads";
const IDENTITY_POOL_ID = "us-east-2:0d00064d-9170-417c-862e-316009584b52";

const DORMS = [
  "Alexander Hall",
  "Campbell South",
  "Transitional Hall",
  "Campbell North",
  "Dixon Hall",
  "Stewart Hall",
  "One University Place",
  "Walthall Lofts",
  "Courthouse Apartments",
];

const MAX_FILE_SIZE_MB = 10;

export default function RAPage() {
  const auth = useAuth();

  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [dorm, setDorm] = useState("");
  const [roomNumber, setRoomNumber] = useState("");
  const [uploadedBy, setUploadedBy] = useState("");
  const [notes, setNotes] = useState("");

  const [toast, setToast] = useState(null);

  const userId =
    auth.user?.profile?.sub ??
    auth.user?.profile?.email ??
    null;

  const userEmail = auth.user?.profile?.email ?? "unknown";
  const iss = auth.user?.profile?.iss;

  const credentials = useMemo(() => {
    if (!auth.user || !iss) return null;

    return fromCognitoIdentityPool({
      clientConfig: { region: REGION },
      identityPoolId: IDENTITY_POOL_ID,
      logins: {
        [`cognito-idp.${REGION}.amazonaws.com/${iss.split("/").pop()}`]:
          auth.user.id_token,
      },
    });
  }, [auth.user, iss]);

  const s3 = useMemo(() => {
    if (!credentials) return null;
    return new S3Client({
      region: REGION,
      credentials,
      requestChecksumCalculation: "WHEN_REQUIRED",
    });
  }, [credentials]);

  const dynamo = useMemo(() => {
    if (!credentials) return null;
    return new DynamoDBClient({ region: REGION, credentials });
  }, [credentials]);

  const authReady = auth.isAuthenticated && auth.user && s3 && dynamo && userId;

  // FILE HANDLING
  const handleFileChange = (e) => {
    const selected = [...e.target.files];
    if (selected.length === 0) return;

    const newWarnings = [];
    const validFiles = [];

    selected.forEach((file) => {
      const sizeMb = file.size / (1024 * 1024);
      if (sizeMb > MAX_FILE_SIZE_MB) {
        newWarnings.push(
          `${file.name} is larger than ${MAX_FILE_SIZE_MB}MB and may upload slowly.`
        );
      }
      validFiles.push(file);
    });

    setFiles((prev) => [...prev, ...validFiles]);
    setPreviews((prev) => [
      ...prev,
      ...validFiles.map((file) => URL.createObjectURL(file)),
    ]);
    setWarnings((prev) => [...prev, ...newWarnings]);
  };

  const removePreview = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const clearAllFiles = () => {
    setFiles([]);
    setPreviews([]);
    setWarnings([]);
  };

  useEffect(() => {
    return () => previews.forEach((url) => URL.revokeObjectURL(url));
  }, [previews]);

  // UPLOAD LOGIC
  const handleUpload = async () => {
    if (!authReady || files.length === 0) {
      setToast({ type: "error", message: "Please select files and fill all required fields." });
      return;
    }

    if (!dorm || !roomNumber || !uploadedBy) {
      setToast({ type: "error", message: "Dorm, Room Number, and Uploaded By are required." });
      return;
    }

    setUploading(true);

    try {
      for (const file of files) {
        const uploadId = crypto.randomUUID();
        const objectKey = `${userId}/${uploadId}-${file.name}`;

        await s3.send(
          new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: objectKey,
            Body: file,
            ContentType: file.type,
          })
        );

        await dynamo.send(
          new PutItemCommand({
            TableName: TABLE_NAME,
            Item: {
              PK: { S: `USER#${userId}` },
              SK: { S: `UPLOAD#${uploadId}` },
              userId: { S: userId },
              userEmail: { S: userEmail },
              dorm: { S: dorm },
              roomNumber: { S: roomNumber },
              uploadedBy: { S: uploadedBy },
              notes: { S: notes || "None" },
              fileName: { S: file.name },
              s3Key: { S: objectKey },
              createdAt: { S: new Date().toISOString() },
            },
          })
        );
      }

      setToast({ type: "success", message: "Upload successful!" });

      clearAllFiles();
      setDorm("");
      setRoomNumber("");
      setUploadedBy("");
      setNotes("");
    } catch (err) {
      console.error("Upload error:", err);
      setToast({ type: "error", message: "Upload failed. Check console for details." });
    } finally {
      setUploading(false);
    }
  };

  if (!authReady) return <p>Loading...</p>;

  return (
    <div style={{ background: "#f7f7f7", minHeight: "100vh", padding: "40px" }}>
      <div style={{ maxWidth: "800px", margin: "0 auto" }}>
        <h1 style={{ textAlign: "center", marginBottom: "20px" }}>RA Dashboard</h1>

        {toast && (
          <div
            style={{
              padding: "12px",
              marginBottom: "20px",
              borderRadius: "6px",
              background: toast.type === "error" ? "#ffe5e5" : "#e5ffe8",
              border: `1px solid ${toast.type === "error" ? "#ff9a9a" : "#8aff9a"}`,
            }}
          >
            {toast.message}
          </div>
        )}

        <div style={{ background: "white", padding: "20px", borderRadius: "8px", marginBottom: "20px" }}>
          <h2>Upload Room Photos</h2>
          <p style={{ color: "#666" }}>Logged in as {userEmail}</p>

          <hr style={{ margin: "20px 0" }} />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div>
              <label>Dorm *</label>
              <select value={dorm} onChange={(e) => setDorm(e.target.value)} style={{ width: "100%" }}>
                <option value="">Select Dorm</option>
                {DORMS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label>Room Number *</label>
              <input
                value={roomNumber}
                onChange={(e) => setRoomNumber(e.target.value)}
                placeholder="e.g., 214E"
                style={{ width: "100%" }}
              />
            </div>

            <div>
              <label>Uploaded By *</label>
              <input
                value={uploadedBy}
                onChange={(e) => setUploadedBy(e.target.value)}
                placeholder="Your name"
                style={{ width: "100%" }}
              />
            </div>

            <div style={{ gridColumn: "1 / span 2" }}>
              <label>Notes (Optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes"
                style={{ width: "100%" }}
              />
            </div>
          </div>

          <div style={{ marginTop: "20px" }}>
            <label>Choose Images</label>
            <input type="file" multiple accept="image/*" onChange={handleFileChange} />
          </div>

          {warnings.length > 0 && (
            <div style={{ marginTop: "16px", padding: "10px", background: "#fff8e1", borderRadius: "6px" }}>
              {warnings.map((w, i) => (
                <p key={i} style={{ margin: 0 }}>
                  {w}
                </p>
              ))}
            </div>
          )}
        </div>

        {previews.length > 0 && (
          <div style={{ background: "white", padding: "20px", borderRadius: "8px", marginBottom: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <h2>Selected Images ({previews.length})</h2>
              <button onClick={clearAllFiles}>Clear All</button>
            </div>

            <hr style={{ margin: "20px 0" }} />

            <div
              style={{
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
                    alt={`preview-${i}`}
                    style={{ width: "100%", height: "120px", objectFit: "cover" }}
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
          </div>
        )}

        <button
          onClick={handleUpload}
          disabled={uploading || files.length === 0}
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
