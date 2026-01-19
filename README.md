<<<<<<< HEAD
# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)
=======
# Secure Room Inspection Upload System

## Overview

The **Secure Room Inspection Upload System** is a cloud-based application that enables secure image submissions with an administrative review workflow. It is designed for use cases such as student housing inspections, facility condition reporting, and compliance documentation.

The system prioritizes **security**, **role-based access control**, and **operational oversight**, ensuring that uploaded images are reviewed and managed exclusively by authorized administrators.

---

## Problem Statement

Traditional inspection processes often rely on:

- Manual paperwork
- Email-based photo submissions
- Unstructured storage
- Limited auditability

These approaches are error-prone, difficult to scale, and lack proper access control.

This project addresses those issues by providing a **centralized, secure, and auditable image submission platform**.

---

## Key Features

- Secure image uploads
- Role-based authentication and authorization
- Admin-only review and approval workflow
- Cloud-native storage and access control
- Scalable and auditable system design

---

## High-Level System Flow

### Student Flow

1. Student logs into the web application.
2. Student uploads room inspection images.
3. Images are stored securely in cloud storage.
4. Each upload is automatically marked as **Pending Review**.
5. Student does not have access to images after submission.

### Administrator Flow

1. Administrator logs into the admin dashboard.
2. Administrator views all submitted images.
3. Administrator approves or rejects submissions.
4. Administrator manages records and inspection metadata.

---

## System Architecture (Conceptual)

- **Frontend**: Web application for students and administrators
- **Authentication**: Amazon Cognito (User Pools)
- **Authorization**: Role-based access using IAM policies
- **Storage**: Amazon S3 (private buckets)
- **Backend (Planned / In Progress)**: API layer to manage uploads, approvals, and metadata
- **Admin Dashboard (Planned)**: Centralized interface for review and management

---

## Security & Access Control

Security is enforced through a strict separation of responsibilities.

### Authentication (Who You Are)

- Managed via **Amazon Cognito**
- Users are assigned to roles:
  - `Student`
  - `Administrator`

### Authorization (What You Can Do)

- Permissions are enforced at the cloud level:
  - Students can **upload images only**
  - Administrators can **view, approve, reject, and manage images**
- No direct S3 access is exposed to end users
- All sensitive actions are performed by authorized roles only

This design ensures:

- Data confidentiality
- Minimal attack surface
- Clear audit trails
- Scalability without compromising security

---

## Tech Stack

### Cloud & Backend

- **AWS**
  - Amazon Cognito (Authentication)
  - Amazon S3 (Secure object storage)
  - IAM (Role-based access control)
  - API Gateway / Backend services (planned)

### Frontend

- Web-based interface
- Student upload portal
- Admin dashboard (planned)

### Security

- Private S3 buckets
- IAM roles and least-privilege policies
- No hardcoded credentials
- No direct client-side access to storage resources


---

## Setup & Deployment (High-Level)

1. Configure Amazon Cognito user pools and user groups.
2. Create private S3 buckets for image storage.
3. Define IAM roles and policies for students and administrators.
4. Deploy backend services to handle uploads and approvals.
5. Deploy frontend application.
6. Assign users to appropriate roles.

---

## Planned Enhancements

- Full-featured admin dashboard
- Image approval workflow (Pending → Approved / Rejected)
- Organized storage by:
  - Room
  - Date
  - Inspection cycle
- Audit logs and reporting
- Improved UI/UX for both students and administrators
- Automated notifications for approval status

---

## Business Value

- Eliminates manual inspection paperwork
- Creates verifiable, time-stamped inspection records
- Improves accountability and compliance
- Scales efficiently with minimal administrative overhead
- Demonstrates a modern, cloud-native solution to operational data collection

---

## Use Cases

- University housing inspections
- Property management inspections
- Facilities condition reporting
- Compliance documentation
- Any organization requiring structured image submissions with approvals

---

## Summary

This project demonstrates a **real-world, production-oriented cloud application** that combines usability, security, and administrative oversight. It highlights best practices in authentication, authorization, and cloud resource isolation while solving a practical operational problem.

>>>>>>> d86a1042ed3d862e4400bdef361fcfab9f19545b
