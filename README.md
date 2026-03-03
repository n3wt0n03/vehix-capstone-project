# Vehix Capstone Project

A full-stack web application for vehicle management, built with a **Next.js** frontend and an **Express.js** backend. Authentication is powered by **Supabase**.

---

## Project Structure

```
vehix-capstone-project/
├── vehix-frontend/   # Next.js 16 frontend (React 19, Tailwind CSS)
└── vehix-backend/    # Express.js backend (TypeScript, Supabase)
```

---

## Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher
- npm v9 or higher
- A [Supabase](https://supabase.com/) project for authentication

---

## Getting Started

### 1. Backend

```bash
cd vehix-backend
npm install
```

Create a `.env` file in `vehix-backend/` with your Supabase credentials


Start the development server:

```bash
npm run dev
```


---

### 2. Frontend

```bash
cd vehix-frontend
npm install
```

Create a `.env.local` file in `vehix-frontend/` with your API and Supabase credentials


Start the development server:

```bash
npm run dev
```

The frontend will be available at `http://localhost:3000`.

---

## Available Scripts

### Backend (`vehix-backend/`)

| Script | Description |
|--------|-------------|
| `npm run dev` | Start dev server with hot reload (nodemon + ts-node) |
| `npm run build` | Compile TypeScript to JavaScript |
| `npm start` | Run compiled production build |

### Frontend (`vehix-frontend/`)

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Next.js development server |
| `npm run build` | Build for production |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |

---

## Tech Stack

### Frontend
- [Next.js 16](https://nextjs.org/)
- [React 19](https://react.dev/)
- [Tailwind CSS 4](https://tailwindcss.com/)
- [Axios](https://axios-http.com/)
- TypeScript

### Backend
- [Express.js 5](https://expressjs.com/)
- [Supabase JS](https://supabase.com/docs/reference/javascript)
- TypeScript
- dotenv, cors
