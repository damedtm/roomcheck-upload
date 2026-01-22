import { useState, useMemo } from "react";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { fromCognitoIdentityPool } from "@aws-sdk/credential-providers";
import { useAuth } from "react-oidc-context";

const REGION = "us-east-2";
const BUCKET_NAME = "roomcheck-photos-damianohajunwa";
const TABLE_NAME = "RoomUploads";
const IDENTITY_POOL_ID = "us-east-2:0d00064d-9170-417c-862e-316009584b52";

export default function RAPage() {
  const auth = useAuth();
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("");
  const [uploading, setUploading] = useState(false);

  const { sub: userId, email: userEmail, iss } = auth.user?.profile || {};

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

  const authReady = auth.isAuthenticated && auth.user && s3 && dynamo;

  const handleUpload = async () => {
    if (!file || !authReady) return;

    setUploading(true);
    setStatus("Uploading...");

    const objectKey = `${userId}/${crypto.randomUUID()}-${file.name}`;

    try {
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
            userId: { S: userId },
            userEmail: { S: userEmail },
            fileName: { S: file.name },
            s3Key: { S: objectKey },
            timestamp: { S: new Date().toISOString() },
          },
        })
      );

      setStatus("Upload successful!");
      setFile(null);
    } catch (err) {
      console.error(err);
      setStatus("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  if (!authReady) return <p>Loading…</p>;

  return (
    <div>
      <h2>RA Dashboard</h2>
      <p>Email: {userEmail}</p>

      <input
        type="file"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        disabled={uploading}
      />

      <br /><br />

      <button onClick={handleUpload} disabled={!file || uploading}>
        {uploading ? "Uploading..." : "Upload"}
      </button>

      <p>Status: {status}</p>

      <button onClick={() => auth.removeUser()}>Sign out</button>
    </div>
  );
}
