## Objetivo

<!-- Qual estória / achado? Ex.: US018 — editor SOAP; D-01 — rota pep-import -->

## O que mudou

-

## Como testar

1.

## Checklist

- [ ] CI verde (pytest, ruff, eslint, tsc, build)
- [ ] Teste automatizado cobre o critério de aceite
- [ ] Docs tocados se mudou contrato de API, modelo de dados ou fluxo do usuário
- [ ] Screenshot/gif se mudou UI

### LGPD e segurança

- [ ] Nenhum dado real de paciente em código, teste, fixture, screenshot ou log
- [ ] Novo campo de paciente está na tabela certa (pseudonimizado vs. cifrado)
- [ ] Nova chamada externa passa por `anonymize()` e registra auditoria
- [ ] Novo log não contém conteúdo clínico
- [ ] Nova permissão no `manifest.json` justificada aqui
- [ ] Nenhuma chave, token ou `.env` no diff
