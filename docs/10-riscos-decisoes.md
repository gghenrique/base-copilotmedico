# 10 — Riscos e decisões pendentes

## Riscos

| ID | Risco | Prob. | Impacto | Sinal de alerta | Mitigação | Dono |
|---|---|---|---|---|---|---|
| R1 | Provedor de transcrição não definido / sem chave paga na Sprint 3 | Alta | Alto | S0 termina sem decisão do PO | Regra dos 72 h (doc 07): vale Gemini áudio com a chave já existente; Vosk como plano B | PO |
| R2 | DOM do Amplimed muda e quebra o adaptador | Média | Médio | Testes de fixture passam mas a página real falha | Fixture atualizada a cada sprint pela conta de teste; seletores com fallback; detecção de "nada extraído" com aviso | TL Front |
| R3 | Sem acesso a conta de teste do Amplimed | Média | Alto | Sprint 1 sem página real | PO consegue conta; enquanto isso, fixture gravada de uma sessão real (sem PII) | PO |
| R4 | e‑SUS PEC local difícil de subir | Média | Médio | Sprint 5 gasta > 2 dias no Docker do PEC | Instalar na Sprint 0 em uma máquina; se falhar até S4, PEC sai do escopo (regra do doc 06) | TL Back |
| R5 | Custo de API estoura | Baixa | Médio | Eval mostra > R$ 0,50/consulta | Chunking, modelo flash, cache de contexto; limite diário por médico | Qualidade |
| R6 | Equipe menor que 6 ou evasão no meio | Média | Alto | Velocidade cai 30 % em duas sprints | Escopo mínimo protegido: Épicos A, B, C, D; E reduz a Amplimed; F reduz a eval automática | SM |
| R7 | Qualidade da diarização insuficiente | Alta | Médio | Papéis < 80 % no eval | Gemini áudio com marcação de falantes; UI para corrigir papel; SOAP não depende do papel | TL Back |
| R8 | Dados reais entram em teste/demo | Baixa | Muito alto | Nome real em fixture, screenshot ou vídeo | Checklist do PR; revisão do responsável por privacidade; vídeos gravados com casos sintéticos | Privacidade |
| R9 | Confusão entre trilha privada e acadêmica | Média | Médio | Alunos tentam integrar Supabase/Vercel | Doc 03 fixa o escopo; ideias da v2.3 entram só como referência | PO |
| R10 | `audioop` / Python 3.13 no computador do aluno | Alta | Baixo | Erro de import na Sprint 0 | README exige 3.11–3.12; Docker resolve | TL Back |
| R11 | Piloto sem médicos disponíveis em dezembro | Média | Médio | Nenhuma agenda confirmada até 04/12 | Confirmar na Sprint 4; plano B: 1 médico + 2 estudantes de medicina | PO |
| R12 | Gemini muda API/SDK durante o semestre | Baixa | Médio | Deprecação anunciada | Camada `llm/provider.py`; versões travadas | TL Back |
| R13 | Instalação inacessível por falta de bootstrap/segredo (D‑22, D‑23) trava a Sprint 0 | Alta | Médio | Onboarding preso em 500/403 | B67: `API/.env.example` + compose com `AUTH_*`; script `bootstrap_admin`; README corrigido em 20/09 | TL Back |

Revisão dos riscos: a cada retrospectiva, o SM atualiza probabilidade/impacto e adiciona novos.

## Decisões pendentes do cliente

Cada item tem uma **recomendação**, que vale automaticamente se não houver resposta em 72 h após a Sprint 0 (regra do doc 07).

| # | Decisão | Opções | Recomendação | Prazo |
|---|---|---|---|---|
| P1 | Provedor de transcrição pago | (a) Gemini áudio — mesma chave, marcação de falantes; (b) Whisper large‑v3 via Groq — melhor WER em PT‑BR, chave nova; (c) Whisper local — precisa GPU | **DECIDIDO 15/09/2026: (a) Gemini áudio.** Whisper/Groq entra só como comparação no eval, se sobrar tempo | — |
| P2 | Quem paga as chaves de API durante o semestre | PO / disciplina / créditos gratuitos | PO fornece chave com limite mensal; equipe reporta custo no eval | 25/09 |
| P3 | Segundo PEP além do Amplimed | e‑SUS PEC (público, Docker oficial) / iClinic / nenhum | **DECIDIDO 15/09/2026: e‑SUS PEC.** | — |
| P4 | Futuro da trilha privada (Supabase/Vercel) | reativar em paralelo / congelar / migrar ideias para a v5.0 | **Congelar** durante o semestre; reavaliar em M4 com o eval em mãos | 09/10 |
| P5 | Médicos do piloto | Dr. Rui + Dra. Lorena + convidados | Confirmar dois nomes e datas até a Sprint 4 | 20/11 |
| P6 | Nome e owner do repositório único | organização `copilot-medico` / conta pessoal do PO | **DECIDIDO 15/09/2026:** repositório `ruypontes/copilot-medico` criado na conta do PO (privado). Em 20/09 a árvore do Grupo 2 foi integrada e a equipe começou a ser convidada. Resta transferir para uma organização com o professor como co‑owner e tornar público (branch protection só funciona em repositório público no plano gratuito) | 25/09 |
| P7 | Cadastro de identificação do paciente | obrigatório / opcional / nunca | **Opcional** e cifrado (ADR‑03); padrão é só pseudônimo | 23/10 |
| P8 | Exibir CID‑10 sugerido ao médico | sim / só a descrição | **Sim**, com confiança qualitativa e busca na tabela | 20/11 |
| P9 | Vídeos finais gravados com qual PEP | Amplimed real (conta de teste) / PEC local | Ambos, 1 min cada | 15/01 |
| P10 | Destino do sistema gerenciador web do Grupo 2 (`front/copmed-web`) | (a) manter só login, pacientes e aprovação de médicos, integrado à auth; (b) evoluir Consulta/Histórico na web em paralelo à extensão; (c) congelar | **Recomendação: (a)** — a extensão continua o produto principal; a web serve ao admin e à visão do prontuário. (b) só com ≥ 8 pessoas na equipe | 09/10 |
| P11 | Pacientes legados sem médico (`doctor_id` nulo, D‑24) | atribuir ao primeiro médico aprovado / manter só para o admin / apagar o seed e recomeçar | **Recomendação:** apagar o seed "João Silva" e migrar os demais para o médico do piloto na migração de banco (B21/B68) | 09/10 |

## Próximo ciclo (registrar desde já)

- Receitas e atestados com validade legal (assinatura ICP‑Brasil, integração com prescrição eletrônica).
- Terceiro e quarto PEP (iClinic, Tasy) pelo padrão de adaptador.
- Whisper local em GPU para eliminar envio de áudio.
- Publicação na Chrome Web Store com política de privacidade.
- RIPD e parecer jurídico para uso clínico rotineiro.
- Histórico pesquisável por palavra‑chave (US009 original).
