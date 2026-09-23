# syntax=docker/dockerfile:1
#
# eSUS-AB-PEC-*.jar e o instalador oficial (empacota Postgres 9.6 + app
# pec-bundle.jar). Build em 2 estagios: 1) roda o instalador em modo
# console pra gerar /opt/e-SUS; 2) copia so o resultado pra imagem final.

FROM mirror.gcr.io/library/eclipse-temurin:8-jdk-jammy AS installer

RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    apt-get update && apt-get install -y --no-install-recommends \
    procps sudo file locales

# locale pt_BR: instalador exige pra configurar o postgresql.conf
RUN sed -i 's/^# *pt_BR.UTF-8 UTF-8/pt_BR.UTF-8 UTF-8/' /etc/locale.gen \
    && locale-gen pt_BR.UTF-8

# /bin/sh -> bash: script de pos-instalacao do Postgres embutido (BitRock)
RUN ln -sf bash /bin/sh

# "file" falso: intercepta so "file -L /sbin/init" (checagem de arquitetura
# do instalador). Criar /sbin/init de verdade faria o instalador do Postgres
# tentar "systemctl start", que nao existe no container.
RUN printf '%s\n' \
    '#!/bin/sh' \
    'if [ "$*" = "-L /sbin/init" ]; then' \
    '    echo "/sbin/init: ELF 64-bit LSB executable, x86-64, version 1 (SYSV)"' \
    'else' \
    '    exec /usr/bin/file "$@"' \
    'fi' \
    > /usr/local/bin/file && chmod +x /usr/local/bin/file

# "ps" falso: intercepta so "ps --no-headers -o comm 1" (checagem de
# systemd do instalador); qualquer outro uso cai no binario real.
RUN printf '%s\n' \
    '#!/bin/sh' \
    'if [ "$*" = "--no-headers -o comm 1" ]; then' \
    '    echo systemd' \
    'else' \
    '    exec /usr/bin/ps "$@"' \
    'fi' \
    > /usr/local/bin/ps && chmod +x /usr/local/bin/ps

COPY eSUS-AB-PEC-5.5.28-Linux64.jar /tmp/installer.jar
WORKDIR /tmp

# heap explicito pros subprocessos do instalador (ex.: migration do
# schema), que sem isso estouram OutOfMemoryError
ENV JAVA_TOOL_OPTIONS="-Xmx2g"

# JDK 8, nao 17: a migration do instalador usa Liquibase antigo,
# incompativel com o encapsulamento de modulos do JDK 16+. So afeta o
# instalador -- o app final roda com seu proprio JRE 17 embutido.
#
# -console: modo texto | -continue: sem confirmacao S/N | -treinamento:
# ambiente de treino/teste
RUN java -jar /tmp/installer.jar -console -continue -treinamento \
    && rm -f /tmp/installer.jar

# Enxugar /opt/e-SUS antes de copiar pro runtime:
# - o instalador termina com o Postgres derrubado sem shutdown limpo e ~1GB
#   de WAL em pg_xlog. Subir (crash recovery; -t 600 pois passa de 60s),
#   parar limpo e rodar pg_resetxlog deixa 1 segmento (16MB). Seguro so
#   porque o cluster esta "shut down" nesse ponto.
# - pgAdmin, docs, headers, stackbuilder, desinstaladores e migrador.jar
#   (atualizacao de versao) nao sao usados no container.
RUN PG=/opt/e-SUS/database/postgresql-9.6.13-1-linux-x64 \
    && rm -f "$PG/data/postmaster.pid" \
    && sudo -u '#1000' "$PG/bin/pg_ctl" -D "$PG/data" -l /tmp/pg.log -w -t 600 start \
        -o "-c max_wal_size=32MB -c min_wal_size=32MB" \
    && sudo -u '#1000' "$PG/bin/pg_ctl" -D "$PG/data" -w -t 600 -m fast stop \
    && sudo -u '#1000' "$PG/bin/pg_resetxlog" "$PG/data" \
    && rm -rf "$PG/pgAdmin 4" "$PG/doc" "$PG/include" "$PG/stackbuilder" \
        "$PG/uninstall-postgresql" "$PG/installer" "$PG/data/pg_log/"* \
        /opt/e-SUS/desinstalador.jar /opt/e-SUS/database/tools/migrador.jar

# Heap do app: o PEC vem com -Xms2048M -Xmx4096M (~3GB de RAM). Com
# -Xmx1024M usa ~2GB e roda com limite de 2,5GB. O grep falha o build se
# uma versao nova do PEC mudar essa linha.
RUN F=/opt/e-SUS/webserver/standalone.sh \
    && grep -q -- '-Xms2048M -Xmx4096M' "$F" \
    && sed -i 's/-Xms2048M -Xmx4096M/-Xms256M -Xmx1024M/' "$F"

FROM mirror.gcr.io/library/ubuntu:jammy AS runtime

RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    apt-get update && apt-get install -y --no-install-recommends \
    procps locales \
    && sed -i 's/^# *pt_BR.UTF-8 UTF-8/pt_BR.UTF-8 UTF-8/' /etc/locale.gen \
    && locale-gen pt_BR.UTF-8

ENV LANG=pt_BR.UTF-8

# UID/GID 1000: mesmo usuario que o instalador do Postgres usou no estagio
# "installer". Necessario pra "su postgres" funcionar no entrypoint.sh,
# ja que data/ copiado abaixo tem dono numerico 1000.
RUN groupadd -g 1000 postgres \
    && useradd -u 1000 -g 1000 -m -s /bin/bash postgres

COPY --from=installer /opt/e-SUS /opt/e-SUS
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 8080

ENTRYPOINT ["/entrypoint.sh"]
