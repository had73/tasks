"""Backend tests for POST /api/users (admin-only user creation) - Iteration 2."""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://workflow-board-65.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN = {"email": "hadrava.martin@gmail.com", "password": "Admin123!"}
NONADMIN = {"email": "anna.novakova@taskflow.dev", "password": "User123!"}


def _login(creds):
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json=creds, timeout=15)
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    return s, r.json().get("access_token") or r.json().get("token")


@pytest.fixture(scope="module")
def admin_session():
    s, tok = _login(ADMIN)
    if tok:
        s.headers.update({"Authorization": f"Bearer {tok}"})
    return s


@pytest.fixture(scope="module")
def user_session():
    s, tok = _login(NONADMIN)
    if tok:
        s.headers.update({"Authorization": f"Bearer {tok}"})
    return s


def test_admin_create_user_success(admin_session):
    email = f"TEST_{uuid.uuid4().hex[:8]}@taskflow.dev"
    payload = {"email": email, "password": "Secret123!", "first_name": "Test",
               "last_name": "User", "role": "user", "active": True}
    r = admin_session.post(f"{API}/users", json=payload, timeout=15)
    assert r.status_code == 200, r.text
    data = r.json()
    assert "id" in data and data["email"] == email.lower()
    assert data["first_name"] == "Test" and data["role"] == "user"
    assert "password_hash" not in data
    # Verify persisted via GET /users
    lst = admin_session.get(f"{API}/users", timeout=15).json()
    assert any(u["email"] == email.lower() for u in lst)


def test_admin_create_user_duplicate_email_400(admin_session):
    email = f"TEST_{uuid.uuid4().hex[:8]}@taskflow.dev"
    payload = {"email": email, "password": "Secret123!", "first_name": "Dup",
               "last_name": "User", "role": "user"}
    r1 = admin_session.post(f"{API}/users", json=payload, timeout=15)
    assert r1.status_code == 200
    r2 = admin_session.post(f"{API}/users", json=payload, timeout=15)
    assert r2.status_code == 400, f"expected 400 duplicate, got {r2.status_code}: {r2.text}"


def test_non_admin_create_user_forbidden(user_session):
    payload = {"email": f"TEST_{uuid.uuid4().hex[:6]}@x.dev", "password": "Secret123!",
               "first_name": "F", "last_name": "L", "role": "user"}
    r = user_session.post(f"{API}/users", json=payload, timeout=15)
    assert r.status_code == 403, f"expected 403, got {r.status_code}: {r.text}"


def test_create_user_short_password_422(admin_session):
    payload = {"email": f"TEST_{uuid.uuid4().hex[:6]}@x.dev", "password": "abc",
               "first_name": "F", "last_name": "L", "role": "user"}
    r = admin_session.post(f"{API}/users", json=payload, timeout=15)
    assert r.status_code == 422, f"expected 422, got {r.status_code}: {r.text}"


def test_new_user_can_login(admin_session):
    email = f"TEST_{uuid.uuid4().hex[:8]}@taskflow.dev"
    pw = "NewUser123!"
    payload = {"email": email, "password": pw, "first_name": "Login",
               "last_name": "Test", "role": "user", "active": True}
    r = admin_session.post(f"{API}/users", json=payload, timeout=15)
    assert r.status_code == 200
    lr = requests.post(f"{API}/auth/login", json={"email": email, "password": pw}, timeout=15)
    assert lr.status_code == 200, lr.text
