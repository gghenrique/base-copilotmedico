"""
Testes de rota com as dependencias de persistencia mockadas (B15).

Migrado de unittest para pytest. Tres problemas da versao anterior:

1. `from API.server import app` no topo do modulo importava o servidor durante
   a COLETA do pytest, antes de qualquer fixture rodar - ou seja, antes dos
   stubs de vosk/speech_recognition. O app agora chega pela fixture
   `auth_client`, que so e construida depois dos stubs.
2. Os sys.path.insert manuais foram substituidos por `pythonpath = .` no
   pytest.ini.
3. O alvo `patch('patient_db.get_patient_data')` nao existia (o modulo e
   `backend.patient_db`, e o server importa o nome diretamente). Todos os
   alvos agora apontam para `server.<nome>`, que e onde a referencia e
   resolvida em tempo de chamada.
"""
from unittest.mock import patch

import pytest


# ---------------------------------------------------------------------------
# POST /api/patients
# ---------------------------------------------------------------------------

def test_create_patient_success(auth_client):
    """Criar paciente deve retornar 201 e propagar os IDs gerados."""
    with patch("server.generate_patient_id", return_value="NEW_TEST_ID_001") as mock_gen, \
         patch("server.add_consultation_to_patient", return_value="CONSULTA_ID_001") as mock_add, \
         patch("server.ensure_patient_exists") as mock_ensure:

        mock_ensure.return_value = {"name": "Novo Paciente", "chat_history": []}

        response = auth_client.post("/api/patients", json={"name": "Novo Paciente"})

        assert response.status_code == 201, "Deve retornar 201 ao criar paciente"

        mock_gen.assert_called_once()
        mock_add.assert_called_once_with("NEW_TEST_ID_001", "Primeira Consulta")

        # ensure_patient_exists passou a receber doctor_id/created_by junto da
        # autenticacao; validamos os argumentos relevantes sem travar a
        # assinatura inteira.
        assert mock_ensure.call_count == 1
        args, kwargs = mock_ensure.call_args
        assert args[0] == "NEW_TEST_ID_001"
        assert kwargs["name"] == "Novo Paciente"

        body = response.get_json()
        assert body["patient_id"] == "NEW_TEST_ID_001"
        assert body["first_consultation_id"] == "CONSULTA_ID_001"


def test_create_patient_requires_authentication(client):
    """Sem token, a rota protegida responde 401 (e nao 201)."""
    response = client.post("/api/patients", json={"name": "Sem Token"})

    assert response.status_code == 401
    assert response.get_json()["status"] == "error"


# ---------------------------------------------------------------------------
# GET /api/patient-exists/<id>
# ---------------------------------------------------------------------------

def test_check_patient_exists_found(auth_client):
    with patch("server.get_patient_data") as mock_get:
        mock_get.return_value = {"name": "Existente"}

        response = auth_client.get("/api/patient-exists/existing_id")

        assert response.status_code == 200
        assert response.get_json()["exists"] is True
        mock_get.assert_called_once_with("existing_id")


def test_check_patient_exists_not_found(auth_client):
    # Alvo corrigido: antes era 'patient_db.get_patient_data', modulo que nao
    # existe com esse nome - o patch falhava antes mesmo de rodar o teste.
    with patch("server.get_patient_data", return_value=None):
        response = auth_client.get("/api/patient-exists/non_existing_id")

        assert response.status_code == 200
        assert response.get_json()["exists"] is False


# ---------------------------------------------------------------------------
# GET /api/all-patients
# ---------------------------------------------------------------------------

def test_get_all_patients_success(auth_client):
    mock_data = [
        {"id": "id_pac_1", "name": "Paciente A"},
        {"id": "id_pac_2", "name": "Paciente B"},
    ]
    with patch("server.get_all_patients_info", return_value=mock_data) as mock_all:
        response = auth_client.get("/api/all-patients")

        assert response.status_code == 200, "Deve retornar 200 OK."
        mock_all.assert_called_once()

        body = response.get_json()
        assert body["status"] == "success"
        assert body["patients"] == mock_data


def test_get_all_patients_empty(auth_client):
    with patch("server.get_all_patients_info", return_value=[]):
        response = auth_client.get("/api/all-patients")

        assert response.status_code == 200, "Deve retornar 200 mesmo com lista vazia."
        body = response.get_json()
        assert body["status"] == "success"
        assert body["patients"] == []


def test_get_all_patients_internal_error(auth_client):
    """Falha na camada de dados deve virar 500 estruturado, nao stacktrace."""
    with patch("server.get_all_patients_info", side_effect=Exception("Erro simulado de DB")):
        response = auth_client.get("/api/all-patients")

        assert response.status_code == 500
        assert response.get_json()["status"] == "error"


# ---------------------------------------------------------------------------
# GET /api/health  (B12 - usado pelo healthcheck do Docker)
# ---------------------------------------------------------------------------

def test_health_endpoint_is_public(client):
    """O healthcheck precisa responder sem token, senao o compose nunca sobe."""
    response = client.get("/api/health")

    assert response.status_code == 200
    body = response.get_json()
    assert body["status"] == "success"
    assert body["service"] == "copilot-medico-api"
    assert "diarizer_loaded" in body
