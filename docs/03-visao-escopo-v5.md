# 03 — Visão e escopo da v5.0

## Visão

> Ao fim de uma consulta, o médico clica em **"Gerar SOAP"**, revisa um registro clínico estruturado (Subjetivo, Objetivo, Avaliação com CID‑10 sugerido, Plano) montado a partir da conversa gravada, do prontuário e dos exames enviados, e o insere no prontuário eletrônico com um clique — sem que nenhum dado identificável do paciente tenha saído do computador dele.

Quatro ciclos construíram a *entrada* (prontuário, PDF, áudio, chat). O quinto ciclo constrói a *saída* que devolve tempo ao médico: o registro pronto para o prontuário.

## Nome do ciclo

**CoPilot Médico 5.0 — "Da conversa ao prontuário"**

## Objetivos (mensuráveis)

| # | Objetivo | Métrica de sucesso (Sprint 7) |
|---|---|---|
| O1 | Base estável e testável | CI verde com ≥ 60 % de cobertura no backend; `docker compose up` sobe tudo; zero rotas chamadas pelo front sem implementação |
| O2 | Multiusuário com dados protegidos | Login por médico; banco relacional; nenhum nome, CPF, telefone, e‑mail ou endereço presente nos payloads enviados ao LLM (verificado por teste automatizado sobre 20 casos) |
| O3 | Transcrição confiável | WER ≤ 20 % em 10 áudios de referência em PT‑BR; papel Médico/Paciente correto em ≥ 80 % dos turnos |
| O4 | SOAP estruturado | JSON válido em 100 % das gerações; completude (4 seções preenchidas) ≥ 90 % nos 20 casos; zero referências bibliográficas inventadas (prompt não pede mais) |
| O5 | Volta para o prontuário | SOAP inserido no campo de evolução do Amplimed e lido/inserido no e‑SUS PEC (leitura + escrita em pelo menos um campo) |
| O6 | Piloto com médicos | ≥ 2 médicos, ≥ 10 consultas simuladas cada, questionário SUS (System Usability Scale) ≥ 70 |
| O7 | Handoff limpo | Repositório único com `docs/` atualizado, vídeo pitch + relatório técnico, release `v5.0.0` |

## Personas

- **Dra. Lorena (clínica geral, consultório com Amplimed).** Atende 20 pacientes/dia, digita durante a consulta, quer olhar para o paciente. Precisa que o SOAP chegue pronto no campo de evolução.
- **Dr. Rui (cliente, PO).** Quer validar se a IA ajuda de fato antes de investir mais; precisa de métricas e de LGPD defensável.
- **Médico de UBS (e‑SUS PEC).** Sem verba para software pago; usa o PEC do Ministério da Saúde; precisa que a extensão funcione sem instalar servidor (Docker no próprio computador).
- **Equipe 2026.2 (alunos).** 6–8 pessoas, 4 meses, notas dependem de entregas visíveis; precisam de tarefas pequenas e claras.

## Escopo — dentro

1. **Consolidação** da base v3.0 (diagnóstico D‑01…D‑21 priorizados).
2. **Persistência relacional** (SQLite em dev, PostgreSQL via Docker) com pseudonimização do paciente.
3. **Autenticação** de médico (e‑mail + senha, JWT) e isolamento de dados por médico.
4. **Pipeline de áudio v2:** consentimento registrado, gravação com pausa, envio em partes, transcrição por provedor pago (Gemini áudio ou Whisper), diarização por papel, fallback offline com Vosk.
5. **SOAP estruturado** com CID‑10 sugerido, gerado como JSON validado, editável na extensão, com trilha "gerado pela IA / editado pelo médico".
6. **Recomendações durante a consulta** (já existe) mantidas e testadas.
7. **Adaptador de PEP** com interface única: Amplimed (leitura + escrita), e‑SUS PEC (leitura + escrita em campo de evolução).
8. **Anonimização v2:** regex (CPF, RG, telefone, e‑mail, CEP, datas) + NER (PER, LOC) + mapa de pseudônimos reversível guardado localmente.
9. **Avaliação:** 20 casos clínicos sintéticos, 10 áudios de referência, métricas automáticas, piloto com médicos.
10. **Exportar consulta** em PDF/Markdown (fecha US010 de 2025).
11. **Documentação viva** em `docs/`, vídeos de pitch e relatório técnico.

## Escopo — fora (decisão consciente)

- Receitas, atestados, laudos e encaminhamentos gerados por IA (responsabilidade legal, assinatura digital ICP‑Brasil; fica para um ciclo dedicado).
- Publicação na Chrome Web Store (requer política de privacidade pública e revisão; a v5.0 é distribuída como `dist` zipado).
- Suporte a Tasy, MV, SISS, iClinic, SHOSP, Doctoralia, Pixeon (a arquitetura de adaptadores fica pronta; cada PEP novo é ~1 sprint).
- Aplicativo mobile ou desktop.
- Integração com o backend privado Supabase/Vercel.
- Faturamento, planos, multi‑clínica.
- Diagnóstico automático "final" — a IA sugere, o médico decide (regra de produto inegociável).

## Princípios de produto

1. **O médico aprova antes de gravar.** Nada gerado pela IA entra no prontuário sem passar por uma tela de edição com botão explícito.
2. **Dado identificável não sai do computador.** Pseudonimizar antes de qualquer chamada externa; o mapa de reversão fica no backend local do médico.
3. **Sem referências inventadas.** O prompt não pede citações; se o médico quiser literatura, a resposta diz "consulte diretrizes X" sem link fabricado.
4. **Funciona sem internet para o essencial.** Gravação e fila local não dependem de rede; transcrição e SOAP sim (com Vosk como plano B degradado).
5. **Cada sprint termina com algo demonstrável ao Dr. Rui.**

## Entregáveis por marco

| Marco | Data | Entregável demonstrável |
|---|---|---|
| M1 — Base estável | 09/10/2026 | Extração do Amplimed funciona de novo; CI verde; `docker compose up` |
| M2 — Consulta confiável | 06/11/2026 | Login, banco relacional, gravação com consentimento e transcrição via provedor pago, papéis Médico/Paciente |
| M3 — Da conversa ao prontuário | 04/12/2026 | SOAP + CID‑10 gerado, editado e inserido no Amplimed; leitura no e‑SUS PEC |
| M4 — Release v5.0 | 15/01/2027 | Relatório de avaliação, piloto, vídeos, tag `v5.0.0`, docs atualizados |
