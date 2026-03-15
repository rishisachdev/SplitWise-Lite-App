# Assumptions & Design Decisions

---

## Auth

- JWT is stored in `localStorage`.
- Token expiry uses Flask-JWT-Extended's default.
- If a token expires mid-session, any API call will get a 401 back from the server. The frontend catches this, clears the token, and redirects to login automatically.
- The backend has a /api/auth/logout endpoint but it just returns a success message — JWTs are stateless so the real logout happens client-side by removing the token.

---

## Groups

- The person who creates a group is automatically added as a member.
- Members are added by email at creation time. All emails must belong to existing accounts — if even one isn't found, the whole group creation is rolled back.
- There's no "remove member" feature. It's intentionally left out because removing someone with unsettled balances is not wise.

---

## Balances

- Balances are calculated live every time you load a group — not stored anywhere. This keeps the data always accurate and avoids any sync issues.
- The algorithm nets out all debts first (so if A owes B $30 and B owes A $10, the result is just A owes B $20), then uses a approach to reduce it to the minimum number of payments needed.

---
