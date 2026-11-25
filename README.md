# Appointer

Appointer is a healthcare appointment platform that helps patients find doctors, explore specialties, and organize appointments in one place.

This repository currently contains the React frontend. It is being built as the first part of a future MERN application, with backend services planned for a later phase.

## Frontend features

- Responsive healthcare homepage with doctor search preview and interactive Care Orbit visual
- Doctor directory with local search and specialty filtering
- Doctor profile and appointment availability preview
- Patient login and registration interfaces
- Patient dashboard and appointment history screens
- Doctor dashboard with schedule overview
- Admin dashboard with platform activity overview
- AI Doctor Finder selection interface
- AI Appointment Assistant conversation preview
- Shared public navigation and dashboard layout
- Responsive cards, forms, hover states, and keyboard focus styles

The current doctor records, dashboard numbers, and appointment details are sample frontend data. No authentication, booking persistence, medical diagnosis, or AI service is connected yet.

## Tech stack

- React 19
- Vite
- React Router
- CSS

## Getting started

### Requirements

- Node.js 18 or newer
- npm

### Install and run

```bash
npm install
npm run dev
```

Open the local URL printed by Vite in your browser.

## Available scripts

```bash
npm run dev       # Start the development server
npm run build     # Create a production build
npm run preview   # Preview the production build locally
npm run lint      # Check the project with ESLint
```

## Password recovery demonstration mode

The password-recovery flow works for patient, doctor, and administrator accounts. This college-project build does not require SMTP or external email services. Add the following to `backend/.env` for local use:

```env
DEMO_OTP_ENABLED=true
```

With `NODE_ENV` unset, `development`, or `test`, the verification page will state that local demonstration mode is active; enter `123456` after requesting a reset. The API returns only a non-sensitive demo-mode flag, never the code itself. The code is still stored only as a bcrypt hash, expires after five minutes, is limited to five verification attempts, and is consumed after verification. The application refuses to start when `NODE_ENV=production` and `DEMO_OTP_ENABLED=true`; production also never creates a usable demo code.

## Main routes

| Route | Purpose |
| --- | --- |
| `/` | Appointer homepage |
| `/doctors` | Find and filter doctors |
| `/doctors/:id` | Doctor profile |
| `/login` | Patient login interface |
| `/register` | Patient registration interface |
| `/forgot-password` | Request a password-reset verification code |
| `/verify-reset-otp` | Verify the emailed six-digit code |
| `/reset-password` | Set a new password after verification |
| `/patient/dashboard` | Patient overview |
| `/patient/appointments` | Patient appointments |
| `/doctor/dashboard` | Doctor schedule |
| `/admin/dashboard` | Admin overview |
| `/ai-doctor-finder` | Guided doctor finder |
| `/ai-assistant` | Appointment planning assistant |

## Project structure

```text
src/
├── assets/       # Local images used by the frontend
├── components/   # Shared navigation and footer components
├── layouts/      # Public and dashboard layouts
├── pages/        # Routed page components
├── App.jsx       # Application routes
├── App.css       # Shared and page-specific styles
└── main.jsx      # React entry point
logo/             # Source Appointer logo artwork
```

## Development notes

The frontend intentionally avoids fake API calls and secret values. When backend development begins, the sample data can be replaced with API responses for users, doctors, availability, appointments, and assistant interactions.
