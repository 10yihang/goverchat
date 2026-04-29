from __future__ import annotations

"""
Whisper 语音识别服务（线程安全单例）
"""
import os
import logging
import threading
import time
import uuid

import config

logger = logging.getLogger(__name__)

_FFMPEG_CMD = (
    "ffmpeg -y -i {input} -ar 16000 -ac 1 -f wav {output} "
    "-loglevel error"
)


class ASRService:
    """
    Whisper 语音识别单例服务。
    preload() 在子线程异步加载模型，就绪前调用 transcribe() 返回 None。
    """

    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        self._model = None
        self._model_lock = threading.Lock()
        self._loading = False
        self._ready = False
        self._initialized = True

    # ── 加载 ──────────────────────────────────────────────────────

    def _do_preload(self) -> None:
        try:
            import whisper
            logger.info("[ASR] 开始加载 Whisper 模型：%s …", config.WHISPER_MODEL)
            t0 = time.perf_counter()
            model = whisper.load_model(config.WHISPER_MODEL)
            elapsed = time.perf_counter() - t0
            with self._model_lock:
                self._model = model
                self._ready = True
                self._loading = False
            logger.info("[ASR] Whisper 模型加载完成，耗时 %.2f s", elapsed)
        except Exception as e:
            self._loading = False
            logger.error("[ASR] Whisper 模型加载失败：%s", e)

    def preload(self) -> None:
        """在子线程异步加载模型（不阻塞 Flask 启动）"""
        if self._ready or self._loading:
            return
        self._loading = True
        t = threading.Thread(target=self._do_preload, daemon=True, name="whisper-loader")
        t.start()

    def is_ready(self) -> bool:
        return self._ready

    # ── 转录 ──────────────────────────────────────────────────────

    def transcribe(self, audio_path: str) -> str | None:
        """
        将音频文件转录为文本。

        流程：
        1. ffmpeg 将原始音频（WebM/MP3/M4A 等）转码为 16kHz 单声道 WAV
        2. whisper.transcribe() 返回中文文本
        3. 删除临时文件

        Returns:
            识别文本字符串；模型未就绪返回 None；识别失败返回 None
        """
        with self._model_lock:
            if not self._ready or self._model is None:
                return None

        # 生成临时 WAV 路径
        wav_path = os.path.join(
            config.UPLOAD_FOLDER,
            f"tmp_{uuid.uuid4().hex}.wav"
        )

        try:
            # ffmpeg 转码
            cmd = _FFMPEG_CMD.format(input=f'"{audio_path}"', output=f'"{wav_path}"')
            ret = os.system(cmd)
            if ret != 0 or not os.path.exists(wav_path):
                logger.error("[ASR] ffmpeg 转码失败，返回码 %d，文件：%s", ret, audio_path)
                return None

            # Whisper 转录
            with self._model_lock:
                result = self._model.transcribe(
                    wav_path,
                    language=config.WHISPER_LANG,
                    fp16=config.WHISPER_FP16,
                )
            text = result.get("text", "").strip()
            # Whisper 默认倾向输出繁体，统一转简体
            try:
                from zhconv import convert
                text = convert(text, "zh-cn")
            except ImportError:
                pass
            logger.info("[ASR] 转录结果：%s", text[:100])
            return text

        except Exception as e:
            logger.error("[ASR] transcribe 异常：%s", e)
            return None

        finally:
            # 清理临时文件
            for p in (audio_path, wav_path):
                try:
                    if p and os.path.exists(p):
                        os.remove(p)
                except OSError:
                    pass


# 全局单例
asr_service = ASRService()
