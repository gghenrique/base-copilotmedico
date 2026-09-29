import json
import os
import uuid
from datetime import datetime

from .config import settings

# Lido de PATIENTS_DB_FILE (ver .env.example); o default mantem o caminho
# historico backend/patients_db.json para quem roda fora do Docker.
DB_FILE = settings.patients_db_file

def _now_iso():
    return datetime.now().isoformat()

def _empty_patient_record(patient_id, name=None, doctor_id=None, created_by=None):
    return {
        "id": patient_id,
        "name": name if name else "Desconhecido",
        "doctor_id": doctor_id,
        "created_by": created_by,
        "created_at": _now_iso(),
        "consultations": [],
        "chat_history": [],
        "extension_data": [],
        "transcription_log": [],
    }

def normalize_patient_record(patient_id, patient_data):
    """
    Garante que pacientes novos e legados tenham as chaves esperadas.
    Pacientes antigos sem doctor_id continuam sem medico vinculado.
    """
    if not isinstance(patient_data, dict):
        patient_data = {}

    patient_data.setdefault("id", patient_id)
    patient_data.setdefault("name", f"Paciente {patient_id[:8]}")
    patient_data.setdefault("doctor_id", None)
    patient_data.setdefault("created_by", None)
    patient_data.setdefault("created_at", None)

    if not isinstance(patient_data.get("consultations"), list):
        patient_data["consultations"] = []
    if not isinstance(patient_data.get("chat_history"), list):
        patient_data["chat_history"] = []
    if not isinstance(patient_data.get("extension_data"), list):
        patient_data["extension_data"] = []
    if not isinstance(patient_data.get("transcription_log"), list):
        patient_data["transcription_log"] = []

    return patient_data

def load_database():
    """
    Carrega o banco de dados JSON do arquivo.
    Retorna um dicionário vazio se o arquivo não existir, estiver vazio ou for inválido.
    """
    if not os.path.exists(DB_FILE):
        return {}
    try:
        with open(DB_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
            if not isinstance(data, dict):
                return {}
            return {
                patient_id: normalize_patient_record(patient_id, patient_data)
                for patient_id, patient_data in data.items()
            }
    except (IOError, json.JSONDecodeError):
        # Em caso de erro de leitura ou JSON malformado, retorna um dicionário vazio
        # Isso evita que a aplicação trave, mas pode significar perda de dados se o arquivo estiver corrompido.
        print(f"Aviso: Não foi possível carregar o banco de dados de {DB_FILE}. Criando um novo.")
        return {} 

def save_database(db_data):
    """
    Salva o banco de dados JSON no arquivo.
    """
    try:
        # Garante o diretorio: com PATIENTS_DB_FILE apontando para um volume
        # (ex.: /app/data/patients_db.json), a pasta pode nao existir ainda.
        directory = os.path.dirname(DB_FILE)
        if directory:
            os.makedirs(directory, exist_ok=True)
        with open(DB_FILE, 'w', encoding='utf-8') as f:
            json.dump(db_data, f, ensure_ascii=False, indent=2)
    except IOError:
        print(f"Erro: Não foi possível salvar o banco de dados em {DB_FILE}")

def generate_patient_id():
    """
    Gera um ID de paciente único usando UUID (Universally Unique Identifier).
    """
    return str(uuid.uuid4())

def get_patient_data(patient_id):
    """
    Recupera todos os dados de um paciente específico pelo seu ID.
    Retorna None se o paciente não for encontrado.
    """
    db = load_database()
    return db.get(patient_id)

def get_all_patients_info(doctor_id=None, include_unassigned=True):
    """
    Retorna uma lista de dicionários, cada um contendo o 'id' e o 'name'
    de todos os pacientes registrados no banco de dados.
    """
    db = load_database()
    patients_list = []
    for patient_id, patient_data in db.items():
        patient_data = normalize_patient_record(patient_id, patient_data)
        patient_doctor_id = patient_data.get("doctor_id")
        if doctor_id is not None and patient_doctor_id != doctor_id:
            continue
        if doctor_id is None and not include_unassigned and patient_doctor_id is None:
            continue
        patients_list.append({
            "id": patient_id,
            # Usa o nome do paciente ou um fallback se o nome não estiver disponível
            "name": patient_data.get("name", f"Paciente {patient_id[:8]}"),
            "doctor_id": patient_doctor_id,
            "created_by": patient_data.get("created_by"),
            "created_at": patient_data.get("created_at"),
        })
    return patients_list

def ensure_patient_exists(patient_id, name=None, doctor_id=None, created_by=None):
    """
    Verifica se um paciente com o given `patient_id` existe no banco de dados.
    Se não existir, uma nova entrada para o paciente é criada com o nome fornecido (ou "Desconhecido").
    Se o paciente existir e o nome for "Desconhecido", e um novo nome for fornecido, ele é atualizado.
    Retorna os dados completos do paciente (existente ou recém-criado).
    """
    db = load_database()
    patient_data = db.get(patient_id)

    if not patient_data:
        # Paciente não existe, cria um novo
        patient_data = _empty_patient_record(patient_id, name, doctor_id, created_by)
        db[patient_id] = patient_data
        save_database(db)
    else:
        patient_data = normalize_patient_record(patient_id, patient_data)
        changed = False
        if doctor_id is not None and patient_data.get("doctor_id") is None:
            patient_data["doctor_id"] = doctor_id
            changed = True
        if created_by is not None and patient_data.get("created_by") is None:
            patient_data["created_by"] = created_by
            changed = True
        db[patient_id] = patient_data
        if changed:
            save_database(db)

    if name and patient_data.get("name", "Desconhecido") == "Desconhecido":
        patient_data["name"] = name
        db[patient_id] = patient_data
        save_database(db)

    return db[patient_id]


def add_consultation_to_patient(patient_id: str, consultation_title: str = None, consultation_date: str = None, initial_history: list[dict] = None):
    """
    Adiciona uma nova consulta a um paciente existente.
    Cria uma nova consulta com um ID único.
    Permite fornecer um 'initial_history' que será o chat_history inicial desta consulta.
    Se 'initial_history' não for fornecido, a consulta começa com um histórico vazio.
    Retorna o ID da nova consulta.
    """
    db = load_database()
    patient_data = db.get(patient_id)

    if not patient_data:
        print(f"Erro: Paciente {patient_id} não encontrado para adicionar consulta.")
        return None

    consultation_id = str(uuid.uuid4())
    new_consultation = {
        "id": consultation_id,
        "title": consultation_title if consultation_title else f"Consulta em {datetime.now().strftime('%Y-%m-%d %H:%M')}",
        "date": consultation_date if consultation_date else datetime.now().isoformat(),
        # Se initial_history for fornecido, usa-o; caso contrário, inicia com uma lista vazia.
        "chat_history": initial_history if initial_history is not None else [] 
    }
    
    # Garante que a chave 'consultations' exista para o paciente
    if "consultations" not in patient_data:
        patient_data["consultations"] = []
    
    patient_data["consultations"].append(new_consultation)
    save_database(db)
    return consultation_id

def get_patient_consultations(patient_id: str) -> list[dict]:
    """
    Retorna a lista de todas as consultas associadas a um paciente.
    Retorna uma lista vazia se o paciente não tiver consultas ou não existir.
    """
    patient_data = get_patient_data(patient_id)
    if patient_data:
        return patient_data.get("consultations", [])
    return []

def get_consultation_chat_history(patient_id: str, consultation_id: str) -> list[dict]:
    """
    Recupera o histórico de chat de uma consulta específica de um paciente.
    Retorna uma lista vazia se a consulta ou o paciente não forem encontrados.
    """
    patient_data = get_patient_data(patient_id)
    if patient_data and "consultations" in patient_data:
        for consultation in patient_data["consultations"]:
            if consultation["id"] == consultation_id:
                return consultation.get("chat_history", [])
    return []

def consultation_belongs_to_patient(patient_id: str, consultation_id: str) -> bool:
    """
    Verifica se uma consulta pertence ao paciente informado.
    """
    if not consultation_id:
        return False

    patient_data = get_patient_data(patient_id)
    if not patient_data:
        return False

    return any(
        consultation.get("id") == consultation_id
        for consultation in patient_data.get("consultations", [])
    )

def find_patient_id_by_consultation(consultation_id: str):
    """
    Devolve o id do paciente dono da consulta, ou None se ela nao existir.
    (O banco JSON e indexado por paciente; a B19 troca isto por uma consulta SQL.)
    """
    if not isinstance(consultation_id, str) or not consultation_id:
        return None

    for patient_id, patient_data in load_database().items():
        for consultation in patient_data.get("consultations", []):
            if consultation.get("id") == consultation_id:
                return patient_id
    return None

def add_message_to_consultation_history(patient_id: str, consultation_id: str, role: str, text: str):
    """
    Adiciona uma nova mensagem (do usuário ou do modelo) ao histórico de chat
    de uma consulta específica de um paciente.
    """
    db = load_database()
    patient_data = db.get(patient_id)

    if not patient_data or "consultations" not in patient_data:
        print(f"Erro: Paciente {patient_id} ou suas consultas não encontradas para adicionar mensagem.")
        return

    consultation_found = False
    for consultation in patient_data["consultations"]:
        if consultation["id"] == consultation_id:
            message_parts_for_gemini = [{'text': text}]
            consultation["chat_history"].append({
                "role": role,
                "parts": message_parts_for_gemini,
                "timestamp": datetime.now().isoformat()
            })
            consultation_found = True
            break
    
    if consultation_found:
        save_database(db)
    else:
        print(f"Erro: Consulta {consultation_id} não encontrada para o paciente {patient_id}.")



def add_extension_data_to_patient(
    patient_id: str,
    content,
    consultation_id: str = None,
    source_url: str = None,
    created_at: str = None,
    entry_type: str = "extracted_data",
    extra: dict = None,
):
    """
    Salva dados estruturados capturados pela extensao dentro do registro do paciente.

    `entry_type` diferencia o formato livre legado ("extracted_data") do contrato
    tipado ("pep_import"); `extra` acrescenta campos de primeiro nivel ao item
    (ex.: pep_origem) sem poder sobrescrever os campos reservados.
    """
    db = load_database()
    patient_data = db.get(patient_id)

    if not patient_data:
        print(f"Erro: Paciente {patient_id} nao encontrado para salvar dados da extensao.")
        return None

    if "extension_data" not in patient_data or not isinstance(patient_data.get("extension_data"), list):
        patient_data["extension_data"] = []

    entry_created_at = created_at if isinstance(created_at, str) and created_at.strip() else datetime.now().isoformat()
    entry = {
        "id": str(uuid.uuid4()),
        "patient_id": patient_id,
        "consultation_id": consultation_id,
        "source": "extension",
        "source_url": source_url,
        "type": entry_type,
        "content": content,
        "created_at": entry_created_at,
        "timestamp": entry_created_at,
    }
    for key, value in (extra or {}).items():
        entry.setdefault(key, value)

    patient_data["extension_data"].insert(0, entry)
    save_database(db)
    return entry


def get_patient_extension_data(patient_id):
    """
    Recupera dados estruturados capturados pela extensao para um paciente.
    """
    patient_data = get_patient_data(patient_id)

    if patient_data and isinstance(patient_data.get("extension_data"), list):
        return patient_data["extension_data"]

    return []


def add_transcription_log_to_patient(
    patient_id,
    consultation_id,
    text,
    duration_seconds,
    dialogue=None,
    source="extension",
    created_at=None,
    audio_metadata=None,
):
    """
    Salva uma transcrição no histórico exclusivo de transcrições do paciente.

    Args:
        patient_id (str): ID do paciente.
        consultation_id (str): ID da consulta.
        text (str): Texto corrido da transcrição.
        duration_seconds (float): Duração do áudio em segundos.
        dialogue (list, optional): Lista estruturada do diálogo (diarização) para renderizar chat.
    """
    db = load_database()
    patient_data = db.get(patient_id)

    if not patient_data:
        print(f"Erro: Paciente {patient_id} não encontrado para salvar log de transcrição.")
        return None

    # Garante que a lista existe
    if "transcription_log" not in patient_data:
        patient_data["transcription_log"] = []

    # Formatação da duração (ex: 125s -> "2:05")
    mins = int(duration_seconds // 60)
    secs = int(duration_seconds % 60)
    duration_fmt = f"{mins}:{secs:02d}"

    entry_created_at = created_at if isinstance(created_at, str) and created_at.strip() else datetime.now().isoformat()
    log_entry = {
        "id": str(uuid.uuid4()),
        "patient_id": patient_id,
        "consultation_id": consultation_id,
        "source": source,
        "type": "transcription",
        "text": text,  # Texto corrido (fallback)
        "dialogue": dialogue,  # NOVA CAMPO: Estrutura rica (Médico/Paciente)
        "duration": duration_fmt,
        "audio": audio_metadata if audio_metadata is not None else {"persisted": False},
        "created_at": entry_created_at,
        "timestamp": entry_created_at
    }

    # Adiciona no início da lista (mais recente primeiro)
    patient_data["transcription_log"].insert(0, log_entry)

    save_database(db)
    return log_entry


def get_patient_transcription_log(patient_id):
    """
    Recupera apenas a lista 'transcription_log' do JSON do paciente.
    Retorna uma lista vazia se não houver logs ou se o paciente não tiver essa chave.
    """
    patient_data = get_patient_data(patient_id)

    if patient_data and "transcription_log" in patient_data:
        return patient_data["transcription_log"]

    return []
