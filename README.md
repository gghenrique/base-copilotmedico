# CoPilot Médico 4.0 — Projeto de 4 meses (2026.2)

**Cliente / Product Owner:** Dr. Rui Pontes
**Contexto:** 4º ciclo do projeto CoPilot Médico na disciplina de Engenharia de Software (REACT Labs, UPE – POLI)
**Janela:** 15/09/2026 → 15/01/2027 (8 sprints de 2 semanas + recesso)
**Tema do ciclo:** *Da conversa ao prontuário* — transformar a consulta gravada em um registro clínico estruturado (SOAP + CID-10) que volta para o prontuário eletrônico, com LGPD de verdade.

---

## Resumo executivo

Três equipes já passaram pelo CoPilot Médico:

| Ciclo | Equipe | Período | Versão | O que entregou |
|---|---|---|---|---|
| 1 | Equipe 3 | 2024.2 | v1.0 | Extensão Chrome + Flask + GPT‑4. Lê o prontuário Amplimed, envia à IA, devolve hipótese diagnóstica. Cliente: Dra. Lorena Mazoni. |
| 2 | Equipe 4 | 2025.1 | v2.0 | Migração para Gemini, anonimização com spaCy, upload de PDF, IDs de paciente, banco JSON, histórico por consulta, botão flutuante, docs de requisitos e arquitetura. |
| 3 | Equipe 6 | 2025.2 | v3.0 | Gravação de áudio na extensão, diarização médico/paciente (Vosk + Google SR), log de transcrições, rota de recomendações, Docker, suíte de testes, novo layout. |

O produto **funciona como demo**, mas não como ferramenta de uso diário: banco em arquivo JSON, sem autenticação, anonimização que só remove nomes, transcrição dependente de uma API não oficial, uma regressão que quebra a extração do Amplimed desde a v2.0, e nenhum teste rodando em CI. O ciclo 4 existe para **fechar essa distância** e entregar a primeira funcionalidade de valor clínico direto: o SOAP estruturado inserido de volta no prontuário.

## O que este projeto entrega

- **Documentação completa** (pasta `docs/`) — histórico, diagnóstico, escopo, requisitos, arquitetura, roadmap, processo, LGPD, qualidade, riscos.
- **Backlog importável** (`backlog/backlog-v4.csv`) — 66 itens (~256 pontos) com épico, sprint, estimativa e critério de aceite.
- **Anexos** — transcrições revisadas dos 6 vídeos e inventário técnico dos repositórios.

## Índice

| # | Documento | Para quem |
|---|---|---|
| 01 | [Histórico dos três semestres](docs/01-historico-tres-semestres.md) | Toda a equipe (leitura obrigatória na Sprint 0) |
| 02 | [Diagnóstico do estado atual](docs/02-diagnostico-estado-atual.md) | Tech leads |
| 03 | [Visão e escopo da v4.0](docs/03-visao-escopo-v4.md) | PO, equipe, professor |
| 04 | [Requisitos (US011–US024)](docs/04-requisitos-v4.md) | Equipe, QA |
| 05 | [Arquitetura alvo e ADRs](docs/05-arquitetura-v4.md) | Devs |
| 06 | [Roadmap de 4 meses](docs/06-roadmap-4-meses.md) | Todos |
| 07 | [Equipe e processo](docs/07-equipe-processo.md) | Scrum master, equipe |
| 08 | [LGPD e segurança](docs/08-lgpd-seguranca.md) | PO, dev responsável por privacidade |
| 09 | [Qualidade, testes e avaliação](docs/09-qualidade-testes-avaliacao.md) | QA, devs |
| 10 | [Riscos e decisões pendentes](docs/10-riscos-decisoes.md) | PO |
| A | [Transcrições dos vídeos](docs/anexos/A-transcricoes-videos.md) | Referência |
| B | [Inventário dos repositórios](docs/anexos/B-inventario-repositorios.md) | Referência |

## Como rodar a base atual (v3.0, herdada da Equipe 6)

Instruções herdadas e corrigidas. A Sprint 1 substitui isto por `docker compose up` (item B12).

**Backend** (Python 3.11 ou 3.12 — o módulo `audioop` usado pela diarização não existe no 3.13):

```bash
cd API
pip install -r requirements.txt
python -m spacy download pt_core_news_lg
```

Crie `API/backend/.env` com `GEMINI_API_KEY=<sua chave>` (o arquivo está no `.gitignore`; nunca commitar). Os modelos Vosk (`API/backend/vosk-model-small-pt-0.3` e `vosk-model-spk-0.4`) ainda vêm no repositório; a Sprint 1 os move para download por script (B13).

```bash
python server.py
```

Servidor em `http://localhost:3001`.

**Extensão:**

```bash
cd front/copmed-extension
npm install
npm run build
```

Em `chrome://extensions`, ative o Modo desenvolvedor, clique em "Carregar sem compactação" e selecione a pasta `dist`. Para gravar áudio, em "Mais opções" da extensão → permissões → Microfone → Permitir.

**Docker (só backend):** crie `.env` na raiz com `GEMINI_API_KEY` e rode `docker compose up --build`.

**Conhecido e quebrado nesta versão:** o botão "Extrair dados" chama uma rota que não existe (D‑01); a diarização está em modo de teste (D‑03). Ambos são itens da Sprint 1.

## Fontes analisadas

**Vídeos (canal REACT Labs | UPE – POLI):**
- Equipe 3 — Pitch: https://www.youtube.com/watch?v=_0SnWv-aAp0
- Equipe 3 — Relatório técnico: https://www.youtube.com/watch?v=wJ56Jl9cktE
- Equipe 4 — Pitch: https://www.youtube.com/watch?v=cxFWvGYqn2U
- Equipe 4 — Relatório técnico: https://www.youtube.com/watch?v=qFYitWekCEI
- Equipe 6 — Pitch: https://www.youtube.com/watch?v=FmpYD-HKD9A
- Equipe 6 — Relatório técnico: https://www.youtube.com/watch?v=9zBD2nv-5uk

**Repositórios:**
- Equipe 4 (2025.1): https://github.com/J-Eduardo25/copilot_medico_G4_2025.1 (branch `main`)
- Equipe 6 (2025.2): https://github.com/Jamuelton/copilot_medico_grupo_6_es (branch `develop`, contém o histórico da Equipe 4)

**Trilha privada (fora do escopo acadêmico, analisada como referência):**
- Extensão `copilot-medico-ext-v2.2` (manifest v2.3.0, abril/2026) em `C:\Users\WIN\Downloads\copilot-medico-ext-v2.2` — backend em `copilot-medico.vercel.app` (hoje **desativado**, HTTP 402 `DEPLOYMENT_DISABLED`).

## Decisões que só o cliente pode tomar

Listadas em [docs/10-riscos-decisoes.md](docs/10-riscos-decisoes.md#decisões-pendentes-do-cliente).

**Já decididas (15/09/2026):** transcrição por **Gemini áudio**; segundo prontuário **e‑SUS PEC**; repositório único em `ruypontes/copilot-medico`.

**Ainda pendentes:**
1. Quem paga a chave Gemini durante o semestre e qual o limite mensal (P2).
2. Se a trilha privada (Supabase/Vercel) fica congelada até M4 (P4).
3. Médicos que participarão do piloto na Sprint 6 (P5).
4. Cadastro de identificação do paciente opcional e cifrado (P7); exibir CID‑10 sugerido (P8); prontuário dos vídeos finais (P9).
