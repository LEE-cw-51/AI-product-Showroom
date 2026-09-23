import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { analysisSchema, type ProductAnalysis } from "../ai/schemas/analysis.ts";
import {
  showroomContentSchema,
  type ShowroomContent,
} from "../ai/schemas/showroom.ts";
import type { ShowroomQaResult } from "../ai/qa.ts";

/**
 * content/drafts 초안의 단일 읽기·쓰기 창구.
 * CLI 와 관리자 검수 UI 가 같은 형식을 쓴다. 공개 발행 형식은
 * content/showrooms 의 `{ taca_item_id, content }` 이다.
 */

const DRAFTS_DIR = path.join(process.cwd(), "content", "drafts");
const SHOWROOMS_DIR = path.join(process.cwd(), "content", "showrooms");

/** 초안 생명주기. QA 통과 → review, 실패 → failed. 검수 후 published|rejected. */
export type DraftStatus = "review" | "failed" | "published" | "rejected";

export type ShowroomDraft = {
  taca_item_id: number;
  analysis: ProductAnalysis;
  content: ShowroomContent;
  qa_result: ShowroomQaResult;
  prompt_version: string;
  status: DraftStatus;
};

export type PublishedShowroomFile = {
  taca_item_id: number;
  content: ShowroomContent;
};

function draftPath(tacaItemId: number): string {
  return path.join(DRAFTS_DIR, `${tacaItemId}.json`);
}

function publishedPath(slug: string): string {
  return path.join(SHOWROOMS_DIR, `${slug}.json`);
}

function parseDraft(raw: unknown): ShowroomDraft {
  if (!raw || typeof raw !== "object") {
    throw new Error("초안 JSON이 객체가 아닙니다.");
  }
  const obj = raw as Record<string, unknown>;

  if (typeof obj.taca_item_id !== "number") {
    throw new Error("초안에 taca_item_id 가 없습니다.");
  }
  if (typeof obj.prompt_version !== "string") {
    throw new Error("초안에 prompt_version 이 없습니다.");
  }
  if (
    obj.status !== "review" &&
    obj.status !== "failed" &&
    obj.status !== "published" &&
    obj.status !== "rejected"
  ) {
    throw new Error(`알 수 없는 초안 status: ${String(obj.status)}`);
  }

  const analysis = analysisSchema.parse(obj.analysis);
  const content = showroomContentSchema.parse(obj.content);
  const qa_result = obj.qa_result as ShowroomQaResult;
  if (
    !qa_result ||
    typeof qa_result !== "object" ||
    typeof qa_result.passed !== "boolean" ||
    !Array.isArray(qa_result.failures)
  ) {
    throw new Error("초안에 qa_result 가 없거나 형식이 틀립니다.");
  }

  return {
    taca_item_id: obj.taca_item_id,
    analysis,
    content,
    qa_result,
    prompt_version: obj.prompt_version,
    status: obj.status,
  };
}

export async function ensureDraftsDir(): Promise<void> {
  await mkdir(DRAFTS_DIR, { recursive: true });
}

export async function writeDraft(draft: ShowroomDraft): Promise<string> {
  await ensureDraftsDir();
  const file = draftPath(draft.taca_item_id);
  await writeFile(file, `${JSON.stringify(draft, null, 2)}\n`, "utf8");
  return file;
}

export async function readDraft(
  tacaItemId: number,
): Promise<ShowroomDraft | null> {
  try {
    const raw = JSON.parse(await readFile(draftPath(tacaItemId), "utf8"));
    return parseDraft(raw);
  } catch (err) {
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code: string }).code === "ENOENT"
    ) {
      return null;
    }
    throw err;
  }
}

export async function listDrafts(): Promise<ShowroomDraft[]> {
  let files: string[];
  try {
    files = (await readdir(DRAFTS_DIR)).filter((f) => f.endsWith(".json"));
  } catch {
    return [];
  }

  const drafts: ShowroomDraft[] = [];
  for (const file of files) {
    const raw = JSON.parse(await readFile(path.join(DRAFTS_DIR, file), "utf8"));
    drafts.push(parseDraft(raw));
  }

  return drafts.sort((a, b) => a.taca_item_id - b.taca_item_id);
}

export async function updateDraftStatus(
  tacaItemId: number,
  status: DraftStatus,
): Promise<ShowroomDraft> {
  const draft = await readDraft(tacaItemId);
  if (!draft) {
    throw new Error(`초안이 없습니다: ${tacaItemId}`);
  }
  const next = { ...draft, status };
  await writeDraft(next);
  return next;
}

/**
 * QA 통과(review) 초안만 발행한다.
 * content/showrooms/<slug>.json 에 `{ taca_item_id, content }` 를 쓰고
 * 초안 status 를 published 로 바꾼다.
 */
export async function approveDraft(
  tacaItemId: number,
): Promise<{ draft: ShowroomDraft; publishedPath: string }> {
  const draft = await readDraft(tacaItemId);
  if (!draft) {
    throw new Error(`초안이 없습니다: ${tacaItemId}`);
  }
  if (draft.status !== "review") {
    throw new Error(
      `승인할 수 없습니다. status 가 "${draft.status}" 입니다 (review 만 가능).`,
    );
  }

  const slug = draft.content.seo.slug;
  const published: PublishedShowroomFile = {
    taca_item_id: draft.taca_item_id,
    content: draft.content,
  };

  await mkdir(SHOWROOMS_DIR, { recursive: true });
  const out = publishedPath(slug);
  await writeFile(out, `${JSON.stringify(published, null, 2)}\n`, "utf8");

  const updated = await updateDraftStatus(tacaItemId, "published");
  return { draft: updated, publishedPath: out };
}

/** 반려. failed 포함 어떤 초안이든 rejected 로 바꿀 수 있다. */
export async function rejectDraft(tacaItemId: number): Promise<ShowroomDraft> {
  const draft = await readDraft(tacaItemId);
  if (!draft) {
    throw new Error(`초안이 없습니다: ${tacaItemId}`);
  }
  return updateDraftStatus(tacaItemId, "rejected");
}
