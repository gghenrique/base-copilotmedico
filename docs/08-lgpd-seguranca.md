# 08 — LGPD e segurança

O CoPilot Médico trata **dados pessoais sensíveis** (dados de saúde, LGPD art. 5º, II) de pacientes que não são usuários do sistema, em nome de um médico (controlador). Este documento define o mínimo que a v5.0 precisa ter para ser usada num piloto com segurança jurídica razoável. Não substitui parecer jurídico.

## 1. Papéis e bases legais

| Agente | Papel LGPD | Base legal |
|---|---|---|
| Médico / clínica | Controlador | Tutela da saúde (art. 11, II, f) para o registro clínico; consentimento específico (art. 11, I) para a **gravação de áudio** e para o envio a provedores externos de IA |
| CoPilot Médico (backend local) | Operador (quando roda em servidor da clínica) ou ferramenta do controlador (quando roda no computador do médico) | — |
| Google (Gemini), Groq (Whisper) | Suboperadores internacionais | Transferência internacional (art. 33) — só recebem dados **pseudonimizados**, sem identificação direta |
| Equipe da disciplina | Não deve tratar dados reais | Todo desenvolvimento e teste usa dados sintéticos |

## 2. Regras de produto derivadas

1. **Minimização.** O backend guarda de paciente apenas: pseudônimo, sexo, ano de nascimento. Nome/CPF/telefone ficam na tabela `pseudonimo`, cifrada com chave derivada da senha do médico, e só existem se o médico optar por cadastrar identificação.
2. **Pseudonimização antes de sair.** Toda chamada externa (LLM, transcrição) recebe texto/áudio sem identificadores diretos. Teste automatizado de vazamento faz parte do CI (US016‑CA003).
3. **Consentimento da gravação.** Antes de gravar, a extensão exige registrar o consentimento (verbal, com data/hora e versão do texto lido ao paciente, ou termo anexado). Texto sugerido para o médico ler:

   > "Esta consulta pode ser gravada para ajudar na documentação do seu atendimento. O áudio é transcrito e apagado; seu nome e documentos são removidos antes de qualquer processamento por serviço externo. Você pode recusar sem prejuízo ao atendimento. Você autoriza?"

4. **Áudio não persiste.** Apagado do servidor após a transcrição; nunca enviado com metadados (nome do arquivo = id da consulta).
5. **Direitos do titular.** Rota administrativa para o médico exportar ou apagar tudo de um paciente (`DELETE /api/patients/<id>` apaga em cascata e o mapa de pseudônimos).
6. **Retenção.** Transcrições e SOAPs seguem a retenção do prontuário do médico (responsabilidade dele); logs de auditoria: 12 meses.
7. **Sem dados reais no desenvolvimento.** Casos, áudios e fixtures são sintéticos; o piloto usa consultas **simuladas** (pacientes‑ator ou casos lidos). Uso com pacientes reais só após parecer do PO e, idealmente, de um comitê de ética se houver publicação.
8. **Transparência.** A resposta da IA sempre traz o aviso de validação médica; o SOAP inserido no prontuário indica "rascunho gerado com apoio de IA, revisado pelo médico".

## 3. Ameaças e mitigações

| Ameaça | Cenário | Mitigação | Item |
|---|---|---|---|
| Página maliciosa lê a API local | Site aberto no navegador chama `localhost:3001/api/all-patients` | JWT obrigatório; CORS só para a origem da extensão; content script só em domínios de PEP | US014, US019‑CA004 |
| Vazamento de PII para provedor externo | Nome dito no áudio ou escrito no chat vai para o Gemini | Anonimizador em duas camadas + teste de vazamento; lista de nomes do cadastro do próprio médico usada como dicionário | US016 |
| Chave de API exposta | Chave no repositório ou em endpoint de health | `.env` + GitHub Secrets; `/api/health` sem chaves; `gitleaks` no CI | ADR‑08 |
| Banco copiado | Alguém copia `app.db` do computador do médico | Tabela `pseudonimo` cifrada; senha do médico nunca em claro; orientação de disco cifrado (BitLocker/FileVault) no manual | US015‑CA004 |
| Extensão em site errado | Content script injetado em internet banking | `host_permissions` específicos; sem `<all_urls>` | US019‑CA004 |
| Modelo alucina conduta | SOAP com exame "já realizado" que não existe | Prompt proíbe; seção `pendencias`; médico aprova antes de inserir; eval mede | US018 |
| Dependência vulnerável | Pacote Python/npm com CVE | `pip-audit` e `npm audit` no CI; versões travadas | ADR‑08 |
| Áudio esquecido no servidor | Falha durante a transcrição deixa `.wav` em `/tmp` | `finally` apaga; job diário limpa; teste cobre o caminho de erro | US017‑CA007 |
| Log com conteúdo clínico | `print()` de transcrição no console do servidor | Logging estruturado sem conteúdo; lint que proíbe `print` no backend | RNF08 |

## 4. Checklist LGPD do PR (copiado no template)

- [ ] Nenhum dado real de paciente em código, teste, fixture, screenshot ou log.
- [ ] Novo campo de paciente? Está na tabela certa (pseudonimizado vs. cifrado)?
- [ ] Nova chamada externa? Passa por `anonymize()` e registra auditoria?
- [ ] Novo log? Sem conteúdo clínico.
- [ ] Nova permissão no `manifest.json`? Justificada no PR.

## 5. Checklist de release (Sprint 7)

- [ ] `gitleaks` limpo no histórico do repositório novo.
- [ ] Teste de vazamento com 20 casos + 10 áudios: zero ocorrências.
- [ ] `pip-audit` / `npm audit` sem críticos.
- [ ] `manifest.json` sem `<all_urls>`; permissões mínimas.
- [ ] `/api/health` sem chaves.
- [ ] Manual do médico com: instalação, consentimento, como apagar um paciente, quem contatar.
- [ ] Política de privacidade em `docs/politica-privacidade.md` (necessária para futura Chrome Web Store).

## 6. O que fica para depois (registrar, não implementar agora)

- Relatório de Impacto à Proteção de Dados (RIPD) formal — necessário antes de uso clínico rotineiro.
- Contratos com suboperadores (DPA da Google/Groq) — verificar termos empresariais.
- Assinatura digital de documentos (ICP‑Brasil) — só quando entrarem receitas/atestados.
- Anonimização em áudio (mascarar nome antes de enviar o WAV) — hoje o áudio vai íntegro ao provedor de transcrição; mitigado pelo consentimento e pela escolha de provedor com política de não‑retenção. Avaliar Whisper local (faster‑whisper) em máquina com GPU no próximo ciclo.
