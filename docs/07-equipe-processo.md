# 07 — Equipe e processo

## Papéis

| Papel | Quem | Responsabilidades |
|---|---|---|
| Product Owner (cliente) | Dr. Rui Pontes | Prioriza backlog; aprova critérios de aceite; decide pendências do doc 10; participa de todas as reviews; provê acesso a conta de teste do Amplimed e médicos para o piloto |
| Orientador | Professor da disciplina | Avaliação acadêmica; desempate em conflitos de escopo |
| Scrum Master | 1 aluno | Cerimônias, quadro, remoção de impedimentos, métricas de sprint |
| Tech Lead Backend | 1 aluno | Arquitetura Flask, banco, LLM, transcrição; revisor obrigatório de PRs de backend |
| Tech Lead Frontend | 1 aluno | Extensão, adaptadores de PEP, UI; revisor obrigatório de PRs de front |
| Responsável por Privacidade | 1 aluno | Anonimização, consentimento, auditoria, checklist LGPD em cada PR |
| Responsável por Qualidade | 1 aluno | Testes, CI, casos de referência, `run_eval.py`, piloto |
| Devs | 2–3 alunos | Itens do backlog nos dois lados |

Papéis de liderança rotacionam no meio do projeto (após a Sprint 3) se a equipe quiser; a rotação é registrada no README.

Equipes anteriores tiveram entre 6 e 9 contribuidores ativos; o plano assume 6–8.

## Ferramentas

| Necessidade | Ferramenta | Motivo |
|---|---|---|
| Código | GitHub (organização única, ADR‑09) | Histórico contínuo entre ciclos |
| Quadro | GitHub Projects (board por sprint) | Fica junto do código; Trello (usado antes) fragmentava |
| CI | GitHub Actions | Já existe um workflow |
| Comunicação | Grupo WhatsApp da equipe + canal Discord para dúvidas técnicas | Prático para alunos |
| Reuniões | Google Meet, gravadas | Ausentes assistem |
| Docs | `docs/` no repositório (Markdown + Mermaid) | Versionado, revisado em PR |
| Segredos | `.env` local + GitHub Secrets para CI | Nunca em commit (lição do `api-key.txt` de 2025) |

## Cerimônias

| Cerimônia | Quando | Duração | Quem |
|---|---|---|---|
| Planejamento | Segunda, 1ª semana da sprint | 60 min | Equipe + PO |
| Daily assíncrona | Todo dia útil, até 10h, no grupo | 3 linhas: fiz / farei / impedimento | Equipe |
| Sync técnica | Quarta | 30 min | Tech leads + quem precisar |
| Review | Sexta, 2ª semana | 45 min, com demo ao PO | Equipe + PO (+ professor nos marcos) |
| Retrospectiva | Após a review | 30 min | Equipe |
| Refinamento | Quarta, 2ª semana | 45 min | Equipe + PO |

## Fluxo de código

- Branches: `main` (releases), `develop` (integração), `feat/USnnn-descricao`, `fix/D-nn-descricao`, `docs/…`.
- Commits: Conventional Commits em português ou inglês (`feat:`, `fix:`, `docs:`, `test:`, `chore:`), referenciando a estória (`feat(soap): gera SoapV1 via response_schema (US018)`).
- PR: template com **Objetivo / Como testar / Checklist** (CI verde, teste incluído, sem PII, docs atualizados, screenshot se UI). Um revisor obrigatório da outra "ponta" (front revisa back e vice‑versa uma vez por sprint para espalhar conhecimento).
- Merge: squash em `develop`; `main` recebe merge da `develop` só na release, com tag `vX.Y.Z`.
- Versionamento: `5.0.0-alpha.N` durante o semestre; `5.0.0` em M4.

### Proteção de branches (B11)

O workflow `.github/workflows/construir_frontend.yml` roda em todo PR para `develop` e `main` e tem dois jobs: **Extensão (eslint, tsc, vite build)** e **Web copmed-web (eslint, vite build)**. Para que um PR com CI vermelho não possa ser mergeado, um administrador do repositório configura em *Settings → Branches* (ou *Rules → Rulesets*) uma regra para `develop` e outra para `main` com:

- *Require a pull request before merging*, com 1 aprovação.
- *Require status checks to pass before merging*, marcando os dois jobs acima e o **pytest (API)** do workflow `testes_backend.yml`, e *Require branches to be up to date*.
- *Do not allow bypassing the above settings* e bloqueio de *force push* e de exclusão da branch.

A regra só aparece na lista de checks depois que o workflow rodou pelo menos uma vez no repositório.

## Definição de pronto

Ver doc 06. Resumo: PR revisado, CI verde, teste do critério de aceite, sem PII, docs quando muda contrato, demonstrado na review.

## Métricas de processo (Scrum Master coleta e mostra na retro)

- Pontos planejados × entregues por sprint.
- Tempo médio de PR aberto → mesclado (meta ≤ 3 dias).
- Cobertura de testes (tendência).
- Itens reabertos após review.

## Como o PO participa sem virar gargalo

- Recebe o build da extensão (`dist.zip`) toda sexta com um roteiro de 5 minutos para testar.
- Responde perguntas do refinamento por escrito no quadro em até 48 h.
- Decisões que travam a sprint têm prazo: se o PO não responder em 72 h, vale a recomendação registrada no doc 10.

## Onboarding (checklist da Sprint 0)

1. Acesso ao repositório, ao quadro e ao grupo.
2. Ler docs 01, 02, 03 (2 h).
3. Subir backend nativo e em Docker; carregar a extensão em `chrome://extensions`.
4. Rodar `pytest` e `npm run build`.
5. Fazer um PR de "primeiro toque" (typo no README, teste pequeno) para exercitar o fluxo.
6. Assistir aos 6 vídeos dos ciclos anteriores (25 min no total).
