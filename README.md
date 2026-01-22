# Secure Room Inspection Upload System

## Overview

The **Secure Room Inspection Upload System** is a web application that allows secure image submissions for room inspections with an administrative review workflow. The app ensures **role-based access control**, **secure storage**, and **auditability** for all uploaded images.

Students can upload images of rooms, and administrators can review, approve, or reject submissions.

---

## Key Features

- Secure image uploads to Amazon S3
- Role-based authentication and authorization
- Admin-only review and approval workflow
- Scalable and cloud-native architecture
- Real-time upload progress and status indicators
- Audit-friendly and organized storage

---

## User Roles

### Student

- Log in via the web portal
- Upload room inspection images
- Track the status of uploads (pending, approved, rejected)

### Administrator

- View all submitted images
- Approve or reject submissions
- Manage records and metadata
- Maintain audit logs

---

## Tech Stack

### Frontend

- **React** – Web application framework
- **Tailwind CSS** – Styling and UI components
- **React OIDC** – Authentication

### Backend / Cloud

- **AWS Cognito** – Authentication and user management
- **AWS S3** – Secure image storage
- **AWS DynamoDB** – Metadata storage
- **AWS IAM** – Role-based access control
- **AWS SDK for JavaScript** – Handling uploads and database operations

---

## Setup & Installation

### Prerequisites

- Node.js (v16+ recommended)
- npm or yarn
- AWS account with Cognito, S3, and DynamoDB configured

### Steps

1. Clone the repository:

```bash
git clone <repository-url>
cd room-check-app
