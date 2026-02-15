// Configuration file for RoomCheck application
// Single API: RoomCheckUploadsAPI (lsnro81xgl)

const config = {
  // AWS Cognito
  cognito: {
    userPoolId: process.env.REACT_APP_USER_POOL_ID || 'us-east-2_lk1vd8Mwx',
    clientId: process.env.REACT_APP_CLIENT_ID || '47bl8bnnokh7p1i4j7ha6f6ala',
    region: process.env.REACT_APP_REGION || 'us-east-2'
  },

  // AWS API Gateway - RoomCheckUploadsAPI (lsnro81xgl)
  api: {
    baseUrl: process.env.REACT_APP_API_URL || 'https://lsnro81xgl.execute-api.us-east-2.amazonaws.com/prod',
    endpoints: {
      uploadRoom: '/upload',
      getUploads: '/admin/get-uploads',
      deleteUpload: '/admin/delete-upload',
      bulkDeleteUploads: '/admin/delete-upload',
      createUser: '/admin/create-user',
      getUsers: '/admin/get-users',        // FIXED: was wrongly set to '/admin/delete-user'
      deleteUser: '/admin/delete-user',
      logError: '/log-error',
      health: '/health'
    },
    timeout: 30000,
    retries: 3
  },

  // AWS S3
  s3: {
    bucket: process.env.REACT_APP_S3_BUCKET || 'roomcheck-photos-damianohajunwa',
    region: process.env.REACT_APP_REGION || 'us-east-2'
  },

  // Application settings
  app: {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedFileTypes: ['image/jpeg', 'image/jpg', 'image/png'],
    imageQuality: 0.8,
    maxImageDimension: 1920,
  },

  // Feature flags
  features: {
    darkMode: true,
    bulkDelete: true,
    pdfExport: true,
    advancedFilters: true,
    keyboardShortcuts: true,
    auditLogging: true
  },

  // UPPERCASE VERSION FOR COMPATIBILITY
  FEATURES: {
    DARK_MODE: true,
    BULK_DELETE: true,
    PDF_EXPORT: true,
    ADVANCED_FILTERS: true,
    KEYBOARD_SHORTCUTS: true,
    AUDIT_LOGGING: true
  },

  // Pagination
  pagination: {
    defaultPageSize: 20,
    pageSizeOptions: [10, 20, 50, 100]
  },

  // Error logging
  errorLogging: {
    enabled: true,
    logToConsole: process.env.NODE_ENV === 'development',
    logToBackend: process.env.NODE_ENV === 'production'
  }
};

// Validate required environment variables in production
if (process.env.NODE_ENV === 'production') {
  const required = [
    'REACT_APP_USER_POOL_ID',
    'REACT_APP_CLIENT_ID',
    'REACT_APP_API_URL',
    'REACT_APP_S3_BUCKET'
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.warn('Missing required environment variables:', missing);
  }
}

export const CONFIG = config;
export default config;