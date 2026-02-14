// Lambda: get-users/index.mjs

import { DynamoDBClient, ScanCommand } from "@aws-sdk/client-dynamodb";
import pkg from 'jsonwebtoken';
const { verify } = pkg;
import jwksClient from 'jwks-rsa';

const REGION = "us-east-2";
const USER_POOL_ID = "us-east-2_lk1vd8Mwx";
const USERS_TABLE = "RoomCheckUsers";

const dynamo = new DynamoDBClient({ region: REGION });

// JWT verification setup
const client = jwksClient({
  jwksUri: `https://cognito-idp.${REGION}.amazonaws.com/${USER_POOL_ID}/.well-known/jwks.json`
});

function getKey(header, callback) {
  client.getSigningKey(header.kid, function (err, key) {
    if (err) {
      callback(err);
      return;
    }
    const signingKey = key.publicKey || key.rsaPublicKey;
    callback(null, signingKey);
  });
}

// Verify JWT token and check if user is admin
async function verifyAdminToken(token) {
  return new Promise((resolve, reject) => {
    verify(token, getKey, {
      issuer: `https://cognito-idp.${REGION}.amazonaws.com/${USER_POOL_ID}`,
      algorithms: ['RS256']
    }, (err, decoded) => {
      if (err) {
        reject(new Error('Invalid token'));
        return;
      }

      // Check if user is in admin group
      const groups = decoded['cognito:groups'] || [];
      if (!groups.includes('Admins')) {
        reject(new Error('Unauthorized: Admin access required'));
        return;
      }

      resolve(decoded);
    });
  });
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Access-Control-Allow-Methods": "GET,OPTIONS"
};

export const handler = async (event) => {
  console.log('Get users request');

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS_HEADERS, body: '' };
  }

  try {
    // Extract and verify authorization token
    const authHeader = event.headers?.Authorization || event.headers?.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        statusCode: 401,
        headers: CORS_HEADERS,
        body: JSON.stringify({ message: 'Missing or invalid authorization header' })
      };
    }

    const token = authHeader.substring(7);
    await verifyAdminToken(token);

    console.log('Admin user verified');

    const response = await dynamo.send(
      new ScanCommand({
        TableName: USERS_TABLE,
        FilterExpression: 'attribute_exists(userId) AND attribute_exists(email) AND attribute_exists(firstName)'
      })
    );

    const users = (response.Items || []).map((item) => ({
      userId: item.userId?.S,
      email: item.email?.S,
      firstName: item.firstName?.S,
      lastName: item.lastName?.S,
      role: item.role?.S || null,   // null instead of undefined so frontend can detect it
      dorm: item.dorm?.S || null,
      createdAt: item.createdAt?.S || null
    }));

    // Sort by creation date (newest first), nulls last
    users.sort((a, b) => {
      if (!a.createdAt && !b.createdAt) return 0;
      if (!a.createdAt) return 1;
      if (!b.createdAt) return -1;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    console.log(`Found ${users.length} users`);

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        users,
        count: users.length
      })
    };

  } catch (err) {
    console.error('Get users error:', err);

    if (err.message?.includes('Unauthorized') || err.message?.includes('Invalid token')) {
      return {
        statusCode: 403,
        headers: CORS_HEADERS,
        body: JSON.stringify({ message: err.message })
      };
    }

    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        message: "Failed to fetch users",
        error: err.message
      })
    };
  }
};
