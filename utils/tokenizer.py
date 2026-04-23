"""
Jieba 分词 + 停用词过滤工具
政务自定义词典和停用词表在模块首次导入时自动加载
"""
import os
import jieba
import jieba.analyse

_BASE_DIR   = os.path.dirname(__file__)
_DICT_PATH  = os.path.join(_BASE_DIR, "gov_dict.txt")
_STOP_PATH  = os.path.join(_BASE_DIR, "stopwords.txt")

_stopwords: set[str] = set()
_initialized = False


def _init():
    global _initialized, _stopwords
    if _initialized:
        return

    # 加载政务自定义词典
    if os.path.exists(_DICT_PATH):
        jieba.load_userdict(_DICT_PATH)

    # 加载停用词
    if os.path.exists(_STOP_PATH):
        with open(_STOP_PATH, encoding="utf-8") as f:
            _stopwords = {line.strip() for line in f if line.strip()}

    jieba.initialize()
    _initialized = True


def tokenize(text: str) -> list[str]:
    """
    对输入文本进行分词并过滤停用词。

    Returns:
        词语列表，去除停用词后的结果
    """
    _init()
    tokens = jieba.cut(text.strip(), cut_all=False)
    return [t for t in tokens if t.strip() and t not in _stopwords and len(t) > 1]


def tokenize_to_str(text: str) -> str:
    """分词结果以空格拼接，供 TfidfVectorizer 使用"""
    return " ".join(tokenize(text))
