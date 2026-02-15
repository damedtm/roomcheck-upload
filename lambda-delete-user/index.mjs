// Lambda: delete-user/index.mjs

import {
  CognitoIdentityProviderClient,
  AdminDeleteUserCommand,
  AdminGetUserCommand
} from "@aws-sdk/client-cognito-identity-provider";
import { DynamoDBClient, DeleteItemCommand, PutItemCommand } from "@aws-sdk/client-dynamodb";
import pkg from 'jsonwebtoken';
const { verify } = pkg;
import jwksClient from 'jwks-rsa';

const REGION = "us-east-2";
const USER_POOL_ID = "us-east-2_lk1vd8Mwx";
const USERS_TABLE = "RoomCheckUsers";
const AUDIT_TABLE = "RoomCheckAuditLog";

const cognito = new CognitoIdentityProviderClient({ region: REGION });
const dynamo = new DynamoDBClient({ region: REGION });

const jwks = jwksClient({
  jwksUri: `https://cognito-idp.${REGION}.amazonaws.com/${USER_POOL_ID}/.well-known/jwks.json`
});

function getKey(header, callback) {
  jwks.getSigningKey(header.kid, function (err, key) {
    if (err) { callback(err); return; }
    const signingKey = key.publicKey || key.rsaPublicKey;
    callback(null, signingKey);
  });
}

async function verifyAdminToken(token) {
  return new Promise((resolve, reject) => {
    verify(token, getKey, {
      issuer: `https://cognito-idp.${REGION}.amazonaws.com/${USER_POOL_ID}`,
      algorithms: ['RS256']
    }, (err, decoded) => {
      if (err) { reject(new Error('Invalid token')); return; }
      const groups = decoded['cognito:groups'] || [];
      if (!groups.includes('Admins')) {
        reject(new Error('Unauthorized: Admin access required'));
        return;
      }
      resolve(decoded);
    });
  });
}

async function logAudit(action, performedBy, targetUserId, targetEmail, details) {
  try {
    await dynamo.send(new PutItemCommand({
      TableName: AUDIT_TABLE,
      Item: {
        auditId: { S: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}` },
        timestamp: { S: new Date().toISOString() },
        action: { S: action },
        performedBy: { S: performedBy },
        targetUserId: { S: targetUserId },
        targetEmail: { S: targetEmail },
        details: { S: JSON.stringify(details) },
        ipAddress: { S: details.ipAddress || 'unknown' }
      }
    }));
  } catch (err) {
    console.error('Failed to log audit event:', err);
    // Don't fail the request if audit logging fails
  }
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Access-Control-Allow-Methods": "DELETE,OPTIONS"
};

export const handler = async (event) => {
  console.log('Delete user request');

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS_HEADERS, body: '' };
  }

  try {
    // Verify authorization token
    const authHeader = event.headers?.Authorization || event.headers?.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        statusCode: 401,
        headers: CORS_HEADERS,
        body: JSON.stringify({ message: 'Missing or invalid authorization header' })
      };
    }

    const token = authHeader.substring(7);
    const decoded = await verifyAdminToken(token);
    const adminUserId = decoded.sub;
    const adminEmail = decoded.email;

    console.log('Admin verified:', adminEmail);

    // Parse request body
    const body = JSON.parse(event.body);
    const { userId, email } = body;

    if (!userId || !email) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ message: 'Missing required fields: userId and email' })
      };
    }

    // Prevent self-deletion
    if (userId === adminUserId) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ message: 'You cannot delete your own account' })
      };
    }

    console.log('Deleting user:', { userId, email });

    // Verify user exists in Cognito
    try {
      await cognito.send(new AdminGetUserCommand({
        UserPoolId: USER_POOL_ID,
        Username: email
      }));
    } catch (err) {
      if (err.name === 'UserNotFoundException') {
        return {
          statusCode: 404,
          headers: CORS_HEADERS,
          body: JSON.stringify({ message: 'User not found in Cognito' })
        };
      }
      throw err;
    }

    // Delete from Cognito
    console.log('Deleting from Cognito...');
    await cognito.send(new AdminDeleteUserCommand({
      UserPoolId: USER_POOL_ID,
      Username: email
    }));
    console.log('Cognito deletion successful');

    // Delete from DynamoDB
    console.log('Deleting from DynamoDB...');
    await dynamo.send(new DeleteItemCommand({
      TableName: USERS_TABLE,
      Key: { userId: { S: userId } }
    }));
    console.log('DynamoDB deletion successful');

    // Log audit event
    await logAudit('DELETE_USER', adminUserId, userId, email, {
      performedByEmail: adminEmail,
      ipAddress: event.requestContext?.identity?.sourceIp || 'unknown',
      userAgent: event.headers?.['User-Agent'] || 'unknown'
    });

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        message: 'User deleted successfully',
        deletedUserId: userId,
        deletedEmail: email
      })
    };

  } catch (err) {
    console.error('Delete user error:', err);

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
      body: JSON.stringify({ message: 'Failed to delete user', error: err.message })
    };
  }
};
