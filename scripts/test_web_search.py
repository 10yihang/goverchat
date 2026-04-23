from __future__ import annotations

"""
简单测试当前 WEB_SEARCH_* 配置能否拿到搜索结果。
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from services.web_search_service import web_search_service


def main() -> None:
    query = "如何办理户口迁移"
    results = web_search_service.search(query)
    print(f"enabled={web_search_service.is_enabled()}")
    print(f"query={query}")
    print(f"result_count={len(results)}")
    for idx, item in enumerate(results[:5], start=1):
        print("-" * 50)
        print(f"#{idx} {item.get('title')}")
        print(f"url={item.get('url')}")
        print(f"category={item.get('category')}")
        print(f"official={item.get('is_official')}")
        print(f"snippet={item.get('snippet')}")


if __name__ == "__main__":
    main()
