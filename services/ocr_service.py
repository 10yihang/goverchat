"""
OCR service backed by the local Tesseract executable.
"""
from __future__ import annotations

import logging
import os
import shutil
import subprocess
from functools import lru_cache

import config

logger = logging.getLogger(__name__)


class OcrService:
    def __init__(self) -> None:
        self._common_windows_paths = (
            r"C:\Program Files\Tesseract-OCR\tesseract.exe",
            r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
        )

    @lru_cache(maxsize=1)
    def _resolve_command(self) -> str:
        if config.TESSERACT_CMD:
            return config.TESSERACT_CMD

        command = shutil.which("tesseract") or shutil.which("tesseract.exe")
        if command:
            return command

        for candidate in self._common_windows_paths:
            if os.path.exists(candidate):
                return candidate

        return ""

    def is_enabled(self) -> bool:
        return config.OCR_ENABLED

    def is_ready(self) -> bool:
        return self.is_enabled() and bool(self._resolve_command())

    def status(self) -> str:
        if not self.is_enabled():
            return "disabled"
        if self.is_ready():
            return "ready"
        return "missing_tesseract"

    def extract_text(self, image_path: str) -> str:
        if not self.is_enabled():
            raise RuntimeError("OCR is disabled by configuration.")

        command = self._resolve_command()
        if not command:
            raise RuntimeError(
                "Tesseract OCR is not installed or not found in PATH. "
                "Set TESSERACT_CMD if it is installed in a custom location."
            )

        args = [
            command,
            image_path,
            "stdout",
            "-l",
            config.OCR_LANG,
            "--psm",
            str(config.OCR_PSM),
        ]

        logger.info("[OCR] Running Tesseract for %s", image_path)
        completed = subprocess.run(
            args,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="ignore",
            timeout=config.OCR_TIMEOUT,
            check=False,
        )

        if completed.returncode != 0:
            message = completed.stderr.strip() or completed.stdout.strip() or "OCR failed."
            raise RuntimeError(message)

        text = self._normalize_text(completed.stdout)
        if len(text) < config.OCR_MIN_TEXT_LENGTH:
            raise RuntimeError("No recognizable text was found in the uploaded image.")

        return text

    @staticmethod
    def _normalize_text(text: str) -> str:
        lines = [line.strip() for line in text.splitlines()]
        lines = [line for line in lines if line]
        return "\n".join(lines)


ocr_service = OcrService()
