# 09 — Qualidade, testes e avaliação da IA

## 1. Pirâmide de testes

| Camada | Ferramenta | O que cobre | Meta |
|---|---|---|---|
| Unitário backend | pytest | anonimizador, formatação de SOAP, CID‑10, repositórios, provedores (mock) | ≥ 60 % cobertura total; ≥ 90 % em `anonymizer/` e `soap/` |
| Contrato de API | pytest + `app.test_client()` | cada rota: auth, validação, isolamento por médico | 100 % das rotas |
| Unitário front | Vitest + jsdom | adaptadores de PEP com fixtures HTML; `formatSoapForPep`; client de API (fila offline) | todos os adaptadores |
| Ponta a ponta | Playwright (Chromium com extensão carregada) | fluxo login → paciente → gravar (áudio de fixture) → SOAP → inserir na fixture do PEP | 1 cenário feliz por PEP, rodado no CI noturno |
| Vazamento de PII | pytest, marcado `@leak` | 20 casos + 10 transcrições: nenhum padrão sensível no payload capturado do provedor mockado | 0 ocorrências, bloqueante |
| Avaliação da IA | `eval/run_eval.py` | ver seção 3 | relatório por release |

Herança: os 7 arquivos de teste da Equipe 6 são consertados na Sprint 1 (alvos de `patch` corrigidos para `app.blueprints.*`) e migrados para pytest puro.

## 2. Fixtures

- `tests/fixtures/pep/amplimed-consulta.html` — página estática com os 8 `input[f_prontuario]` e as 4 `.note-editable` preenchidas com caso sintético.
- `tests/fixtures/pep/esus-pec-atendimento.html` — cabeçalho do cidadão + campo SOAP.
- `tests/fixtures/audio/*.wav` — 3 áudios curtos (10 s) para testes de rota; os 10 áudios de referência ficam em `eval/audio/` (Git LFS).
- `tests/fixtures/cases/*.json` — subconjunto dos 20 casos.

## 3. Avaliação da IA (`eval/`)

### 3.1 Casos de referência

20 casos clínicos **sintéticos**, escritos pela equipe e revisados pelo PO (médico), cobrindo atenção primária: infecção respiratória, dengue (caso da Equipe 3), hipertensão, diabetes, cefaleia (caso da Equipe 6), lombalgia, ansiedade, gastroenterite, ITU, dermatite, dor torácica de baixo risco, criança com febre, gestante com náusea, idoso com queda, entre outros. Cada caso tem:

```json
{
  "id": "caso-07-dengue",
  "prontuario": {"peso": "70", "altura": "1.75", "tempe": "38.9", "pas": "110", "pad": "70", "anamnese": "..."},
  "transcricao": [{"papel": "medico", "texto": "..."}, {"papel": "paciente", "texto": "..."}],
  "pdfs": ["hemograma-plaquetas-baixas.txt"],
  "gabarito": {
    "soap": {"subjetivo": "...", "objetivo": "...", "avaliacao": "...", "plano": "..."},
    "cid10": ["A90"],
    "cid10_capitulo": "I",
    "pendencias_esperadas": ["prova do laço", "sinais de alarme"]
  },
  "pii_plantada": ["Maria Aparecida", "123.456.789-00", "(85) 99999-1234"]
}
```

`pii_plantada` alimenta o teste de vazamento: cada valor é inserido no texto e não pode aparecer no payload externo.

### 3.2 Métricas

| Métrica | Como | Meta v5.0 |
|---|---|---|
| WER (transcrição) | `jiwer` sobre os 10 áudios × provedor | ≤ 20 % (pago); reportar Vosk |
| Acerto de papel | turnos com papel correto / total | ≥ 80 % |
| JSON válido | SOAP passa no `SoapV1` na 1ª tentativa | 100 % (com 1 retry) |
| Completude | 4 seções com ≥ 20 palavras cada | ≥ 90 % dos casos |
| CID‑10 capítulo | capítulo da 1ª hipótese = gabarito | ≥ 85 % |
| CID‑10 código | código de 3 caracteres = gabarito | ≥ 60 % (informativo) |
| Pendências | interseção com `pendencias_esperadas` | ≥ 50 % (informativo) |
| Alucinação de exame | menção a exame não presente no caso (lista fechada por caso) | 0 |
| Referências inventadas | regex de URL/DOI/"PubMed" na saída | 0 |
| Latência | p50 / p95 por rota | SOAP p95 ≤ 20 s |
| Custo | tokens × preço + minutos de áudio × preço | ≤ R$ 0,50 / consulta de 20 min |

### 3.3 Execução

```bash
make eval            # roda tudo com o provedor configurado em .env
make eval PROVIDER=vosk
```

Gera `eval/reports/YYYY-MM-DD-<provedor>-<prompt_versao>.md` com tabela por caso e agregados. O relatório da release entra em `docs/releases/v5.0.0-eval.md`. Comparar relatórios ao trocar prompt ou provedor é obrigatório antes de mesclar.

## 4. Piloto com médicos (Sprint 6)

- Participantes: ≥ 2 médicos (Dr. Rui, Dra. Lorena se disponível, + convidados).
- Protocolo: 10 consultas simuladas por médico (5 com paciente‑ator da equipe, 5 lendo casos), Amplimed de teste ou PEC local.
- Coleta: tempo até SOAP aprovado, número de edições no SOAP, SUS (10 perguntas), entrevista semiestruturada (o que atrapalhou, o que confiaria, o que não usaria).
- Saída: relatório de 3 páginas + itens de backlog priorizados para a Sprint 7.

## 5. Revisão de código e qualidade estática

- `ruff` (lint + format) e `mypy --strict` em `services/` no backend.
- `eslint` + `typescript-eslint` + `prettier` no front; regra que proíbe `any` fora de `pep/`.
- Limite de tamanho: função ≤ 60 linhas, arquivo ≤ 300 linhas (aviso no lint, não bloqueante).
- Revisão cruzada front/back uma vez por sprint.

## 6. Ambientes

| Ambiente | Onde | Dados |
|---|---|---|
| Dev | máquina do aluno, SQLite | sintéticos (`seed_dev.py`) |
| CI | GitHub Actions, Postgres em serviço | fixtures |
| Piloto | computador do médico, Docker, Postgres | consultas simuladas |
| Amplimed de teste | conta fornecida pelo PO | paciente fictício |
| e‑SUS PEC de teste | Docker oficial do MS, local | cidadão fictício |
