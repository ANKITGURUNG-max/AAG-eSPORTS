# AAG eSports

Production-oriented Free Fire tournament management platform with a Django REST API and a React/Vite mobile-first client.

## Stack

- Backend: Django, Django REST Framework, PostgreSQL, JWT authentication
- Frontend: React, TypeScript, Vite, Tailwind CSS
- Payments: provider-ready sandbox adapter with server-side verification and a manual development workflow

## Local setup

### Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
python manage.py migrate
python manage.py seed_demo
python manage.py runserver
```

### Frontend

```powershell
cd frontend
npm install
npm run dev
```

The client uses `VITE_API_URL` (default `http://127.0.0.1:8000/api`).

## Production notes

Set `DJANGO_SECRET_KEY`, `DATABASE_URL`, `ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`, and provider credentials only through the deployment environment. Never collect card or UPI credentials. Payment success is accepted only from the provider webhook or an authenticated admin manual-verification action.

API endpoints are under `/api/`: `auth/register`, `auth/login`, `auth/refresh`, `me`, `tournaments`, `teams`, `payments/webhook`, `announcements`, and `admin/*`.

Grant protected dashboard access to an existing account:

```powershell
cd backend
python manage.py make_admin your-username
```

The admin dashboard reviews manual payments. Verification is server-side and allocates the lowest available tournament slot inside a database transaction. A pending payment never activates a slot.

Organisers can use `/admin` to create or edit tournament listings, publish upcoming tournament announcements, and attach a YouTube URL to an ongoing tournament. The URL appears in the player-facing Live tab only for ongoing tournaments.

Run tests with:

```powershell
cd backend
python manage.py test
```
