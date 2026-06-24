# silicon-valley-journal

- 이름: 민영환
- 날짜: 2026-06-09
- 목적: 실리콘밸리 투어 참가 학생들이 일정별 생각, 느낀점, 질문을 기록하고 집단 인사이트로 다시 탐색하는 모바일 우선 기록 서비스 MVP

## OCR 파이프라인 실행

`public/schedule-table.jpeg`에서 표 구조를 검출하고 셀 단위 OCR을 수행한다.

### 준비

```bash
uv venv .venv --python /opt/homebrew/bin/python3
source .venv/bin/activate
uv pip install -r requirements-ocr.txt
```

시스템 의존성:

- `tesseract`
- `kor` language data

### 실행

```bash
python scripts/ocr_schedule_table.py --input public/schedule-table.jpeg --output-dir outputs
```

### 생성 산출물

- `outputs/schedule-table-structured.json`
- `outputs/schedule-table.csv`
- `outputs/schedule-table-low-confidence.csv`
- `outputs/schedule-table-overlay.png`

검증 기준은 [docs/ocr-verification-loop.md](/Users/min-yeonghwan/services/silicon-valley-journal/docs/ocr-verification-loop.md) 를 따른다.
