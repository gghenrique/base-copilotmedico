"""
Testes da B68 / bug D-24: pacientes legados sem doctor_id ficavam
invisíveis para qualquer médico em /api/all-patients.
"""
import pytest

from backend import patient_db as pdb


def _legacy_record(name):
    # Registro no formato antigo: sem as chaves doctor_id e created_by.
    return {"name": name, "consultations": [], "chat_history": []}


def _seed_legacy_db():
    """Banco como era antes da migração: o seed + dois pacientes sem médico."""
    pdb.save_database({
        "paciente_abc": _legacy_record("João Silva"),
        "legacy-1": _legacy_record("Maria"),
        "legacy-2": _legacy_record("Carlos"),
    })


def _login_as(monkeypatch, user_id, profile="medico"):
    """Faz o servidor aceitar um token falso, como se `user_id` estivesse logado."""
    from backend import auth_decorators

    def fake_get_user_from_token(token):
        user = {
            "id": user_id,
            "email": f"{user_id}@example.com",
            "name": user_id,
            "profiles": [profile],
            "active": True,
        }
        return user, {"profile": profile}

    monkeypatch.setattr(auth_decorators, "get_user_from_token", fake_get_user_from_token)
    return {"Authorization": "Bearer qualquer-token"}


# --- Função de migração --------------------------------------------------

def test_migrate_removes_seed_and_assigns_legacy_patients(temp_db_file):
    _seed_legacy_db()

    result = pdb.migrate_legacy_patients("doc-1")

    assert result["removed"] == ["paciente_abc"]
    assert sorted(result["assigned"]) == ["legacy-1", "legacy-2"]
    db = pdb.load_database()
    assert "paciente_abc" not in db
    assert db["legacy-1"]["doctor_id"] == "doc-1"
    assert db["legacy-2"]["doctor_id"] == "doc-1"


def test_migrate_is_idempotent(temp_db_file):
    _seed_legacy_db()
    pdb.migrate_legacy_patients("doc-1")

    second_run = pdb.migrate_legacy_patients("doc-1")

    assert second_run == {"removed": [], "assigned": []}


def test_migrate_dry_run_does_not_write(temp_db_file):
    _seed_legacy_db()

    result = pdb.migrate_legacy_patients("doc-1", dry_run=True)

    assert result["removed"] == ["paciente_abc"]
    assert len(result["assigned"]) == 2
    db = pdb.load_database()
    assert "paciente_abc" in db
    assert db["legacy-1"]["doctor_id"] is None


def test_migrate_keeps_patients_that_already_have_a_doctor(temp_db_file):
    pdb.ensure_patient_exists("owned", name="Ana", doctor_id="doc-2")
    pdb.ensure_patient_exists("legacy-1", name="Maria")

    result = pdb.migrate_legacy_patients("doc-1")

    assert result["assigned"] == ["legacy-1"]
    assert pdb.load_database()["owned"]["doctor_id"] == "doc-2"


def test_migrate_removes_seed_only_by_id_not_by_name(temp_db_file):
    pdb.ensure_patient_exists("real-joao", name="João Silva", doctor_id="doc-1")

    result = pdb.migrate_legacy_patients("doc-1")

    assert result["removed"] == []
    assert "real-joao" in pdb.load_database()


def test_migrate_requires_doctor_id(temp_db_file):
    with pytest.raises(ValueError):
        pdb.migrate_legacy_patients("")


# --- D-24 pela rota, do ponto de vista do médico -------------------------

def test_d24_doctor_sees_legacy_patients_only_after_migration(client, temp_db_file, monkeypatch):
    _seed_legacy_db()
    headers = _login_as(monkeypatch, "doc-1")

    # Antes da migração: o bug D-24 (médico não enxerga nenhum paciente legado).
    before = client.get("/api/all-patients", headers=headers)
    assert before.status_code == 200
    assert before.get_json()["patients"] == []

    pdb.migrate_legacy_patients("doc-1")

    # Depois da migração: o médico vê os seus pacientes, e o seed sumiu.
    after = client.get("/api/all-patients", headers=headers)
    assert after.status_code == 200
    ids = sorted(patient["id"] for patient in after.get_json()["patients"])
    assert ids == ["legacy-1", "legacy-2"]


def test_migrated_patients_are_not_visible_to_other_doctors(client, temp_db_file, monkeypatch):
    _seed_legacy_db()
    pdb.migrate_legacy_patients("doc-1")
    headers = _login_as(monkeypatch, "doc-2")

    response = client.get("/api/all-patients", headers=headers)

    assert response.status_code == 200
    assert response.get_json()["patients"] == []