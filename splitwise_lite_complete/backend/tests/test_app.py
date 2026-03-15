"""
SplitWise Lite — Backend Test
Run with: pytest tests.py -v
"""
import pytest
import json
from app import create_app
from extensions import db as _db
from decimal import Decimal


@pytest.fixture
def app():
    app = create_app()
    app.config["TESTING"] = True
    app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///:memory:"
    app.config["JWT_SECRET_KEY"] = "test-secret"
    with app.app_context():
        _db.create_all()
        yield app
        _db.session.remove()
        _db.drop_all()


@pytest.fixture
def client(app):
    return app.test_client()


def register(client, email, password, name="Test User"):
    return client.post("/api/auth/register", json={"email": email, "password": password, "name": name})


def login(client, email, password):
    r = client.post("/api/auth/login", json={"email": email, "password": password})
    return json.loads(r.data).get("token")


def auth_header(token):
    return {"Authorization": f"Bearer {token}"}



class TestAuth:
    def test_register_success(self, client):
        r = register(client, "alice@example.com", "password123")
        assert r.status_code == 200

    def test_register_invalid_email(self, client):
        r = register(client, "not-an-email", "password123")
        assert r.status_code == 400

    def test_register_short_password(self, client):
        r = register(client, "alice@example.com", "short")
        assert r.status_code == 400

    def test_register_duplicate_email(self, client):
        register(client, "alice@example.com", "password123")
        r = register(client, "alice@example.com", "password123")
        assert r.status_code == 400

    def test_login_correct(self, client):
        register(client, "alice@example.com", "password123")
        r = client.post("/api/auth/login", json={"email": "alice@example.com", "password": "password123"})
        assert r.status_code == 200
        assert "token" in json.loads(r.data)

    def test_login_wrong_password(self, client):
        register(client, "alice@example.com", "password123")
        r = client.post("/api/auth/login", json={"email": "alice@example.com", "password": "wrongpass"})
        assert r.status_code == 401

    def test_login_unknown_user(self, client):
        r = client.post("/api/auth/login", json={"email": "ghost@example.com", "password": "password123"})
        assert r.status_code == 401

    def test_protected_route_without_token(self, client):
        r = client.get("/api/expenses")
        assert r.status_code == 401

    def test_protected_route_with_token(self, client):
        register(client, "alice@example.com", "password123")
        token = login(client, "alice@example.com", "password123")
        r = client.get("/api/expenses", headers=auth_header(token))
        assert r.status_code == 200



class TestExpenses:
    def setup_user(self, client, email="alice@example.com"):
        register(client, email, "password123", "Alice")
        return login(client, email, "password123")

    def test_create_expense(self, client):
        token = self.setup_user(client)
        r = client.post("/api/expenses", json={
            "title": "Lunch", "amount": 15.50, "category": "Food & Dining", "date": "2024-01-15"
        }, headers=auth_header(token))
        assert r.status_code == 201

    def test_create_expense_negative_amount(self, client):
        token = self.setup_user(client)
        r = client.post("/api/expenses", json={
            "title": "Lunch", "amount": -10, "category": "Food & Dining", "date": "2024-01-15"
        }, headers=auth_header(token))
        assert r.status_code == 400

    def test_create_expense_zero_amount(self, client):
        token = self.setup_user(client)
        r = client.post("/api/expenses", json={
            "title": "Lunch", "amount": 0, "category": "Food & Dining", "date": "2024-01-15"
        }, headers=auth_header(token))
        assert r.status_code == 400

    def test_create_expense_invalid_category(self, client):
        token = self.setup_user(client)
        r = client.post("/api/expenses", json={
            "title": "Lunch", "amount": 10, "category": "Unicorns", "date": "2024-01-15"
        }, headers=auth_header(token))
        assert r.status_code == 400

    def test_list_expenses(self, client):
        token = self.setup_user(client)
        client.post("/api/expenses", json={
            "title": "Coffee", "amount": 5, "category": "Food & Dining", "date": "2024-01-10"
        }, headers=auth_header(token))
        r = client.get("/api/expenses", headers=auth_header(token))
        data = json.loads(r.data)
        assert len(data) == 1

    def test_update_own_expense(self, client):
        token = self.setup_user(client)
        r = client.post("/api/expenses", json={
            "title": "Coffee", "amount": 5, "category": "Food & Dining", "date": "2024-01-10"
        }, headers=auth_header(token))
        eid = json.loads(r.data)["id"]
        r2 = client.put(f"/api/expenses/{eid}", json={"title": "Espresso"}, headers=auth_header(token))
        assert r2.status_code == 200

    def test_update_other_users_expense_forbidden(self, client):
        token_a = self.setup_user(client, "alice@example.com")
        register(client, "bob@example.com", "password123", "Bob")
        token_b = login(client, "bob@example.com", "password123")

        r = client.post("/api/expenses", json={
            "title": "Coffee", "amount": 5, "category": "Food & Dining", "date": "2024-01-10"
        }, headers=auth_header(token_a))
        eid = json.loads(r.data)["id"]

        r2 = client.put(f"/api/expenses/{eid}", json={"title": "Hacked"}, headers=auth_header(token_b))
        assert r2.status_code == 403

    def test_delete_own_expense(self, client):
        token = self.setup_user(client)
        r = client.post("/api/expenses", json={
            "title": "Coffee", "amount": 5, "category": "Food & Dining", "date": "2024-01-10"
        }, headers=auth_header(token))
        eid = json.loads(r.data)["id"]
        r2 = client.delete(f"/api/expenses/{eid}", headers=auth_header(token))
        assert r2.status_code == 200

    def test_delete_other_users_expense_forbidden(self, client):
        token_a = self.setup_user(client, "alice@example.com")
        register(client, "bob@example.com", "password123", "Bob")
        token_b = login(client, "bob@example.com", "password123")

        r = client.post("/api/expenses", json={
            "title": "Coffee", "amount": 5, "category": "Food & Dining", "date": "2024-01-10"
        }, headers=auth_header(token_a))
        eid = json.loads(r.data)["id"]

        r2 = client.delete(f"/api/expenses/{eid}", headers=auth_header(token_b))
        assert r2.status_code == 403



class TestSplitLogic:
    def setup_group(self, client):
        register(client, "alice@example.com", "password123", "Alice")
        register(client, "bob@example.com", "password123", "Bob")
        register(client, "carol@example.com", "password123", "Carol")
        token_a = login(client, "alice@example.com", "password123")
        token_b = login(client, "bob@example.com", "password123")
        token_c = login(client, "carol@example.com", "password123")

        r = client.post("/api/groups", json={
            "name": "Trip",
            "member_emails": ["bob@example.com", "carol@example.com"]
        }, headers=auth_header(token_a))
        gid = json.loads(r.data)["id"]
        return gid, token_a, token_b, token_c

    def test_equal_split_3_people_remainder_handling(self, client):
        """$100 / 3 = $33.33 each, but sum = $99.99; remainder $0.01 must be assigned"""
        gid, token_a, _, _ = self.setup_group(client)
        r = client.post(f"/api/groups/{gid}/expenses", json={
            "title": "Dinner", "total_amount": 100.00, "split_type": "equal"
        }, headers=auth_header(token_a))
        assert r.status_code == 201

        r2 = client.get(f"/api/groups/{gid}", headers=auth_header(token_a))
        data = json.loads(r2.data)
        splits = data["expenses"][0]["splits"]
        total_splits = sum(s["amount_owed"] for s in splits)
        assert abs(total_splits - 100.00) < 0.02  

    def test_exact_split_valid(self, client):
        gid, token_a, token_b, token_c = self.setup_group(client)
        r = client.get(f"/api/groups/{gid}", headers=auth_header(token_a))
        members = json.loads(r.data)["members"]
        ids = [m["id"] for m in members]

        r2 = client.post(f"/api/groups/{gid}/expenses", json={
            "title": "Hotel",
            "total_amount": 90.00,
            "split_type": "exact",
            "splits": [
                {"user_id": ids[0], "amount": 30.00},
                {"user_id": ids[1], "amount": 30.00},
                {"user_id": ids[2], "amount": 30.00},
            ]
        }, headers=auth_header(token_a))
        assert r2.status_code == 201

    def test_exact_split_wrong_sum_rejected(self, client):
        gid, token_a, token_b, token_c = self.setup_group(client)
        r = client.get(f"/api/groups/{gid}", headers=auth_header(token_a))
        members = json.loads(r.data)["members"]
        ids = [m["id"] for m in members]

        r2 = client.post(f"/api/groups/{gid}/expenses", json={
            "title": "Hotel",
            "total_amount": 90.00,
            "split_type": "exact",
            "splits": [
                {"user_id": ids[0], "amount": 20.00},
                {"user_id": ids[1], "amount": 20.00},
                
            ]
        }, headers=auth_header(token_a))
        assert r2.status_code == 400

    def test_non_member_cannot_add_expense(self, client):
        gid, token_a, _, _ = self.setup_group(client)
        register(client, "dave@example.com", "password123", "Dave")
        token_d = login(client, "dave@example.com", "password123")

        r = client.post(f"/api/groups/{gid}/expenses", json={
            "title": "Snacks", "total_amount": 20, "split_type": "equal"
        }, headers=auth_header(token_d))
        assert r.status_code == 403



class TestBalances:
    def setup_group(self, client):
        register(client, "alice@example.com", "password123", "Alice")
        register(client, "bob@example.com", "password123", "Bob")
        token_a = login(client, "alice@example.com", "password123")
        token_b = login(client, "bob@example.com", "password123")

        r = client.post("/api/groups", json={
            "name": "Roommates",
            "member_emails": ["bob@example.com"]
        }, headers=auth_header(token_a))
        gid = json.loads(r.data)["id"]

        r2 = client.get(f"/api/groups/{gid}", headers=auth_header(token_a))
        members = json.loads(r2.data)["members"]
        alice = next(m for m in members if m["email"] == "alice@example.com")
        bob = next(m for m in members if m["email"] == "bob@example.com")
        return gid, token_a, token_b, alice["id"], bob["id"]

    def test_balance_after_expense(self, client):
        gid, token_a, token_b, alice_id, bob_id = self.setup_group(client)

        client.post(f"/api/groups/{gid}/expenses", json={
            "title": "Groceries", "total_amount": 60.00, "split_type": "equal"
        }, headers=auth_header(token_a))

        r = client.get(f"/api/groups/{gid}", headers=auth_header(token_a))
        balances = json.loads(r.data)["balances"]
        assert len(balances) == 1
        b = balances[0]
        assert b["from_user"] == bob_id
        assert b["to_user"] == alice_id
        assert abs(b["amount"] - 30.00) < 0.01

    def test_balance_after_settlement(self, client):
        gid, token_a, token_b, alice_id, bob_id = self.setup_group(client)

        client.post(f"/api/groups/{gid}/expenses", json={
            "title": "Groceries", "total_amount": 60.00, "split_type": "equal"
        }, headers=auth_header(token_a))

        client.post(f"/api/groups/{gid}/settle", json={
            "paid_to": alice_id, "amount": 30.00
        }, headers=auth_header(token_b))

        r = client.get(f"/api/groups/{gid}", headers=auth_header(token_a))
        balances = json.loads(r.data)["balances"]
        assert balances == []  

    def test_balance_after_multiple_expenses_and_settlement(self, client):
        gid, token_a, token_b, alice_id, bob_id = self.setup_group(client)

        client.post(f"/api/groups/{gid}/expenses", json={
            "title": "Groceries", "total_amount": 60.00, "split_type": "equal"
        }, headers=auth_header(token_a))

        client.post(f"/api/groups/{gid}/expenses", json={
            "title": "Utilities", "total_amount": 40.00, "split_type": "equal",
            "paid_by": bob_id
        }, headers=auth_header(token_b))

        r = client.get(f"/api/groups/{gid}", headers=auth_header(token_a))
        balances = json.loads(r.data)["balances"]
        assert len(balances) == 1
        assert abs(balances[0]["amount"] - 10.00) < 0.01

        client.post(f"/api/groups/{gid}/settle", json={
            "paid_to": alice_id, "amount": 10.00
        }, headers=auth_header(token_b))

        r2 = client.get(f"/api/groups/{gid}", headers=auth_header(token_a))
        assert json.loads(r2.data)["balances"] == []
