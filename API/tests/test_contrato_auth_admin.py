"""B16 - Testes de contrato das rotas de autenticacao e administracao.

Para cada rota: sucesso, erro de validacao e 401/403.
"""
import pytest

from backend import auth_decorators, auth_service


def _fake_login_as(monkeypatch, profile="medico", user_id="user-1"):
    """Finge um usuario logado com o perfil pedido (sem token real)."""

    def fake_get_user_from_token(token):
        if token != "valid-token":
            raise auth_decorators.AuthError("Token invalido", 401)
        user = {
            "id": user_id,
            "email": "user@example.com",
            "name": "Usuario Teste",
            "profiles": [profile],
            "active": True,
        }
        return user, {"profile": profile}

    monkeypatch.setattr(auth_decorators, "get_user_from_token", fake_get_user_from_token)
    return {"Authorization": "Bearer valid-token"}


@pytest.fixture()
def users_db(tmp_path, monkeypatch):
    """Usa um arquivo de usuarios temporario e uma chave secreta de teste."""
    monkeypatch.setattr(auth_service, "USERS_DB_FILE", str(tmp_path / "users_db.json"))
    monkeypatch.setattr(auth_service.settings, "auth_secret_key", "chave-de-teste")
    monkeypatch.setattr(auth_service.settings, "auth_bootstrap_email", "")
    monkeypatch.setattr(auth_service.settings, "auth_bootstrap_password", "")
    return tmp_path


@pytest.fixture()
def admin_user(users_db):
    return auth_service.create_user(
        "admin@example.com", "SenhaForte123!", "Admin", ["administrador"]
    )


# ---------- POST /api/auth/login ----------

def test_login_success(client, admin_user):
    resp = client.post("/api/auth/login", json={
        "email": "admin@example.com", "password": "SenhaForte123!", "profile": "administrador",
    })
    assert resp.status_code == 200
    assert resp.get_json()["token"]


def test_login_validation_error_missing_fields(client, users_db):
    resp = client.post("/api/auth/login", json={"email": "admin@example.com"})
    assert resp.status_code == 400


def test_login_wrong_password_returns_401(client, admin_user):
    resp = client.post("/api/auth/login", json={
        "email": "admin@example.com", "password": "errada", "profile": "administrador",
    })
    assert resp.status_code == 401


def test_login_profile_not_allowed_returns_403(client, admin_user):
    resp = client.post("/api/auth/login", json={
        "email": "admin@example.com", "password": "SenhaForte123!", "profile": "medico",
    })
    assert resp.status_code == 403


# ---------- POST /api/auth/register-doctor ----------

def test_register_doctor_success(client, users_db):
    resp = client.post("/api/auth/register-doctor", json={
        "name": "Dra. Ana", "email": "ana@example.com", "password": "SenhaForte123!",
    })
    assert resp.status_code == 201
    assert resp.get_json()["status"] == "success"


def test_register_doctor_validation_error(client, users_db):
    resp = client.post("/api/auth/register-doctor", json={"name": "Sem email"})
    assert resp.status_code == 400


def test_register_doctor_duplicate_email_returns_409(client, users_db):
    body = {"name": "Dra. Ana", "email": "ana@example.com", "password": "SenhaForte123!"}
    client.post("/api/auth/register-doctor", json=body)
    resp = client.post("/api/auth/register-doctor", json=body)
    assert resp.status_code == 409


# ---------- POST /api/auth/select-profile ----------

def test_select_profile_success(client, users_db, monkeypatch):
    user = auth_service.create_user("m@example.com", "SenhaForte123!", "M", ["medico"])
    headers = _fake_login_as(monkeypatch, profile="medico", user_id=user["id"])
    resp = client.post("/api/auth/select-profile", json={"profile": "medico"}, headers=headers)
    assert resp.status_code == 200


def test_select_profile_validation_error(client, monkeypatch):
    headers = _fake_login_as(monkeypatch)
    resp = client.post("/api/auth/select-profile", json={}, headers=headers)
    assert resp.status_code == 400


def test_select_profile_requires_token_401(client):
    resp = client.post("/api/auth/select-profile", json={"profile": "medico"})
    assert resp.status_code == 401


def test_select_profile_not_allowed_returns_403(client, monkeypatch):
    headers = _fake_login_as(monkeypatch, profile="medico")
    resp = client.post("/api/auth/select-profile", json={"profile": "administrador"}, headers=headers)
    assert resp.status_code == 403


# ---------- GET /api/auth/me ----------

def test_me_success(client, monkeypatch):
    headers = _fake_login_as(monkeypatch)
    resp = client.get("/api/auth/me", headers=headers)
    assert resp.status_code == 200
    assert resp.get_json()["status"] == "success"


def test_me_requires_token_401(client):
    assert client.get("/api/auth/me").status_code == 401


def test_me_invalid_token_401(client, monkeypatch):
    _fake_login_as(monkeypatch)
    resp = client.get("/api/auth/me", headers={"Authorization": "Bearer token-invalido"})
    assert resp.status_code == 401


# ---------- GET /api/admin/doctor-requests ----------

def test_list_doctor_requests_success(client, users_db, monkeypatch):
    headers = _fake_login_as(monkeypatch, profile="administrador")
    resp = client.get("/api/admin/doctor-requests", headers=headers)
    assert resp.status_code == 200
    assert "requests" in resp.get_json()


def test_list_doctor_requests_invalid_status_400(client, monkeypatch):
    headers = _fake_login_as(monkeypatch, profile="administrador")
    resp = client.get("/api/admin/doctor-requests?status=xyz", headers=headers)
    assert resp.status_code == 400


def test_list_doctor_requests_requires_token_401(client):
    assert client.get("/api/admin/doctor-requests").status_code == 401


def test_list_doctor_requests_medico_forbidden_403(client, monkeypatch):
    headers = _fake_login_as(monkeypatch, profile="medico")
    assert client.get("/api/admin/doctor-requests", headers=headers).status_code == 403


# ---------- PATCH /api/admin/doctor-requests/<id>/approve ----------

def test_approve_doctor_success(client, users_db, monkeypatch):
    doctor = auth_service.create_doctor_registration(
        name="Dr. Pedro", email="pedro@example.com", password="SenhaForte123!"
    )
    headers = _fake_login_as(monkeypatch, profile="administrador", user_id="admin-1")
    resp = client.patch(f"/api/admin/doctor-requests/{doctor['id']}/approve", headers=headers)
    assert resp.status_code == 200


def test_approve_doctor_unknown_id_returns_404(client, users_db, monkeypatch):
    headers = _fake_login_as(monkeypatch, profile="administrador")
    resp = client.patch("/api/admin/doctor-requests/nao-existe/approve", headers=headers)
    assert resp.status_code == 404


def test_approve_doctor_requires_token_401(client):
    assert client.patch("/api/admin/doctor-requests/x/approve").status_code == 401


def test_approve_doctor_medico_forbidden_403(client, monkeypatch):
    headers = _fake_login_as(monkeypatch, profile="medico")
    assert client.patch("/api/admin/doctor-requests/x/approve", headers=headers).status_code == 403


# ---------- PATCH /api/admin/doctor-requests/<id>/reject ----------

def test_reject_doctor_success(client, users_db, monkeypatch):
    doctor = auth_service.create_doctor_registration(
        name="Dr. Paulo", email="paulo@example.com", password="SenhaForte123!"
    )
    headers = _fake_login_as(monkeypatch, profile="administrador", user_id="admin-1")
    resp = client.patch(
        f"/api/admin/doctor-requests/{doctor['id']}/reject",
        json={"reason": "CRM invalido"}, headers=headers,
    )
    assert resp.status_code == 200


def test_reject_doctor_unknown_id_returns_404(client, users_db, monkeypatch):
    headers = _fake_login_as(monkeypatch, profile="administrador")
    resp = client.patch("/api/admin/doctor-requests/nao-existe/reject", json={}, headers=headers)
    assert resp.status_code == 404


def test_reject_doctor_requires_token_401(client):
    assert client.patch("/api/admin/doctor-requests/x/reject", json={}).status_code == 401


def test_reject_doctor_medico_forbidden_403(client, monkeypatch):
    headers = _fake_login_as(monkeypatch, profile="medico")
    resp = client.patch("/api/admin/doctor-requests/x/reject", json={}, headers=headers)
    assert resp.status_code == 403
