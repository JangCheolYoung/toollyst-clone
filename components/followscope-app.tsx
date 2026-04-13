"use client";

import { useDeferredValue, useRef, useState, useTransition } from "react";
import {
  parseInstagramUpload,
  type FollowAccount,
  type ParseResult,
  type RelationshipAnalysis,
} from "@/lib/instagram-parser";
import { createSampleAnalysis } from "@/lib/sample-data";

type ResultTab = "followingOnly" | "followersOnly" | "mutuals";

const TAB_COPY: Record<
  ResultTab,
  {
    label: string;
    emptyTitle: string;
    emptyBody: string;
  }
> = {
  followingOnly: {
    label: "나만 팔로우 중",
    emptyTitle: "모든 계정이 맞팔 상태입니다.",
    emptyBody: "현재 분석 기준으로 내가 팔로우한 계정이 모두 나를 다시 팔로우하고 있습니다.",
  },
  followersOnly: {
    label: "내가 놓친 팔로워",
    emptyTitle: "되팔로우하지 않은 팔로워가 없습니다.",
    emptyBody: "현재 분석 기준으로 나를 팔로우하는 계정을 모두 다시 팔로우하고 있습니다.",
  },
  mutuals: {
    label: "맞팔 목록",
    emptyTitle: "맞팔 계정을 찾지 못했습니다.",
    emptyBody: "followers와 following 데이터가 비어 있거나 아직 서로 겹치는 계정이 없습니다.",
  },
};

function summaryCards(analysis: RelationshipAnalysis | null) {
  if (!analysis) {
    return [
      { label: "맞팔 수", value: "0", tone: "cyan" },
      { label: "나만 팔로우 중", value: "0", tone: "amber" },
      { label: "되팔로우 안 한 팔로워", value: "0", tone: "emerald" },
      { label: "비교된 총 계정", value: "0", tone: "slate" },
    ];
  }

  return [
    {
      label: "맞팔 수",
      value: analysis.counts.mutuals.toLocaleString("ko-KR"),
      tone: "cyan",
    },
    {
      label: "나만 팔로우 중",
      value: analysis.counts.followingOnly.toLocaleString("ko-KR"),
      tone: "amber",
    },
    {
      label: "되팔로우 안 한 팔로워",
      value: analysis.counts.followersOnly.toLocaleString("ko-KR"),
      tone: "emerald",
    },
    {
      label: "비교된 총 계정",
      value: analysis.counts.comparedTotal.toLocaleString("ko-KR"),
      tone: "slate",
    },
  ];
}

function currentList(analysis: RelationshipAnalysis | null, tab: ResultTab) {
  if (!analysis) {
    return [];
  }

  if (tab === "followingOnly") {
    return analysis.followingOnly;
  }

  if (tab === "followersOnly") {
    return analysis.followersOnly;
  }

  return analysis.mutuals;
}

function accountLink(account: FollowAccount) {
  return account.href ?? `https://www.instagram.com/${account.username}/`;
}

export function FollowScopeApp() {
  const [analysis, setAnalysis] = useState<RelationshipAnalysis | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [parsedSources, setParsedSources] = useState<string[]>([]);
  const [sourceLabel, setSourceLabel] = useState("업로드 전");
  const [activeTab, setActiveTab] = useState<ResultTab>("followingOnly");
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement | null>(null);

  const deferredSearch = useDeferredValue(search);
  const visibleAccounts = currentList(analysis, activeTab).filter((account) =>
    account.username.toLowerCase().includes(deferredSearch.trim().toLowerCase()),
  );
  const cards = summaryCards(analysis);

  async function commitResult(result: ParseResult, nextSourceLabel: string) {
    startTransition(() => {
      setAnalysis(result.analysis);
      setWarnings(result.warnings);
      setParsedSources(result.parsedSources);
      setSourceLabel(nextSourceLabel);
      setError(null);
      setSearch("");
      setActiveTab("followingOnly");
    });
  }

  async function analyzeFiles(files: File[]) {
    if (files.length === 0) {
      return;
    }

    setError(null);

    try {
      const result = await parseInstagramUpload(files);
      const label =
        files.length === 1 ? files[0].name : `${files.length}개 파일 업로드`;
      await commitResult(result, label);
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "업로드 파일을 읽는 중 예상하지 못한 오류가 발생했습니다.";

      startTransition(() => {
        setError(message);
      });
    }
  }

  function openPicker() {
    inputRef.current?.click();
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.18),transparent_30%),radial-gradient(circle_at_top_right,_rgba(250,204,21,0.16),transparent_24%),linear-gradient(180deg,#07111f_0%,#0c172a_45%,#f4f7fb_45%,#f4f7fb_100%)] text-slate-950">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-6 pb-16 pt-8 sm:px-8 lg:px-10">
        <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-slate-100">
          <div className="inline-flex items-center gap-3 rounded-full border border-white/15 bg-white/10 px-4 py-2 backdrop-blur">
            <span className="font-(family-name:--font-display) text-base tracking-[0.2em] text-cyan-300">
              FOLLOWSCOPE
            </span>
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
            <span>브라우저 안에서만 분석</span>
          </div>
          <p className="max-w-xl text-right leading-6 text-slate-300">
            업로드한 Instagram export는 현재 세션에서만 읽고, 서버에 영구 저장하지
            않습니다.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6 text-white">
            <div className="space-y-4">
              <p className="font-(family-name:--font-display) text-sm uppercase tracking-[0.35em] text-cyan-300">
                Instagram Relationship Snapshot
              </p>
              <h1 className="max-w-3xl font-(family-name:--font-display) text-4xl leading-tight sm:text-5xl lg:text-6xl">
                내 인스타그램 맞팔 현황을
                <br />
                깔끔하게 정리하는 가장 빠른 방법
              </h1>
              <p className="max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
                FollowScope는 Instagram export ZIP 또는 followers/following JSON을
                읽어, 나만 팔로우 중인 계정과 되팔로우하지 않은 팔로워를 한 번에
                보여주는 프라이버시 중심 MVP입니다.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-3xl border border-white/12 bg-white/8 p-4 backdrop-blur">
                <p className="text-sm text-slate-300">지원 업로드</p>
                <p className="mt-2 text-lg font-semibold text-white">ZIP 또는 JSON</p>
              </div>
              <div className="rounded-3xl border border-white/12 bg-white/8 p-4 backdrop-blur">
                <p className="text-sm text-slate-300">분석 방식</p>
                <p className="mt-2 text-lg font-semibold text-white">로컬 · 세션 기반</p>
              </div>
              <div className="rounded-3xl border border-white/12 bg-white/8 p-4 backdrop-blur">
                <p className="text-sm text-slate-300">테스트 모드</p>
                <p className="mt-2 text-lg font-semibold text-white">샘플 데이터 제공</p>
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-slate-950/70 p-6 text-white shadow-[0_30px_80px_rgba(5,10,20,0.45)] backdrop-blur">
            <div className="space-y-3">
              <p className="font-(family-name:--font-display) text-xs uppercase tracking-[0.3em] text-cyan-300">
                안전한 업로드
              </p>
              <h2 className="text-2xl font-semibold">파일을 놓거나 선택하세요</h2>
              <p className="text-sm leading-6 text-slate-300">
                가장 쉬운 방법은 Instagram export ZIP 그대로 올리는 것입니다. JSON만
                있다면 <span className="font-semibold text-white">followers</span>와{" "}
                <span className="font-semibold text-white">following</span> 파일을 함께
                올리면 됩니다.
              </p>
            </div>

            <div
              className={`mt-5 rounded-[1.75rem] border border-dashed p-6 transition ${
                isDragging
                  ? "border-cyan-300 bg-cyan-400/10"
                  : "border-white/15 bg-white/5"
              }`}
              onDragEnter={() => setIsDragging(true)}
              onDragLeave={() => setIsDragging(false)}
              onDragOver={(event) => {
                event.preventDefault();
                setIsDragging(true);
              }}
              onDrop={async (event) => {
                event.preventDefault();
                setIsDragging(false);
                await analyzeFiles(Array.from(event.dataTransfer.files));
              }}
            >
              <input
                ref={inputRef}
                className="hidden"
                type="file"
                accept=".zip,.json,application/json,application/zip"
                multiple
                onChange={async (event) => {
                  await analyzeFiles(Array.from(event.target.files ?? []));
                  event.target.value = "";
                }}
              />

              <div className="space-y-4">
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-2xl">
                  ↗
                </div>
                <div>
                  <p className="text-lg font-semibold">
                    ZIP, followers_*.json, following*.json
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    처리 중에도 브라우저 밖으로 데이터를 보내지 않습니다.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    className="rounded-full bg-cyan-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"
                    onClick={openPicker}
                    type="button"
                  >
                    파일 선택하기
                  </button>
                  <button
                    className="rounded-full border border-white/15 px-5 py-3 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/6"
                    onClick={async () => {
                      await commitResult(createSampleAnalysis(), "샘플 데이터");
                    }}
                    type="button"
                  >
                    샘플 데이터로 체험
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-5 grid gap-3 text-sm text-slate-300 sm:grid-cols-3">
              <div className="rounded-2xl bg-white/5 p-4">
                <p className="font-semibold text-white">1. 데이터 요청</p>
                <p className="mt-2 leading-6">
                  Instagram에서 JSON 형식 export를 내려받습니다.
                </p>
              </div>
              <div className="rounded-2xl bg-white/5 p-4">
                <p className="font-semibold text-white">2. 업로드</p>
                <p className="mt-2 leading-6">ZIP 그대로 또는 JSON 파일만 넣습니다.</p>
              </div>
              <div className="rounded-2xl bg-white/5 p-4">
                <p className="font-semibold text-white">3. 확인</p>
                <p className="mt-2 leading-6">맞팔, 미답팔, 되팔로우 후보를 확인합니다.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-6 pb-18 sm:px-8 lg:px-10">
        <div className="rounded-[2.25rem] border border-slate-200 bg-white p-5 shadow-[0_30px_70px_rgba(15,23,42,0.08)] sm:p-6 lg:p-8">
          <div className="flex flex-wrap items-end justify-between gap-5 border-b border-slate-200 pb-6">
            <div className="space-y-2">
              <p className="font-(family-name:--font-display) text-xs uppercase tracking-[0.3em] text-slate-500">
                Analysis Panel
              </p>
              <h2 className="text-2xl font-semibold text-slate-950">업로드 결과</h2>
              <p className="text-sm leading-6 text-slate-600">
                최근 분석: <span className="font-semibold text-slate-900">{sourceLabel}</span>
              </p>
            </div>
            <div className="rounded-full bg-slate-100 px-4 py-2 text-sm text-slate-600">
              {isPending ? "파일을 분석 중입니다..." : "세션 내 즉시 분석 완료"}
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {cards.map((card) => (
              <div
                key={card.label}
                className={`rounded-[1.75rem] border p-5 ${
                  card.tone === "cyan"
                    ? "border-cyan-100 bg-cyan-50"
                    : card.tone === "amber"
                      ? "border-amber-100 bg-amber-50"
                      : card.tone === "emerald"
                        ? "border-emerald-100 bg-emerald-50"
                        : "border-slate-200 bg-slate-50"
                }`}
              >
                <p className="text-sm text-slate-600">{card.label}</p>
                <p className="mt-3 font-(family-name:--font-display) text-4xl text-slate-950">
                  {card.value}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-[1.4fr_0.6fr]">
            <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-wrap gap-2">
                {(Object.keys(TAB_COPY) as ResultTab[]).map((tab) => {
                  const list = currentList(analysis, tab);

                  return (
                    <button
                      key={tab}
                      className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                        activeTab === tab
                          ? "bg-slate-950 text-white"
                          : "bg-white text-slate-600 hover:bg-slate-100"
                      }`}
                      onClick={() => setActiveTab(tab)}
                      type="button"
                    >
                      {TAB_COPY[tab].label} · {list.length}
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-slate-950">
                    {TAB_COPY[activeTab].label}
                  </p>
                  <p className="text-sm text-slate-600">
                    계정 검색 또는 필터로 바로 살펴볼 수 있습니다.
                  </p>
                </div>
                <label className="w-full max-w-sm">
                  <span className="sr-only">계정 검색</span>
                  <input
                    className="w-full rounded-full border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-950"
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="아이디 검색"
                    type="search"
                    value={search}
                  />
                </label>
              </div>

              <div className="mt-4 min-h-96 rounded-[1.5rem] border border-slate-200 bg-white p-3">
                {!analysis ? (
                  <div className="flex h-full min-h-80 flex-col items-center justify-center rounded-[1.25rem] border border-dashed border-slate-200 bg-slate-50 px-6 text-center">
                    <p className="text-lg font-semibold text-slate-950">
                      아직 분석 결과가 없습니다.
                    </p>
                    <p className="mt-2 max-w-md text-sm leading-6 text-slate-600">
                      Instagram export ZIP 또는 JSON 파일을 올리면 결과 목록이 여기에
                      표시됩니다. 빠르게 확인하려면 샘플 데이터 모드를 사용할 수 있습니다.
                    </p>
                  </div>
                ) : visibleAccounts.length === 0 ? (
                  <div className="flex h-full min-h-80 flex-col items-center justify-center rounded-[1.25rem] border border-dashed border-slate-200 bg-slate-50 px-6 text-center">
                    <p className="text-lg font-semibold text-slate-950">
                      {TAB_COPY[activeTab].emptyTitle}
                    </p>
                    <p className="mt-2 max-w-md text-sm leading-6 text-slate-600">
                      {search
                        ? "현재 검색어와 일치하는 계정이 없습니다. 다른 키워드로 다시 찾아보세요."
                        : TAB_COPY[activeTab].emptyBody}
                    </p>
                  </div>
                ) : (
                  <ul className="grid gap-3">
                    {visibleAccounts.map((account) => (
                      <li
                        key={`${activeTab}-${account.username}`}
                        className="flex flex-col gap-3 rounded-[1.25rem] border border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <p className="font-semibold text-slate-950">@{account.username}</p>
                          <p className="mt-1 text-sm text-slate-500">
                            source: {account.sourcePath}
                          </p>
                        </div>
                        <a
                          className="inline-flex items-center justify-center rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-950 hover:text-slate-950"
                          href={accountLink(account)}
                          rel="noreferrer"
                          target="_blank"
                        >
                          Instagram 열기
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-5">
                <p className="font-(family-name:--font-display) text-xs uppercase tracking-[0.3em] text-slate-500">
                  Privacy
                </p>
                <p className="mt-3 text-sm leading-7 text-slate-700">
                  이 MVP는 업로드 파일을 브라우저 세션 안에서만 파싱합니다. API 라우트나
                  DB 저장을 두지 않아 원본 export를 서비스에 영구 보관하지 않습니다.
                </p>
              </div>

              <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-5">
                <p className="font-(family-name:--font-display) text-xs uppercase tracking-[0.3em] text-slate-500">
                  Coverage
                </p>
                <ul className="mt-3 space-y-2 text-sm leading-7 text-slate-700">
                  <li>가장 흔한 followers/following JSON 파일명과 ZIP 내부 구조를 우선 지원합니다.</li>
                  <li>지원이 애매한 파일은 건너뛰고 경고로 알려줍니다.</li>
                  <li>검색은 현재 탭 기준으로 아이디 부분 일치를 사용합니다.</li>
                </ul>
              </div>

              {(error || warnings.length > 0 || parsedSources.length > 0) && (
                <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5">
                  <p className="font-(family-name:--font-display) text-xs uppercase tracking-[0.3em] text-slate-500">
                    Session Notes
                  </p>
                  {error && (
                    <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm leading-6 text-rose-700">
                      {error}
                    </div>
                  )}
                  {warnings.length > 0 && (
                    <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                      <p className="text-sm font-semibold text-amber-900">파서 경고</p>
                      <ul className="mt-2 space-y-2 text-sm leading-6 text-amber-800">
                        {warnings.map((warning) => (
                          <li key={warning}>{warning}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {parsedSources.length > 0 && (
                    <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-sm font-semibold text-slate-900">읽은 소스</p>
                      <ul className="mt-2 space-y-2 text-sm leading-6 text-slate-600">
                        {parsedSources.map((source) => (
                          <li key={source}>{source}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
