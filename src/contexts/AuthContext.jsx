import React, { createContext, useContext, useState, useEffect } from 'react';
import { CognitoUserPool, CognitoUser, AuthenticationDetails } from 'amazon-cognito-identity-js';

const AuthContext = createContext();

// Cognito configuration
const poolData = {
  UserPoolId: process.env.REACT_APP_USER_POOL_ID || 'us-east-2_lk1vd8Mwx',
  ClientId: process.env.REACT_APP_CLIENT_ID || '47bl8bnnokh7p1i4j7ha6f6ala'
};

const userPool = new CognitoUserPool(poolData);

// Helper function to get user role from token groups
const getRoleFromToken = (session) => {
  try {
    const idToken = session.getIdToken().getJwtToken();
    const payload = JSON.parse(atob(idToken.split('.')[1]));
    
    console.log('AuthProvider: Token payload:', payload);
    
    // Check cognito:groups in the token
    const groups = payload['cognito:groups'] || [];
    console.log('AuthProvider: User groups:', groups);
    
    // Check if user is in Admins group (case-insensitive)
    if (groups.some(g => g.toLowerCase() === 'admins' || g.toLowerCase() === 'admin')) {
      console.log('AuthProvider: User is an admin');
      return 'admin';
    }
    
    // Check custom:role attribute as fallback
    if (payload['custom:role']) {
      console.log('AuthProvider: Using custom:role -', payload['custom:role']);
      return payload['custom:role'];
    }
    
    // Default to RA
    console.log('AuthProvider: Defaulting to RA role');
    return 'ra';
  } catch (error) {
    console.error('AuthProvider: Error parsing token:', error);
    return 'ra';
  }
};

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState({
    isAuthenticated: false,
    user: null,
    userRole: null,
    loading: true
  });

  // Check if user is already logged in on mount
  useEffect(() => {
    console.log('AuthProvider: Checking for existing session...');
    const currentUser = userPool.getCurrentUser();
    
    if (currentUser) {
      console.log('AuthProvider: Found current user:', currentUser.getUsername());
      
      currentUser.getSession((err, session) => {
        if (err) {
          console.error('AuthProvider: Session error:', err);
          setAuth({ isAuthenticated: false, user: null, userRole: null, loading: false });
          return;
        }
        
        console.log('AuthProvider: Session valid:', session.isValid());
        
        if (session.isValid()) {
          // Get role from token groups
          const userRole = getRoleFromToken(session);
          console.log('AuthProvider: Determined user role:', userRole);
          
          // Get user attributes
          currentUser.getUserAttributes((err, attributes) => {
            if (err) {
              console.error('AuthProvider: Error getting attributes:', err);
              // Continue anyway with role from token
            }

            const userData = {
              username: currentUser.getUsername(),
              id_token: session.getIdToken().getJwtToken(),
              access_token: session.getAccessToken().getJwtToken(),
              refresh_token: session.getRefreshToken().getToken(),
              attributes: attributes ? attributes.reduce((acc, attr) => {
                acc[attr.Name] = attr.Value;
                return acc;
              }, {}) : {}
            };
            
            setAuth({
              isAuthenticated: true,
              user: userData,
              userRole,
              loading: false
            });
            
            console.log('AuthProvider: Auth state set:', { 
              isAuthenticated: true, 
              userRole,
              username: currentUser.getUsername() 
            });
          });
        } else {
          console.log('AuthProvider: Session invalid, clearing auth');
          setAuth({ isAuthenticated: false, user: null, userRole: null, loading: false });
        }
      });
    } else {
      console.log('AuthProvider: No current user found');
      setAuth({ isAuthenticated: false, user: null, userRole: null, loading: false });
    }
  }, []);

  const login = async (email, password) => {
    console.log('AuthProvider: Login attempt for:', email);
    
    return new Promise((resolve, reject) => {
      const user = new CognitoUser({
        Username: email,
        Pool: userPool
      });

      const authDetails = new AuthenticationDetails({
        Username: email,
        Password: password
      });

      user.authenticateUser(authDetails, {
        onSuccess: (session) => {
          console.log('AuthProvider: Login successful');
          
          // Get role from token groups
          const userRole = getRoleFromToken(session);
          console.log('AuthProvider: Login - User role:', userRole);
          
          user.getUserAttributes((err, attributes) => {
            if (err) {
              console.error('AuthProvider: Error getting attributes after login:', err);
              // Continue anyway with role from token
            }

            const userData = {
              username: user.getUsername(),
              id_token: session.getIdToken().getJwtToken(),
              access_token: session.getAccessToken().getJwtToken(),
              refresh_token: session.getRefreshToken().getToken(),
              attributes: attributes ? attributes.reduce((acc, attr) => {
                acc[attr.Name] = attr.Value;
                return acc;
              }, {}) : {}
            };

            setAuth({
              isAuthenticated: true,
              user: userData,
              userRole,
              loading: false
            });

            console.log('AuthProvider: Login complete, role:', userRole);
            resolve({ user: userData, role: userRole });
          });
        },
        onFailure: (err) => {
          console.error('AuthProvider: Login failed:', err);
          reject(err);
        },
        newPasswordRequired: (userAttributes) => {
          console.log('AuthProvider: New password required');
          reject(new Error('New password required'));
        }
      });
    });
  };

  const logout = () => {
    console.log('AuthProvider: Logging out...');
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
    console.log('AuthProvider: Logout complete');
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

  console.log('AuthProvider: Current auth state:', { 
    isAuthenticated: auth.isAuthenticated, 
    userRole: auth.userRole, 
    loading: auth.loading 
  });

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
