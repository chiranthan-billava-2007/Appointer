# Appointer Backend API

RESTful API built with Node.js, Express, and MongoDB (Mongoose) for the Appointer healthcare appointment platform.

---

## Features

- **Authentication**: User registration, login, and profile fetching with bcrypt and JWT.
- **Doctor Directory**: List, search (by name or specialty), filter, and retrieve doctor profiles.
- **Appointments**: Create, list, update status, and cancel appointments.
- **Graceful Offline Mode**: Provides fallback demo data when a local MongoDB instance is not yet running or configured.

---

## Getting Started

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Configure Environment
Copy `.env.example` to `.env` (or adjust values in `.env`):
```bash
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/appointer
JWT_SECRET=supersecret_appointer_jwt_key_change_in_production
CLIENT_URL=http://localhost:5173
```

### 3. Run the Server
From the root directory:
```bash
npm run server
```
Or directly from `backend/`:
```bash
npm run dev
```

The server will start on `http://localhost:5000`.

### 4. (Optional) Seed Initial Doctor Data
Once MongoDB is running:
```bash
cd backend
npm run seed
```

---

## API Endpoints

### Health
- `GET /api/health` - Server health check

### Auth
- `POST /api/auth/register` - Create account (`{ name, email, password, role, phone }`)
- `POST /api/auth/login` - Authenticate (`{ email, password }`)
- `GET /api/auth/me` - Get current user profile (requires `Bearer <token>` header)

### Doctors
- `GET /api/doctors` - Get doctors (supports `?search=...` & `?specialty=...`)
- `GET /api/doctors/:id` - Get single doctor details
- `POST /api/doctors` - Add a doctor profile

### Appointments
- `GET /api/appointments` - List patient appointments
- `POST /api/appointments` - Book appointment
- `PATCH /api/appointments/:id/status` - Update status (`upcoming`, `completed`, `cancelled`)
- `DELETE /api/appointments/:id` - Cancel/delete appointment
