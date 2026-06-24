# OCR Verification Loop

## 목적

`public/schedule-table.jpeg`에서 추출한 표 OCR 결과를 "모델이 그럴듯하게 읽은 값"과 "운영상 확정된 값"으로 분리한다. 이 문서는 `OCR 정확도 100%`를 마케팅 표현이 아니라, 셀 단위 검증 완료 상태로 정의한다.

## Operational Definition: 정확도 100%

이 저장소에서 `정확도 100%`는 아래 조건을 모두 만족할 때만 성립한다.

1. 표 구조가 고정됐다.
2. 추출 대상 셀마다 `confirmed_status="confirmed"`가 기록됐다.
3. 각 confirmed 셀의 `confirmed_text`가 원본 이미지와 일치한다.
4. `low_confidence_review` 큐가 비었다.
5. 최종 sign-off 메타데이터에 검수 일시와 검수자 식별자가 남아 있다.

중요:
- OCR engine confidence가 99 이상이어도 confirmed가 아니다.
- 사람이 아직 확인하지 않은 값은 `unconfirmed` 또는 `needs_reread`로 남겨야 한다.
- 검증하지 않은 데이터를 확정값처럼 CSV/JSON에 덮어쓰지 않는다.

## 셀 단위 상태 모델

모든 셀은 아래 상태 중 하나를 가진다.

| 상태 | 의미 | 확정 여부 |
| --- | --- | --- |
| `unconfirmed` | OCR 결과는 있으나 사람 확인 전 | 아님 |
| `needs_reread` | OCR confidence 낮음, variant 불일치, 빈칸 의심 등 재판독 필요 | 아님 |
| `confirmed` | 사람 검수 또는 승인된 교정값으로 원본 일치 확인 | 맞음 |

권장 필드:

```json
{
  "cell_id": "r012_c03",
  "row_index": 12,
  "column_index": 3,
  "header": "이름",
  "ocr_text": "김규서",
  "confirmed_text": null,
  "confidence": 91.7,
  "confirmed_status": "unconfirmed",
  "review_reasons": [],
  "bbox": [123, 456, 242, 480]
}
```

## 재판독 루프

### 1. 구조 고정

- 표 bounding box를 찾는다.
- horizontal line과 vertical line을 검출한다.
- 셀 bbox를 고정한다.
- 셀 개수 변화가 생기면 이전 결과와 diff를 비교한다.

### 2. 1차 OCR

- 셀 단위 crop을 만든다.
- 최소 2개 이상의 preprocess variant를 돌린다.
- variant별 텍스트와 confidence를 저장한다.
- 최고 점수 후보를 `ocr_text`로 채택한다.

### 3. 자동 재판독 판정

아래 중 하나라도 만족하면 `needs_reread`로 보낸다.

- confidence가 임계값 미만이다.
- OCR variant 간 결과가 크게 다르다.
- 셀에 잉크는 있는데 텍스트가 비었다.
- 숫자 열인데 비숫자 문자가 과도하다.
- 사람이 검수 중 오탈자 의심을 표시했다.

### 4. 재판독

- 다른 preprocess variant를 다시 적용한다.
- 필요하면 column-specific OCR config를 적용한다.
- 그래도 불확실하면 사람 검수 큐로 남긴다.

### 5. 사람 검수

- 원본 이미지와 overlay를 같이 본다.
- 필요한 경우 `confirmed_text`를 직접 교정한다.
- 검수 완료 셀만 `confirmed`로 승격한다.

### 6. 재실행

- 교정 파일이 있으면 스크립트가 merge한다.
- confirmed 셀은 그대로 유지하고, 미확정 셀만 다시 비교한다.
- sign-off 조건 충족 전에는 `정확도 100%`를 선언하지 않는다.

## Sign-off 조건

최종 sign-off는 아래를 모두 만족해야 한다.

1. `structured.json`의 전체 대상 셀 수와 confirmed 셀 수가 같다.
2. `confirmed_status != "confirmed"`인 셀이 0개다.
3. `low_confidence_review.csv`가 비었거나, 모든 항목이 별도 교정 파일에서 해소됐다.
4. 구조 검증 결과에서 행/열 개수 drift가 없다.
5. sign-off 메타데이터에 아래 필드가 있다.

```json
{
  "signed_off_at": "2026-06-23T16:00:00+09:00",
  "signed_off_by": "reviewer-id",
  "confirmed_cell_count": 2600,
  "total_cell_count": 2600
}
```

## 현재 구현 기준

- 스크립트는 machine OCR 결과와 confidence를 남긴다.
- low-confidence 목록과 debug overlay를 같이 생성한다.
- 기본 실행만으로는 confirmed 셀을 만들지 않는다.
- 따라서 첫 실행 결과는 "검수 준비 완료"이지 "100% 달성"이 아니다.
