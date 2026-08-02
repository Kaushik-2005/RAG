# Local Setup

This project is designed to run locally without Docker.

## Backend

1. Create a virtual environment.
2. Install backend dependencies from `backend/`.
3. Change into `backend/`.
4. Run the API with `uvicorn app.main:app --reload`.

## Frontend

1. Install frontend dependencies from `frontend/`.
2. Change into `frontend/`.
3. Run the app with `npm run dev`.

## Environment

- Copy `backend/.env.example` to `backend/.env` if you want to override backend defaults.
- Copy `frontend/.env.example` to `frontend/.env.local` if you want to override the backend URL.

## Recommended next step

Start the backend first, then the frontend.
