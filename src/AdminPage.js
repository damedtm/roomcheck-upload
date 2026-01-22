import { useState, useEffect, useMemo } from "react";
import { DynamoDBClient, ScanCommand } from "@aws-sdk/client-dynamodb";
import { fromCognitoIdentityPool } from "@aws-sdk/credential-providers";
import { useAuth } from "react-oidc-context";

const REGION = "us-east-2";
const TABLE_NAME = "RoomUploads";
const IDENTITY_POOL_ID = "us-east-2:0d00064d-9170-417c-862e-316009584b52";

export default function AdminPage() {
  const auth = useAuth();
  const [uploads, setUploads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const { email: userEmail, iss } = auth.user?.profile || {};

  // Hooks are always called, conditional logic inside
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

  const dynamo = useMemo(() => {
    if (!credentials) return null;

    return new DynamoDBClient({
      region: REGION,
      credentials,
    });
  }, [credentials]);

  // Fetch uploads safely
  useEffect(() => {
    if (!auth.isAuthenticated || !auth.user || !dynamo) return;

    let cancelled = false;

    async function fetchUploads() {
      setLoading(true);
      setError("");

      try {
        let items = [];
        let lastKey;

        do {
          const result = await dynamo.send(
            new ScanCommand({
              TableName: TABLE_NAME,
              ExclusiveStartKey: lastKey,
            })
          );

          items = items.concat(result.Items || []);
          lastKey = result.LastEvaluatedKey;
        } while (lastKey);

        if (!cancelled) setUploads(items);
      } catch (err) {
        console.error("Error fetching uploads:", err);
        if (!cancelled) setError("Failed to fetch uploads");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchUploads();
    return () => (cancelled = true);
  }, [auth.isAuthenticated, auth.user, dynamo]);

  // Conditional rendering
  if (!auth.isAuthenticated || !auth.user || !dynamo) return <p>Loading...</p>;

  return (
    <div>
      <h2>Admin Dashboard</h2>
      <p>Email: {userEmail || "Unknown"}</p>

      <button onClick={() => auth.removeUser()}>Sign out</button>

      <h3>Uploaded Files</h3>

      {loading ? (
        <p>Loading uploads...</p>
      ) : error ? (
        <p>{error}</p>
      ) : uploads.length === 0 ? (
        <p>No uploads yet.</p>
      ) : (
        <table border="1" cellPadding="5">
          <thead>
            <tr>
              <th>User Email</th>
              <th>File Name</th>
              <th>S3 Key</th>
              <th>Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {uploads.map((item, index) => (
              <tr key={item.s3Key?.S || index}>
                <td>{item.userEmail?.S || "N/A"}</td>
                <td>{item.fileName?.S || "N/A"}</td>
                <td>{item.s3Key?.S || "N/A"}</td>
                <td>{item.timestamp?.S || "N/A"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
