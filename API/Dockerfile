FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential curl git && rm -rf /var/lib/apt/lists/*

COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

RUN python -m spacy download pt_core_news_lg

# Modelos Vosk (B13): baixados no build, nao versionados no git.
# Fica ANTES do COPY do codigo para que alterar o codigo nao invalide
# a camada de ~67 MB de modelos.
COPY scripts/download_models.py /app/scripts/download_models.py
RUN python scripts/download_models.py

COPY . /app

EXPOSE 3001

# Healthcheck usado pelo compose para ordenar a subida dos servicos.
HEALTHCHECK --interval=30s --timeout=5s --start-period=90s --retries=3 \
    CMD curl -fsS http://localhost:3001/api/health || exit 1

CMD ["python", "server.py"]
