"""
一次性导入政务大厅数据到 gov_hall 表。
执行方式：python3 scripts/import_halls.py [--truncate]
--truncate: 清空后重新导入；默认追加（跳过已存在的 id）
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from models.db import execute, get_pool_connection


def existing_ids() -> set[str]:
    rows = execute("SELECT id FROM gov_hall", fetchall=True) or []
    return {r["id"] for r in rows}


def insert_hall(h: dict) -> bool:
    try:
        execute(
            """INSERT INTO gov_hall
               (id, name, short_name, address, lat, lng, phone, city, district,
                hours_weekday, hours_saturday, hours_sunday,
                services, windows, tags, parking, transit)
             VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
            (
                h["id"], h["name"], h.get("short_name", ""),
                h["address"], h["lat"], h["lng"],
                h.get("phone", ""), h.get("city", ""), h.get("district", ""),
                h.get("hours_weekday"), h.get("hours_saturday"), h.get("hours_sunday"),
                json.dumps(h.get("services", []), ensure_ascii=False),
                h.get("windows", 0),
                json.dumps(h.get("tags", []), ensure_ascii=False),
                1 if h.get("parking") else 0,
                h.get("transit", ""),
            ),
            commit=True,
        )
        return True
    except Exception as exc:
        print(f"  SKIP {h['id']}: {exc}")
        return False


HEILONGJIANG_HALLS: list[dict] = [
    {"id":"hall-hlj-province","name":"黑龙江省政务服务中心","short_name":"省政务中心","address":"哈尔滨市南岗区中山路181号市民大厦3楼B区","lat":45.7606,"lng":126.6550,"phone":"0451-58652001","city":"哈尔滨","district":"南岗区","hours_weekday":"08:00-16:45","hours_saturday":None,"hours_sunday":None,"services":["driver-license-renewal","driver-license-reissue","vehicle-transfer","violation-handling","plate-service","vehicle-inspection"],"windows":50,"tags":["省级政务","综合政务","一站式"],"parking":True,"transit":"地铁1号线博物馆站步行10分钟"},
    {"id":"hall-harbin","name":"哈尔滨市政务服务中心","short_name":"哈尔滨市民大厦","address":"哈尔滨市南岗区中山路181号市民大厦","lat":45.7606,"lng":126.6550,"phone":"0451-87153333","city":"哈尔滨","district":"南岗区","hours_weekday":"08:30-16:30","hours_saturday":None,"hours_sunday":None,"services":["driver-license-renewal","driver-license-reissue","vehicle-transfer","violation-handling","plate-service"],"windows":87,"tags":["市级政务","综合政务","市民服务"],"parking":True,"transit":"地铁1号线博物馆站步行10分钟"},
    {"id":"hall-qqhr","name":"齐齐哈尔市政务服务中心","short_name":"齐齐哈尔政务中心","address":"齐齐哈尔市建华区新明大街29号","lat":47.3543,"lng":123.9182,"phone":"0452-2799035","city":"齐齐哈尔","district":"建华区","hours_weekday":"08:30-16:30","hours_saturday":None,"hours_sunday":None,"services":["driver-license-renewal","vehicle-transfer","violation-handling","plate-service"],"windows":58,"tags":["市级政务","综合政务"],"parking":True,"transit":"公交新明大街站"},
    {"id":"hall-mudanjiang-business","name":"牡丹江市政务服务中心（涉企厅）","short_name":"牡丹江涉企厅","address":"牡丹江市东安区卧龙街6号","lat":44.5850,"lng":129.6080,"phone":"0453-6958002","city":"牡丹江","district":"东安区","hours_weekday":"08:30-17:00","hours_saturday":None,"hours_sunday":None,"services":["driver-license-renewal","vehicle-transfer","ride-hailing-license"],"windows":30,"tags":["市级政务","涉企服务"],"parking":True,"transit":"公交卧龙街站"},
    {"id":"hall-mudanjiang-livelihood","name":"牡丹江市政务服务中心（民生厅）","short_name":"牡丹江民生厅","address":"牡丹江市江南八面通街莲花湖路南68号","lat":44.5814,"lng":129.6297,"phone":"0453-6430315","city":"牡丹江","district":"江南新区","hours_weekday":"08:30-17:00","hours_saturday":None,"hours_sunday":None,"services":["driver-license-renewal","driver-license-reissue","violation-handling","plate-service"],"windows":25,"tags":["市级政务","民生服务"],"parking":True,"transit":"公交江南新区站"},
    {"id":"hall-jms","name":"佳木斯市政务服务中心","short_name":"佳木斯政务中心","address":"佳木斯市郊区长安西路820号（行政中心8号楼）","lat":46.7998,"lng":130.3257,"phone":"0454-8602868","city":"佳木斯","district":"郊区","hours_weekday":"08:30-16:30","hours_saturday":None,"hours_sunday":None,"services":["driver-license-renewal","driver-license-reissue","vehicle-transfer","violation-handling"],"windows":35,"tags":["市级政务","综合政务"],"parking":True,"transit":"公交行政中心站"},
    {"id":"hall-daqing","name":"大庆市行政服务中心","short_name":"大庆政务中心","address":"大庆市萨尔图区政西街2号","lat":46.5903,"lng":125.1046,"phone":"0459-6158890","city":"大庆","district":"萨尔图区","hours_weekday":"08:30-16:50","hours_saturday":None,"hours_sunday":None,"services":["driver-license-renewal","driver-license-reissue","vehicle-transfer","vehicle-inspection","plate-service"],"windows":40,"tags":["市级政务","综合政务"],"parking":True,"transit":"公交市政府站"},
    {"id":"hall-jixi","name":"鸡西市政务服务中心","short_name":"鸡西政务中心","address":"鸡西市鸡冠区康新路92号","lat":45.2949,"lng":130.9754,"phone":"0467-2187678","city":"鸡西","district":"鸡冠区","hours_weekday":"08:30-16:30","hours_saturday":None,"hours_sunday":None,"services":["driver-license-renewal","violation-handling","plate-service"],"windows":20,"tags":["市级政务","综合政务"],"parking":True,"transit":"公交康新路站"},
    {"id":"hall-sys","name":"双鸭山市市民服务中心","short_name":"双鸭山市民中心","address":"双鸭山市尖山区西平行路228号","lat":46.6466,"lng":131.1591,"phone":"0469-4472005","city":"双鸭山","district":"尖山区","hours_weekday":"08:30-16:30","hours_saturday":None,"hours_sunday":None,"services":["driver-license-renewal","driver-license-reissue","violation-handling"],"windows":18,"tags":["市级政务","市民服务"],"parking":True,"transit":"公交西平行路站"},
    {"id":"hall-yichun","name":"伊春市政务服务中心","short_name":"伊春政务中心","address":"伊春市伊美区林都大街10号","lat":47.7275,"lng":128.8422,"phone":"0458-3777771","city":"伊春","district":"伊美区","hours_weekday":"08:30-17:30","hours_saturday":None,"hours_sunday":None,"services":["driver-license-renewal","vehicle-transfer","violation-handling"],"windows":22,"tags":["市级政务","综合政务"],"parking":True,"transit":"公交林都大街站"},
    {"id":"hall-qth","name":"七台河市民中心","short_name":"七台河市民中心","address":"七台河市茄子河区东安街6号市民中心","lat":45.7713,"lng":131.0030,"phone":"0464-8995100","city":"七台河","district":"茄子河区","hours_weekday":"08:30-17:00","hours_saturday":None,"hours_sunday":None,"services":["driver-license-renewal","driver-license-reissue","violation-handling","plate-service"],"windows":30,"tags":["市级政务","市民中心","一站式"],"parking":True,"transit":"公交市民中心站"},
    {"id":"hall-hegang","name":"鹤岗市人民办事中心","short_name":"鹤岗办事中心","address":"鹤岗市工农区北红旗路","lat":47.3309,"lng":130.2979,"phone":"0468-3340988","city":"鹤岗","district":"工农区","hours_weekday":"08:30-17:00","hours_saturday":None,"hours_sunday":None,"services":["driver-license-renewal","violation-handling","plate-service"],"windows":16,"tags":["市级政务","市民服务"],"parking":True,"transit":"公交红旗路站"},
    {"id":"hall-heihe","name":"黑河市政务服务中心","short_name":"黑河政务中心","address":"黑河市爱辉区通江路10号","lat":50.2452,"lng":127.5286,"phone":"0456-2849999","city":"黑河","district":"爱辉区","hours_weekday":"08:30-17:30","hours_saturday":None,"hours_sunday":None,"services":["driver-license-renewal","driver-license-reissue","violation-handling"],"windows":18,"tags":["市级政务","综合政务"],"parking":True,"transit":"公交通江路站"},
    {"id":"hall-suihua","name":"绥化市政务服务中心","short_name":"绥化政务中心","address":"绥化市北林区康庄北路99号","lat":46.6538,"lng":126.9855,"phone":"0455-7872777","city":"绥化","district":"北林区","hours_weekday":"08:30-17:00","hours_saturday":None,"hours_sunday":None,"services":["driver-license-renewal","vehicle-transfer","violation-handling","plate-service"],"windows":24,"tags":["市级政务","综合政务"],"parking":True,"transit":"公交康庄北路站"},
    {"id":"hall-dxal","name":"大兴安岭地区行政服务中心","short_name":"大兴安岭政务中心","address":"大兴安岭地区加格达奇区曙光大街与光华路交汇处210号","lat":50.4206,"lng":124.1260,"phone":"0457-2751234","city":"大兴安岭","district":"加格达奇区","hours_weekday":"08:30-17:30","hours_saturday":None,"hours_sunday":None,"services":["driver-license-renewal","violation-handling"],"windows":12,"tags":["地区政务","综合政务"],"parking":True,"transit":"公交曙光大街站"},
    {"id":"hall-harbin-daoli","name":"哈尔滨市道里区政务服务中心","short_name":"道里政务中心","address":"哈尔滨市道里区西四道街21号","lat":45.7700,"lng":126.6180,"phone":"0451-84557500","city":"哈尔滨","district":"道里区","hours_weekday":"08:30-16:30","hours_saturday":None,"hours_sunday":None,"services":["driver-license-renewal","violation-handling"],"windows":15,"tags":["区级政务","综合政务"],"parking":False,"transit":"公交道里十二道街站"},
    {"id":"hall-daqing-sartu","name":"大庆市萨尔图区政务服务中心","short_name":"萨尔图政务中心","address":"大庆市萨尔图区萨政路6号","lat":46.5982,"lng":125.1013,"phone":"0459-4608057","city":"大庆","district":"萨尔图区","hours_weekday":"08:30-16:30","hours_saturday":None,"hours_sunday":None,"services":["driver-license-renewal","violation-handling"],"windows":12,"tags":["区级政务","综合政务"],"parking":True,"transit":"公交萨政路站"},
    {"id":"hall-jms-jiaoqu","name":"佳木斯市郊区政务服务中心","short_name":"郊区政务中心","address":"佳木斯市郊区友谊路275号郊区政府二办5号楼","lat":46.8130,"lng":130.3159,"phone":"0454-8689288","city":"佳木斯","district":"郊区","hours_weekday":"08:30-16:30","hours_saturday":None,"hours_sunday":None,"services":["driver-license-renewal","violation-handling"],"windows":10,"tags":["区级政务","综合政务"],"parking":True,"transit":"公交友谊路站"},
    {"id":"hall-mudanjiang-dongan","name":"牡丹江市东安区政务服务中心","short_name":"东安政务中心","address":"牡丹江市东安区东三条路109号","lat":44.5845,"lng":129.6330,"phone":"0453-6661001","city":"牡丹江","district":"东安区","hours_weekday":"08:30-16:30","hours_saturday":None,"hours_sunday":None,"services":["driver-license-renewal","violation-handling"],"windows":10,"tags":["区级政务","综合政务"],"parking":False,"transit":"公交东三条路站"},
]


def main():
    truncate = "--truncate" in sys.argv

    if truncate:
        execute("DELETE FROM gov_hall", commit=True)
        print("Cleared gov_hall table")

    skip_ids = set() if truncate else existing_ids()
    if skip_ids:
        print(f"Found {len(skip_ids)} existing halls, will skip duplicates")

    total = 0
    inserted = 0

    # 1. Import existing halls from JSON
    json_path = Path(__file__).resolve().parents[1] / "frontend" / "src" / "data" / "halls.json"
    if json_path.exists():
        with open(json_path) as f:
            existing = json.load(f)
        for h in existing.get("halls", []):
            total += 1
            if h["id"] in skip_ids:
                continue
            hall = dict(h)
            hours = hall.pop("hours", {})
            hall["hours_weekday"] = hours.get("weekday")
            hall["hours_saturday"] = hours.get("saturday")
            hall["hours_sunday"] = hours.get("sunday")
            if insert_hall(hall):
                inserted += 1
        print(f"Imported {inserted}/{len(existing.get('halls',[]))} existing halls")
    else:
        print(f"WARNING: halls.json not found at {json_path}")

    # 2. Import Heilongjiang halls
    hl_inserted = 0
    for h in HEILONGJIANG_HALLS:
        total += 1
        if h["id"] in skip_ids:
            continue
        if insert_hall(h):
            inserted += 1
            hl_inserted += 1
    print(f"Imported {hl_inserted}/{len(HEILONGJIANG_HALLS)} Heilongjiang halls")

    print(f"\nTotal: {inserted} inserted, {total - inserted} skipped")


if __name__ == "__main__":
    main()
