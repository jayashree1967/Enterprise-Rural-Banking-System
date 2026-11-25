# Enterprise Rural Banking System

A full-stack rural banking application built with **Django REST Framework, React.js and MySQL**, designed to support customer banking operations and staff management through a secure, role-based platform.

## Overview

The Enterprise Rural Banking System provides a centralized platform for customers to manage bank accounts, perform transactions, apply for loans and track repayments. Staff members can review applications, manage complaints and monitor customer banking activities.

## Key Features

### Customer Features
- User authentication with JWT.
- Customer profile management and password changes.
- Multiple savings and current bank accounts.
- Account application and approval tracking.
- Deposits, withdrawals and fund transfers.
- Transaction history and PDF statements.
- Beneficiary management.
- Notifications and read/unread status.
- Customer complaint submission and tracking.
- Loan applications with document uploads.
- Loan application status tracking.
- EMI calculation and repayment management.

### Staff Features
- Staff dashboard.
- Customer search and customer information overview.
- Account application review and approval/rejection.
- Loan application review and approval/rejection.
- Complaint management and staff replies.
- Loan repayment monitoring and payment updates.

### Security Features
- JWT authentication and refresh-token handling.
- Role-based permissions for customers, staff and administrators.
- Password validation.
- Environment-based configuration.
- Transaction atomicity and database locking.
- Idempotency protection for financial operations.
- Loan document validation.

## Technology Stack

| Layer | Technologies |
|---|---|
| Frontend | React.js, Vite, JavaScript, HTML5, CSS3 |
| Backend | Python, Django, Django REST Framework |
| Database | MySQL |
| Authentication | JWT, SimpleJWT |
| API Documentation | drf-spectacular |
| PDF Generation | ReportLab |
| Version Control | Git and GitHub |

## Project Structure

```text
Enterprise-Rural-Banking-System/
├── banking/
│   ├── migrations/
│   ├── admin.py
│   ├── api_urls.py
│   ├── api_views.py
│   ├── models.py
│   ├── permissions.py
│   ├── serializers.py
│   ├── services.py
│   ├── tests.py
│   └── test_api.py
├── config/
│   ├── settings.py
│   ├── urls.py
│   ├── asgi.py
│   └── wsgi.py
├── frontend/
│   ├── src/
│   │   ├── context/
│   │   ├── pages/
│   │   └── services/
│   ├── package.json
│   └── vite.config.js
├── loans/                 # Uploaded files; excluded from Git
├── manage.py
├── requirements.txt
├── .env.example
└── README.md
```

## Installation and Setup

### Prerequisites
- Python
- Node.js and npm
- MySQL Server
- Git

### 1. Clone the repository

```bash
git clone https://github.com/jayashree1967/Enterprise-Rural-Banking-System.git
cd Enterprise-Rural-Banking-System
```

### 2. Backend setup

Create and activate a virtual environment:

```bash
py -m venv venv
```

Windows PowerShell:

```powershell
.\venv\Scripts\Activate.ps1
```

Install dependencies:

```bash
pip install -r requirements.txt
```

### 3. Environment configuration

Copy `.env.example` to `.env` and configure your own:

- Django SECRET_KEY
- Database name
- Database username and password
- Database host and port
- Allowed hosts and CORS origins

Never commit your actual `.env` file.

### 4. Database setup

Create the MySQL database configured in your `.env` file, then run:

```bash
py manage.py migrate
```

Create an administrator account:

```bash
py manage.py createsuperuser
```

Start the backend:

```bash
py manage.py runserver
```

### 5. Frontend setup

Open another terminal:

```bash
cd frontend
npm ci
npm run dev
```

Configure `VITE_API_BASE_URL` if your backend API uses a different address.

## API Documentation

When the backend is running, API documentation is available at:

- Swagger UI: `http://127.0.0.1:8000/api/docs/`
- ReDoc: `http://127.0.0.1:8000/api/redoc/`

## Testing

Run backend tests:

```bash
py manage.py test
```

Build the frontend:

```bash
cd frontend
npm run build
```

## Security and Important Notes

This repository is an educational and portfolio project demonstrating full-stack development and banking workflow concepts.

It is not a certified banking platform or a regulated core-banking system. Do not use it to process real customer funds or sensitive identity documents.

Before production use, additional security review, private document storage, malware scanning, HTTPS configuration, operational safeguards and compliance approval are required.

## Author

**Jayashree Biradar**

GitHub: [@jayashree1967](https://github.com/jayashree1967)

---

*Developed as a full-stack software engineering portfolio project.*