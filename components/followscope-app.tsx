"use client";

import { useDeferredValue, useRef, useState, useTransition } from "react";
import {
  buildInstagramProfileUrl,
  parseInstagramUpload,
  type FollowAccount,
  type ParseResult,
  type RelationshipAnalysis,
} from "@/lib/instagram-parser";
import { createSampleAnalysis } from "@/lib/sample-data";

type ResultTab = "followingOnly" | "followersOnly" | "mutuals";

const OUTCOME_GUIDE = [
  {
    label: "서로 팔로우",
    body: "서로 팔로우하고 있는 계정입니다.",
  },
  {
    label: "내가 팔로우만",
    body: "나는 팔로우하지만 상대는 나를 팔로우하지 않는 계정입니다.",
  },
  {
    label: "나를 팔로우만",
    body: "상대는 나를 팔로우하지만 나는 아직 팔로우하지 않은 계정입니다.",
  },
] as const;

const EXPORT_STEPS = [
  {
    step: "1",
    title: "Accounts Center 열기",
    body: "Instagram 설정에서 Accounts Center를 찾습니다.",
  },
  {
    step: "2",
    title: "내 정보 내보내기 선택",
    body: "`내 정보 및 권한`에서 `내 정보 내보내기`로 들어갑니다.",
  },
  {
    step: "3",
    title: "Instagram 프로필과 JSON 선택",
    body: "`Export to device`를 고르고 형식은 `JSON`으로 만듭니다.",
  },
  {
    step: "4",
    title: "다운로드한 ZIP 그대로 업로드",
    body: "완료 후 받은 ZIP을 풀지 말고 그대로 올리면 가장 쉽습니다.",
  },
] as const;

const UPLOAD_TIPS = [
  "가장 쉬운 방법은 Instagram export ZIP 그대로 올리기",
  "JSON만 있으면 followers 파일과 following 파일을 함께 선택",
  "형식은 HTML이 아니라 JSON이어야 합니다",
] as const;

const LIMITATION_NOTES = [
  "지원하지 않는 파일은 건너뛰고 안내 메시지를 보여줍니다.",
  "검색은 현재 보고 있는 목록에서 아이디로 찾습니다.",
] as const;

const TAB_COPY: Record<
  ResultTab,
  {
    label: string;
    description: string;
    emptyTitle: string;
    emptyBody: string;
  }
> = {
  followingOnly: {
    label: "내가 팔로우만",
    description: "나는 팔로우하지만 상대는 나를 팔로우하지 않는 계정입니다.",
    emptyTitle: "이 목록에 계정이 없습니다.",
    emptyBody: "현재 분석에서는 내가 먼저 팔로우한 계정을 찾지 못했습니다.",
  },
  followersOnly: {
    label: "나를 팔로우만",
    description: "상대는 나를 팔로우하지만 나는 아직 팔로우하지 않은 계정입니다.",
    emptyTitle: "이 목록에 계정이 없습니다.",
    emptyBody: "현재 분석에서는 내가 아직 팔로우하지 않은 팔로워를 찾지 못했습니다.",
  },
  mutuals: {
    label: "서로 팔로우",
    description: "서로 팔로우하고 있는 계정입니다.",
    emptyTitle: "이 목록에 계정이 없습니다.",
    emptyBody: "현재 분석에서는 서로 팔로우 중인 계정을 찾지 못했습니다.",
  },
};

function summaryCards(analysis: RelationshipAnalysis | null) {
  if (!analysis) {
    return [
      { label: "서로 팔로우", value: "0", description: "서로 팔로우 중" },
      { label: "내가 팔로우만", value: "0", description: "나는 팔로우 중" },
      { label: "나를 팔로우만", value: "0", description: "상대만 팔로우 중" },
      { label: "비교한 전체 계정", value: "0", description: "중복 제외 기준" },
    ];
  }

  return [
    {
      label: "서로 팔로우",
      value: analysis.counts.mutuals.toLocaleString("ko-KR"),
      description: "서로 팔로우 중",
    },
    {
      label: "내가 팔로우만",
      value: analysis.counts.followingOnly.toLocaleString("ko-KR"),
      description: "나는 팔로우 중",
    },
    {
      label: "나를 팔로우만",
      value: analysis.counts.followersOnly.toLocaleString("ko-KR"),
      description: "상대만 팔로우 중",
    },
    {
      label: "비교한 전체 계정",
      value: analysis.counts.comparedTotal.toLocaleString("ko-KR"),
      description: "중복 제외 기준",
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
  return buildInstagramProfileUrl(account.username);
}

export function FollowScopeApp() {
  const [analysis, setAnalysis] = useState<RelationshipAnalysis | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [parsedSources, setParsedSources] = useState<string[]>([]);
  const [sourceLabel, setSourceLabel] = useState("아직 업로드한 파일 없음");
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

  function commitResult(result: ParseResult, nextSourceLabel: string) {
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
      commitResult(result, label);
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
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#f8f5ef_100%)] text-slate-950">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
        <section className="grid gap-6 lg:grid-cols-[1.06fr_0.94fr]">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 shadow-sm">
              <span className="font-semibold text-slate-950">FollowScope</span>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span>브라우저 안에서만 분석</span>
            </div>

            <div className="space-y-4">
              <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
                인스타 맞팔을
                <br />
                바로 확인하세요
              </h1>
              <p className="max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
                파일을 올리면 결과를 세 가지로 바로 나눠 보여줍니다.{" "}
                <span className="font-semibold text-slate-950">서로 팔로우</span>,{" "}
                <span className="font-semibold text-slate-950">내가 팔로우만</span>,{" "}
                <span className="font-semibold text-slate-950">나를 팔로우만</span>.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {OUTCOME_GUIDE.map((item) => (
                <div
                  key={item.label}
                  className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <p className="text-base font-semibold text-slate-950">{item.label}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{item.body}</p>
                </div>
              ))}
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-950">
                처음 쓰는 분은 이렇게 보시면 됩니다
              </h2>
              <ol className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
                <li>1. ZIP 파일을 그대로 올립니다.</li>
                <li>2. 필요한 결과 탭 하나를 엽니다.</li>
                <li>3. 계정을 누르면 Instagram 프로필이 새 탭에서 열립니다.</li>
              </ol>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-500">파일 올리기</p>
              <h2 className="text-2xl font-semibold text-slate-950">
                가장 쉬운 방법은 ZIP 그대로 올리기입니다
              </h2>
              <p className="text-sm leading-6 text-slate-600">
                JSON만 있다면 followers 파일과 following 파일을 함께 선택하세요.
              </p>
            </div>

            <div
              className={`mt-5 rounded-3xl border-2 border-dashed p-6 transition ${
                isDragging
                  ? "border-slate-950 bg-slate-50"
                  : "border-slate-300 bg-slate-50/70"
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
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-xl text-white">
                  ↑
                </div>
                <div className="space-y-2">
                  <p className="text-lg font-semibold text-slate-950">
                    Instagram export ZIP 또는 JSON
                  </p>
                  <p className="text-sm leading-6 text-slate-600">
                    파일은 이 브라우저 안에서만 읽습니다. 서버로 보내지 않고 저장도
                    하지 않습니다.
                  </p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                    onClick={openPicker}
                    type="button"
                  >
                    파일 선택
                  </button>
                  <button
                    className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-950 hover:text-slate-950"
                    onClick={() => {
                      commitResult(createSampleAnalysis(), "샘플 데이터");
                    }}
                    type="button"
                  >
                    샘플 보기
                  </button>
                </div>
              </div>
            </div>

            <ul className="mt-5 space-y-2 text-sm leading-6 text-slate-700">
              {UPLOAD_TIPS.map((tip) => (
                <li key={tip} className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-slate-400" />
                  <span>{tip}</span>
                </li>
              ))}
            </ul>

            <div className="mt-5 rounded-2xl bg-emerald-50 px-4 py-4 text-sm leading-6 text-emerald-900">
              <p className="font-semibold">개인정보</p>
              <p className="mt-1">
                로그인, 서버 저장, 계정 연결 없이 현재 브라우저 안에서만 분석합니다.
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.86fr_1.14fr]">
          <div className="space-y-4">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-950">
                Instagram 내보내기 방법
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                메뉴 이름이 조금 달라도 아래 순서면 충분합니다.
              </p>

              <ol className="mt-4 space-y-3">
                {EXPORT_STEPS.map((item) => (
                  <li
                    key={item.step}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"
                  >
                    <div className="flex gap-3">
                      <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-950 text-sm font-semibold text-white">
                        {item.step}
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-slate-950">{item.title}</p>
                        <p className="mt-1 text-sm leading-6 text-slate-600">{item.body}</p>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-950">업로드 전에 확인</h2>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
                {LIMITATION_NOTES.map((note) => (
                  <li key={note} className="flex gap-2">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-slate-400" />
                    <span>{note}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 pb-5">
              <div>
                <p className="text-sm font-semibold text-slate-500">분석 결과</p>
                <h2 className="mt-1 text-2xl font-semibold text-slate-950">
                  지금 올린 파일
                </h2>
                <p className="mt-2 text-sm text-slate-600">{sourceLabel}</p>
              </div>
              <div className="flex flex-wrap gap-2 text-sm">
                <span className="rounded-full bg-slate-100 px-3 py-2 text-slate-700">
                  {isPending
                    ? "분석 중"
                    : analysis
                      ? "분석 완료"
                      : "업로드 대기"}
                </span>
                <span className="rounded-full bg-emerald-50 px-3 py-2 text-emerald-800">
                  서버 저장 없음
                </span>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {cards.map((card) => (
                <div
                  key={card.label}
                  className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-5"
                >
                  <p className="text-sm text-slate-600">{card.label}</p>
                  <p className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
                    {card.value}
                  </p>
                  <p className="mt-2 text-sm text-slate-500">{card.description}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-wrap gap-2">
                {(Object.keys(TAB_COPY) as ResultTab[]).map((tab) => {
                  const list = currentList(analysis, tab);

                  return (
                    <button
                      key={tab}
                      className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                        activeTab === tab
                          ? "bg-slate-950 text-white"
                          : "bg-white text-slate-700 hover:bg-slate-100"
                      }`}
                      onClick={() => setActiveTab(tab)}
                      type="button"
                    >
                      {TAB_COPY[tab].label} {list.length.toLocaleString("ko-KR")}
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div className="space-y-1">
                  <p className="text-lg font-semibold text-slate-950">
                    {TAB_COPY[activeTab].label}
                  </p>
                  <p className="text-sm leading-6 text-slate-600">
                    {TAB_COPY[activeTab].description}
                  </p>
                  <p className="text-sm text-slate-500">
                    목록을 누르면 Instagram 프로필이 새 탭에서 열립니다.
                  </p>
                </div>
                <label className="w-full max-w-sm">
                  <span className="sr-only">아이디 검색</span>
                  <input
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-950"
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="아이디 찾기"
                    type="search"
                    value={search}
                  />
                </label>
              </div>

              <div className="mt-4 min-h-96 rounded-3xl border border-slate-200 bg-white p-3">
                {!analysis ? (
                  <div className="flex h-full min-h-80 flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50 px-6 text-center">
                    <p className="text-lg font-semibold text-slate-950">
                      아직 분석 결과가 없습니다.
                    </p>
                    <p className="mt-2 max-w-md text-sm leading-6 text-slate-600">
                      ZIP 또는 JSON 파일을 올리면 이곳에 결과가 표시됩니다. 먼저
                      살펴보고 싶다면 샘플 보기 버튼을 사용하세요.
                    </p>
                  </div>
                ) : visibleAccounts.length === 0 ? (
                  <div className="flex h-full min-h-80 flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50 px-6 text-center">
                    <p className="text-lg font-semibold text-slate-950">
                      {TAB_COPY[activeTab].emptyTitle}
                    </p>
                    <p className="mt-2 max-w-md text-sm leading-6 text-slate-600">
                      {search
                        ? "현재 검색어와 일치하는 계정이 없습니다. 다른 아이디로 다시 찾아보세요."
                        : TAB_COPY[activeTab].emptyBody}
                    </p>
                  </div>
                ) : (
                  <ul className="grid gap-3">
                    {visibleAccounts.map((account) => (
                      <li
                        key={`${activeTab}-${account.username}`}
                        className="flex flex-col gap-3 rounded-[1.5rem] border border-slate-200 bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <p className="font-semibold text-slate-950">@{account.username}</p>
                          <p className="mt-1 text-sm text-slate-500">{account.sourcePath}</p>
                        </div>
                        <a
                          className="inline-flex items-center justify-center rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-950 hover:text-slate-950"
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

            {(error || warnings.length > 0 || parsedSources.length > 0) && (
              <div className="mt-6 grid gap-4 lg:grid-cols-2">
                <div className="rounded-3xl border border-slate-200 bg-white p-5">
                  <p className="text-sm font-semibold text-slate-500">알림</p>
                  {error ? (
                    <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm leading-6 text-rose-700">
                      {error}
                    </div>
                  ) : warnings.length > 0 ? (
                    <ul className="mt-3 space-y-2 text-sm leading-6 text-amber-900">
                      {warnings.map((warning) => (
                        <li
                          key={warning}
                          className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3"
                        >
                          {warning}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-3 text-sm leading-6 text-slate-600">
                      현재 표시할 알림이 없습니다.
                    </p>
                  )}
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-5">
                  <p className="text-sm font-semibold text-slate-500">읽은 파일</p>
                  {parsedSources.length > 0 ? (
                    <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
                      {parsedSources.map((source) => (
                        <li
                          key={source}
                          className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                        >
                          {source}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-3 text-sm leading-6 text-slate-600">
                      아직 읽은 파일이 없습니다.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
