#!/usr/bin/env python3

from __future__ import annotations

import argparse
import csv
import json
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
import pytesseract
from PIL import Image, ImageDraw, ImageFilter, ImageOps


@dataclass
class OcrCandidate:
    text: str
    confidence: float | None
    variant: str
    config: str


def group_indices(indices: np.ndarray) -> list[tuple[int, int, int]]:
    groups: list[tuple[int, int, int]] = []
    if len(indices) == 0:
        return groups

    start = end = int(indices[0])
    for value in map(int, indices[1:]):
        if value <= end + 1:
            end = value
            continue
        groups.append((start, end, (start + end) // 2))
        start = end = value
    groups.append((start, end, (start + end) // 2))
    return groups


def normalize_text(value: str) -> str:
    return " ".join(value.replace("\n", " ").split())


def find_table_bbox(gray: Image.Image) -> tuple[int, int, int, int]:
    arr = np.array(gray)
    mask = arr < 245
    ys, xs = np.where(mask)
    if len(xs) == 0 or len(ys) == 0:
        raise RuntimeError("표 영역을 찾지 못했습니다.")
    return int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1


def detect_horizontal_lines(gray_crop: np.ndarray) -> list[int]:
    dark = gray_crop < 210
    ratio = dark.mean(axis=1)
    indices = np.where(ratio > 0.60)[0]
    lines = [center for _, _, center in group_indices(indices)]
    if len(lines) < 10:
        raise RuntimeError("가로 선 검출 수가 너무 적습니다.")
    return lines


def detect_vertical_lines(gray_crop: np.ndarray, header_band_height: int = 25) -> list[int]:
    band_height = min(header_band_height, gray_crop.shape[0])
    band = gray_crop[:band_height] < 210
    max_runs: list[int] = []

    for x in range(band.shape[1]):
        col = band[:, x].astype(np.int8)
        padded = np.concatenate([[0], col, [0]])
        diff = np.diff(padded)
        starts = np.where(diff == 1)[0]
        ends = np.where(diff == -1)[0]
        max_runs.append(int((ends - starts).max()) if len(starts) else 0)

    indices = np.where(np.array(max_runs) >= max(18, int(band_height * 0.72)))[0]
    lines = [center for _, _, center in group_indices(indices)]
    if len(lines) < 5:
        raise RuntimeError("세로 선 검출 수가 너무 적습니다.")
    return lines


def build_cell_bbox(
    left_line: int,
    top_line: int,
    right_line: int,
    bottom_line: int,
    pad_x: int = 1,
    pad_y: int = 1,
) -> tuple[int, int, int, int]:
    left = left_line + pad_x
    top = top_line + pad_y
    right = right_line - pad_x
    bottom = bottom_line - pad_y
    if right <= left:
        right = left + 1
    if bottom <= top:
        bottom = top + 1
    return left, top, right, bottom


def build_variants(cell: Image.Image) -> list[tuple[str, Image.Image]]:
    gray = cell.convert("L")
    scale = 3
    resized = gray.resize((max(1, gray.width * scale), max(1, gray.height * scale)))
    enhanced = ImageOps.autocontrast(resized).filter(ImageFilter.SHARPEN)
    binary = enhanced.point(lambda px: 255 if px > 185 else 0)
    soft_binary = enhanced.point(lambda px: 255 if px > 205 else 0)
    return [
        ("enhanced", enhanced),
        ("binary", binary),
        ("soft_binary", soft_binary),
    ]


def column_configs(column_index: int, width: int) -> list[str]:
    # 한국어 표지만 좁은 열은 single-line/word 구성을 같이 시도한다.
    if width <= 40:
        return [
            "--oem 3 --psm 10",
            "--oem 3 --psm 8",
            "--oem 3 --psm 7",
        ]
    if width <= 70 or column_index in {0, 1, 2}:
        return [
            "--oem 3 --psm 8",
            "--oem 3 --psm 7",
        ]
    return [
        "--oem 3 --psm 7",
        "--oem 3 --psm 6",
    ]


def read_candidate(image: Image.Image, config: str, lang: str) -> OcrCandidate:
    data = pytesseract.image_to_data(
        image,
        lang=lang,
        config=config,
        output_type=pytesseract.Output.DICT,
    )

    tokens: list[str] = []
    confidences: list[float] = []
    for raw_text, raw_conf in zip(data["text"], data["conf"], strict=False):
        text = normalize_text(str(raw_text))
        if not text:
            continue
        try:
            confidence = float(raw_conf)
        except ValueError:
            confidence = -1
        tokens.append(text)
        if confidence >= 0:
            confidences.append(confidence)

    joined = normalize_text(" ".join(tokens))
    if not joined:
        joined = normalize_text(
            pytesseract.image_to_string(image, lang=lang, config=config).strip()
        )

    confidence_value = round(float(np.mean(confidences)), 2) if confidences else None
    return OcrCandidate(
        text=joined,
        confidence=confidence_value,
        variant="",
        config=config,
    )


def choose_candidate(cell: Image.Image, column_index: int) -> tuple[OcrCandidate, list[OcrCandidate]]:
    variants = build_variants(cell)
    configs = column_configs(column_index, cell.width)
    candidates: list[OcrCandidate] = []

    # 1차 판독은 가장 가능성이 높은 조합 하나만 먼저 사용한다.
    primary_variant_name, primary_variant_image = variants[0]
    primary_candidate = read_candidate(primary_variant_image, configs[0], lang="kor+eng")
    primary_candidate.variant = primary_variant_name
    candidates.append(primary_candidate)

    needs_retry = (
        primary_candidate.confidence is None
        or primary_candidate.confidence < 70
        or not primary_candidate.text
    )

    # low-confidence 셀만 fallback 조합을 추가로 재판독한다.
    if needs_retry:
        fallback_pairs = [
            (variants[1], configs[0]),
            (variants[0], configs[min(1, len(configs) - 1)]),
        ]
        for (variant_name, variant_image), config in fallback_pairs:
            candidate = read_candidate(variant_image, config, lang="kor+eng")
            candidate.variant = variant_name
            candidates.append(candidate)

    def score(item: OcrCandidate) -> float:
        confidence = item.confidence if item.confidence is not None else -5.0
        return confidence + min(len(item.text), 30) * 0.3

    best = max(candidates, key=score)
    return best, candidates


def unique_headers(header_cells: list[dict[str, Any]]) -> list[str]:
    seen: dict[str, int] = {}
    resolved: list[str] = []
    for index, cell in enumerate(header_cells):
        base = cell["ocr_text"] or f"column_{index:02d}"
        count = seen.get(base, 0)
        seen[base] = count + 1
        resolved.append(base if count == 0 else f"{base}_{count + 1}")
    return resolved


def save_overlay(
    image: Image.Image,
    output_path: Path,
    bbox: tuple[int, int, int, int],
    horizontal_lines: list[int],
    vertical_lines: list[int],
    flagged_cells: list[dict[str, Any]],
) -> None:
    overlay = image.convert("RGB")
    draw = ImageDraw.Draw(overlay)
    x0, y0, _, _ = bbox

    for y in horizontal_lines:
        draw.line([(x0, y0 + y), (x0 + vertical_lines[-1], y0 + y)], fill=(0, 170, 0), width=1)
    for x in vertical_lines:
        draw.line([(x0 + x, y0), (x0 + x, y0 + horizontal_lines[-1])], fill=(0, 170, 0), width=1)

    for cell in flagged_cells:
        left, top, right, bottom = cell["absolute_bbox"]
        draw.rectangle([left, top, right, bottom], outline=(220, 30, 30), width=2)

    overlay.save(output_path)


def main() -> None:
    parser = argparse.ArgumentParser(description="표 구조 기반 셀 단위 OCR 파이프라인")
    parser.add_argument(
        "--input",
        default="public/schedule-table.jpeg",
        help="OCR 대상 이미지 경로",
    )
    parser.add_argument(
        "--output-dir",
        default="outputs",
        help="산출물 디렉터리",
    )
    args = parser.parse_args()

    image_path = Path(args.input)
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    image = Image.open(image_path).convert("RGB")
    gray = image.convert("L")
    bbox = find_table_bbox(gray)
    x0, y0, x1, y1 = bbox
    table_crop = gray.crop(bbox)
    gray_arr = np.array(table_crop)

    horizontal_lines = detect_horizontal_lines(gray_arr)
    vertical_lines = detect_vertical_lines(gray_arr)

    rows: list[list[dict[str, Any]]] = []
    low_confidence: list[dict[str, Any]] = []

    for row_index in range(len(horizontal_lines) - 1):
        row_cells: list[dict[str, Any]] = []
        for column_index in range(len(vertical_lines) - 1):
            rel_bbox = build_cell_bbox(
                vertical_lines[column_index],
                horizontal_lines[row_index],
                vertical_lines[column_index + 1],
                horizontal_lines[row_index + 1],
            )
            left, top, right, bottom = rel_bbox
            absolute_bbox = (x0 + left, y0 + top, x0 + right, y0 + bottom)
            cell_image = table_crop.crop(rel_bbox)
            ink_ratio = round(float((np.array(cell_image) < 210).mean()), 4)
            best, candidates = choose_candidate(cell_image, column_index)
            distinct_texts = sorted({candidate.text for candidate in candidates if candidate.text})

            review_reasons: list[str] = []
            if best.confidence is None or best.confidence < 70:
                review_reasons.append("low_confidence")
            if len(distinct_texts) >= 2:
                review_reasons.append("variant_disagreement")
            if ink_ratio > 0.03 and not best.text:
                review_reasons.append("ink_without_text")

            confirmed_status = "needs_reread" if review_reasons else "unconfirmed"

            cell_record = {
                "cell_id": f"r{row_index:03d}_c{column_index:02d}",
                "row_index": row_index,
                "column_index": column_index,
                "ocr_text": best.text,
                "confirmed_text": None,
                "confidence": best.confidence,
                "confirmed_status": confirmed_status,
                "review_reasons": review_reasons,
                "selected_variant": best.variant,
                "selected_config": best.config,
                "candidate_texts": distinct_texts,
                "ink_ratio": ink_ratio,
                "relative_bbox": [left, top, right, bottom],
                "absolute_bbox": list(absolute_bbox),
            }
            row_cells.append(cell_record)

            if review_reasons:
                low_confidence.append(cell_record)
        rows.append(row_cells)

    header_cells = rows[0]
    resolved_headers = unique_headers(header_cells)
    for row in rows:
        for column_index, cell in enumerate(row):
            cell["header"] = resolved_headers[column_index]

    records: list[dict[str, Any]] = []
    for row in rows[1:]:
        record = {cell["header"]: cell["ocr_text"] for cell in row}
        records.append(record)

    structured_output = {
        "generated_at": datetime.now().astimezone().isoformat(),
        "source_image": str(image_path),
        "table_bbox": [x0, y0, x1, y1],
        "table_shape": {
            "row_count_including_header": len(rows),
            "data_row_count": max(0, len(rows) - 1),
            "column_count": len(vertical_lines) - 1,
        },
        "line_detection": {
            "horizontal_lines": horizontal_lines,
            "vertical_lines": vertical_lines,
        },
        "verification_summary": {
            "total_cells": len(rows) * (len(vertical_lines) - 1),
            "confirmed_cells": 0,
            "unconfirmed_cells": sum(
                1 for row in rows for cell in row if cell["confirmed_status"] == "unconfirmed"
            ),
            "needs_reread_cells": len(low_confidence),
            "sign_off_ready": False,
        },
        "headers": resolved_headers,
        "rows": rows,
    }

    json_path = output_dir / "schedule-table-structured.json"
    csv_path = output_dir / "schedule-table.csv"
    review_csv_path = output_dir / "schedule-table-low-confidence.csv"
    overlay_path = output_dir / "schedule-table-overlay.png"

    json_path.write_text(
        json.dumps(structured_output, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    pd.DataFrame(records).to_csv(csv_path, index=False)

    with review_csv_path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=[
                "cell_id",
                "row_index",
                "column_index",
                "header",
                "ocr_text",
                "confidence",
                "confirmed_status",
                "review_reasons",
                "ink_ratio",
                "absolute_bbox",
            ],
        )
        writer.writeheader()
        for cell in low_confidence:
            writer.writerow(
                {
                    "cell_id": cell["cell_id"],
                    "row_index": cell["row_index"],
                    "column_index": cell["column_index"],
                    "header": cell["header"],
                    "ocr_text": cell["ocr_text"],
                    "confidence": cell["confidence"],
                    "confirmed_status": cell["confirmed_status"],
                    "review_reasons": "|".join(cell["review_reasons"]),
                    "ink_ratio": cell["ink_ratio"],
                    "absolute_bbox": json.dumps(cell["absolute_bbox"], ensure_ascii=False),
                }
            )

    save_overlay(
        image=image,
        output_path=overlay_path,
        bbox=bbox,
        horizontal_lines=horizontal_lines,
        vertical_lines=vertical_lines,
        flagged_cells=low_confidence,
    )

    print(f"structured_json={json_path}")
    print(f"csv={csv_path}")
    print(f"low_confidence_csv={review_csv_path}")
    print(f"overlay={overlay_path}")
    print(
        "summary="
        + json.dumps(structured_output["verification_summary"], ensure_ascii=False)
    )


if __name__ == "__main__":
    main()
