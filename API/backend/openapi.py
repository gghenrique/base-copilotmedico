"""Especificacao OpenAPI 3.1 das rotas de importacao do PEP (B07).

Servida em ``GET /api/openapi.json``. Por enquanto documenta so o contrato
``pep-import`` e seus aliases; as demais rotas entram conforme a B16.
Enums e limites vem de ``backend.pep_import`` para nao divergir da validacao.
"""

from backend import pep_import

EXEMPLO_REQUEST = {
    "pep_origem": "amplimed",
    "source_url": "https://app.amplimed.com.br/atendimento/123",
    "campos": {
        "peso": "70",
        "altura": "1.75",
        "tempe": "38.9",
        "pas": "110",
        "pad": "70",
        "anamnese": "Febre ha 3 dias, cefaleia e dor retro-orbitaria.",
    },
}


def _campos_schema():
    properties = {
        chave: {"type": "string", "maxLength": pep_import.MAX_SINAL_VITAL_CHARS,
                "description": f"Sinal vital: {rotulo}."}
        for chave, rotulo in pep_import.SINAIS_VITAIS.items()
    }
    properties.update({
        chave: {"type": "string", "maxLength": pep_import.MAX_NOTA_CHARS,
                "description": f"Nota clinica: {rotulo}."}
        for chave, rotulo in pep_import.NOTAS.items()
    })
    return {
        "type": "object",
        "description": "Ao menos um campo preenchido. Numeros tambem sao aceitos e convertidos para texto.",
        "additionalProperties": False,
        "minProperties": 1,
        "properties": properties,
    }


def _error_response(descricao):
    return {
        "description": descricao,
        "content": {"application/json": {"schema": {"$ref": "#/components/schemas/Erro"}}},
    }


def _responses():
    return {
        "200": {
            "description": "Dados registrados na consulta.",
            "content": {"application/json": {"schema": {"$ref": "#/components/schemas/PepImportResposta"}}},
        },
        "400": _error_response("Payload fora do contrato."),
        "401": _error_response("Token ausente ou invalido."),
        "403": _error_response("Perfil sem permissao ou paciente de outro medico."),
        "404": _error_response("Consulta nao encontrada para o paciente."),
    }


def build_openapi_spec():
    security = [{"bearerAuth": []}]
    return {
        "openapi": "3.1.0",
        "info": {
            "title": "CoPilot Medico API",
            "version": "5.0.0-dev",
            "description": "Contrato de importacao de dados do PEP (pep-import).",
        },
        "paths": {
            "/api/consultations/{consultation_id}/pep-import": {
                "post": {
                    "operationId": "pepImport",
                    "summary": "Importa sinais vitais e notas do PEP para uma consulta",
                    "description": "Rota canonica. O paciente e deduzido da consulta.",
                    "security": security,
                    "parameters": [{
                        "name": "consultation_id", "in": "path", "required": True,
                        "schema": {"type": "string"},
                    }],
                    "requestBody": {
                        "required": True,
                        "content": {"application/json": {
                            "schema": {"$ref": "#/components/schemas/PepImportRequisicao"},
                            "example": EXEMPLO_REQUEST,
                        }},
                    },
                    "responses": _responses(),
                },
            },
            "/api/extension/extracted-data": {
                "post": {
                    "operationId": "extensionExtractedData",
                    "summary": "Rota da extensao para importar dados do PEP",
                    "description": (
                        "Mesmo contrato da rota canonica, acrescido de patient_id e consultation_id "
                        "no corpo (ambos obrigatorios). Continua aceitando o formato livre legado "
                        "(extracted_content / extracted_data)."
                    ),
                    "security": security,
                    "requestBody": {
                        "required": True,
                        "content": {"application/json": {
                            "schema": {"$ref": "#/components/schemas/ExtensaoRequisicao"},
                            "example": {
                                **EXEMPLO_REQUEST,
                                "patient_id": "<id do paciente>",
                                "consultation_id": "<id da consulta>",
                            },
                        }},
                    },
                    "responses": _responses(),
                },
            },
            "/api/extracted-data": {
                "post": {
                    "operationId": "legacyExtractedData",
                    "deprecated": True,
                    "summary": "Alias legado de /api/extension/extracted-data",
                    "description": "Mantido para clientes antigos. Use /api/extension/extracted-data.",
                    "security": security,
                    "requestBody": {
                        "required": True,
                        "content": {"application/json": {
                            "schema": {"$ref": "#/components/schemas/ExtensaoRequisicao"},
                        }},
                    },
                    "responses": _responses(),
                },
            },
        },
        "components": {
            "securitySchemes": {"bearerAuth": {"type": "http", "scheme": "bearer", "bearerFormat": "JWT"}},
            "schemas": {
                "PepImportRequisicao": {
                    "type": "object",
                    "required": ["pep_origem", "campos"],
                    "properties": {
                        "pep_origem": {"type": "string", "enum": list(pep_import.PEP_ORIGENS)},
                        "source_url": {"type": "string"},
                        "created_at": {"type": "string", "description": "ISO 8601; padrao: agora."},
                        "campos": _campos_schema(),
                    },
                },
                "ExtensaoRequisicao": {
                    "type": "object",
                    "required": ["patient_id", "consultation_id"],
                    "description": (
                        "Corpo tipado (pep_origem + campos) ou formato livre legado "
                        "(extracted_content: lista de {role, text}, ou extracted_data: objeto/texto). "
                        "Tambem aceita camelCase (patientId, consultationId, sourceUrl, createdAt)."
                    ),
                    "properties": {
                        "patient_id": {"type": "string"},
                        "consultation_id": {"type": "string"},
                        "pep_origem": {"type": "string", "enum": list(pep_import.PEP_ORIGENS)},
                        "source_url": {"type": "string"},
                        "created_at": {"type": "string"},
                        "campos": _campos_schema(),
                        "extracted_content": {"type": "array", "items": {
                            "type": "object", "required": ["role", "text"],
                            "properties": {"role": {"type": "string"}, "text": {"type": "string"}},
                        }},
                    },
                },
                "PepImportResposta": {
                    "type": "object",
                    "required": ["status", "patient_id", "consultation_id", "extension_data"],
                    "properties": {
                        "status": {"type": "string", "enum": ["success"]},
                        "patient_id": {"type": "string"},
                        "consultation_id": {"type": "string"},
                        "ai_response": {"type": ["string", "null"]},
                        "extension_data": {"type": "object"},
                        "resumo": {
                            "type": "object",
                            "description": "So no formato tipado. Lista nomes de campos, nunca o conteudo.",
                            "required": ["pep_origem", "sinais_vitais", "notas", "total"],
                            "properties": {
                                "pep_origem": {"type": "string"},
                                "sinais_vitais": {"type": "array", "items": {"type": "string"}},
                                "notas": {"type": "array", "items": {"type": "string"}},
                                "total": {"type": "integer"},
                            },
                        },
                    },
                },
                "Erro": {
                    "type": "object",
                    "required": ["status", "message"],
                    "properties": {
                        "status": {"type": "string", "enum": ["error"]},
                        "message": {"type": "string"},
                    },
                },
            },
        },
    }
