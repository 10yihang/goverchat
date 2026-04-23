from __future__ import annotations

"""
Business guide service backed by the shared transport service catalog.
"""

from services.service_catalog import service_catalog_service


class GuideService:
    def list_topics(self) -> list[dict]:
        topics = []
        for item in service_catalog_service.list_items():
            topics.append(
                {
                    "slug": item["slug"],
                    "title": item["title"],
                    "category": item["category"],
                    "summary": item["summary"],
                    "materials": item["materials"],
                    "steps": item["process_steps"],
                    "tips": item["tips"],
                    "qa_seed": item["qa_seed"],
                }
            )
        return topics

    def get_topic(self, slug: str) -> dict | None:
        item = service_catalog_service.get_item(slug)
        if item is None:
            return None
        return {
            "slug": item["slug"],
            "title": item["title"],
            "category": item["category"],
            "summary": item["summary"],
            "materials": item["materials"],
            "steps": item["process_steps"],
            "tips": item["tips"],
            "qa_seed": item["qa_seed"],
        }


guide_service = GuideService()
