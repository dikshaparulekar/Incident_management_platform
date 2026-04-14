# UIMP - Unified Incident Management Platform

## Quick Start

### 1. Start the Backend
```bash
cd backend
npm start
# Runs on http://localhost:5000
```

### 2. Start the Frontend (new terminal)
```bash
cd frontend
npm run dev
# Runs on http://localhost:3000
```

### 3. Open http://localhost:3000

## Login Credentials

| Role  | Email               | Password  |
|-------|---------------------|-----------|
| Admin | admin@uimp.com      | admin123  |
| Staff | staff1@uimp.com     | staff123  |
| User  | user1@uimp.com      | user123   |

Staff: staff1–staff30@uimp.com / staff123  
Users: user1–user300@uimp.com / user123

## Pre-seeded Data
- 1 Admin, 30 Staff, 300 Users
- 200 Incidents (60 Open, 40 In Progress, 70 Resolved, 30 Closed)
- 500 Comments, 1000 Activity Logs

## Features
- **Admin Portal**: Full CRUD for users/staff/incidents, charts, reports, audit logs, settings
- **Staff Portal**: Assigned incidents, status updates, comments, performance metrics
- **User Portal**: Create incidents, track status, add comments
- **Complete Workflow**: User → Admin assigns → Staff resolves → Activity timeline
- **Dark Mode**: Toggle in header
- **Search**: Cmd+K global search
