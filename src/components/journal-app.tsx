"use client";

import { ReactNode, useEffect, useMemo, useState } from "react";
import { itineraryByTraveler, quickPickNames, scheduleImage, scheduleSegments, travelerProfiles } from "@/lib/mock-data";
import { PlannerFilters, ScheduleEntry, ScheduleImageConfig, ScheduleSegment, TravelerProfile } from "@/lib/types";

const STORAGE_KEY = "sv-tour-personal-schedule-v2";

const defaultFilters: PlannerFilters = {
  name: "",
};

export function JournalApp() {
  const [filters, setFilters] = useState<PlannerFilters>(defaultFilters);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const stored = window.localStorage.getItem(STORAGE_KEY);
    let nextFilters = defaultFilters;

    if (stored) {
      try {
        nextFilters = JSON.parse(stored) as PlannerFilters;
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    }

    const nameFromQuery = params.get("name")?.trim();
    if (nameFromQuery) {
      nextFilters = { ...nextFilters, name: nameFromQuery };
    }

    setFilters(nextFilters);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) {
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));

    const params = new URLSearchParams(window.location.search);
    if (filters.name.trim()) {
      params.set("name", filters.name.trim());
    } else {
      params.delete("name");
    }

    const nextQuery = params.toString();
    const nextUrl = nextQuery ? `/?${nextQuery}` : "/";
    window.history.replaceState({}, "", nextUrl);
  }, [filters, ready]);

  const normalizedName = normalizeText(filters.name);

  const exactProfile = useMemo(() => {
    if (!normalizedName) {
      return null;
    }

    return (
      travelerProfiles.find((profile) => normalizeText(profile.name) === normalizedName) ?? null
    );
  }, [normalizedName]);

  const suggestedProfiles = useMemo(() => {
    if (!normalizedName) {
      return quickPickNames
        .map((name) => travelerProfiles.find((profile) => profile.name === name))
        .filter((profile): profile is TravelerProfile => Boolean(profile));
    }

    return travelerProfiles
      .filter((profile) => normalizeText(profile.name).includes(normalizedName))
      .slice(0, 12);
  }, [normalizedName]);

  const rosterCount = travelerProfiles.length;
  const busCount = new Set(travelerProfiles.map((profile) => profile.vehicle)).size;
  const groupCount = new Set(travelerProfiles.map((profile) => profile.groupNumber)).size;
  const scheduleEntries = useMemo(
    () => (exactProfile ? itineraryByTraveler[exactProfile.name] ?? [] : []),
    [exactProfile],
  );

  function handleNameChange(name: string) {
    setFilters({ name });
  }

  function chooseProfile(profile: TravelerProfile) {
    setFilters({ name: profile.name });
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--ink)]">
      <div className="mx-auto flex min-h-screen max-w-[460px] flex-col px-4 pb-14 pt-4">
        <header className="hero-wash editorial-shadow notebook-grid relative overflow-hidden rounded-[32px] px-5 pb-6 pt-5">
          <div className="absolute inset-x-0 top-0 h-2 bg-[color:var(--accent)]" />
          <p className="section-kicker text-[11px] font-extrabold uppercase text-[var(--muted)]">
            Silicon Valley Personal Schedule
          </p>
          <h1 className="mt-4 text-[2rem] font-semibold leading-[1.04]">
            학생 이름만 넣으면
            <br />
            원본 일정표에서 내 줄만 바로 보여줘
          </h1>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
            네가 보낸 실제 표 기준으로 전체 학생 명단 129명을 넣었고, 선택한 학생 줄만 모바일에서 보기 쉽게 잘라서 보여주게 바꿨어.
          </p>

          <div className="ledger-rule mt-6 pt-4">
            <div className="grid grid-cols-3 gap-3">
              <MetricTile label="students" value={`${rosterCount}명`} />
              <MetricTile label="groups" value={`${groupCount}개`} />
              <MetricTile label="buses" value={`${busCount}대`} />
            </div>
          </div>

          <div className="mt-5 rounded-[28px] bg-white/88 px-4 py-4 backdrop-blur">
            <label className="block text-sm font-semibold">학생 이름</label>
            <input
              value={filters.name}
              onChange={(event) => handleNameChange(event.target.value)}
              placeholder="예: 민영환"
              className="mt-2 min-h-11 w-full rounded-2xl border border-[color:var(--line)] bg-white px-4 text-base outline-none transition focus:border-[color:var(--accent)]"
            />

            <div className="mt-4 rounded-2xl bg-[color:var(--signal-soft)] px-4 py-3 text-sm leading-6 text-[var(--muted)]">
              {exactProfile ? (
                <>
                  <strong className="text-[var(--ink)]">{exactProfile.name}</strong>
                  <span> · {exactProfile.groupLabel} · {exactProfile.vehicle} · 번호 {exactProfile.rowNumber}</span>
                </>
              ) : normalizedName ? (
                <>정확히 일치하는 학생을 못 찾았어. 아래 후보에서 바로 누르면 돼.</>
              ) : (
                <>이름만 치면 원본 표에서 그 학생 줄만 바로 잘라서 보여줘.</>
              )}
            </div>
          </div>
        </header>

        <main className="mt-6 flex-1 space-y-5">
          <SectionCard
            kicker="빠른 선택"
            title={normalizedName ? "이름 후보" : "자주 볼 학생"}
            description={normalizedName ? "부분 일치하는 이름부터 먼저 보여줘." : "바로 눌러서 일정 확인하면 돼."}
          >
            <div className="grid grid-cols-2 gap-2">
              {suggestedProfiles.map((profile) => (
                <button
                  key={profile.id}
                  type="button"
                  onClick={() => chooseProfile(profile)}
                  className="min-h-11 rounded-2xl border border-[color:var(--line)] bg-white px-3 py-3 text-left text-sm font-semibold"
                >
                  <div>{profile.name}</div>
                  <div className="mt-1 text-xs text-[var(--muted)]">
                    {profile.groupLabel} · {profile.vehicle}
                  </div>
                </button>
              ))}
            </div>
          </SectionCard>

          {exactProfile ? (
            <>
              <SectionCard
                kicker="선택된 학생"
                title={`${exactProfile.name} 개인 일정 뷰`}
                description="원본 표를 기준으로 구조화한 일정과 방문지 설명을 같이 보여주게 바꿨다."
              >
                <div className="grid grid-cols-3 gap-3">
                  <HighlightRow label="번호" value={`${exactProfile.rowNumber}번`} />
                  <HighlightRow label="조" value={exactProfile.groupLabel} />
                  <HighlightRow label="호차" value={exactProfile.vehicle} />
                </div>
              </SectionCard>

              <SectionCard
                kicker="구조화 일정"
                title="방문 일정 + 기업 정보"
                description="방문지는 정식 영문명으로 통일했고, 필요한 배경 정보는 5불렛 카드로 붙였다."
              >
                <ScheduleAgenda entries={scheduleEntries} />
              </SectionCard>

              {scheduleSegments.map((segment) => (
                <SectionCard
                  key={segment.id}
                  kicker="원본 일정표"
                  title={segment.title}
                  description={segment.subtitle}
                >
                  <CropPanel profile={exactProfile} segment={segment} image={scheduleImage} />
                </SectionCard>
              ))}

              <SectionCard
                kicker="전체 줄 보기"
                title="한 줄 전체"
                description="가로로 넘기면서 보면 원본 표 한 줄을 한 번에 확인할 수 있어."
              >
                <FullRowViewer profile={exactProfile} image={scheduleImage} />
              </SectionCard>
            </>
          ) : (
            <SectionCard
              kicker="안내"
              title="학생을 먼저 고르면 바로 보여줘"
              description="명단 전체는 이미 반영했고, 이름이 정확히 맞으면 일정 줄을 바로 잘라서 띄운다."
            >
              <div className="rounded-[24px] bg-white px-4 py-4 text-sm leading-6 text-[var(--muted)]">
                지금은 아직 학생을 선택하지 않았어.
              </div>
            </SectionCard>
          )}
        </main>
      </div>
    </div>
  );
}

function normalizeText(value: string) {
  return value.replaceAll(" ", "").trim().toLowerCase();
}

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[22px] border border-[color:var(--line)] bg-white/80 px-3 py-3 text-center">
      <div className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[var(--muted)]">
        {label}
      </div>
      <div className="mt-2 text-[1.2rem] font-semibold">{value}</div>
    </div>
  );
}

function SectionCard({
  kicker,
  title,
  description,
  children,
}: {
  kicker: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="ledger-paper rounded-[30px] px-4 py-5">
      <p className="section-kicker text-[11px] font-extrabold uppercase text-[var(--muted)]">
        {kicker}
      </p>
      <h2 className="mt-2 text-[1.35rem] font-semibold leading-[1.15]">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{description}</p>
      <div className="ledger-rule mt-4 pt-4">{children}</div>
    </section>
  );
}

function HighlightRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[22px] bg-white px-4 py-4">
      <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[var(--muted)]">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold leading-6">{value}</p>
    </div>
  );
}

function ScheduleAgenda({ entries }: { entries: ScheduleEntry[] }) {
  return (
    <div className="space-y-3">
      {entries.map((entry) => (
        <article key={entry.id} className="rounded-[24px] border border-[color:var(--line)] bg-white px-4 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[var(--muted)]">
                {entry.slotLabel}
              </p>
              <h3 className="mt-2 text-base font-semibold leading-6">{entry.displayLabel}</h3>
            </div>
            <span className="rounded-full bg-[color:var(--signal-soft)] px-3 py-1 text-[11px] font-semibold text-[var(--muted)]">
              {entry.company?.category ?? "Logistics"}
            </span>
          </div>

          {entry.company ? (
            <ul className="mt-3 space-y-2 text-sm leading-6 text-[var(--muted)]">
              <Bullet label="Official Name" value={entry.company.officialName} />
              <Bullet label="한줄 소개" value={entry.company.summary} />
              <Bullet label="핵심 분야" value={entry.company.keywords.join(" · ")} />
              <Bullet label="왜 중요한가" value={entry.company.whyItMatters} />
              <Bullet label="관전 포인트" value={entry.company.whatToWatch.join(" / ")} />
            </ul>
          ) : (
            <div className="mt-3 rounded-[18px] bg-[color:var(--signal-soft)] px-3 py-3 text-sm leading-6 text-[var(--muted)]">
              {entry.rawLabel}
            </div>
          )}
        </article>
      ))}
    </div>
  );
}

function Bullet({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex gap-2">
      <span aria-hidden className="mt-[0.45rem] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
      <span>
        <strong className="text-[var(--ink)]">{label}:</strong> {value}
      </span>
    </li>
  );
}

function CropPanel({
  profile,
  segment,
  image,
}: {
  profile: TravelerProfile;
  segment: ScheduleSegment;
  image: ScheduleImageConfig;
}) {
  const rowY = image.rowTop + (profile.rowNumber - 1) * image.rowHeight;

  return (
    <div className="space-y-3">
      <ImageCrop
        src={image.src}
        sourceWidth={image.width}
        sourceHeight={image.height}
        x={segment.x}
        y={image.headerTop}
        width={segment.width}
        height={image.headerHeight}
        label={`${segment.title} 헤더`}
        roundedClassName="rounded-[20px]"
        heightClassName="h-14"
      />
      <ImageCrop
        src={image.src}
        sourceWidth={image.width}
        sourceHeight={image.height}
        x={segment.x}
        y={rowY}
        width={segment.width}
        height={image.rowHeight}
        label={`${profile.name} 일정 ${segment.title}`}
        roundedClassName="rounded-[20px] border border-[color:var(--line)] bg-white"
        heightClassName="h-16"
      />
    </div>
  );
}

function FullRowViewer({ profile, image }: { profile: TravelerProfile; image: ScheduleImageConfig }) {
  const rowY = image.rowTop + (profile.rowNumber - 1) * image.rowHeight;

  return (
    <div className="overflow-x-auto pb-2">
      <div className="w-[980px] space-y-3">
        <ImageCrop
          src={image.src}
          sourceWidth={image.width}
          sourceHeight={image.height}
          x={0}
          y={image.headerTop}
          width={image.width}
          height={image.headerHeight}
          label="원본 일정표 헤더 전체"
          roundedClassName="rounded-[20px]"
          heightClassName="h-12"
        />
        <ImageCrop
          src={image.src}
          sourceWidth={image.width}
          sourceHeight={image.height}
          x={0}
          y={rowY}
          width={image.width}
          height={image.rowHeight}
          label={`${profile.name} 원본 일정표 한 줄 전체`}
          roundedClassName="rounded-[20px] border border-[color:var(--line)] bg-white"
          heightClassName="h-14"
        />
      </div>
    </div>
  );
}

function ImageCrop({
  src,
  sourceWidth,
  sourceHeight,
  x,
  y,
  width,
  height,
  label,
  roundedClassName,
  heightClassName = "w-full",
}: {
  src: string;
  sourceWidth: number;
  sourceHeight: number;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  roundedClassName: string;
  heightClassName?: string;
}) {
  return (
    <div className={`overflow-hidden ${roundedClassName}`}>
      <svg
        aria-label={label}
        className={`block w-full ${heightClassName}`}
        viewBox={`${x} ${y} ${width} ${height}`}
        xmlns="http://www.w3.org/2000/svg"
      >
        <image href={src} width={sourceWidth} height={sourceHeight} preserveAspectRatio="xMinYMin slice" />
      </svg>
    </div>
  );
}
