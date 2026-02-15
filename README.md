# RoomCheck - Dorm Room Inspection System

A comprehensive web application for managing dorm room inspections, built with React and AWS services. This system enables Resident Assistants (RAs) to conduct and document room inspections, while administrators can review, manage, and export inspection data.

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (React SPA)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │   RA Page    │  │  Admin Page  │  │   Login      │           │
│  │              │  │              │  │   (Cognito)  │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           |
│                                                                 |
│  Components:                                                    |
│  • User Management  • Inspection Forms  • Data Tables           │
│  • Image Upload     • CSV Export        • Search/Filter         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTPS (JWT Auth)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   API Gateway (REST API)                        |
│                      <API_BASE_URL>                             |
│                                                                 |
│  Routes:                                                        |
│  POST   /upload                  → Upload room inspection       │
│  GET    /admin/get-uploads       → Fetch all inspections        │
│  DELETE /admin/delete-upload     → Delete inspection record     │
│  POST   /admin/create-user       → Create new user              │
│  GET    /admin/get-users         → Fetch all users              │
│  DELETE /admin/delete-user       → Delete user account          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Lambda Invocation
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      AWS Lambda Functions                       |
│                                                                 |
│  • uploadRoomHandler      • getUploadsHandler                   │
│  • deleteUploadHandler    • createUserHandler                   │
│  • getUsersHandler        • deleteUserHandler                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                ┌─────────────┴─────────────┐
                ▼                           ▼
┌──────────────────────────┐  ┌────────────────────────┐
│    AWS Cognito           │  │   Amazon DynamoDB      │
│                          │  │                        │
│  User Pool:              │  │  Tables:               │
│ <USER_POOL_ID>           |  |  • RoomCheckUploads    |
│                          │  │  • RoomCheckUsers      │
│  Identity Pool:          │  │                        │
│  <IDENTITY_POOL_ID>      │  |  Indexes:              |
│                          │  │  • userId-uploadedAt   │
│  Features:               │  │  • dorm-room           │
│  • JWT tokens            │  │                        │
│  • MFA support           │  └────────────────────────┘
│  • Password policies     │              │
│  • User groups           │              │
└──────────────────────────┘              │
                                          ▼
                          ┌────────────────────────────┐
                          │      Amazon S3             │
                          │                            │
                          │  Bucket:                   │
                          │  <S3_BUCKET_NAME>          |
                          │                            │
                          │  Structure:                │
                          │  /uploads/{userId}/{uuid}  │
                          │                            │
                          │  Features:                 │
                          │  • Presigned URLs          │
                          │  • Lifecycle policies      │
                          │  • Versioning              │
                          └────────────────────────────┘
```

## Features

### For Resident Assistants (RAs)
- **Room Inspection Submission**
  - Multi-image upload (up to 10MB per image)
  - Inspection status selection (Passed/Failed/Maintenance Concern)
  - Detailed maintenance issue tracking
  - Failure reason documentation
  - Resident information capture
  - Real-time upload progress

### For Administrators
- **Comprehensive Dashboard**
  - View all inspection reports
  - Filter by dorm building
  - Search functionality
  - Sort by inspection status or date
  - Image viewing and downloading
  - CSV export functionality

- **User Management**
  - Create RA and Admin accounts
  - View all users by role
  - Delete users (Cognito + DynamoDB)
  - Role-based access control

## Data Model

### Inspection Records (DynamoDB)
```javascript
{
  userId: "cognito-sub-id",           // Partition key
  uploadedAt: "2024-02-10T12:00:00Z", // Sort key
  dorm: "Alexander Hall",
  room: "214E",
  residentName: "John Doe",
  residentJNumber: "J12345",
  residentEmail: "student@university.edu",
  inspectionStatus: "Passed|Failed|Maintenance Concern",
  maintenanceIssues: ["Mold", "HVAC issues"],
  failureReasons: ["Room is dirty/messy"],
  notes: "Additional observations...",
  uploadedByName: "Jane Smith",
  uploadedByEmail: "ra@university.edu",
  imageKey: "uploads/user-id/timestamp.jpg",
  imageUrl: "https://s3-presigned-url...",
  downloadUrl: "https://s3-download-url..."
}
```

### User Records (DynamoDB)
```javascript
{
  userId: "cognito-sub-id",  // Partition key
  email: "user@university.edu",
  firstName: "Jane",
  lastName: "Smith",
  role: "ra|admin",
  dorm: "Alexander Hall",    // Required for RAs
  createdAt: "2024-02-10T12:00:00Z"
}
```

## Authentication & Authorization

### Cognito User Pool
- **User Pool ID**
- **Identity Pool ID**
- **Region**

### Authentication Flow
```
1. User signs in → Cognito User Pool
2. Receives ID Token + Access Token
3. ID Token passed to API Gateway (Bearer token)
4. Lambda validates token
5. Exchanges ID Token for temporary AWS credentials (Identity Pool)
6. Direct DynamoDB access for read operations
```

## Dorm Buildings

The system supports the following dorm buildings:
- Alexander Hall
- Campbell South
- Campbell North
- Transitional Hall
- Dixon Hall
- Stewart Hall
- One University Place
- Walthall Lofts
- Courthouse Apartments

## Component Structure

```
src/
├── components/
│   ├── admin/
│   │   ├── AdminPage.jsx          # Main admin dashboard
│   │   ├── AddUserForm.jsx        # User creation form
│   │   ├── ManageUsersTable.jsx   # User management interface
│   │   ├── ViewUploads.jsx        # Inspection reports table
│   │   └── DeleteUser.jsx         # User deletion hook
│   └── ra/
│       └── RAPage.jsx             # RA inspection form
├── utils/
│   └── api.js                     # API client functions
└── App.jsx                        # Main application & routing
```

## API Endpoints

### Base URL
```
<API_BASE_URL>
```

### Endpoints

#### 1. Upload Room Inspection
```http
POST /upload-room
Authorization: Bearer {id_token}
Content-Type: application/json

{
  "dorm": "Alexander Hall",
  "room": "214E",
  "notes": "Room in good condition",
  "imageBase64": "base64-encoded-image-data",
  "uploadedByUserId": "cognito-sub-id",
  "uploadedByName": "Jane Smith",
  "residentName": "John Doe",
  "residentJNumber": "J12345",
  "residentEmail": "student@university.edu",
  "inspectionStatus": "Passed",
  "maintenanceIssues": [],
  "failureReasons": []
}
```

#### 2. Get All Uploads (Admin Only)
```http
GET /admin/get-uploads
Authorization: Bearer {id_token}
```

#### 3. Delete Upload (Admin Only)
```http
DELETE /admin/delete-upload
Authorization: Bearer {id_token}
Content-Type: application/json

{
  "userId": "cognito-sub-id",
  "timestamp": "2024-02-10T12:00:00Z",
  "imageKey": "uploads/user-id/timestamp.jpg"
}
```

#### 4. Create User
```http
POST /create-user
Content-Type: application/json

{
  "firstName": "Jane",
  "lastName": "Smith",
  "email": "user@university.edu",
  "role": "ra",
  "dorm": "Alexander Hall"
}
```

## Responsive Design

The application is fully responsive with breakpoints:

- **Desktop** (≥769px): Full sidebar navigation
- **Tablet/Mobile** (≤768px): Hamburger menu with overlay
- **Small Mobile** (≤480px): Optimized spacing and typography

### Mobile Adaptations
- Collapsible sidebar menu
- Touch-optimized buttons
- Responsive form layouts
- Stack-based grid layouts
- Viewport-aware typography

## User Workflows

### RA Inspection Workflow
```
1. Sign in with Cognito credentials
2. Enter RA name (first time only)
3. Select dorm and room number
4. Enter resident information
5. Choose inspection status
6. If Failed: Select failure reasons
7. If Maintenance: Select issues
8. Add optional notes
9. Upload room images
10. Submit inspection
```

### Admin Review Workflow
```
1. Sign in with admin credentials
2. Navigate to "Dorm Reports"
3. Filter by dorm or search
4. Sort by status or date
5. View images in modal
6. Download images if needed
7. Delete records if necessary
8. Export to CSV for reporting
```

### Admin User Management Workflow
```
1. Navigate to "User Management"
2. Click "Add User"
3. Enter user details
4. Select role (RA/Admin)
5. If RA: Assign dorm
6. Submit to create Cognito account
7. View/Delete users as needed
```

## Error Handling

The application includes comprehensive error handling:

### Network Errors
- Connection failures
- Timeout handling
- Retry mechanisms

### Validation Errors
- Form field validation
- File size/type validation
- Required field checking

### API Errors
- 400: Invalid request data
- 401/403: Authentication failures
- 404: Resource not found
- 413: Payload too large
- 500: Server errors
- 503: Service unavailable

### User-Friendly Messages
All errors are translated into clear, actionable messages for users.

## CSV Export Format

Exported CSV files include the following columns:
1. Dorm
2. Room
3. Inspection Status
4. Maintenance Issues
5. Uploaded By
6. Uploaded At
7. Notes

**Filename Format**: `DormReports_{DormName}_{YYYY-MM-DD}.csv`

## Security Features

1. **Authentication**
   - AWS Cognito for user management
   - JWT token validation
   - Session management

2. **Authorization**
   - Role-based access control
   - Admin-only endpoints
   - Identity pool permissions

3. **Data Protection**
   - Presigned S3 URLs (time-limited)
   - Secure API Gateway endpoints
   - Input validation and sanitization

4. **File Upload Security**
   - File type validation
   - Size limits (10MB per image)
   - Base64 encoding for transmission

## UI/UX Features

### Visual Indicators
- Color-coded inspection statuses
  - Green: Passed
  - Red: Failed
  - Orange: Maintenance Concern

### Loading States
- Spinner animations
- Upload progress bars
- Disabled button states

### Interactive Elements
- Image preview before upload
- Full-screen image modal
- Sortable/filterable tables
- Collapsible sidebar

### Toast Notifications
- Success confirmations
- Error messages
- Action feedback

## Installation & Setup

### Prerequisites
```bash
Node.js >= 16.x
npm or yarn
AWS Account with configured services
```

### Environment Setup
```bash
# Clone repository
git clone [repository-url]
cd roomcheck

# Install dependencies
npm install

# Configure AWS credentials
aws configure
```

### Required AWS Resources
1. Cognito User Pool
2. Cognito Identity Pool
3. DynamoDB Table: `RoomCheckUsers`
4. S3 Bucket for image storage
5. API Gateway with Lambda functions

### Run Development Server
```bash
npm run dev
```

### Build for Production
```bash
npm run build
```

## Future Enhancements

- [ ] Email notifications for failed inspections
- [ ] Scheduled inspection reminders
- [ ] Analytics dashboard
- [ ] Mobile app (React Native)
- [ ] Bulk image upload
- [ ] PDF report generation
- [ ] Integration with maintenance ticketing system
- [ ] Historical trend analysis
- [ ] Multi-language support

## Troubleshooting

### Common Issues

**Issue**: "Your session has expired"
- **Solution**: Sign out and sign back in to refresh tokens

**Issue**: "Image too large" error
- **Solution**: Compress images to under 10MB before upload

**Issue**: Uploads not appearing in admin view
- **Solution**: Check DynamoDB table for records, verify IAM permissions

**Issue**: CSV export shows no data
- **Solution**: Ensure filters aren't excluding all records

## License

This project is currently unlicensed. All rights reserved.  
You may not use, copy, or distribute this code without permission.

## Contributors

[This project was built by a team of myself and the grace of God]

## Support

For issues or questions:
- Email: [damianohajunwa88@gmail.com]
