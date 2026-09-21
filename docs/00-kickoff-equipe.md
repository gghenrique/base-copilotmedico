# CoPilot Médico 5.0 — Kickoff da equipe 2026.2

**De:** Dr. Rui Pontes (cliente / Product Owner)
**Para:** equipe de Engenharia de Software — ciclo 2026.2
**Data:** 15/09/2026
**Repositório:** https://github.com/ruypontes/copilot-medico

---

## Bem‑vindos ao quinto ciclo

O CoPilot Médico é uma extensão do Chrome que assiste o médico durante a consulta: lê o prontuário eletrônico, ouve a conversa, recebe exames em PDF e conversa com uma IA para apoiar a decisão clínica. Quatro equipes já passaram por aqui — a Equipe 3 (2024.2) fez a prova de conceito com GPT‑4, a Equipe 4 (2025.1) migrou para o Gemini e cuidou de privacidade e histórico, a Equipe 6 (2025.2) colocou a gravação de áudio com identificação de quem fala.

Vocês recebem uma base que **funciona como demonstração**, mas ainda não como ferramenta de uso diário. O tema do ciclo de vocês é fechar essa distância e entregar a primeira funcionalidade de valor clínico direto:

> **Da conversa ao prontuário.** Ao fim da consulta, o médico clica em "Gerar SOAP", revisa um registro clínico estruturado (Subjetivo, Objetivo, Avaliação com CID‑10 sugerido, Plano) montado a partir da gravação, do prontuário e dos exames, e o insere no prontuário eletrônico com um clique — sem que nenhum dado identificável do paciente saia do computador dele.

## O que já está decidido

| Decisão | Escolha |
|---|---|
| Transcrição de áudio | **Gemini áudio** (mesma chave do chat; devolve transcrição com falantes). Vosk local continua como plano B offline |
| Segundo prontuário além do Amplimed | **e‑SUS PEC** (prontuário público do Ministério da Saúde; roda em Docker local) |
| Repositório | `ruypontes/copilot-medico` — código da v3.0 com o histórico das equipes anteriores + pasta `docs/` com todo o planejamento |
| Stack | Mantida: extensão React + TypeScript, backend Flask, Gemini. Sem migração de framework |
| Fora do escopo | Receitas e atestados por IA, Chrome Web Store, outros prontuários além dos dois, app mobile |

## Os quatro marcos

| Marco | Data | O que eu vou testar na review |
|---|---|---|
| M1 — Base estável | 09/10 | Extração do Amplimed funciona de novo; CI verde com testes; `docker compose up` sobe tudo |
| M2 — Consulta confiável | 06/11 | Login por médico; banco relacional; gravação com consentimento e transcrição via Gemini com papéis médico/paciente |
| M3 — Da conversa ao prontuário | 04/12 | SOAP com CID‑10 gerado, editado, aprovado e inserido no Amplimed; leitura e escrita no e‑SUS PEC |
| M4 — Release v5.0 | 15/01 | Relatório de avaliação com métricas, piloto com médicos, vídeos, tag `v5.0.0` |

Oito sprints de duas semanas, review toda sexta da segunda semana comigo presente. Recesso de 21/12 a 03/01.

## Sprint 0 — até sexta 25/09

Checklist para cada pessoa:

1. Aceitar o convite do repositório e entrar no grupo da equipe.
2. Ler, nesta ordem: `README.md`, `docs/01` (histórico), `docs/02` (diagnóstico), `docs/03` (escopo). Uma hora e meia.
3. Subir o backend e a extensão localmente seguindo o README. Anotar no quadro tudo que travou — isso vira tarefa.
4. Assistir aos seis vídeos das equipes anteriores (25 minutos no total; links no README).
5. Fazer um PR pequeno (um typo, um teste) para passar pelo fluxo completo uma vez.

Checklist da equipe:

6. Definir papéis (abaixo) e me mandar a lista até **sexta 19/09**.
7. Criar o quadro no GitHub Projects e importar `backlog/backlog-v5.csv` (66 itens, já estimados e distribuídos por sprint).
8. Uma pessoa instala o e‑SUS PEC em Docker e documenta em `docs/` (item B06). Se travar por mais de dois dias, me avisem.
9. Planejamento da Sprint 1 na segunda 28/09, 60 minutos, comigo.

## Papéis a preencher

- **Scrum Master** — cerimônias, quadro, impedimentos.
- **Tech Lead Backend** — Flask, banco, Gemini, transcrição. Revisa todo PR de backend.
- **Tech Lead Frontend** — extensão, adaptadores de prontuário, UI. Revisa todo PR de front.
- **Responsável por Privacidade** — anonimização, consentimento, checklist LGPD em cada PR.
- **Responsável por Qualidade** — testes, CI, casos de referência, avaliação, piloto.
- **Devs** — todos os demais.

Os papéis de liderança podem rotacionar depois da Sprint 3.

## Cinco regras que não se negociam

1. **Nenhum dado real de paciente**, nunca — nem em teste, fixture, screenshot, vídeo ou conversa com a IA. Todos os casos são sintéticos. O piloto usa consultas simuladas.
2. **Nada da IA entra no prontuário sem o médico editar e aprovar** com um clique explícito. A IA sugere; o médico decide.
3. **Dado identificável não sai do computador.** Tudo passa pelo anonimizador antes de qualquer chamada externa. Há um teste automático para isso e ele bloqueia o merge.
4. **O prompt não pede referências bibliográficas nem percentuais.** As equipes anteriores pediam e o modelo inventava links. Confiança é qualitativa.
5. **Nenhuma chave de API em commit.** Os repositórios das equipes anteriores têm duas chaves vazadas no histórico público (uma Gemini, uma OpenAI). Eu já limpei o histórico do repositório novo e vou revogar as chaves. Chave fica em `.env`, que está no `.gitignore`; no CI, em GitHub Secrets. Quem commitar chave refaz o PR.

## Como trabalhamos

- `develop` é a integração; `main` só recebe releases. Branch por estória: `feat/US018-soap-editor`.
- Todo PR: CI verde, teste do critério de aceite, checklist LGPD marcado, um revisor da outra ponta (front revisa back e vice‑versa pelo menos uma vez por sprint).
- Daily assíncrona no grupo até 10h: fiz / farei / impedimento.
- Eu recebo o build da extensão (`dist.zip`) toda sexta com um roteiro de cinco minutos para testar.
- Perguntas para mim vão no quadro; respondo em até 48 h. Decisão que trava a sprint tem prazo de 72 h — se eu não responder, vale a recomendação registrada em `docs/10`.

## O que ainda depende de mim

Estão em `docs/10`, seção "Decisões pendentes". As que afetam vocês cedo: quem paga a chave Gemini e qual o limite mensal (respondo até 25/09) e os nomes dos médicos do piloto (até 20/11).

## Leitura completa

| Arquivo | O que é | Quando ler |
|---|---|---|
| `README.md` | Índice e resumo | Agora |
| `docs/01` | O que cada equipe fez, extraído dos vídeos e do git | Sprint 0 |
| `docs/02` | Diagnóstico do código: 21 achados que definem a ordem das sprints | Sprint 0 |
| `docs/03` | Visão, objetivos mensuráveis, dentro/fora do escopo | Sprint 0 |
| `docs/04` | Estórias US011–US024 com critérios de aceite | Ao pegar a estória |
| `docs/05` | Arquitetura alvo, modelo de dados, contrato de API, ADRs | Tech leads na Sprint 0; todos na Sprint 1 |
| `docs/06` | Roadmap sprint a sprint, definição de pronto | Sprint 0 |
| `docs/07` | Papéis, cerimônias, fluxo de código | Sprint 0 |
| `docs/08` | LGPD e segurança: consentimento, ameaças, checklists | Responsável por privacidade na Sprint 0; todos até a Sprint 2 |
| `docs/09` | Testes, casos de referência, métricas, piloto | Responsável por qualidade na Sprint 0 |
| `docs/10` | Riscos e decisões pendentes | Scrum master |
| `docs/anexos/A` | Transcrições dos seis vídeos | Consulta |
| `docs/anexos/B` | Inventário técnico dos repositórios | Consulta |
| `backlog/backlog-v5.csv` | 66 itens, 256 pontos, por sprint | Importar no quadro |

Bom ciclo. A régua é simples: cada sprint termina com algo que eu consigo usar numa consulta simulada.

— Rui
