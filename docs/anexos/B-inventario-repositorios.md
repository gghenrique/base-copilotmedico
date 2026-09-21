# Anexo B — Inventário técnico dos repositórios

Levantado em 15/09/2026 com clone raso (`--depth 50`) dos dois repositórios e leitura da extensão privada.

## 1. Números

| | Equipe 4 (`main`) | Equipe 6 (`develop`) | Ext. privada v2.3 |
|---|---|---|---|
| Commits | 59 | 125 (inclui os 59) | — (sem git) |
| Período | 27/04 → 17/08/2025 | 27/04 → 01/12/2025 | arquivos de 01–02/04/2026 |
| Contribuidores | 9 | 17 acumulados (8 novos) | 1 |
| Backend Python (sem testes) | 768 linhas | 1.826 linhas | — (backend em Vercel, não disponível) |
| Testes Python | 0 | 532 linhas (7 arquivos) | — |
| Front TS/TSX/JS/CSS | 1.532 linhas | 2.838 linhas | 6.567 linhas (JS puro) |
| Modelos binários no git | Vosk small‑pt (52 MB) | + Vosk spk (15 MB) | — |
| CI | build do front | build do front | — |
| Docker | não | API + front (nginx) + compose | — |
| Docs | Requisitos.md, PDF arquitetura | + 3 diagramas | — |

## 2. Árvore relevante — Equipe 6 `develop`

```
API/
  server.py                 (10 rotas Flask, pré-popula "João Silva")
  requirements.txt          Flask==3.0.3, google-generativeai, spacy, PyPDF2, Flask-Cors,
                            python-dotenv, SpeechRecognition, numpy, python3-pika, vosk
  Dockerfile                python:3.11-slim + spacy pt_core_news_lg, porta 3001
  recommendations.txt       prompt de recomendações
  backend/
    gemini_connection.py    send_message(patient_id, consultation_id, text) — recria modelo a cada chamada
    text_filter.py          remover_nomes() (spaCy PER), retornar_nome() (quebrada)
    patient_db.py           CRUD sobre patients_db.json (pacientes, consultas, histórico, transcription_log)
    pdf_reader.py           PyPDF2
    audio_service.py        classe Diarizador (Vosk + SpkModel + Google SR), MODO_TESTE_SOZINHO = True
    processador_voz/        CapturaAudio, TranscritorVoz (recognize_google), ConstrutorContexto
    audio_listener.py       protótipo microfone do servidor (sounddevice) — morto
    worker.py               consumidor RabbitMQ — morto
    config.py               pydantic-settings — não importado
    Co-Pilot_medico.txt     system prompt (PT/EN misturados)
    patients_db.json        banco
    vosk-model-small-pt-0.3/, vosk-model-spk-0.4/
  tests/
    conftest.py, test_config.py, test_patient_db.py, test_pdf_reader.py,
    test_server.py, test_server_api.py, test_text_filter.py, output.wav
front/copmed-extension/
  package.json              react 18.3, vite 5.4, typescript 5.5, react-markdown, lucide, phosphor
  public/manifest.json      MV3, permissions: scripting, activeTab, storage; host: localhost:3001;
                            content_scripts em <all_urls>, all_frames
  public/content.js         extração Amplimed (input[f_prontuario=…], .note-editable) + botão flutuante comentado
  public/background.js      SEND_COMBINED_DATA → POST /api/extracted-data (rota inexistente)
  src/App.tsx               ~1.750 linhas: pacientes, consultas, chat, PDF, extração, debug de seletor,
                            gravação (MediaRecorder → WAV), log de transcrições, import de histórico
  src/modules/Chat/         chat.tsx (react-markdown), Notification.tsx
  src/utils/utils.ts        executeScriptOnActiveTab, executeArbitraryScriptOnActiveTab
documents/
  Requisitos.md, Documento de arquitetura.pdf, Documento de arquitetura(1).PDF,
  Diagrama de Arquitetura (Forma Livre) do Sistema.jpg,
  Diagrama de Classes Planejado para a Funcionalidade de Áudio.jpg,
  Diagrama de Classes da Funcionalidade de Áudio Implementada.png
docker-compose.yml          backend:3001 (env GEMINI_API_KEY), frontend nginx:8080
.github/workflows/construir_frontend.yml
```

## 3. Rotas do backend (v3.0) e quem as chama

| Rota | Chamada por |
|---|---|
| `POST /api/transcribe_audio` | `App.tsx:968` |
| `GET /api/patients/<id>/transcription-log` | `App.tsx:857` |
| `GET /api/patient-exists/<id>` | testes |
| `POST /api/patients` | `App.tsx:372` |
| `POST /api/chat` | `App.tsx:243` |
| `POST /api/upload-pdf` | `App.tsx:317` |
| `GET/POST /api/patients/<id>/consultations` | `App.tsx:162,424,443,575` |
| `GET /api/patients/<id>/consultations/<cid>/history` | `App.tsx:100` |
| `GET /api/all-patients` | `App.tsx:147` |
| `POST /api/recommendations` | (sem chamada encontrada no front) |
| `POST /api/extracted-data` | `App.tsx:677`, `background.js:17` — **rota não existe** |

## 4. Diagrama de arquitetura da Equipe 6 (transcrito)

Frontend (extensão): Usuário → UI; Content → Background → **API REST** do Backend (Servidor Python) → Lógica de Negócio → {Conexão Gemini, Processador de Voz, Leitor de PDF, Gerenciador de Pacientes} → `patients_db.json`; Serviços externos: Google Gemini.

## 5. Contribuidores por ciclo

**Equipe 4 (2025.1):** AdelmoABNeto, João Eduardo M. de Freitas, Nielso Júnior, jonatasalex, João Batista de Aguiar Júnior, Gaiutuz, fabiodof.
**Equipe 6 (2025.2):** Lucas Rafael Leite, Ana Laura, Jamuelton, GabriPoli, Francisco Marcelo de Barros Maciel, GabrielsLeal04.
**Equipe 3 (2024.2):** não identificados no git (código herdado no primeiro commit da Equipe 4, autor João Eduardo Freitas).

## 6. Extensão privada v2.3 — mapa

| Arquivo | Linhas | Conteúdo |
|---|---|---|
| `manifest.json` | 47 | MV3 v2.3.0; permissões activeTab, storage, tabs, scripting, alarms, identity; hosts: vercel.app, supabase.co, api.groq.com, localhost; content em `<all_urls>`; oauth2 client_id |
| `background.js` | 907 | Roteador de mensagens (30 tipos); OAuth Google→Supabase; `apiRequest` com JWT; transcrição via `/api/transcription` com fallback direto Groq (chave vinda de `/api/health`); SOAP cache (20); fila offline (50); badge; alarmes (timeout 120 min, sync 15 min) |
| `content.js` | 3.416 | Sidebar 4 abas; gravação `MediaRecorder` webm/opus; `PEP_SCRAPERS` (tasy, mv, siss, esus_pec, iclinic, shosp, amplimed, doctoralia, pixeon, generic); `detectInjectableFields`/`injectTextIntoPEP`; `formatSoapForPEP` (8 formatos); `AUTO` (widget flutuante, auto‑detecção de paciente, silêncio 5 s/10 s); botão flutuante "Colar SOAP"; referência a `ConsultationGuide` inexistente |
| `popup.js` | 470 | Status do app (HEAD health), detecção de PEP na aba, lista dos 5 últimos SOAPs, colar SOAP, sync, login demo/Google, dashboard |
| `popup.html` | 607 | UI do popup |
| `sidebar.css` | 1.120 | Estilos da sidebar |

Estado em 15/09/2026: `https://copilot-medico.vercel.app/api/health` → `HTTP 402 Payment required — DEPLOYMENT_DISABLED`.

## 5. Repositório do Grupo 2 (2026.1) — adicionado em 20/09/2026

`https://github.com/qleticia/copilot_medico_grupo_2_es` (fork público da base da Equipe 6, branch `main`).

| | Valor |
|---|---|
| Commits do grupo | 24 (05/07 → 14/07/2026), 8 identidades git, 6 pessoas com commits |
| Delta sobre a v3.0 | 37 arquivos, +4.570 / −362 linhas |
| Backend Python | `server.py` 581 → 1.070 linhas; `auth_service.py` 521; `patient_db.py` +177 |
| Web app | `front/copmed-web` — React 18 + Vite 5, JavaScript, ~1.900 linhas, sem testes |
| Extensão | `App.tsx` 1.752 → 1.972; `services/api.ts` 168; `background.js` reescrito |
| Testes Python | +283 linhas (12 casos novos); 16 casos da suíte quebram por 401 |
| CI | idêntico à v3.0 (só builda a extensão) |
| Segredos na história | `api-key.txt` (herdado da Equipe 4) — por isso só a **árvore final** foi integrada em `ruypontes/copilot-medico`, com co‑autoria dos 7 committers, e não o histórico |
| Docs | README reescrito; `front/copmed-web/README.md`; PDF de 12 páginas (anexo C); `Requisitos.md` intocado |
