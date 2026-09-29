"""B07 / US011: contrato pep-import, alias legado e OpenAPI.

Fixtures (conftest.py): `client` e anonimo; `auth_client` e administrador;
`auth_headers(perfil)` fabrica cabecalhos para um perfil especifico.
"""

import pytest
from jsonschema import Draft202012Validator

from backend import patient_db as pdb
from backend import pep_import
from backend.openapi import EXEMPLO_REQUEST, build_openapi_spec
from backend.pep_import import PepImportError

CANONICAL = "/api/consultations/{cid}/pep-import"
EXTENSION = "/api/extension/extracted-data"
LEGACY = "/api/extracted-data"

CAMPOS_COMPLETOS = {
    "peso": "70", "altura": "1.75", "imc": "22.9", "tempe": "38.9",
    "freqres": "18", "freqcar": "88", "pas": "110", "pad": "70",
    "anamnese": "Febre ha 3 dias.", "exame_fisico": "Sem alteracoes.",
    "conclusao_diagnostica": "Sindrome febril.", "lista_problemas": "Febre.",
}


# --------------------------------------------------------------------------- helpers

def _schema_validator(spec, name):
    root = {"$ref": f"#/components/schemas/{name}", "components": spec["components"]}
    return Draft202012Validator(root)


@pytest.fixture()
def consulta(temp_db_file):
    """Paciente do usuario de teste (user-test-1) com uma consulta."""
    pid = pdb.generate_patient_id()
    pdb.ensure_patient_exists(pid, name="Paciente Sintetico", doctor_id="user-test-1")
    cid = pdb.add_consultation_to_patient(pid, "Consulta")
    return pid, cid


def _body(**extra):
    return {"pep_origem": "amplimed", "campos": {"peso": "70", "anamnese": "Cefaleia."}, **extra}


# --------------------------------------------------------------------------- modulo

def test_parse_aceita_os_8_sinais_vitais_e_as_4_notas():
    out = pep_import.parse_pep_import({"pep_origem": "Amplimed", "campos": CAMPOS_COMPLETOS})
    assert out["pep_origem"] == "amplimed"
    assert list(out["campos"]) == list(pep_import.SINAIS_VITAIS) + list(pep_import.NOTAS)
    assert len(pep_import.SINAIS_VITAIS) == 8 and len(pep_import.NOTAS) == 4


def test_parse_converte_numero_e_ignora_campo_vazio():
    out = pep_import.parse_pep_import(
        {"pep_origem": "amplimed", "campos": {"peso": 70, "altura": 1.75, "imc": "  ", "pas": ""}}
    )
    assert out["campos"] == {"peso": "70", "altura": "1.75"}


@pytest.mark.parametrize("payload, trecho", [
    (None, "Corpo JSON"),
    ({"campos": {"peso": "1"}}, "pep_origem e obrigatorio"),
    ({"pep_origem": "prontuario-x", "campos": {"peso": "1"}}, "pep_origem invalido"),
    ({"pep_origem": "amplimed"}, "campos e obrigatorio"),
    ({"pep_origem": "amplimed", "campos": []}, "campos e obrigatorio"),
    ({"pep_origem": "amplimed", "campos": {"peso": "1", "cpf": "x", "apelido": "y"}}, "apelido, cpf"),
    ({"pep_origem": "amplimed", "campos": {"peso": True}}, "campos.peso deve ser texto ou numero"),
    ({"pep_origem": "amplimed", "campos": {"peso": ["70"]}}, "campos.peso deve ser texto ou numero"),
    ({"pep_origem": "amplimed", "campos": {"peso": " ", "anamnese": ""}}, "nenhum valor preenchido"),
    ({"pep_origem": "amplimed", "campos": {"peso": "1" * 21}}, "excede 20"),
    ({"pep_origem": "amplimed", "campos": {"anamnese": "x" * 20001}}, "excede 20000"),
])
def test_parse_rejeita_payload_fora_do_contrato(payload, trecho):
    with pytest.raises(PepImportError) as exc:
        pep_import.parse_pep_import(payload)
    assert trecho in str(exc.value)


def test_summarize_lista_nomes_e_nunca_conteudo():
    out = pep_import.parse_pep_import({"pep_origem": "amplimed", "campos": CAMPOS_COMPLETOS})
    resumo = pep_import.summarize(out)
    assert resumo["total"] == 12
    assert resumo["sinais_vitais"] == list(pep_import.SINAIS_VITAIS)
    assert resumo["notas"] == list(pep_import.NOTAS)
    assert "Febre" not in str(resumo)


def test_format_for_prompt_agrupa_sinais_e_notas():
    out = pep_import.parse_pep_import(
        {"pep_origem": "amplimed", "campos": {"peso": "70", "anamnese": "Cefaleia."}}
    )
    texto = pep_import.format_for_prompt(out, "https://pep.example/1")
    assert "Dados importados do prontuario (amplimed)" in texto
    assert "Fonte: https://pep.example/1" in texto
    assert "- Peso (kg): 70" in texto
    assert "Anamnese: Cefaleia." in texto
    assert "Notas clinicas:" in texto


# --------------------------------------------------------------------------- rota canonica

def test_canonica_registra_dados_e_responde_conforme_o_spec(auth_client, consulta):
    pid, cid = consulta
    resp = auth_client.post(CANONICAL.format(cid=cid), json=_body(source_url="https://pep.example/1"))

    payload = resp.get_json()
    assert resp.status_code == 200
    assert payload["patient_id"] == pid and payload["consultation_id"] == cid
    assert payload["resumo"] == {"pep_origem": "amplimed", "sinais_vitais": ["peso"],
                                 "notas": ["anamnese"], "total": 2}
    _schema_validator(build_openapi_spec(), "PepImportResposta").validate(payload)

    item = pdb.get_patient_extension_data(pid)[0]
    assert item["type"] == "pep_import"
    assert item["pep_origem"] == "amplimed"
    assert item["consultation_id"] == cid
    assert item["content"] == {"peso": "70", "anamnese": "Cefaleia."}

    historico = pdb.get_consultation_chat_history(pid, cid)
    assert [m["role"] for m in historico] == ["user", "model"]
    assert "- Peso (kg): 70" in historico[0]["parts"][0]["text"]


def test_canonica_exige_token(client, consulta):
    resp = client.post(CANONICAL.format(cid=consulta[1]), json=_body())
    assert resp.status_code == 401


def test_canonica_rejeita_perfil_sem_permissao(client, consulta, auth_headers):
    resp = client.post(CANONICAL.format(cid=consulta[1]), json=_body(), headers=auth_headers("recepcao"))
    assert resp.status_code == 403


def test_canonica_consulta_inexistente_404(auth_client, temp_db_file):
    resp = auth_client.post(CANONICAL.format(cid="nao-existe"), json=_body())
    assert resp.status_code == 404


def test_canonica_paciente_de_outro_medico_403(client, temp_db_file, auth_headers):
    pid = pdb.generate_patient_id()
    pdb.ensure_patient_exists(pid, name="De outro", doctor_id="outro-medico")
    cid = pdb.add_consultation_to_patient(pid, "Consulta")

    resp = client.post(CANONICAL.format(cid=cid), json=_body(), headers=auth_headers("medico"))

    assert resp.status_code == 403
    assert pdb.get_patient_extension_data(pid) == []


def test_canonica_medico_dono_do_paciente_200(client, consulta, auth_headers):
    resp = client.post(CANONICAL.format(cid=consulta[1]), json=_body(), headers=auth_headers("medico"))
    assert resp.status_code == 200


@pytest.mark.parametrize("corpo", [
    {"campos": {"peso": "70"}},                                  # sem pep_origem
    {"pep_origem": "amplimed"},                                  # sem campos
    {"pep_origem": "amplimed", "campos": {"cpf": "123"}},        # chave desconhecida
    {"pep_origem": "amplimed", "campos": {}},                    # vazio
    {"extracted_content": [{"role": "peso", "text": "70"}]},     # legado nao vale na rota canonica
])
def test_canonica_400_e_nada_e_gravado(auth_client, consulta, corpo):
    pid, cid = consulta
    resp = auth_client.post(CANONICAL.format(cid=cid), json=corpo)
    assert resp.status_code == 400
    assert resp.get_json()["status"] == "error"
    assert pdb.get_patient_extension_data(pid) == []


def test_canonica_corpo_nao_json_400(auth_client, consulta):
    resp = auth_client.post(CANONICAL.format(cid=consulta[1]), data="texto", content_type="text/plain")
    assert resp.status_code == 400


# --------------------------------------------------------------------------- extensao + alias legado

@pytest.mark.parametrize("rota", [EXTENSION, LEGACY])
def test_rotas_da_extensao_aceitam_o_corpo_tipado(auth_client, consulta, rota):
    pid, cid = consulta
    resp = auth_client.post(rota, json=_body(patient_id=pid, consultation_id=cid))
    payload = resp.get_json()
    assert resp.status_code == 200
    assert payload["extension_data"]["type"] == "pep_import"
    assert payload["resumo"]["total"] == 2


@pytest.mark.parametrize("rota", [EXTENSION, LEGACY])
def test_rotas_da_extensao_mantem_o_formato_livre_legado(auth_client, consulta, rota):
    pid, cid = consulta
    resp = auth_client.post(rota, json={
        "patient_id": pid, "consultation_id": cid,
        "extracted_content": [{"role": "peso", "text": "70"}, {"role": "Anamnese", "text": "Dor"}],
    })
    payload = resp.get_json()
    assert resp.status_code == 200
    assert payload["extension_data"]["type"] == "extracted_data"
    assert "resumo" not in payload
    assert "peso: 70" in pdb.get_consultation_chat_history(pid, cid)[0]["parts"][0]["text"]


@pytest.mark.parametrize("rota", [EXTENSION, LEGACY])
def test_rotas_da_extensao_exigem_consulta_e_paciente(auth_client, consulta, rota):
    pid, cid = consulta
    sem_consulta = auth_client.post(rota, json=_body(patient_id=pid))
    sem_paciente = auth_client.post(rota, json=_body(consultation_id=cid))
    assert sem_consulta.status_code == 400 and "consultation_id" in sem_consulta.get_json()["message"]
    assert sem_paciente.status_code == 400 and "patient_id" in sem_paciente.get_json()["message"]
    assert pdb.get_patient_extension_data(pid) == []


def test_extensao_consulta_de_outro_paciente_404(auth_client, consulta):
    pid, _ = consulta
    outro = pdb.generate_patient_id()
    pdb.ensure_patient_exists(outro, name="Outro", doctor_id="user-test-1")
    cid_outro = pdb.add_consultation_to_patient(outro, "Consulta")
    resp = auth_client.post(EXTENSION, json=_body(patient_id=pid, consultation_id=cid_outro))
    assert resp.status_code == 404


def test_extensao_tipada_invalida_400(auth_client, consulta):
    pid, cid = consulta
    resp = auth_client.post(EXTENSION, json={"patient_id": pid, "consultation_id": cid,
                                        "pep_origem": "amplimed", "campos": {"cpf": "1"}})
    assert resp.status_code == 400


# --------------------------------------------------------------------------- OpenAPI

def test_openapi_e_publico_e_documenta_as_tres_rotas(client):
    resp = client.get("/api/openapi.json")
    spec = resp.get_json()
    assert resp.status_code == 200
    assert spec["openapi"].startswith("3.1")
    assert set(spec["paths"]) == {
        "/api/consultations/{consultation_id}/pep-import", EXTENSION, LEGACY,
    }
    assert spec["paths"][LEGACY]["post"]["deprecated"] is True


def test_toda_rota_documentada_existe_no_flask(flask_app):
    regras = {(r.rule.replace("<consultation_id>", "{consultation_id}"), m)
              for r in flask_app.url_map.iter_rules() for m in r.methods}
    for caminho, operacoes in build_openapi_spec()["paths"].items():
        for metodo in operacoes:
            assert (caminho, metodo.upper()) in regras, f"{metodo.upper()} {caminho} nao existe"


def test_toda_rota_pep_documentada_e_toda_rota_de_extensao_esta_no_spec(flask_app):
    documentadas = set(build_openapi_spec()["paths"])
    reais = {r.rule.replace("<consultation_id>", "{consultation_id}")
             for r in flask_app.url_map.iter_rules()
             if "pep-import" in r.rule or "extracted-data" in r.rule}
    assert reais == documentadas


def test_exemplo_do_spec_e_valido_no_schema_e_aceito_pela_api(auth_client, consulta):
    spec = build_openapi_spec()
    _schema_validator(spec, "PepImportRequisicao").validate(EXEMPLO_REQUEST)
    resp = auth_client.post(CANONICAL.format(cid=consulta[1]), json=EXEMPLO_REQUEST)
    assert resp.status_code == 200


def test_schema_rejeita_o_que_a_api_rejeita():
    validator = _schema_validator(build_openapi_spec(), "PepImportRequisicao")
    assert not validator.is_valid({"pep_origem": "amplimed", "campos": {"cpf": "1"}})
    assert not validator.is_valid({"pep_origem": "xxx", "campos": {"peso": "1"}})
    assert not validator.is_valid({"campos": {"peso": "1"}})


def test_erro_da_api_segue_o_schema_Erro(auth_client, consulta):
    resp = auth_client.post(CANONICAL.format(cid=consulta[1]), json={"pep_origem": "amplimed"})
    _schema_validator(build_openapi_spec(), "Erro").validate(resp.get_json())
