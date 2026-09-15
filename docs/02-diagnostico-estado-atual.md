# 02 — Diagnóstico do estado atual (base v3.0, branch `develop` da Equipe 6)

Auditoria feita em 15/09/2026 sobre o clone do repositório `Jamuelton/copilot_medico_grupo_6_es` (branch `develop`, último commit 01/12/2025) e sobre a extensão privada v2.3. Cada achado tem um ID (`D‑nn`) referenciado no backlog.

## 1. Inventário rápido

| Componente | Tecnologia | Tamanho | Estado |
|---|---|---|---|
| Backend | Python 3.11, Flask 3.0.3, google‑generativeai, spaCy `pt_core_news_lg`, PyPDF2, SpeechRecognition, Vosk, numpy | 1.826 linhas (sem testes) | Roda localmente; sem auth; sem CI |
| Banco | Arquivo `patients_db.json` | — | Único arquivo, reescrito inteiro a cada operação |
| Testes | unittest + pytest, 7 arquivos | 532 linhas | Não executados em CI; alvos de `patch` inconsistentes (`server.` vs `API.server.`) |
| Frontend | React 18 + TypeScript + Vite 5, react‑markdown, lucide/phosphor icons | 2.838 linhas | `App.tsx` com ~1.750 linhas concentra toda a lógica |
| Extensão | Manifest V3, popup `index.html`, `content.js`, `background.js` | — | Content script em `<all_urls>` |
| Infra | Dockerfile API (python:3.11‑slim + spaCy), Dockerfile front (nginx), docker‑compose | — | Front em nginx não serve extensão; só o backend é útil |
| CI | GitHub Actions `construir_frontend.yml` | — | Só `npm ci && npm run build` + zip do `dist` |
| Modelos | `vosk-model-small-pt-0.3` (52 MB) e `vosk-model-spk-0.4` (15 MB) | 67 MB | Commitados no git |
| Docs | `Requisitos.md` (jun/2025), PDF de arquitetura, 3 diagramas | — | Desatualizados em relação à v3.0 |

## 2. Rotas do backend (v3.0)

| Método | Rota | Função | Observação |
|---|---|---|---|
| POST | `/api/transcribe_audio` | Recebe WAV + `patient_id` + `consultation_id`; diariza (Vosk+Google) ou transcreve simples; grava `transcription_log` | Depende da API Google não oficial |
| GET | `/api/patients/<id>/transcription-log` | Lista transcrições do paciente | |
| GET | `/api/patient-exists/<id>` | Verifica ID | |
| POST | `/api/patients` | Cria paciente (UUID) + "Primeira Consulta" | Guarda **nome real** no JSON |
| POST | `/api/chat` | Mensagem → `remover_nomes` → Gemini com histórico da consulta | Cria paciente/consulta se faltarem IDs |
| POST | `/api/upload-pdf` | PyPDF2 → `remover_nomes` → Gemini | |
| GET/POST | `/api/patients/<id>/consultations` | Lista / cria consulta, com importação de históricos anteriores | |
| GET | `/api/patients/<id>/consultations/<cid>/history` | Histórico de chat | |
| GET | `/api/all-patients` | Lista id+nome | |
| POST | `/api/recommendations` | Prompt de `recommendations.txt` sobre a consulta | |

**Ausente:** `/api/extracted-data` — chamada por `App.tsx:677` (`handleSendExtractedDataToServer`) e por `public/background.js:17`, existia na v1.0 e sumiu na reescrita de 05/05/2025.

## 3. Achados

### Funcionais / regressões

- **D‑01 (crítico) — Extração do Amplimed quebrada desde a v2.0.** A extensão envia os campos raspados para `/api/extracted-data`, rota que não existe nem na Equipe 4 nem na Equipe 6. O botão "Extrair dados" devolve erro. Os vídeos mostram a extração funcionando porque a demo da v1 usava a rota antiga. Além disso, os seletores usados em `handleExtractAndSend` (`.editable-notes`, `.create-input`) não são os mesmos do `content.js` (`.note-editable[role="textbox"]`, `input[f_prontuario=...]`); há duas implementações divergentes.
- **D‑02 — Botão flutuante comentado** (`content.js`, commit de 10/11/2025). O requisito US005‑CA001 deixou de ser atendido.
- **D‑03 — `MODO_TESTE_SOZINHO = True`** em `audio_service.py`: em produção a diarização alterna falantes a cada bloco em vez de comparar vetores de voz. O README diz que o padrão é `False`.
- **D‑04 — Transcrição depende de `recognize_google`** (endpoint gratuito e não documentado do Google, sem SLA, sem chave, com limite de tamanho por requisição). É a principal causa de falhas e do fallback para o Vosk small (qualidade baixa em PT‑BR).
- **D‑05 — `audioop` foi removido no Python 3.13.** `audio_service.py` importa `audioop`; só roda em ≤ 3.12. O Dockerfile pina 3.11, mas o README não avisa.
- **D‑06 — `gemini_connection.py` recria o modelo e a sessão a cada mensagem** e usa `gemini-flash-latest` via SDK `google-generativeai`, que a Google marcou como legado em favor de `google-genai`.
- **D‑07 — Prompt do sistema** (`Co-Pilot_medico.txt`) mistura português e inglês ("Final Question: Please select…", template "Patient Data / Chief Complaint"), pede **referências PubMed com link** (o modelo inventa DOIs/links — risco de alucinação em contexto clínico) e pede percentuais de probabilidade sem base.
- **D‑08 — Código morto:** `worker.py` (RabbitMQ), `audio_listener.py` (sounddevice no servidor), `config.py` (pydantic‑settings nunca importado), `Form/index.tsx` (placeholder), `manifest_modified.json`, `patient_data.txt`, `get_patient_chat_history`/`add_message_to_history` (legado).
- **D‑09 — `server.py` pré‑popula o banco com "João Silva"** a cada inicialização.

### Dados e privacidade

- **D‑10 (crítico) — Banco em arquivo JSON:** sem transações, sem concorrência (dois médicos = corrupção), reescrito inteiro a cada mensagem, sem backup, guarda **nome do paciente em texto claro** junto de todo o histórico clínico. Contradiz US007‑CA003 ("não persiste dados sensíveis").
- **D‑11 (crítico) — Anonimização insuficiente.** `remover_nomes` remove apenas entidades `PER` do spaCy (e faz `replace` da string em todo o texto, apagando também palavras coincidentes). CPF, telefone, e‑mail, endereço, data de nascimento, número de prontuário e nomes que o NER não pega passam para o Gemini. `retornar_nome` está quebrada (sempre retorna o último nome). Não há pseudonimização reversível, então o médico perde a referência.
- **D‑12 — Sem consentimento para gravação.** US008‑CA001 declarou o consentimento "fora do escopo do software". Para uso real, o registro do consentimento precisa existir (LGPD art. 7º e 11).
- **D‑13 — Áudio temporário** salvo em `tempfile` e removido — correto — mas a transcrição completa (com nomes, se ditos) fica no JSON.

### Segurança

- **D‑14 (crítico) — API sem autenticação e `CORS(app)` aberto.** Qualquer página pode chamar `localhost:3001` e ler todos os pacientes (`/api/all-patients`).
- **D‑15 — Content script injetado em `<all_urls>` com `all_frames: true`.** A extensão roda em todos os sites, incluindo internet banking. Deve ser restrito aos domínios dos PEPs suportados.
- **D‑16 — Chave Gemini** via variável de ambiente (ok), mas `.env` de exemplo ausente e instruções pedem "variável de usuário do Windows".

### Engenharia

- **D‑17 — Testes não rodam em CI** e parte deles está quebrada por caminhos de `patch` inconsistentes. Nenhum teste de front.
- **D‑18 — `App.tsx` monolítico** (~1.750 linhas, 15+ `useState`, três modais, gravação, chat, debug). Difícil de testar e de dividir entre devs.
- **D‑19 — Modelos Vosk (67 MB) commitados.** Clone lento; deveriam ser baixados por script.
- **D‑20 — Docs desatualizados:** `Requisitos.md` para na v2.0; diagramas de classes só cobrem áudio; README com passos manuais ("pip install requirements.txt" sem `-r`).
- **D‑21 — Dois repositórios, dois owners** (`J-Eduardo25`, `Jamuelton`), nenhum é organização. Cada equipe forka e o histórico se fragmenta.

## 4. O que funciona e deve ser preservado

- Estrutura extensão ⇄ Flask ⇄ Gemini: simples, ensinável, já conhecida por três turmas.
- Modelo de dados lógico *paciente → consultas → histórico + transcrições*: correto, só precisa sair do JSON.
- Sessão de chat com `system_instruction` + histórico por consulta.
- Fluxo de gravação no navegador (`MediaRecorder` → WAV) e a ideia da diarização com papel Médico/Paciente.
- Rota de recomendações como "segundo olhar" durante a consulta.
- Dockerfile do backend.
- Base de testes (a ser consertada).
- Documento de requisitos com estórias e critérios de aceite — manter o formato e a numeração.

## 5. Trilha privada (ext v2.3) — observações para o cliente

Não é escopo da equipe, mas afeta decisões:

- **Backend desativado** (`402 DEPLOYMENT_DISABLED` em `copilot-medico.vercel.app`). Sem ele a extensão não faz login real, não transcreve nem gera SOAP.
- **`background.js` busca a chave Groq em `GET /api/health`** (`health.groq_key`) como fallback — se o backend voltar assim, a chave fica pública para qualquer um que chame o health check. Deve ser removido antes de reativar.
- `content.js` referencia `ConsultationGuide`, classe que não existe em nenhum arquivo (feature morta).
- Login "demo" grava um usuário fictício sem senha — ok para demo, perigoso em produção.
- Boas ideias a reaproveitar: `formatSoapForPEP` (formato por sistema), `detectInjectableFields`/`injectTextIntoPEP` (escrita no campo de evolução), `AUTO` (detecção de silêncio 5 s aviso / 10 s parada), cache + fila offline.

## 6. Ordem de ataque sugerida

1. D‑01, D‑14, D‑17, D‑08, D‑19, D‑05 → Sprint 1 (base estável).
2. D‑10, D‑11, D‑16 → Sprint 2 (dados e identidade).
3. D‑03, D‑04, D‑12, D‑13 → Sprint 3 (áudio confiável).
4. D‑06, D‑07 → Sprint 4 (SOAP estruturado).
5. D‑02, D‑15 → Sprint 5 (adaptador PEP).
6. D‑18, D‑20, D‑21 → contínuo, fechando na Sprint 7.
