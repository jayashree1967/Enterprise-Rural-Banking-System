# Enterprise Rural Banking System – Security hardening changes

This is an additive hardening pass. Existing application pages, models, business modules and API routes have been retained. The uploaded original archive was not modified.

## Changes included

- DRF anonymous/user rate limits and scoped limits for login, password changes and financial operations.
- 12-character minimum password validation, in addition to Django's similarity/common/numeric validators.
- SimpleJWT refresh rotation with blacklist-after-rotation and last-login updates.
- Authenticated logout endpoint that blacklists the submitted refresh token.
- React token storage moved from localStorage to sessionStorage; access token refresh is retried once after a 401, and logout clears the tab session.
- Staff permissions now require an authenticated active staff/admin account. Staff complaint, loan and repayment lists/updates are scoped to records assigned to that staff member; administrators retain broader access.
- Transfer response no longer returns the recipient's account balance.
- Loan document validation checks both extension/size and the file signature for PDF/JPG/PNG.
- Production-oriented Django security headers/cookie settings and environment-configurable hosts/CORS/HTTPS settings.
- Environment example and Git ignore rules for secrets, uploads, databases, virtual environments and build artifacts.
- Frontend API base URL can be configured with VITE_API_BASE_URL.

## Required setup after extracting

1. Create a virtual environment and install backend dependencies:
   `py -m venv venv`
   `venv\\Scripts\\activate`
   `pip install -r requirements.txt`
2. Copy `.env.example` to `.env` and enter your own database password and a newly generated Django SECRET_KEY. Never use the old ZIP's `.env` in a public repository.
3. Run database migrations, including SimpleJWT's token blacklist tables:
   `py manage.py migrate`
4. Run checks:
   `py manage.py check`
   `py manage.py check --deploy` (after setting production environment variables and HTTPS configuration)
   `py manage.py test`
5. Frontend:
   `cd frontend`
   `npm ci`
   `npm run build`

## Staff assignment requirement

Staff now see and update only complaints/loans assigned to their user account. An administrator must assign the case to a staff user before that staff user can process it. Confirm that staff accounts have `is_staff=True` and role `STAFF`; admin accounts must have role `ADMIN` and `is_staff=True` (or be superusers).

## Deployment warnings

- For a real HTTPS deployment, set `DEBUG=False`, `ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`, `SECURE_SSL_REDIRECT=True`, `COOKIE_SECURE=True`, and configure HSTS only after HTTPS works end-to-end. Do not use the example localhost origins in production.
- Keep media/document storage private. Do not expose the media directory through a public static web server; implement authenticated document download and malware scanning before handling real identity/income documents.
- `sessionStorage` is tab-scoped but still readable by JavaScript. It is not an XSS-proof token vault. Before real bank use, migrate authentication to short-lived access tokens held in memory and refresh tokens in Secure, HttpOnly, SameSite cookies with a carefully implemented CSRF strategy.
- This change does not create a regulated double-entry general ledger, connect to a bank core-banking system, implement MFA, perform malware scanning, or certify compliance. Do not process real customer funds or documents until independent security review, penetration testing, operational controls, backup/restore tests and the bank's compliance approval are complete.

## Validation status

Python source syntax compilation and JavaScript API-client syntax checks were run in the build environment. Django runtime tests and the Vite production build could not be run in this environment because the Django dependencies and frontend node_modules are not installed here. Run the commands above on your machine before presenting/deploying the project.
