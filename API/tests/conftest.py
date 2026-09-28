"""
Fixtures compartilhadas da suite de testes do backend (B15).

Dois problemas historicos sao resolvidos aqui:

1. `server.py` importa vosk / speech_recognition / numpy no topo do modulo e
   carrega os modelos Vosk na importacao. Como os modelos deixaram de ser
   versionados (B13), o CI nao pode depender deles. Os modulos pesados sao
   substituidos por stubs ANTES de `import server`.

2. Todas as rotas de negocio passaram a exigir JWT (@roles_required), o que
   quebrou 16 testes com 401 (D-17). A fixture `auth_client` injeta um token
   valido; `client` continua anonimo para os testes que verificam 401/403.
"""
from __future__ import annotations

import importlib
import pathlib
import sys
import types

import pytest

# Garante que `API/` esteja no sys.path para resolver `backend.*` e `server`.
_PROJECT_ROOT = pathlib.Path(__file__).resolve().parent.parent
if str(_PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(_PROJECT_ROOT))


# ---------------------------------------------------------------------------
# Stubs dos modulos pesados (audio / IA)
# ---------------------------------------------------------------------------

def _make_stub_speech_recognition() -> types.ModuleType:
    """Substitui `speech_recognition`, que puxa audioop/pyaudio."""
    mod = types.ModuleType("speech_recognition")

    class AudioFile:
        def __init__(self, *args, **kwargs):
            pass

        def __enter__(self):
            return self

        def __exit__(self, *exc):
            return False

    class Recognizer:
        def record(self, source):
            return b""

        def recognize_google(self, audio, language=None):
            return "[stub] transcricao"

    class UnknownValueError(Exception):
        pass

    class RequestError(Exception):
        pass

    mod.AudioFile = AudioFile
    mod.Recognizer = Recognizer
    mod.UnknownValueError = UnknownValueError
    mod.RequestError = RequestError
    return mod


def _make_stub_audio_service() -> types.ModuleType:
    """Substitui `backend.audio_service`, que importa vosk + numpy."""
    mod = types.ModuleType("backend.audio_service")

    class Diarizador:
        def __init__(self, model_path=None, spk_model_path=None):
            self.model_path = model_path
            self.spk_model_path = spk_model_path

        def processar(self, *args, **kwargs):
            return {"dialogue": [], "text": "[stub] sem diarizacao"}

    mod.Diarizador = Diarizador
    return mod


def _make_stub_processador_voz():
    """Substitui o pacote `backend.processador_voz` e seu submodulo."""
    pkg = types.ModuleType("backend.processador_voz")
    pkg.__path__ = []  # sinaliza que e um pacote

    sub = types.ModuleType("backend.processador_voz.processador_voz")

    class TranscritorVoz:
        def __init__(self, *args, **kwargs):
            pass

        def transcrever(self, *args, **kwargs):
            return "[stub] transcricao"

    sub.TranscritorVoz = TranscritorVoz
    pkg.processador_voz = sub
    return pkg, sub


def _make_stub_text_filter() -> types.ModuleType:
    """Substitui `backend.text_filter`, que carrega o modelo spaCy pt."""
    mod = types.ModuleType("backend.text_filter")
    mod.remover_nomes = lambda texto: texto
    mod.retornar_nome = lambda texto: ""
    return mod


def _make_stub_gemini_connection() -> types.ModuleType:
    """Substitui `backend.gemini_connection` para nao chamar a API do Google."""
    mod = types.ModuleType("backend.gemini_connection")

    def send_message(patient_id: str, consultation_id: str, message_text: str) -> str:
        return f"[stubbed AI reply] {message_text}"

    mod.send_message = send_message
    return mod


def _make_stub_pdf_reader() -> types.ModuleType:
    """Substitui `backend.pdf_reader`: le o upload como texto puro."""
    mod = types.ModuleType("backend.pdf_reader")

    def extract_text_from_pdf(file_storage):
        content = getattr(file_storage, "_test_text", None)
        if content is None:
            try:
                content = file_storage.stream.read().decode("utf-8")
            except Exception:
                content = ""
        return content

    mod.extract_text_from_pdf = extract_text_from_pdf
    return mod


# Modulos pesados trocados por stubs durante toda a sessao de testes.
_HEAVY_STUBS = {
    "speech_recognition": _make_stub_speech_recognition,
    "backend.audio_service": _make_stub_audio_service,
    "backend.text_filter": _make_stub_text_filter,
    "backend.gemini_connection": _make_stub_gemini_connection,
    "backend.pdf_reader": _make_stub_pdf_reader,
}

_VOZ_MODULES = (
    "backend.processador_voz",
    "backend.processador_voz.processador_voz",
)


@pytest.fixture(scope="session", autouse=True)
def stub_heavy_modules():
    """
    Instala os stubs no sys.modules antes de qualquer `import server`.

    Escopo de sessao porque `server` e importado uma unica vez: reinstalar os
    stubs por teste nao teria efeito depois que o modulo ja esta em cache.
    """
    # Importa o pacote `backend` DE VERDADE antes de registrar stubs de
    # submodulos. Sem isto, sys.modules teria "backend.pdf_reader" sem ter
    # "backend", e qualquer importlib.reload() nesses submodulos falharia com
    # ImportError: parent 'backend' not in sys.modules - um bug que so aparecia
    # ao rodar um arquivo de teste isolado.
    importlib.import_module("backend")

    originals = {name: sys.modules.get(name) for name in _HEAVY_STUBS}
    originals.update({name: sys.modules.get(name) for name in _VOZ_MODULES})

    for name, factory in _HEAVY_STUBS.items():
        sys.modules[name] = factory()

    voz_pkg, voz_sub = _make_stub_processador_voz()
    sys.modules["backend.processador_voz"] = voz_pkg
    sys.modules["backend.processador_voz.processador_voz"] = voz_sub

    yield

    for name, original in originals.items():
        if original is None:
            sys.modules.pop(name, None)
        else:
            sys.modules[name] = original


# ---------------------------------------------------------------------------
# Ambiente e isolamento de dados
# ---------------------------------------------------------------------------

@pytest.fixture()
def real_module():
    """
    Carrega a implementacao REAL de um modulo que esta stubado na sessao.

    `test_pdf_reader` e `test_text_filter` testam o codigo de verdade (com
    PyPDF2/spaCy falsos injetados), entao precisam sair da sombra dos stubs.
    O stub e restaurado no teardown para nao vazar para os testes seguintes -
    `server` guarda a referencia ao objeto modulo desde a importacao, e deixar
    o modulo real no lugar mudaria o comportamento de outros testes.
    """
    swapped: dict[str, object] = {}

    def _load(name: str):
        swapped[name] = sys.modules.pop(name, None)
        module = importlib.import_module(name)
        return importlib.reload(module)

    yield _load

    for name, original in swapped.items():
        if original is None:
            sys.modules.pop(name, None)
        else:
            sys.modules[name] = original


@pytest.fixture(autouse=True)
def env_for_config(monkeypatch):
    """
    Variaveis minimas para importar `backend.config` de forma deterministica.

    Definidas como env vars reais porque o pydantic-settings da precedencia ao
    ambiente sobre o `env_file` - assim um API/.env local do desenvolvedor nao
    contamina o resultado dos testes.
    """
    monkeypatch.setenv("DB_URL", "sqlite:///test.db")
    monkeypatch.setenv("APP_TITLE", "Test App")
    monkeypatch.setenv("GEMINI_API_KEY", "dummy-key")
    monkeypatch.setenv("AUTH_SECRET_KEY", "test-secret-key")
    monkeypatch.setenv("CORS_ORIGINS", "*")
    yield


@pytest.fixture()
def temp_db_file(tmp_path, monkeypatch):
    """
    Redireciona o banco JSON de pacientes para um arquivo temporario por teste.

    Evita que a suite leia ou sobrescreva o backend/patients_db.json real.
    """
    from backend import patient_db

    temp_file = tmp_path / "patients_db_test.json"
    if temp_file.exists():
        temp_file.unlink()
    monkeypatch.setattr(patient_db, "DB_FILE", str(temp_file), raising=True)
    return str(temp_file)


@pytest.fixture()
def temp_users_db(tmp_path, monkeypatch):
    """Isola tambem a base de usuarios, usada pelo bootstrap do admin."""
    from backend import auth_service

    users_file = tmp_path / "users_db_test.json"
    monkeypatch.setattr(auth_service, "USERS_DB_FILE", str(users_file), raising=True)
    return str(users_file)


# ---------------------------------------------------------------------------
# Aplicacao Flask e clientes HTTP
# ---------------------------------------------------------------------------

@pytest.fixture()
def flask_app(stub_heavy_modules, temp_db_file, temp_users_db):
    """Importa `server` ja com os stubs instalados e devolve o app Flask."""
    server = importlib.import_module("server")
    server.app.config.update(TESTING=True)
    return server.app


@pytest.fixture()
def client(flask_app):
    """Cliente HTTP ANONIMO - usado nos testes que esperam 401/403."""
    return flask_app.test_client()


# Token ficticio aceito apenas pelo `fake_get_user_from_token` abaixo.
TEST_TOKEN = "test-valid-token"


def _fake_user(profile: str) -> dict:
    return {
        "id": "user-test-1",
        "email": "doctor@example.com",
        "name": "Doctor Test",
        "profiles": [profile],
        "active": True,
    }


@pytest.fixture()
def auth_headers(monkeypatch):
    """
    Fabrica de cabecalhos autenticados: `auth_headers(profile="medico")`.

    Faz o patch em `backend.auth_decorators.get_user_from_token` - o nome ja
    importado pelo decorador. Aplicar o patch em `auth_service` nao teria
    efeito, porque o decorador guarda a referencia direta a funcao (esse era um
    dos "alvos de patch" incorretos citados na D-17).
    """
    from backend import auth_decorators

    def _factory(profile: str = "administrador", token: str = TEST_TOKEN):
        def fake_get_user_from_token(received_token):
            if received_token != token:
                raise auth_decorators.AuthError("Token invalido", 401)
            return _fake_user(profile), {"profile": profile}

        monkeypatch.setattr(
            auth_decorators, "get_user_from_token", fake_get_user_from_token
        )
        return {"Authorization": f"Bearer {token}"}

    return _factory


class _AuthenticatedClient:
    """Encaminha ao test_client do Flask mesclando o header Authorization."""

    def __init__(self, inner, default_headers):
        self._inner = inner
        self._default_headers = default_headers

    def _merge(self, kwargs):
        merged = dict(self._default_headers)
        merged.update(kwargs.get("headers") or {})
        kwargs["headers"] = merged
        return kwargs

    def get(self, *a, **kw):
        return self._inner.get(*a, **self._merge(kw))

    def post(self, *a, **kw):
        return self._inner.post(*a, **self._merge(kw))

    def put(self, *a, **kw):
        return self._inner.put(*a, **self._merge(kw))

    def patch(self, *a, **kw):
        return self._inner.patch(*a, **self._merge(kw))

    def delete(self, *a, **kw):
        return self._inner.delete(*a, **self._merge(kw))


@pytest.fixture()
def auth_client(flask_app, auth_headers):
    """
    Cliente HTTP autenticado como `administrador` (padrao).

    O perfil administrador e proposital: `patient_belongs_to_current_user`
    libera qualquer paciente para admin, enquanto `medico` so enxerga pacientes
    cujo `doctor_id` seja o seu. Como a maioria dos testes cria pacientes
    direto via patient_db (sem doctor_id), usar `medico` devolveria 403 - o
    mesmo sintoma da D-24.
    """
    return _AuthenticatedClient(flask_app.test_client(), auth_headers("administrador"))
