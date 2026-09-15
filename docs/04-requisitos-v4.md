# 04 — Documento de Requisitos — CoPilot Médico v4.0

**Histórico de versões**

| Data | Versão | Descrição | Autor |
|---|---|---|---|
| 14/06/2025 | 2.0 | US001–US010 (Equipe 4) | Fábio, Nielso Júnior, João Júnior |
| 15/09/2026 | 4.0‑draft | Revisão do status de US001–US010; novas US011–US024 | Dr. Rui Pontes (PO) com apoio de IA |

A numeração continua a do documento de 2025 para preservar rastreabilidade. O antigo "US009" duplicado foi renumerado: histórico pesquisável = **US009**, integração com outros prontuários = **US009b** (absorvido em US019).

---

## 1. Status das estórias herdadas

| ID | Estória | Status na v3.0 | Ação na v4.0 |
|---|---|---|---|
| US001 | Chat no navegador | Atendida | Manter; cobrir com testes |
| US002 | Perguntas livres ao Gemini | Atendida | Manter |
| US003 | Texto adicional | Atendida | Manter |
| US004 | Upload de PDF | Atendida | Manter; anonimizar v2 |
| US005 | Captura do Amplimed com botão flutuante | **Quebrada** (D‑01, D‑02) | Reimplementar via adaptador (US019) |
| US006 | Proteção LGPD | Parcial (só nomes) | Substituída por US016 |
| US007 | Histórico por paciente com ID | Parcial (guarda nome real) | Substituída por US014/US015 |
| US008 | Áudio da consulta | Atendida com ressalvas (D‑03, D‑04, D‑12) | Substituída por US017 |
| US009 | Histórico pesquisável | Não feita | Parcial em US022 |
| US009b | Outros prontuários | Não feita | US019 |
| US010 | Exportar resumo PDF/TXT | Não feita | US021 |

---

## 2. Novas estórias de usuário

### Épico A — Base estável

#### US011 — Como desenvolvedor, desejo que a extração de dados do Amplimed volte a funcionar, para que o requisito US005 seja atendido de novo.
- CA001 — Existe a rota `POST /api/consultations/<id>/pep-import` que recebe os campos raspados e os registra na consulta.
- CA002 — O content script e o popup usam a **mesma** lista de seletores, definida em um único módulo (`pep/amplimed.ts`).
- CA003 — Teste automatizado com uma página HTML de exemplo do Amplimed (fixture) valida a extração dos 8 sinais vitais e das 4 notas.
- CA004 — O usuário vê confirmação visual com o resumo do que foi extraído antes do envio.

#### US012 — Como desenvolvedor, desejo CI que rode testes de backend e front em cada PR, para que regressões sejam detectadas antes do merge.
- CA001 — Workflow executa `pytest` com cobertura e `npm run lint && npm run build`.
- CA002 — PR não pode ser mesclado com CI vermelho (branch protection em `develop` e `main`).
- CA003 — Relatório de cobertura publicado como artefato; meta ≥ 60 % backend na Sprint 7.

#### US013 — Como desenvolvedor, desejo subir todo o ambiente com um comando, para que um novo membro esteja produtivo em menos de 30 minutos.
- CA001 — `docker compose up` sobe backend + PostgreSQL; modelos Vosk baixados por script na primeira execução (não commitados).
- CA002 — `.env.example` documenta todas as variáveis.
- CA003 — README com passos verificados por um membro que não escreveu o README.

### Épico B — Identidade e dados

#### US014 — Como médico, desejo entrar com e‑mail e senha, para que só eu veja meus pacientes e consultas.
- CA001 — Cadastro e login com senha (bcrypt/argon2) e token JWT de curta duração + refresh.
- CA002 — Toda rota `/api/*` exige token; rota sem token retorna 401.
- CA003 — Dados de paciente e consulta são filtrados pelo médico autenticado; teste garante que médico A não lê consulta de médico B.
- CA004 — CORS restrito à origem da extensão (`chrome-extension://<id>`).

#### US015 — Como médico, desejo que pacientes, consultas, mensagens e transcrições fiquem em um banco relacional, para que nada se perca ou corrompa.
- CA001 — Modelo SQLAlchemy com tabelas `medico`, `paciente`, `consulta`, `mensagem`, `transcricao`, `documento_soap`, `consentimento`, `pseudonimo`.
- CA002 — Migrações com Alembic; SQLite em dev, PostgreSQL em Docker.
- CA003 — Script migra o `patients_db.json` existente para o novo banco.
- CA004 — A tabela `paciente` guarda apenas: pseudônimo, sexo, ano de nascimento, hash do identificador local. Nome e documentos ficam **somente** na tabela `pseudonimo`, cifrada com chave do médico.

#### US016 — Como médico, desejo que nenhum dado identificável do paciente saia do meu computador, para cumprir a LGPD.
- CA001 — Antes de qualquer chamada ao LLM ou ao serviço de transcrição, o texto passa por `anonimizar()` que substitui CPF, RG, CNS, telefone, e‑mail, CEP, endereço, datas completas e nomes (PER/LOC do spaCy + lista de nomes do próprio cadastro) por tokens `[PACIENTE]`, `[CPF]`, `[DATA_1]`…
- CA002 — O mapa token → valor real é guardado localmente e usado para **reidratar** a resposta exibida ao médico.
- CA003 — Teste automatizado roda os 20 casos de referência e falha se qualquer padrão sensível aparecer no payload de saída (mock do provedor).
- CA004 — Log de auditoria registra cada envio externo (quando, qual consulta, qual provedor, tamanho), sem conteúdo.

### Épico C — Áudio confiável

#### US017 — Como médico, desejo gravar a consulta com o consentimento do paciente registrado e obter uma transcrição com papéis Médico/Paciente, para não precisar digitar durante o atendimento.
- CA001 — Antes de iniciar a gravação, a extensão exige marcar "Paciente consentiu verbalmente" (ou anexar termo); o consentimento é gravado com data/hora e versão do texto.
- CA002 — Gravação com iniciar / pausar / retomar / parar e cronômetro; parada automática após 120 min.
- CA003 — Áudio enviado em partes (chunks de ≤ 5 min) para o backend; a consulta continua se uma parte falhar.
- CA004 — Transcrição feita por provedor configurável (`TRANSCRIPTION_PROVIDER=gemini|whisper|vosk`); padrão pago; Vosk local como fallback declarado ao usuário.
- CA005 — Cada turno tem papel `medico|paciente|outro` e carimbo de tempo; o médico pode corrigir o papel na interface.
- CA006 — WER ≤ 20 % nos 10 áudios de referência (medido na Sprint 6).
- CA007 — O arquivo de áudio é apagado do servidor após a transcrição; não é persistido.

### Épico D — SOAP estruturado

#### US018 — Como médico, desejo gerar um registro SOAP com CID‑10 sugerido a partir da consulta, para revisar e inserir no prontuário.
- CA001 — `POST /api/consultations/<id>/soap` combina transcrição, dados do prontuário, PDFs e chat da consulta e devolve JSON no esquema `SoapV1` (pydantic): `subjetivo`, `objetivo`, `avaliacao`, `plano`, `hipoteses[] {descricao, cid10, confianca: baixa|media|alta}`, `alertas[]`, `pendencias[]`.
- CA002 — O prompt não solicita referências bibliográficas nem percentuais numéricos; confiança é qualitativa.
- CA003 — A interface mostra as quatro seções editáveis, o CID‑10 sugerido com busca na tabela CID‑10 embarcada, e um botão "Aprovar".
- CA004 — Cada SOAP guarda `versao_ia` (texto original) e `versao_medico` (após edição), e a diferença é visível.
- CA005 — Tempo de geração ≤ 20 s para consultas de até 20 min.
- CA006 — Completude ≥ 90 % nos 20 casos de referência.

#### US020 — Como médico, desejo receber recomendações curtas durante a consulta (exame, pergunta, diferencial), para ter um segundo olhar em tempo real.
- CA001 — Mantém `POST /api/recommendations`, agora sobre transcrição parcial (últimos N minutos).
- CA002 — Resposta em até 5 itens, frases curtas, sem diagnóstico fechado.
- CA003 — Botão "Sugestões" na aba de gravação; resultado não é gravado no prontuário.

### Épico E — Volta ao prontuário

#### US019 — Como médico, desejo que a extensão leia e escreva no meu prontuário eletrônico (Amplimed ou e‑SUS PEC), para não copiar e colar.
- CA001 — Interface `PepAdapter { id, detect(), readPatient(), readClinicalNotes(), writeEvolution(text) }` no content script; um arquivo por PEP.
- CA002 — `AmplimedAdapter` lê os 8 sinais vitais e 4 notas (herdado) e escreve o SOAP formatado no campo de evolução.
- CA003 — `EsusPecAdapter` lê nome/idade/sexo do cabeçalho do cidadão e escreve no campo SOAP do PEC (o PEC já usa SOAP nativamente).
- CA004 — O content script só é injetado nos domínios configurados (`host_permissions` específicos), nunca em `<all_urls>`.
- CA005 — Botão flutuante reaparece apenas em página de PEP detectada (fecha US005‑CA001).
- CA006 — A escrita nunca é automática: exige clique em "Inserir no prontuário" após aprovar o SOAP.

#### US021 — Como médico, desejo exportar a consulta (SOAP + transcrição + chat) em PDF ou Markdown, para anexar ao prontuário ou discutir com colegas.
- CA001 — `GET /api/consultations/<id>/export?format=pdf|md`.
- CA002 — O export usa a versão reidratada (com nome real) somente quando o médico marca "incluir identificação"; padrão é pseudonimizado.

### Épico F — Qualidade e avaliação

#### US022 — Como PO, desejo um conjunto de casos de referência e métricas automáticas, para saber se a IA melhora ou piora entre versões.
- CA001 — 20 casos clínicos sintéticos (texto de consulta + prontuário + gabarito SOAP e CID‑10) em `eval/cases/`, sem dados reais.
- CA002 — 10 áudios de referência gravados pela equipe (2 vozes, ambiente de consultório) com transcrição‑gabarito.
- CA003 — `make eval` gera relatório com WER, completude do SOAP, acerto de CID‑10 (capítulo e código), latência e custo por consulta.
- CA004 — O relatório é anexado a cada release.

#### US023 — Como PO, desejo um piloto com médicos reais em consultas simuladas, para validar usabilidade antes de qualquer uso clínico.
- CA001 — ≥ 2 médicos, ≥ 10 consultas simuladas cada (pacientes‑ator ou casos lidos).
- CA002 — Questionário SUS e entrevista de 20 min por médico; meta SUS ≥ 70.
- CA003 — Achados viram itens de backlog da Sprint 7.

#### US024 — Como próxima equipe, desejo documentação e vídeos atualizados, para começar sem redescobrir o projeto.
- CA001 — `docs/` atualizado a cada sprint (requisitos, arquitetura, ADRs, changelog).
- CA002 — Vídeo pitch (≤ 3 min) e relatório técnico (≤ 6 min) no padrão do REACT Labs.
- CA003 — Tag `v4.0.0`, release notes, `dist.zip` da extensão anexado.

---

## 3. Requisitos não funcionais

| ID | Requisito | Meta |
|---|---|---|
| RNF01 | Privacidade | Nenhum identificador direto em payload externo (teste automático) |
| RNF02 | Desempenho | Chat ≤ 8 s; SOAP ≤ 20 s; transcrição ≤ 1× duração do áudio |
| RNF03 | Disponibilidade local | Gravação e fila funcionam sem rede; sincroniza ao reconectar |
| RNF04 | Portabilidade | Backend roda em Docker (Linux) e nativo em Windows/macOS com Python 3.11–3.12 |
| RNF05 | Testabilidade | Cobertura backend ≥ 60 %; testes de front para adaptadores e formatação de SOAP |
| RNF06 | Custo | ≤ R$ 0,50 por consulta de 20 min (transcrição + SOAP), medido no eval |
| RNF07 | Acessibilidade | Popup navegável por teclado; contraste AA; tema claro/escuro mantido |
| RNF08 | Observabilidade | Logs estruturados (JSON) sem conteúdo clínico; métricas de latência por rota |

## 4. Modelo para novas estórias

```
## USnnn — Como <papel> desejo <necessidade> para <objetivo>.
### Critérios de aceite
- CA001 — …
- CA002 — …
```
