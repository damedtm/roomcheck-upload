// src/AdminPage.js
import { useState, useEffect, useMemo } from "react";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { DynamoDBClient, ScanCommand } from "@aws-sdk/client-dynamodb";
import { fromCognitoIdentityPool } from "@aws-sdk/credential-providers";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { useAuth } from "react-oidc-context";

const REGION = "us-east-2";
const BUCKET_NAME = "roomcheck-photos-damianohajunwa";
const TABLE_NAME = "RoomUploads";
const IDENTITY_POOL_ID = "us-east-2:0d00064d-9170-417c-862e-316009584b52";

export default function AdminPage() {
  const auth = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const { iss } = auth.user?.profile || {};

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

  const s3 = useMemo(() => (credentials ? new S3Client({ region: REGION, credentials }) : null), [credentials]);
  const dynamo = useMemo(() => (credentials ? new DynamoDBClient({ region: REGION, credentials }) : null), [credentials]);

  const authReady = auth.isAuthenticated && auth.user && s3 && dynamo;

  useEffect(() => {
    if (!authReady) return;

    const fetchItems = async () => {
      try {
        const data = await dynamo.send(new ScanCommand({ TableName: TABLE_NAME }));

        const validItems = (data.Items || []).filter(item => item.PK?.S && item.SK?.S);

        const itemsWithPreview = await Promise.all(
          validItems.map(async (item) => {
            let previewUrl = null;
            if (item.s3Key?.S) {
              try {
                previewUrl = await getSignedUrl(
                  s3,
                  new GetObjectCommand({ Bucket: BUCKET_NAME, Key: item.s3Key.S }),
                  { expiresIn: 3600 }
                );
              } catch (err) {
                console.error("Error generating preview URL:", err);
              }
            }
            return {
              ...item,
              previewUrl,
            };
          })
        );

        setItems(itemsWithPreview);
      } catch (err) {
        console.error("Error fetching items:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchItems();
  }, [authReady, dynamo, s3]);

  if (!authReady) return <p>Loading...</p>;

  return (
    <div>
      <h2>Admin Dashboard</h2>
      <p>Email: {auth.user.profile.email}</p>
      <button onClick={() => auth.removeUser()}>Sign out</button>

      <h3>Uploaded Files</h3>
      {loading ? (
        <p>Loading files...</p>
      ) : (
        <table border="1" cellPadding="8">
          <thead>
            <tr>
              <th>User Email</th>
              <th>File Name</th>
              <th>Preview</th>
              <th>Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={idx}>
                <td>{item.userEmail?.S || "-"}</td>
                <td>{item.fileName?.S || "-"}</td>
                <td>
                  {item.previewUrl ? (
                    <a href={item.previewUrl} target="_blank" rel="noreferrer">
                      <img
                        src={item.previewUrl}
                        alt="preview"
                        style={{ width: "100px", borderRadius: "6px" }}
                        onError={(e) => (e.target.style.display = "none")}
                      />
                    </a>
                  ) : (
                    "-"
                  )}
                </td>
                <td>{item.createdAt?.S || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
