# CoPilot Médico 5.0 — Projeto de 4 meses (2026.2)

**Cliente / Product Owner:** Dr. Rui Pontes
**Contexto:** 5º ciclo do projeto CoPilot Médico na disciplina de Engenharia de Software (REACT Labs, UPE – POLI)
**Janela:** 15/09/2026 → 15/01/2027 (8 sprints de 2 semanas + recesso)
**Tema do ciclo:** *Da conversa ao prontuário* — transformar a consulta gravada em um registro clínico estruturado (SOAP + CID-10) que volta para o prontuário eletrônico, com LGPD de verdade.

---

## Resumo executivo

Quatro equipes já passaram pelo CoPilot Médico:

| Ciclo | Equipe | Período | Versão | O que entregou |
|---|---|---|---|---|
| 1 | Equipe 3 | 2024.2 | v1.0 | Extensão Chrome + Flask + GPT‑4. Lê o prontuário Amplimed, envia à IA, devolve hipótese diagnóstica. Cliente: Dra. Lorena Mazoni. |
| 2 | Equipe 4 | 2025.1 | v2.0 | Migração para Gemini, anonimização com spaCy, upload de PDF, IDs de paciente, banco JSON, histórico por consulta, botão flutuante, docs de requisitos e arquitetura. |
| 3 | Equipe 6 | 2025.2 | v3.0 | Gravação de áudio na extensão, diarização médico/paciente (Vosk + Google SR), log de transcrições, rota de recomendações, Docker, suíte de testes, novo layout. |
| 4 | Grupo 2 | 2026.1 | v4.0 | Autenticação por perfil (scrypt + JWT), aprovação de médicos pelo admin, sistema gerenciador web em React (login, pacientes, admin), rota `extension/extracted-data`, client de API na extensão. Documentação em PDF (anexo C). |

O produto **funciona como demo**, mas não como ferramenta de uso diário: banco em arquivo JSON, autenticação recém‑criada mas sem bootstrap documentado (a instalação padrão não tem administrador), anonimização que só remove nomes, transcrição dependente de uma API não oficial, extração do Amplimed só parcialmente restaurada, e nenhum teste rodando em CI. O ciclo 5 existe para **fechar essa distância** e entregar a primeira funcionalidade de valor clínico direto: o SOAP estruturado inserido de volta no prontuário.

## O que este projeto entrega

- **Documentação completa** (pasta `docs/`) — histórico, diagnóstico, escopo, requisitos, arquitetura, roadmap, processo, LGPD, qualidade, riscos.
- **Backlog importável** (`backlog/backlog-v5.csv`) — 70 itens (~269 pontos) com épico, sprint, estimativa e critério de aceite.
- **Anexos** — transcrições revisadas dos 6 vídeos, inventário técnico dos repositórios e a documentação do Grupo 2 (PDF).

## Índice

| # | Documento | Para quem |
|---|---|---|
| 01 | [Histórico dos quatro ciclos](docs/01-historico-quatro-ciclos.md) | Toda a equipe (leitura obrigatória na Sprint 0) |
| 02 | [Diagnóstico do estado atual](docs/02-diagnostico-estado-atual.md) | Tech leads |
| 03 | [Visão e escopo da v5.0](docs/03-visao-escopo-v5.md) | PO, equipe, professor |
| 04 | [Requisitos (US011–US024)](docs/04-requisitos-v5.md) | Equipe, QA |
| 05 | [Arquitetura alvo e ADRs](docs/05-arquitetura-v5.md) | Devs |
| 06 | [Roadmap de 4 meses](docs/06-roadmap-4-meses.md) | Todos |
| 07 | [Equipe e processo](docs/07-equipe-processo.md) | Scrum master, equipe |
| 08 | [LGPD e segurança](docs/08-lgpd-seguranca.md) | PO, dev responsável por privacidade |
| 09 | [Qualidade, testes e avaliação](docs/09-qualidade-testes-avaliacao.md) | QA, devs |
| 10 | [Riscos e decisões pendentes](docs/10-riscos-decisoes.md) | PO |
| A | [Transcrições dos vídeos](docs/anexos/A-transcricoes-videos.md) | Referência |
| B | [Inventário dos repositórios](docs/anexos/B-inventario-repositorios.md) | Referência |
| C | [Documentação do Grupo 2 (2026.1)](docs/anexos/C-documentacao-grupo-2-2026-1.pdf) | Referência |

## Como rodar (v5.0 — Sprint 1)

### Caminho rápido: Docker

Pré-requisitos: Docker Desktop (com WSL2 no Windows) e Google Chrome.
Não é preciso ter Python instalado — a imagem do backend já usa Python 3.11.

```bash
cp API/.env.example API/.env
```

Preencha em `API/.env` no mínimo `GEMINI_API_KEY`, `AUTH_SECRET_KEY` e
`AUTH_BOOTSTRAP_EMAIL` / `AUTH_BOOTSTRAP_PASSWORD`. Sem `AUTH_SECRET_KEY` toda
rota autenticada responde 500; sem `AUTH_BOOTSTRAP_*` nenhum administrador é
criado e ninguém consegue entrar (D‑22/D‑23). O arquivo está no `.gitignore`.

```bash
docker compose up -d --build
```

Sobe três serviços:

| Serviço | Endereço | O que é |
|---|---|---|
| `copmed-web` | http://localhost:8080 | Sistema gerenciador (login, pacientes, admin) |
| `backend` | http://localhost:3001 | API Flask (`/api/health` para checagem) |
| `db` | localhost:5432 | PostgreSQL |

> **Nota sobre o PostgreSQL:** o banco já sobe e `DB_URL` já é lido por
> `backend/config.py`, mas a persistência da aplicação ainda é o arquivo JSON
> `backend/patients_db.json`. A migração é um item posterior do backlog; o
> serviço existe para que ela não exija mudar a infraestrutura de novo.

Os dados JSON ficam no volume `backend_data`, então sobrevivem a `--build`.

### Extensão Chrome

A extensão **não** é servida pelo Docker: ela depende das APIs `chrome.*` e
precisa ser carregada como extensão de verdade. Aberta como página web comum,
ela trava em "Validando sessão...".

```bash
cd front/copmed-extension && npm install && npm run build
```

Em `chrome://extensions`, ative o **Modo desenvolvedor**, clique em **Carregar
sem compactação** e selecione `front/copmed-extension/dist`. Para gravar áudio,
libere o Microfone nas permissões da extensão.

### Rodando sem Docker

**Backend — Python 3.11 ou 3.12 (obrigatório).** Esta versão do projeto suporta
somente Python 3.11 e 3.12, devido à dependência de áudio (`audioop`) usada pela
diarização. Python 3.13 ou superior **não é suportado**. Confirme antes de
instalar:

```bash
python --version
```

A versão deve ser `3.11.x` ou `3.12.x`. Em seguida:

```bash
cd API && pip install -r requirements.txt && python -m spacy download pt_core_news_lg
```

Os modelos Vosk não são mais versionados (o clone caiu de ~67 MB para menos de
5 MB). Baixe-os com o script idempotente:

```bash
python scripts/download_models.py
```

```bash
python server.py
```

Servidor em `http://localhost:3001`.

Sistema gerenciador web:

```bash
cd front/copmed-web && npm install && npm run dev
```

Abre em `http://localhost:5174`. Entre com o e‑mail/senha do bootstrap e perfil
`administrador`; médicos se cadastram na aba "Cadastrar médico" e ficam
pendentes até o admin aprovar em **Médicos**.

### Testes

```bash
cd API && pip install -r requirements-dev.txt && pytest
```

40 testes em 6 arquivos. As dependências pesadas (vosk, spaCy, numpy,
speech_recognition) são substituídas por stubs no `tests/conftest.py`, então a
suíte roda em segundos e **não** precisa dos modelos Vosk — é o que permite
rodá-la no CI.

**Conhecido e quebrado nesta versão:** a extração do Amplimed usa dois conjuntos
de seletores divergentes (D‑01); a diarização está em modo de teste (D‑03);
médicos não veem os pacientes legados (D‑24).

## Validação do README

Este README deve ser validado por uma pessoa que não participou da sua escrita, seguindo as instruções de instalação e execução desde o início.

### Checklist de validação

- [ ] Confirmar que Python 3.11 ou 3.12 está sendo utilizado.
- [ ] Confirmar que Python 3.13 ou superior está identificado como não suportado.
- [ ] Instalar as dependências do backend.
- [ ] Confirmar a configuração do arquivo `.env`.
- [ ] Iniciar o backend sem erros.
- [ ] Instalar e executar o sistema gerenciador web.
- [ ] Confirmar acesso a `http://localhost:5174`.
- [ ] Confirmar que as instruções do README são suficientes sem orientação do autor.

### Registro da validação

- **Validador:** ______________________________
- **Data:** ____/____/________
- **Versão do Python utilizada:** ______________
- **Resultado:** [ ] Aprovado  [ ] Aprovado com ajustes  [ ] Reprovado
- **Observações:** ______________________________________________

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
- Grupo 2 (2026.1): https://github.com/qleticia/copilot_medico_grupo_2_es (branch `main`; árvore final integrada aqui em 20/09/2026 — documentação em `docs/anexos/C-documentacao-grupo-2-2026-1.pdf`)

**Trilha privada (fora do escopo acadêmico, analisada como referência):**
- Extensão `copilot-medico-ext-v2.2` (manifest v2.3.0, abril/2026) em `C:\Users\WIN\Downloads\copilot-medico-ext-v2.2` — backend em `copilot-medico.vercel.app` (hoje **desativado**, HTTP 402 `DEPLOYMENT_DISABLED`).

## Decisões que só o cliente pode tomar

Listadas em [docs/10-riscos-decisoes.md](docs/10-riscos-decisoes.md#decisões-pendentes-do-cliente).

**Já decididas (15/09/2026):** transcrição por **Gemini áudio**; segundo prontuário **e‑SUS PEC**; repositório único em `ruypontes/copilot-medico`.

```bash
cd API
pip install -r requirements.txt
python -m spacy download pt_core_news_lg
```

**Ainda pendentes:**
1. Quem paga a chave Gemini durante o semestre e qual o limite mensal (P2).
2. Se a trilha privada (Supabase/Vercel) fica congelada até M4 (P4).
3. Médicos que participarão do piloto na Sprint 6 (P5).
4. Cadastro de identificação do paciente opcional e cifrado (P7); exibir CID‑10 sugerido (P8); prontuário dos vídeos finais (P9).
5. Destino do sistema gerenciador web do Grupo 2 (P10) e dos pacientes legados sem médico (P11).
