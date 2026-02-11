import React, { createContext, useContext, useState, useEffect } from 'react';
import { CognitoUserPool, CognitoUser, AuthenticationDetails } from 'amazon-cognito-identity-js';

const AuthContext = createContext();

// Cognito configuration
const poolData = {
  UserPoolId: process.env.REACT_APP_USER_POOL_ID || 'us-east-2_lk1vd8Mwx',
  ClientId: process.env.REACT_APP_CLIENT_ID || '47bl8bnnokh7p1i4j7ha6f6ala'
};

const userPool = new CognitoUserPool(poolData);

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState({
    isAuthenticated: false,
    user: null,
    userRole: null,
    loading: true
  });

  // Check if user is already logged in on mount
  useEffect(() => {
    const currentUser = userPool.getCurrentUser();
    if (currentUser) {
      currentUser.getSession((err, session) => {
        if (err) {
          console.error('Session error:', err);
          setAuth({ isAuthenticated: false, user: null, userRole: null, loading: false });
          return;
        }
        
        if (session.isValid()) {
          // Get user attributes
          currentUser.getUserAttributes((err, attributes) => {
            if (err) {
              console.error('Error getting attributes:', err);
              setAuth({ isAuthenticated: false, user: null, userRole: null, loading: false });
              return;
            }

            const userRole = attributes.find(attr => attr.Name === 'custom:role')?.Value || 'ra';
            
            setAuth({
              isAuthenticated: true,
              user: {
                username: currentUser.getUsername(),
                id_token: session.getIdToken().getJwtToken(),
                access_token: session.getAccessToken().getJwtToken(),
                refresh_token: session.getRefreshToken().getToken(),
                attributes: attributes.reduce((acc, attr) => {
                  acc[attr.Name] = attr.Value;
                  return acc;
                }, {})
              },
              userRole,
              loading: false
            });
          });
        } else {
          setAuth({ isAuthenticated: false, user: null, userRole: null, loading: false });
        }
      });
    } else {
      setAuth({ isAuthenticated: false, user: null, userRole: null, loading: false });
    }
  }, []);

  const login = async (email, password) => {
    return new Promise((resolve, reject) => {
      const user = new CognitoUser({
        Username: email, // This accepts email when the pool is configured for email sign-in
        Pool: userPool
      });

      const authDetails = new AuthenticationDetails({
        Username: email, // This accepts email when the pool is configured for email sign-in
        Password: password
      });

      user.authenticateUser(authDetails, {
        onSuccess: (session) => {
          user.getUserAttributes((err, attributes) => {
            if (err) {
              console.error('Error getting attributes:', err);
              reject(err);
              return;
            }

            const userRole = attributes.find(attr => attr.Name === 'custom:role')?.Value || 'ra';
            
            const userData = {
              username: user.getUsername(),
              id_token: session.getIdToken().getJwtToken(),
              access_token: session.getAccessToken().getJwtToken(),
              refresh_token: session.getRefreshToken().getToken(),
              attributes: attributes.reduce((acc, attr) => {
                acc[attr.Name] = attr.Value;
                return acc;
              }, {})
            };

            setAuth({
              isAuthenticated: true,
              user: userData,
              userRole,
              loading: false
            });

            resolve({ user: userData, role: userRole });
          });
        },
        onFailure: (err) => {
          console.error('Login failed:', err);
          reject(err);
        },
        newPasswordRequired: (userAttributes) => {
          // Handle new password required
          reject(new Error('New password required'));
        }
      });
    });
  };

  const logout = () => {
    const currentUser = userPool.getCurrentUser();
    if (currentUser) {
      currentUser.signOut();
    }
    setAuth({
      isAuthenticated: false,
      user: null,
      userRole: null,
      loading: false
    });
  };

  const refreshSession = async () => {
    return new Promise((resolve, reject) => {
      const currentUser = userPool.getCurrentUser();
      if (!currentUser) {
        reject(new Error('No current user'));
        return;
      }

      currentUser.getSession((err, session) => {
        if (err) {
          reject(err);
          return;
        }

        if (!session.isValid()) {
          reject(new Error('Session invalid'));
          return;
        }

        const refreshToken = session.getRefreshToken();
        currentUser.refreshSession(refreshToken, (err, newSession) => {
          if (err) {
            reject(err);
            return;
          }

          setAuth(prev => ({
            ...prev,
            user: {
              ...prev.user,
              id_token: newSession.getIdToken().getJwtToken(),
              access_token: newSession.getAccessToken().getJwtToken()
            }
          }));

          resolve(newSession);
        });
      });
    });
  };

  const value = {
    ...auth,
    login,
    logout,
    refreshSession
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
