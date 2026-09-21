# 05 — Arquitetura alvo da v5.0 e decisões (ADRs)

## 1. Visão de contexto

```mermaid
flowchart LR
    M[Médico] -->|usa| EXT[Extensão Chrome<br/>React + TS]
    EXT -->|lê / escreve DOM| PEP[Prontuário eletrônico<br/>Amplimed · e-SUS PEC]
    EXT -->|HTTPS + JWT| API[Backend Flask<br/>localhost ou Docker]
    API --> DB[(PostgreSQL / SQLite)]
    API -->|texto pseudonimizado| LLM[Gemini API]
    API -->|áudio sem metadados| STT[Transcrição<br/>Gemini áudio · Whisper · Vosk local]
    API -.->|nunca| PII[(Nome, CPF, telefone…<br/>só no mapa local cifrado)]
```

O desenho mantém a topologia dos quatro ciclos anteriores (extensão ⇄ Flask ⇄ Gemini) e troca as partes frágeis: banco JSON → relacional; sem auth → JWT; Google SR não oficial → provedor configurável; anonimização de nomes → pseudonimização completa; chat livre → chat + SOAP estruturado; scraping fixo → adaptadores de PEP.

## 2. Containers e módulos

### 2.1 Extensão (`front/copmed-extension`)

```
src/
  app/            App.tsx (roteamento de abas, ≤ 200 linhas)
  features/
    auth/         login, token no chrome.storage.session
    patients/     lista, criação, seleção
    consultation/ chat, recomendações, histórico
    recording/    MediaRecorder, chunks, consentimento, timer
    soap/         SoapEditor (S/O/A/P + CID-10), diff IA×médico, inserir no PEP
    export/       PDF/MD
  pep/            PepAdapter (interface), amplimed.ts, esus-pec.ts, registry.ts
  api/            client.ts (fetch com JWT e fila offline), types.ts (gerados do OpenAPI)
  shared/         ui, hooks, formatSoapForPep.ts
public/
  manifest.json   host_permissions restritos aos PEPs; content.js só nesses domínios
  content.js      registra adaptadores, botão flutuante, ponte de mensagens
  background.js   fila offline, alarmes, sincronização
```

Regras: nenhum componente acima de 300 linhas; `App.tsx` só compõe; lógica de PEP não conhece React; lógica de API não conhece DOM.

### 2.2 Backend (`API/`)

```
API/
  app.py                create_app(): blueprints, CORS restrito, JWT, logging
  config.py             pydantic-settings (reaproveita o arquivo existente)
  blueprints/
    auth.py             /api/auth/register, /login, /refresh
    patients.py         /api/patients
    consultations.py    /api/consultations/<id>/(messages|history|pep-import|export)
    audio.py            /api/consultations/<id>/audio/chunks, /transcribe
    soap.py             /api/consultations/<id>/soap, /recommendations
  services/
    anonymizer/         regex.py, ner.py, pseudonym_map.py, anonymize()
    llm/                provider.py (interface), gemini.py, prompts/ (PT-BR, versionados)
    transcription/      provider.py, gemini_audio.py, whisper.py, vosk_local.py, diarize.py
    soap/               schema.py (SoapV1), generator.py, cid10.py (tabela embarcada)
    pdf.py, export.py
  models/               SQLAlchemy + Alembic (migrations/)
  scripts/              download_models.py, migrate_json_db.py, seed_dev.py
  tests/                unit/, integration/, fixtures/ (páginas HTML de PEP, áudios curtos)
eval/
  cases/                20 casos sintéticos (json)
  audio/                10 wavs + gabaritos
  run_eval.py           WER, completude, CID-10, latência, custo → relatório md
```

## 3. Modelo de dados

```mermaid
erDiagram
    MEDICO ||--o{ PACIENTE : atende
    MEDICO ||--o{ CONSULTA : conduz
    PACIENTE ||--o{ CONSULTA : tem
    CONSULTA ||--o{ MENSAGEM : contem
    CONSULTA ||--o{ TRANSCRICAO : gera
    CONSULTA ||--o{ DOCUMENTO_SOAP : produz
    CONSULTA ||--o| CONSENTIMENTO : registra
    PACIENTE ||--|| PSEUDONIMO : mapeia
    MEDICO {
        uuid id
        string email
        string senha_hash
        string crm
        datetime criado_em
    }
    PACIENTE {
        uuid id
        uuid medico_id
        string pseudonimo "ex.: PAC-7F3A"
        char sexo
        int ano_nascimento
        datetime criado_em
    }
    PSEUDONIMO {
        uuid paciente_id
        bytes dados_cifrados "nome, cpf, telefone… cifrados com chave do médico"
    }
    CONSULTA {
        uuid id
        uuid paciente_id
        uuid medico_id
        string titulo
        datetime inicio
        string origem_pep "amplimed | esus_pec | manual"
    }
    MENSAGEM {
        uuid id
        uuid consulta_id
        string papel "user | model"
        text conteudo_pseudonimizado
        datetime ts
    }
    TRANSCRICAO {
        uuid id
        uuid consulta_id
        json turnos "[{papel, inicio, fim, texto}]"
        string provedor
        float duracao_s
        float wer_estimado
    }
    DOCUMENTO_SOAP {
        uuid id
        uuid consulta_id
        json versao_ia
        json versao_medico
        string status "gerado | editado | aprovado | inserido_no_pep"
        datetime aprovado_em
    }
    CONSENTIMENTO {
        uuid consulta_id
        string tipo "verbal | termo"
        string versao_texto
        datetime ts
    }
```

## 4. Contrato da API (resumo; OpenAPI completo gerado pelo backend em `/api/openapi.json`)

| Método | Rota | Entrada | Saída |
|---|---|---|---|
| POST | `/api/auth/register` | email, senha, crm | 201 |
| POST | `/api/auth/login` | email, senha | access, refresh |
| GET/POST | `/api/patients` | — / {sexo, ano_nascimento, identificacao?} | lista / paciente (pseudônimo) |
| POST | `/api/patients/<id>/consultations` | titulo?, origem_pep?, importar_de?[] | consulta |
| POST | `/api/consultations/<id>/consent` | tipo, versao_texto | 201 |
| POST | `/api/consultations/<id>/pep-import` | {campos: {peso, …, anamnese, …}} | resumo do que foi registrado |
| POST | `/api/consultations/<id>/messages` | texto | resposta do LLM (reidratada) |
| POST | `/api/consultations/<id>/pdf` | multipart pdf | resumo + resposta |
| POST | `/api/consultations/<id>/audio/chunks` | multipart wav, seq | 202 |
| POST | `/api/consultations/<id>/transcribe` | provedor? | transcrição com turnos |
| POST | `/api/consultations/<id>/recommendations` | janela_min? | itens[] |
| POST | `/api/consultations/<id>/soap` | — | `SoapV1` (versao_ia) |
| PUT | `/api/consultations/<id>/soap/<sid>` | versao_medico, status | SOAP |
| GET | `/api/consultations/<id>/export?format=` | pdf \| md | arquivo |
| GET | `/api/health` | — | versão, provedores ativos (**sem chaves**) |

Todas as rotas exigem `Authorization: Bearer <jwt>` exceto `register`, `login`, `health`.

## 5. Fluxo principal — "Da conversa ao prontuário"

```mermaid
sequenceDiagram
    participant D as Médico
    participant E as Extensão
    participant P as PEP (Amplimed)
    participant A as Backend
    participant S as STT
    participant G as Gemini
    D->>E: Abre consulta, marca consentimento
    E->>P: adapter.readPatient() / readClinicalNotes()
    E->>A: POST pep-import (campos)
    A->>A: anonimizar() → mapa local
    D->>E: Iniciar gravação
    loop a cada 5 min
        E->>A: POST audio/chunks
    end
    D->>E: Parar
    E->>A: POST transcribe
    A->>S: áudio (sem metadados)
    S-->>A: texto + turnos
    A->>A: anonimizar(turnos) · diarizar papéis
    D->>E: Gerar SOAP
    E->>A: POST soap
    A->>G: prompt SOAP + contexto pseudonimizado
    G-->>A: JSON SoapV1
    A->>A: validar (pydantic) · reidratar
    A-->>E: SOAP versao_ia
    D->>E: Edita, aprova
    E->>A: PUT soap (versao_medico, aprovado)
    D->>E: Inserir no prontuário
    E->>P: adapter.writeEvolution(formatSoapForPep(soap, 'amplimed'))
```

## 6. Decisões de arquitetura (ADRs)

Formato curto. Cada ADR ganha um arquivo em `docs/adr/` no repositório quando aceito pela equipe.

### ADR‑01 — Manter Flask + extensão React/TS
**Contexto:** três turmas conhecem essa stack; a trilha privada usa Next.js/Supabase.
**Decisão:** manter Flask e React, refatorando em blueprints e features. Não migrar para Next.js.
**Consequência:** continuidade de conhecimento; código legado reaproveitado; o backend continua local ao médico (bom para LGPD).

### ADR‑02 — Banco relacional com SQLAlchemy + Alembic
**Contexto:** JSON único (D‑10).
**Decisão:** SQLite em desenvolvimento, PostgreSQL 16 em Docker; modelos SQLAlchemy 2.x; migrações Alembic; script de migração do JSON.
**Alternativas rejeitadas:** manter JSON com lock (não resolve concorrência nem PII); MongoDB (sem ganho para o modelo relacional simples).

### ADR‑03 — Pseudonimização reversível local
**Contexto:** D‑11; LGPD exige minimização e o médico precisa ver nomes.
**Decisão:** `anonymize()` em duas camadas (regex determinística + NER spaCy) substitui por tokens estáveis por consulta; o mapa fica na tabela `pseudonimo`, cifrada (Fernet/AES‑GCM) com chave derivada da senha do médico; a resposta é reidratada só na exibição.
**Consequência:** payloads externos sem PII verificáveis por teste; custo: nomes de doenças homônimos a pessoas podem ser mascarados (mitigar com lista de exceções médicas).

### ADR‑04 — Provedor de transcrição configurável, pago por padrão
**Contexto:** D‑04; qualidade da API gratuita é imprevisível; Vosk small‑pt tem WER alto.
**Decisão:** interface `TranscriptionProvider`; implementação padrão **Gemini áudio** (já é a API contratada; devolve transcrição com marcação de falantes em uma chamada); alternativa **Whisper large‑v3 via Groq**; **Vosk local** como fallback offline (com aviso de qualidade). Diarização: papéis atribuídos pelo provedor quando disponível, senão pela heurística de vetor de voz já existente (com `MODO_TESTE_SOZINHO` removido).
**Decidido pelo cliente em 15/09/2026:** Gemini áudio é o provedor padrão; Whisper/Groq fica como comparação opcional no eval. Quem paga a chave segue pendente (P2, doc 10).

### ADR‑05 — SOAP como saída estruturada validada
**Contexto:** hoje a saída é markdown livre com formato instável.
**Decisão:** esquema `SoapV1` em pydantic; chamada ao Gemini com `response_mime_type=application/json` + `response_schema`; reprocessamento com 1 tentativa se inválido; prompts em PT‑BR versionados em arquivos; sem pedido de referências ou percentuais.
**Consequência:** front simples; testes de contrato; avaliação automática possível.

### ADR‑06 — Adaptador por PEP no content script
**Contexto:** seletores espalhados e duplicados (D‑01); trilha privada provou o padrão com 9 sistemas.
**Decisão:** interface `PepAdapter` com `detect/readPatient/readClinicalNotes/writeEvolution`; registro central; fixtures HTML por PEP para testes; `host_permissions` só dos domínios suportados.
**Consequência:** cada PEP novo é um arquivo + fixture + teste.

### ADR‑07 — Autenticação JWT própria
**Contexto:** D‑14; backend roda no computador do médico ou em servidor da clínica.
**Decisão:** e‑mail + senha (argon2), JWT de 15 min + refresh de 7 dias em `chrome.storage.session`; sem OAuth nesta versão.
**Alternativa rejeitada:** Google OAuth via `chrome.identity` (exige client id publicado e complica o Docker local).

### ADR‑08 — CI obrigatório e branch protection
**Decisão:** GitHub Actions com `pytest --cov`, `ruff`, `eslint`, `tsc`, `vite build`; PR template com checklist LGPD; `develop` protegido; `main` só recebe releases.

### ADR‑09 — Repositório único em organização GitHub
**Contexto:** D‑21.
**Decisão:** criar organização `copilot-medico` (ou similar) com repositório `copilot-medico`; importar o histórico da branch `develop` da Equipe 6 (que já contém o da Equipe 4). Owners: Dr. Rui + professor; alunos como maintainers do semestre.

## 7. Prompts (diretrizes)

- Português do Brasil, persona "assistente de documentação clínica", nunca "diagnostica".
- Sempre termina com o aviso de validação médica (mantido dos ciclos anteriores).
- SOAP: instruções explícitas por seção; CID‑10 sugerido com `confianca` qualitativa; `pendencias` lista o que faltou perguntar.
- Recomendações: até 5 itens, ≤ 20 palavras cada.
- Proibido: inventar exames já feitos, valores de exames ausentes, referências bibliográficas com link.
- Cada prompt tem `id` e `versao`; a versão é gravada junto do SOAP gerado.

## 8. Segurança (resumo; detalhes no doc 08)

- CORS restrito à origem da extensão; rate limit por médico.
- Chaves de API só em variáveis de ambiente; `/api/health` nunca expõe chaves (lição da trilha privada).
- Áudio apagado após transcrição; logs sem conteúdo clínico.
- Dependências travadas (`requirements.txt` com versões; `npm ci`).
