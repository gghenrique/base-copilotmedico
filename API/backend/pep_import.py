"""Contrato ``pep-import`` (B07 / US011 / D-01).

Define, em um unico lugar, quais campos o Prontuario Eletronico do Paciente (PEP)
pode enviar ao backend e como eles sao validados. A especificacao OpenAPI
(``backend/openapi.py``) e os testes de contrato leem as constantes daqui, entao
documentacao, validacao e testes nao divergem.

Corpo tipado aceito::

    {
      "pep_origem": "amplimed",
      "source_url": "https://...",            # opcional
      "created_at": "2026-09-28T10:00:00",    # opcional
      "campos": {
        "peso": "70", "altura": "1.75", ...,   # sinais vitais
        "anamnese": "...", ...                 # notas clinicas
      }
    }

Este modulo nao faz I/O nem depende de Flask.
"""

# PEPs suportados. "outro" existe para nao bloquear pilotos; novos adaptadores
# (ex.: e-SUS PEC, B-* da Sprint 5) entram aqui.
PEP_ORIGENS = ("amplimed", "esus-pec", "outro")

# Nomes iguais aos `f_prontuario` do Amplimed (public/content.js) e ao doc 09.
SINAIS_VITAIS = {
    "peso": "Peso (kg)",
    "altura": "Altura (m)",
    "imc": "IMC (kg/m2)",
    "tempe": "Temperatura (C)",
    "freqres": "Frequencia respiratoria (irpm)",
    "freqcar": "Frequencia cardiaca (bpm)",
    "pas": "Pressao arterial sistolica (mmHg)",
    "pad": "Pressao arterial diastolica (mmHg)",
}

# As 4 notas editaveis do Amplimed (.note-editable), na ordem da tela.
NOTAS = {
    "anamnese": "Anamnese",
    "exame_fisico": "Detalhes do exame fisico",
    "conclusao_diagnostica": "Conclusao diagnostica",
    "lista_problemas": "Lista de problemas",
}

MAX_SINAL_VITAL_CHARS = 20
MAX_NOTA_CHARS = 20000


class PepImportError(ValueError):
    """Payload fora do contrato. ``str(erro)`` e seguro para devolver ao cliente."""


def _coerce_text(campo, valor):
    # bool e subclasse de int em Python; True viraria "True" silenciosamente.
    if isinstance(valor, bool) or not isinstance(valor, (str, int, float)):
        raise PepImportError(f"campos.{campo} deve ser texto ou numero.")
    return str(valor).strip()


def parse_pep_import(data):
    """Valida o corpo tipado e devolve ``{"pep_origem", "campos"}`` normalizado.

    ``campos`` volta plano (so as chaves preenchidas, valores em texto) e na
    ordem canonica: sinais vitais primeiro, depois notas.
    """
    if not isinstance(data, dict):
        raise PepImportError("Corpo JSON invalido.")

    origem = data.get("pep_origem")
    if not isinstance(origem, str) or not origem.strip():
        raise PepImportError(
            "pep_origem e obrigatorio. Valores aceitos: " + ", ".join(PEP_ORIGENS) + "."
        )
    origem = origem.strip().lower()
    if origem not in PEP_ORIGENS:
        raise PepImportError(
            "pep_origem invalido. Valores aceitos: " + ", ".join(PEP_ORIGENS) + "."
        )

    campos = data.get("campos")
    if not isinstance(campos, dict):
        raise PepImportError("campos e obrigatorio e deve ser um objeto.")

    conhecidos = set(SINAIS_VITAIS) | set(NOTAS)
    desconhecidos = sorted(str(chave) for chave in campos if chave not in conhecidos)
    if desconhecidos:
        raise PepImportError("campos contem chaves desconhecidas: " + ", ".join(desconhecidos) + ".")

    normalizados = {}
    for chave, limite in [(k, MAX_SINAL_VITAL_CHARS) for k in SINAIS_VITAIS] + [
        (k, MAX_NOTA_CHARS) for k in NOTAS
    ]:
        if chave not in campos:
            continue
        texto = _coerce_text(chave, campos[chave])
        if not texto:
            continue  # campo vazio na tela do PEP: ignora, nao e erro
        if len(texto) > limite:
            raise PepImportError(f"campos.{chave} excede {limite} caracteres.")
        normalizados[chave] = texto

    if not normalizados:
        raise PepImportError("campos nao contem nenhum valor preenchido.")

    return {"pep_origem": origem, "campos": normalizados}


def summarize(normalizado):
    """Resumo do que foi registrado. So nomes de campo: nunca conteudo clinico."""
    campos = normalizado["campos"]
    sinais = [k for k in SINAIS_VITAIS if k in campos]
    notas = [k for k in NOTAS if k in campos]
    return {
        "pep_origem": normalizado["pep_origem"],
        "sinais_vitais": sinais,
        "notas": notas,
        "total": len(sinais) + len(notas),
    }


def format_for_prompt(normalizado, source_url=None):
    """Texto enviado ao historico da consulta / ao Gemini."""
    campos = normalizado["campos"]
    linhas = [f"Dados importados do prontuario ({normalizado['pep_origem']})"]

    if source_url:
        linhas.extend(["", f"Fonte: {source_url}"])

    sinais = [k for k in SINAIS_VITAIS if k in campos]
    if sinais:
        linhas.extend(["", "Sinais vitais:"])
        linhas.extend(f"- {SINAIS_VITAIS[k]}: {campos[k]}" for k in sinais)

    notas = [k for k in NOTAS if k in campos]
    if notas:
        linhas.extend(["", "Notas clinicas:"])
        for k in notas:
            linhas.append(f"{NOTAS[k]}: {campos[k]}")

    return "\n".join(linhas)
