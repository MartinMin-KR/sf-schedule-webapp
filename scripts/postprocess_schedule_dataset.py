from __future__ import annotations

import csv
import json
import re
from collections import defaultdict
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[1]
OCR_JSON = BASE_DIR / "outputs/schedule-table-structured.json"
ROSTER_CSV = BASE_DIR / "data/manual-roster.csv"
OUT_CSV = BASE_DIR / "outputs/schedule-dataset.csv"
OUT_JSON = BASE_DIR / "outputs/schedule-dataset.json"
OUT_REVIEW = BASE_DIR / "outputs/schedule-review.csv"

HEADERS = [
    "vehicle",
    "number",
    "group",
    "name",
    "6.23_점심자유식",
    "6.23_석식",
    "6.24_오전",
    "6.24_중식",
    "버스_교체",
    "6.24_오후",
    "6.24_석식",
    "6.25_점심자유식",
    "6.25_석식자유식",
    "6.26_오전",
    "6.26_중식자유식",
    "6.26_오후",
    "6.26_석식",
    "6.27_점심자유식",
    "6.27",
    "6.28",
]

EXPECTED_BLANK_COLUMNS = {12, 14}

DIRECT_REPLACEMENTS = {
    "PoP": "PnP",
    "pnp": "PnP",
    "민앤아웃": "인앤아웃",
    "민 맨 아웃": "인앤아웃",
    "민 앤 아웃": "인앤아웃",
    "인 엔 아웃": "인앤아웃",
    "인 맨 아웃": "인앤아웃",
    "인 맨 아 옷": "인앤아웃",
    "인 앤 아 옷": "인앤아웃",
    "인 앤 아웃": "인앤아웃",
    "망 고 부스트": "망고부스트",
    "망 고 부 스트": "망고부스트",
    "동 순원": "동순원",
    "브 리 즈 바이오": "브리즈바이오",
    "브 리 즈 바 미오": "브리즈바이오",
    "브 리 즈 바 이 오": "브리즈바이오",
    "블 룸 에너지": "블룸에너지",
    "블 룸 에 너지": "블룸에너지",
    "베 어 로보틱스": "베어로보틱스",
    "베 어 로 봇 틱": "베어로보틱스",
    "시 스 코": "시스코",
    "세 일 즈 포스": "세일즈포스",
    "몰 로 코": "몰로코",
    "치 폴레": "치폴레",
    "스 탠 포 드": "스탠포드",
    "UCBerkeley": "UC버클리",
    "UC Berkeley": "UC버클리",
    "UC 버클리": "UC버클리",
    "버 클리": "버클리",
    "호 자": "호 차",
    "후 차": "호 차",
    "초 차": "호 차",
    "차 랑": "차량",
}

PLACE_LIKE_GARBAGE = {
    "",
    "-",
    "=",
    "~",
    "i",
    "I",
    "l",
    "pO",
    "PO",
    "Po",
    "pt",
    "EE",
    ":",
    ". :",
    "글 =",
    "ㄷㄷ",
    "(=",
    "늘 =",
    "르",
    "Ls",
    "Pe",
    "으",
    "를",
    "을",
    "늘",
    "그",
    "피",
    "어",
    "39",
    "자유식",
}

COLUMN_KEYWORDS = {
    4: ["스탠포드"],
    5: ["인앤아웃", "쌀국수"],
    6: ["PnP", "망고부스트", "조비"],
    7: ["쌀국수", "스테이크"],
    9: ["블룸에너지", "NVIDIA", "PnP"],
    10: ["쌀국수", "스테이크", "동순원"],
    11: ["UC버클리"],
    13: ["브리즈바이오", "시스코"],
    15: ["NVIDIA", "베어로보틱스", "구글"],
    16: ["스테이크", "동순원", "인앤아웃"],
    17: ["치폴레"],
    18: ["BBQ"],
    19: ["공항"],
}


def normalize_whitespace(text: str) -> str:
    text = text.replace("|", " ").replace("ㅣ", " ").replace("_", " ")
    text = re.sub(r"\s+", " ", text).strip()
    return text


def infer_vehicle(number: int) -> str:
    if 1 <= number <= 32:
        return "1호차"
    if 33 <= number <= 64:
        return "2호차"
    if 65 <= number <= 112:
        return "3호차"
    return "4호차"


def extract_bus_suffix(text: str) -> str:
    match = re.search(r"([1-4])\s*호\s*차", text)
    if match:
        return f" ({match.group(1)}호차)"
    fallback = re.search(r"\(([1-4])\)", text)
    if fallback:
        return f" ({fallback.group(1)}호차)"
    if "124" in text:
        return " (1호차)"
    return ""


def canonicalize_by_column(column_index: int, cleaned: str) -> str:
    bus_suffix = extract_bus_suffix(cleaned)
    compact = re.sub(r"\s+", "", cleaned)
    if column_index == 8:
        if "호텔" in cleaned:
            return "호텔 차량 교체"
        if compact in {"", "po", "pO", "PO", "Pe", "pt", "EE", ":", ".:"}:
            return ""
        return ""
    if column_index in EXPECTED_BLANK_COLUMNS:
        return ""

    if column_index in {5, 16} and ("아웃" in cleaned or "아옷" in compact or "아웃" in compact):
        return f"인앤아웃{bus_suffix}" if bus_suffix else "인앤아웃"
    if column_index == 9 and (("블" in cleaned and ("에너" in cleaned or "너지" in cleaned)) or "블룸" in cleaned):
        return f"블룸에너지{bus_suffix}" if bus_suffix else "블룸에너지"
    if column_index == 13 and ("바이오" in cleaned or "브" in cleaned):
        return f"브리즈바이오{bus_suffix}" if bus_suffix else "브리즈바이오"
    if column_index == 15 and ("로봇" in cleaned or "봇" in cleaned):
        return f"베어로보틱스{bus_suffix}" if bus_suffix else "베어로보틱스"

    for keyword in COLUMN_KEYWORDS.get(column_index, []):
        compact_keyword = re.sub(r"\s+", "", keyword)
        if keyword in cleaned or compact_keyword in compact:
            return f"{keyword}{bus_suffix}" if bus_suffix else keyword
    if column_index == 11 and ("버클리" in cleaned or "UC" in cleaned or "UCH" in cleaned):
        return f"UC버클리{bus_suffix}" if bus_suffix else "UC버클리"
    if column_index == 17 and ("치" in cleaned or "폴" in cleaned):
        return f"치폴레{bus_suffix}" if bus_suffix else "치폴레"
    if column_index == 18 and ("BBQ" in cleaned or "BBO" in cleaned or "0660" in cleaned):
        return f"BBQ{bus_suffix}" if bus_suffix else "BBQ"
    if column_index == 19 and "공항" in cleaned:
        return f"공항{bus_suffix}" if bus_suffix else "공항"
    return cleaned


def normalize_schedule_text(text: str, column_index: int) -> tuple[str, str]:
    raw = normalize_whitespace(text)
    cleaned = raw
    for before, after in DIRECT_REPLACEMENTS.items():
        cleaned = cleaned.replace(before, after)
    cleaned = re.sub(r"[\[\]{}]", "", cleaned)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    cleaned = cleaned.replace("( ", "(").replace(" )", ")")
    cleaned = cleaned.replace("(1호 차)", "(1호차)")
    cleaned = cleaned.replace("(2호 차)", "(2호차)")
    cleaned = cleaned.replace("(3호 차)", "(3호차)")
    cleaned = cleaned.replace("(4호 차)", "(4호차)")
    cleaned = cleaned.replace("(1 호 차)", "(1호차)")
    cleaned = cleaned.replace("(2 호 차)", "(2호차)")
    cleaned = cleaned.replace("(3 호 차)", "(3호차)")
    cleaned = cleaned.replace("(4 호 차)", "(4호차)")
    cleaned = cleaned.replace("(1 SHH)", "(1호차)")
    cleaned = cleaned.replace("(4 SHH)", "(4호차)")
    cleaned = cleaned.replace("SK Hy 중식", "SK Hynix 중식")
    cleaned = cleaned.replace("UCH", "UC")
    cleaned = cleaned.replace("UCBe", "UC버클리")
    cleaned = cleaned.replace("UC He", "UC버클리")
    cleaned = cleaned.replace("UC #2", "UC버클리")
    cleaned = cleaned.replace("UC me!", "UC버클리")
    cleaned = cleaned.replace("UC He!", "UC버클리")
    cleaned = cleaned.replace("UC32", "UC버클리")
    cleaned = cleaned.replace("400 버클리", "UC버클리")
    cleaned = cleaned.replace("40(버클리", "UC버클리")
    cleaned = cleaned.replace("406 버클리", "UC버클리")
    cleaned = cleaned.replace("00 버클리", "UC버클리")
    cleaned = cleaned.replace("10 버클리", "UC버클리")
    cleaned = cleaned.replace("0() 버클리", "UC버클리")
    cleaned = cleaned.replace("6 버클리", "UC버클리")
    cleaned = cleaned.replace("UC버클리e", "UC버클리")
    cleaned = cleaned.replace("UC버클리!", "UC버클리")
    cleaned = cleaned.replace("UC버클리]", "UC버클리")
    cleaned = cleaned.replace("UC{#e]", "UC버클리")
    cleaned = cleaned.replace("UCR!", "UC버클리")
    cleaned = cleaned.replace("UC 2]", "UC버클리")
    cleaned = cleaned.replace("UGH Be", "UC버클리")
    cleaned = cleaned.replace("YCH Be", "UC버클리")
    cleaned = cleaned.replace("UCUC버클리", "UC버클리")
    cleaned = cleaned.replace("10UCUC버클리", "UC버클리")
    cleaned = cleaned.replace("0UCUC버클리", "UC버클리")
    cleaned = cleaned.replace("ㄴ 0UCUC버클리", "UC버클리")
    cleaned = cleaned.replace("호텔 차량 교 제", "호텔 차량 교체")
    cleaned = cleaned.replace("호텔 차 랑 교 체", "호텔 차량 교체")
    cleaned = cleaned.replace("호텔 차 랑 교체", "호텔 차량 교체")
    cleaned = cleaned.replace("호텔 차 량 교 제", "호텔 차량 교체")
    cleaned = cleaned.replace("호텔 차 량 교체", "호텔 차량 교체")
    cleaned = cleaned.replace("호텔 차 람 교체", "호텔 차량 교체")
    cleaned = cleaned.replace("그 레 이 트 물", "그레이트몰")
    cleaned = cleaned.replace("차 유 식", "자유식")
    cleaned = cleaned.replace("피 어 39 자 유 식", "피어39 자유식")
    cleaned = cleaned.replace("Sew", "세일즈포스")
    cleaned = cleaned.replace("HIOJ SSE!", "세일즈포스")
    cleaned = cleaned.lstrip('. ')

    compact = re.sub(r"\s+", "", cleaned)
    if column_index in EXPECTED_BLANK_COLUMNS:
        return raw, ""
    if compact in {"", *[re.sub(r'\s+', '', item) for item in PLACE_LIKE_GARBAGE]}:
        return raw, ""
    cleaned = canonicalize_by_column(column_index, cleaned)
    return raw, cleaned


def load_roster() -> dict[int, dict[str, str]]:
    roster: dict[int, dict[str, str]] = {}
    with ROSTER_CSV.open() as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            roster[int(row["number"])] = row
    return roster


def load_ocr_rows() -> list[dict[int, str]]:
    structured = json.loads(OCR_JSON.read_text())
    rows: list[dict[int, str]] = []
    for row_cells in structured["rows"][1:]:
        row_map: dict[int, str] = {}
        for cell in row_cells:
            row_map[int(cell["column_index"])] = str(cell.get("ocr_text", ""))
        rows.append(row_map)
    return rows


def build_dataset() -> tuple[list[dict[str, str]], list[dict[str, str]]]:
    roster = load_roster()
    rows = load_ocr_rows()
    dataset: list[dict[str, str]] = []
    review: list[dict[str, str]] = []

    for row_index, raw_row in enumerate(rows, start=1):
        if row_index not in roster:
            continue
        number = row_index
        roster_row = roster[number]
        cleaned: dict[str, str] = {
            "vehicle": infer_vehicle(number),
            "number": str(number),
            "group": roster_row["group"],
            "name": roster_row["name"],
        }
        for column_index in range(4, len(HEADERS)):
            header = HEADERS[column_index]
            raw_text, normalized = normalize_schedule_text(raw_row.get(column_index, ""), column_index)
            cleaned[header] = normalized
            if raw_text and not normalized:
                compact_raw = re.sub(r"\s+", "", raw_text)
                expected_blank = (
                    column_index in EXPECTED_BLANK_COLUMNS
                    or (column_index == 8 and normalized == "")
                    or compact_raw in {re.sub(r'\s+', '', item) for item in PLACE_LIKE_GARBAGE}
                )
                if not expected_blank:
                    review.append(
                        {
                            "number": str(number),
                            "group": roster_row["group"],
                            "name": roster_row["name"],
                            "column_index": str(column_index),
                            "field": header,
                            "raw_text": raw_text,
                            "suggested_text": normalized,
                            "status": "needs_review",
                        }
                    )
            elif raw_text != normalized:
                review.append(
                    {
                        "number": str(number),
                        "group": roster_row["group"],
                        "name": roster_row["name"],
                        "column_index": str(column_index),
                        "field": header,
                        "raw_text": raw_text,
                        "suggested_text": normalized,
                        "status": "normalized",
                    }
                )
        dataset.append(cleaned)
    return dataset, review


def apply_group_majority(dataset: list[dict[str, str]]) -> list[dict[str, str]]:
    fields = HEADERS[4:]
    grouped: dict[str, list[dict[str, str]]] = defaultdict(list)
    for row in dataset:
        grouped[row["group"]].append(row)

    for group_rows in grouped.values():
        for field in fields:
            counts = defaultdict(int)
            for row in group_rows:
                value = row.get(field, "")
                if value:
                    counts[value] += 1
            if not counts:
                continue
            majority_value = max(counts.items(), key=lambda item: item[1])[0]
            for row in group_rows:
                row[field] = majority_value
    return dataset


def write_outputs(dataset: list[dict[str, str]], review: list[dict[str, str]]) -> None:
    with OUT_CSV.open("w", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=HEADERS)
        writer.writeheader()
        writer.writerows(dataset)

    OUT_JSON.write_text(json.dumps(dataset, ensure_ascii=False, indent=2))

    with OUT_REVIEW.open("w", newline="") as handle:
        fieldnames = ["number", "group", "name", "column_index", "field", "raw_text", "suggested_text", "status"]
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(review)


def main() -> None:
    dataset, review = build_dataset()
    dataset = apply_group_majority(dataset)
    write_outputs(dataset, review)
    status_count = defaultdict(int)
    for item in review:
        status_count[item["status"]] += 1
    print(json.dumps({
        "rows": len(dataset),
        "review_rows": len(review),
        "status_count": dict(status_count),
        "dataset_csv": str(OUT_CSV),
        "review_csv": str(OUT_REVIEW),
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
