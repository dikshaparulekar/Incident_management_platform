# 🚨 Unified Incident Management Platform (UIMP)

## 📌 Overview

The **Unified Incident Management Platform (UIMP)** is a centralized web
application designed to manage, track, and resolve incidents within an
organization.

The system allows **users to report issues**, **staff members to resolve
incidents**, and **administrators to monitor the entire workflow**
through a single platform.\
It demonstrates a complete **incident lifecycle management system**
using a modern **full‑stack architecture** with secure authentication
and **role‑based access control**.

------------------------------------------------------------------------

# ✨ Features

## 🔐 Role-Based Access System

The platform supports three types of users:

### 👨‍💼 Admin

-   Manage users and staff\
-   Monitor dashboards and statistics\
-   Assign and track incidents\
-   Access reports and audit logs

### 🛠 Staff

-   View incidents assigned to them\
-   Update incident status\
-   Add comments and updates\
-   Resolve incidents

### 👤 User

-   Create incidents\
-   Track incident progress\
-   Communicate with staff through comments

------------------------------------------------------------------------

# 🔄 Incident Lifecycle

    Open → In Progress → Resolved → Closed

This ensures proper **tracking, transparency, and accountability**
throughout the incident management process.

------------------------------------------------------------------------

# 📊 Dashboard and Analytics

The admin dashboard provides system insights such as:

-   Total users\
-   Total staff members\
-   Total incidents\
-   Open and resolved incidents\
-   Incident trends and statistics

These analytics help administrators **monitor system performance and
efficiency**.

------------------------------------------------------------------------

# 📜 Activity Timeline & Audit Logs

Each incident contains an **activity timeline** that records:

-   Status updates\
-   Assignments\
-   Comments and interactions

The system also maintains **audit logs** for transparency and
accountability.

------------------------------------------------------------------------

# 🧰 Tech Stack

### Frontend

-   HTML\
-   CSS\
-   Bootstrap\
-   JavaScript

### Backend

-   Node.js\
-   Express.js

### Database

-   SQLite

### Authentication & Security

-   JWT (JSON Web Token)\
-   bcrypt password hashing\
-   Role-Based Access Control (RBAC)

------------------------------------------------------------------------

# 🏗 System Architecture

    Frontend (HTML, CSS, JS)
            ↓
    Backend API (Node.js + Express)
            ↓
    Authentication Layer (JWT)
            ↓
    Application Logic
            ↓
    SQLite Database

------------------------------------------------------------------------

# 📁 Project Structure

    Incident_management_platform/
    │
    ├── public/           # Frontend files
    ├── routes/           # API routes
    ├── controllers/      # Application logic
    ├── middleware/       # Authentication middleware
    ├── database/         # SQLite configuration
    ├── server.js         # Main server file
    └── README.md

------------------------------------------------------------------------

# ⚙ Installation & Setup

### 1. Clone the Repository

    git clone https://github.com/dikshaparulekar/Incident_management_platform.git

### 2. Navigate to the Project Folder

    cd Incident_management_platform

### 3. Install Dependencies

    npm install

### 4. Run the Application

    node server.js

The application will run at:

    http://localhost:3000

------------------------------------------------------------------------

# 🚀 Future Enhancements

-   Email notifications for incident updates\
-   Advanced analytics dashboard\
-   Integration with external ticketing systems\
-   AI orchestration layer with agents and sub‑agents for automated
    incident analysis and routing

## Author
Diksha Parulekar