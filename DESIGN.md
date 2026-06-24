# Design

## Source of truth
- Status: Active
- Last refreshed: 2026-06-23
- Primary product surfaces: 홈 조 선택 화면, 개인 상세 화면, 날짜별 일정 화면
- Evidence reviewed:
  - `/Users/min-yeonghwan/Downloads/CODEX.md`
  - `/Users/min-yeonghwan/AGENTS.md`
  - `src/pages/HomePage.tsx`
  - `src/pages/PersonPage.tsx`
  - `src/pages/SchedulePage.tsx`
  - `src/App.css`
  - Toss Product Principle: One thing for One Page (`https://toss.tech/article/engineering-note-1`)
  - Toss Product Principle: Value first, cost later (`https://toss.tech/article/value-first-cost-later`)
  - Toss writing principles (`https://toss.tech/article/8-writing-principles-of-toss`)
  - Toss Design System overview (`https://developers-apps-in-toss.toss.im/design/components.html`)

## Brand
- Personality: 또렷하고 조용하며 빠르게 결정을 돕는 도구
- Trust signals: 흰 배경 중심, 강한 정보 위계, 단일 주제 화면, 짧은 문장
- Avoid: 장식성 높은 히어로, 의미 없는 보조 문구, 한 화면에 여러 목표를 섞는 구조, 토스 고유 자산을 그대로 복제한 디자인

## Product goals
- Goals: 자기 조 일정 확인을 10초 안에 끝내기, 모바일 현장에서 빠르게 다음 일정 파악하기
- Non-goals: 관리자 편집 기능, 로그인, 백엔드 동기화
- Success signals: 이름 선택 후 날짜와 현재 일정이 바로 보이고, 다른 조 일정이 섞이지 않는다

## Personas and jobs
- Primary personas: 현지 일정 참가자, 현장 운영 지원자
- User jobs: 자기 이름을 찾고, 참여 날짜를 보고, 오늘 일정과 다음 이동을 확인한다
- Key contexts of use: 이동 중 모바일 사용, 낯선 도시에서 빠른 확인, 네트워크가 느린 환경

## Information architecture
- Primary navigation: 홈 -> 개인 상세 -> 날짜별 일정
- Core routes/screens:
  - `/`
  - `/person/:personId`
  - `/person/:personId/date/:date`
- Content hierarchy: 조 선택 -> 이름 선택 -> 날짜 선택 -> 시간순 일정 확인

## Design principles
- Principle 1: One thing for One Page
  홈은 조 선택, 개인 상세는 날짜 선택, 일정 화면은 방문 순서 확인만 중심에 둔다. 이는 토스가 말하는 화면 하나의 목표를 분명히 두는 원칙에서 가져온 것이다.
- Principle 2: Value first, cost later
  조를 고르기 전에 사용자가 얻게 되는 가치인 "내 일정이 바로 보인다"를 먼저 보여준다. 다음 행동의 비용이나 설명은 뒤로 보낸다.
- Principle 3: Focus on key message
  제목과 핵심 설명만 남기고, 같은 말을 반복하는 보조 문구는 덜어낸다.
- Principle 4: Easy to speak
  현장에서 입으로 바로 말할 수 있는 짧은 한국어를 쓴다. 전문 용어, 문어체, 긴 설명을 피한다.
- Tradeoffs: 시각적 개성은 일부 줄더라도, 빠른 스캔과 터치 안정성을 우선한다.

## Visual language
- Color: 매우 밝은 회색 배경, 흰 카드, 짙은 글자색, 하나의 선명한 블루 포인트
- Typography: 읽기 쉬운 산세리프 중심, 제목과 본문 크기 차이를 분명하게 둔다
- Spacing/layout rhythm: 작은 모바일 화면에서도 블록 간 경계가 선명하도록 8px 기반 여백 리듬 사용
- Shape/radius/elevation: 과하지 않은 라운드, 얕은 그림자, 얇은 경계선
- Motion: 터치 피드백과 짧은 등장 효과만 사용
- Imagery/iconography: 일러스트보다 텍스트와 상태 배지 중심

## Components
- Existing components to reuse: 없음, 신규 프로젝트
- New/changed components:
  - GroupDropdown
  - MemberList
  - DateList
  - ScheduleTimeline
  - StatusPill
- Variants and states: 기본, 선택됨, 진행 중, 완료, 예정, 빈 상태, 오류 상태
- Token/component ownership: 색상과 간격은 CSS 변수로 관리하며, 같은 버튼 모양을 반복 사용해 TDS식 일관성을 만든다

## Accessibility
- Target standard: 기본적인 WCAG AA 수준
- Keyboard/focus behavior: 모든 버튼과 링크는 키보드 포커스 가능
- Contrast/readability: 본문과 배경 대비를 충분히 유지
- Screen-reader semantics: 제목 구조, 버튼 라벨, 리스트 의미 유지
- Reduced motion and sensory considerations: 모션 줄이기 설정에서는 애니메이션 최소화

## Responsive behavior
- Supported breakpoints/devices: 모바일 우선, 태블릿과 데스크톱 대응
- Layout adaptations: 큰 화면은 카드 폭만 넓히고 정보 구조는 유지한다. 모바일에서는 한 화면에 하나의 핵심 블록만 강하게 보이게 한다. 날짜 선택은 가로 스와이프, 상단 액션은 세로 적층을 유지한다.
- Touch/hover differences: 터치 기준 큰 클릭 영역, hover는 보조 효과만 제공

## Interaction states
- Loading: 정적 데이터라 별도 로딩 최소화
- Empty: 해당 조 인원이 없거나 날짜 일정이 없을 때 안내 문구 표시
- Error: 잘못된 personId/date 접근 시 홈으로 유도
- Success: 현재 진행 중 일정과 다음 일정 요약 표시
- Disabled: 선택할 데이터가 없을 때 비활성 스타일 사용
- Offline/slow network, if applicable: 정적 데이터라 핵심 화면은 오프라인에 가깝게 동작

## Content voice
- Tone: 짧고 단정하고 명확함
- Terminology: 조, 날짜, 방문, 차량, 일정, 진행 중
- Microcopy rules: 토스 라이팅 원칙을 따라 빈 문장 제거, 핵심 메시지 우선, 쉽게 말할 수 있는 표현 사용

## Implementation constraints
- Framework/styling system: React + TypeScript + Vite + CSS
- Design-token constraints: CSS 변수 기반, 새 의존성 최소화
- Performance constraints: 첫 화면은 정적 JSON만 읽고 즉시 표시
- Compatibility constraints: 최신 모바일 브라우저 기준
- Test/screenshot expectations: 빌드 성공, 기본 라우팅과 상태 계산 확인

## Open questions
- [ ] 실제 참가자 명단과 일정 JSON이 확정되면 샘플 데이터를 교체해야 한다 / owner: user / impact: 높음
- [ ] Google Maps API 키가 준비되면 이동시간 계산을 실데이터 기반으로 교체할 수 있다 / owner: user / impact: 중간
- [ ] 토스 원칙은 반영하되 토스 고유 UI 자산을 직접 복제하지 않는 현재 방향을 유지할지 최종 확인이 필요하다 / owner: user / impact: 중간
