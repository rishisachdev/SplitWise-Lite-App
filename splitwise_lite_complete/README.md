# SplitWise Lite

## A web app to track personal expenses and split bills with friends.

## Tech Stack

- **Frontend** — React
- **Backend** — Python + Flask
- **Database** — SQLite
- **Auth** — JWT (stored in localStorage)

---

## Project Structure

```
splitwise_lite/
├── backend/
│   ├── app.py
│   ├── models.py
│   ├── extensions.py
│   ├── schema.sql
│   ├── requirements.txt
│   ├── routes/
│   │   ├── auth.py
│   │   ├── expenses.py
│   │   ├── groups.py
│   │   └── dashboard.py
│   └── tests/
│       └── test_app.py
└── frontend/
    └── src/
        ├── App.jsx
        ├── index.css
        ├── api/
        │   └── client.js
        └── pages/
            ├── AuthPage.jsx
            ├── DashboardPage.jsx
            ├── ExpensesPage.jsx
            ├── GroupsPage.jsx
            └── GroupDetailPage.jsx
```

---

## Running the App

You need two terminals — one for the backend, one for the frontend.

### Backend

```bash
cd backend
py -m venv venv
venv\Scripts\activate
py -m pip install -r requirements.txt
py app.py
```

Backend runs at: `http://localhost:5000`

The SQLite database is created automatically on first run. No manual setup needed.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at: `http://localhost:5173`

Open that URL in your browser and you're good to go.

---

## Environment Variables

No `.env` file is needed to run locally. The app works out of the box.

If deploying to production, set this environment variable:

```
JWT_SECRET_KEY=your-secret-key-here
```

And update `app.py` line:

```python
app.config["JWT_SECRET_KEY"] = "dev_secret_key"
```

to:

```python
app.config["JWT_SECRET_KEY"] = os.environ.get("JWT_SECRET_KEY")
```

---

## Running Tests

```bash
cd backend
pytest tests/ -v
```

Tests run on an in-memory SQLite database so nothing affects your real data.

What's covered:

- Register, login, wrong credentials, protected route without token
- Create, read, update, delete expenses + ownership checks
- Equal split with remainder, exact split that doesn't sum to total
- Balance after multiple expenses and a settlement

---

## API Endpoints

| Method | Endpoint                 | Auth | What it does                |
| ------ | ------------------------ | ---- | --------------------------- |
| POST   | /api/auth/register       | No   | Create account              |
| POST   | /api/auth/login          | No   | Login, get JWT              |
| GET    | /api/expenses            | Yes  | List your expenses          |
| POST   | /api/expenses            | Yes  | Add an expense              |
| PUT    | /api/expenses/:id        | Yes  | Edit an expense             |
| DELETE | /api/expenses/:id        | Yes  | Delete an expense           |
| GET    | /api/expenses/summary    | Yes  | Monthly total + by category |
| GET    | /api/groups              | Yes  | List your groups            |
| POST   | /api/groups              | Yes  | Create a group              |
| GET    | /api/groups/:id          | Yes  | Group details + balances    |
| POST   | /api/groups/:id/expenses | Yes  | Add a shared expense        |
| POST   | /api/groups/:id/settle   | Yes  | Record a payment            |
| GET    | /api/dashboard           | Yes  | Dashboard summary           |
