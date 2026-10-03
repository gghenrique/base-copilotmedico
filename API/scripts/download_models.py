#!/usr/bin/env python3
"""
Baixa e extrai os modelos Vosk usados pela diarizacao (B13).

Os modelos somavam ~67 MB no repositorio e foram removidos do versionamento.
Este script os reconstroi em `API/backend/` de forma idempotente: se o modelo
ja existe e esta integro, nada e baixado novamente.

Uso:
    python scripts/download_models.py             # baixa o que estiver faltando
    python scripts/download_models.py --force     # rebaixa tudo
    python scripts/download_models.py --check     # so verifica, nao baixa (CI)
"""
from __future__ import annotations

import argparse
import shutil
import sys
import tempfile
import urllib.error
import urllib.request
import zipfile
from dataclasses import dataclass, field
from pathlib import Path

# Destino: API/backend/ (mesmo caminho que server.py monta em MODEL_PATH/SPK_MODEL_PATH)
BACKEND_DIR = Path(__file__).resolve().parent.parent / "backend"

BASE_URL = "https://alphacephei.com/vosk/models"


@dataclass(frozen=True)
class VoskModel:
    """Um modelo Vosk e os arquivos que provam que a extracao terminou."""

    name: str
    # Arquivos obrigatorios: se algum faltar, o diretorio e considerado corrompido
    # (download interrompido pela metade) e sera refeito.
    required_files: tuple[str, ...] = field(default=())

    @property
    def url(self) -> str:
        return f"{BASE_URL}/{self.name}.zip"

    @property
    def target_dir(self) -> Path:
        return BACKEND_DIR / self.name

    def is_complete(self) -> bool:
        if not self.target_dir.is_dir():
            return False
        return all((self.target_dir / f).exists() for f in self.required_files)


MODELS: tuple[VoskModel, ...] = (
    # Reconhecimento de fala em portugues
    VoskModel(
        name="vosk-model-small-pt-0.3",
        required_files=("final.mdl", "HCLr.fst", "Gr.fst", "mfcc.conf"),
    ),
    # Identificacao de falante (diarizacao medico/paciente)
    VoskModel(
        name="vosk-model-spk-0.4",
        required_files=("final.ext.raw", "mean.vec", "transform.mat"),
    ),
)


def _human(num_bytes: int) -> str:
    size = float(num_bytes)
    for unit in ("B", "KB", "MB", "GB"):
        if size < 1024 or unit == "GB":
            return f"{size:.1f} {unit}"
        size /= 1024
    return f"{size:.1f} GB"


def _report_progress(block_num: int, block_size: int, total_size: int) -> None:
    """Callback de progresso do urlretrieve, em uma unica linha."""
    if total_size <= 0:
        return
    downloaded = min(block_num * block_size, total_size)
    pct = downloaded * 100 / total_size
    print(
        f"\r    {pct:5.1f}%  ({_human(downloaded)} / {_human(total_size)})",
        end="",
        flush=True,
    )


def _extract_into_backend(zip_path: Path, model: VoskModel) -> None:
    """
    Extrai o zip e move o conteudo para `backend/<nome-do-modelo>`.

    Os zips do Vosk ja trazem a pasta raiz com o nome do modelo, mas extraimos
    para um diretorio temporario antes de mover: assim uma extracao interrompida
    nunca deixa um modelo pela metade no destino final.
    """
    with tempfile.TemporaryDirectory() as tmp:
        tmp_path = Path(tmp)
        with zipfile.ZipFile(zip_path) as archive:
            archive.extractall(tmp_path)

        extracted_root = tmp_path / model.name
        if not extracted_root.is_dir():
            # Alguns zips podem vir sem a pasta raiz esperada; usa o unico dir presente.
            candidates = [d for d in tmp_path.iterdir() if d.is_dir()]
            if len(candidates) != 1:
                raise RuntimeError(
                    f"Estrutura inesperada no zip de {model.name}: {candidates}"
                )
            extracted_root = candidates[0]

        # Troca atomica-ish: remove o destino antigo so depois da extracao dar certo.
        if model.target_dir.exists():
            shutil.rmtree(model.target_dir)
        shutil.move(str(extracted_root), str(model.target_dir))


def download_model(model: VoskModel, force: bool = False) -> bool:
    """Garante que `model` esteja presente. Retorna True se baixou algo."""
    if model.is_complete() and not force:
        print(f"[OK]   {model.name} ja presente - pulando.")
        return False

    if model.target_dir.exists() and not force:
        print(f"[WARN] {model.name} incompleto - refazendo download.")

    print(f"[..]   Baixando {model.name}")
    print(f"       {model.url}")

    with tempfile.TemporaryDirectory() as tmp:
        zip_path = Path(tmp) / f"{model.name}.zip"
        try:
            urllib.request.urlretrieve(model.url, zip_path, _report_progress)
            print()  # fecha a linha do progresso
        except urllib.error.URLError as exc:
            print()
            raise RuntimeError(f"Falha ao baixar {model.url}: {exc}") from exc

        print(f"[..]   Extraindo {model.name}")
        _extract_into_backend(zip_path, model)

    if not model.is_complete():
        raise RuntimeError(
            f"{model.name} continua incompleto apos a extracao. "
            f"Esperado em {model.target_dir}: {model.required_files}"
        )

    print(f"[OK]   {model.name} pronto em {model.target_dir}")
    return True


def check_only() -> int:
    """Modo --check: nao baixa nada, so reporta o que falta."""
    missing = [m.name for m in MODELS if not m.is_complete()]
    if missing:
        print("Modelos ausentes ou incompletos:")
        for name in missing:
            print(f"  - {name}")
        print("\nRode: python scripts/download_models.py")
        return 1
    print("Todos os modelos Vosk estao presentes.")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--force", action="store_true", help="Rebaixa os modelos mesmo se ja existirem."
    )
    parser.add_argument(
        "--check",
        action="store_true",
        help="Apenas verifica a presenca dos modelos (exit 1 se faltar algum).",
    )
    args = parser.parse_args()

    if args.check:
        return check_only()

    BACKEND_DIR.mkdir(parents=True, exist_ok=True)
    print(f"Destino: {BACKEND_DIR}\n")

    downloaded = 0
    for model in MODELS:
        try:
            if download_model(model, force=args.force):
                downloaded += 1
        except RuntimeError as exc:
            print(f"[ERRO] {exc}", file=sys.stderr)
            return 1

    print(
        f"\nConcluido. {downloaded} modelo(s) baixado(s), "
        f"{len(MODELS) - downloaded} ja presente(s)."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
