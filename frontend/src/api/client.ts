import type {
  Chunk,
  DocumentManifest,
  FormulaModule,
  VisualModule,
} from "../types";

const BASE = "/api";

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export async function getManifest(docId: string): Promise<DocumentManifest> {
  return fetchJSON(`${BASE}/documents/${docId}/manifest`);
}

export async function getChunks(
  docId: string
): Promise<{ docId: string; chunks: Chunk[] }> {
  return fetchJSON(`${BASE}/documents/${docId}/chunks`);
}

export async function getFormulas(
  docId: string,
  pageNo?: number
): Promise<{ formulas: FormulaModule[] }> {
  const params = new URLSearchParams({ docId });
  if (pageNo !== undefined) params.set("pageNo", String(pageNo));
  return fetchJSON(`${BASE}/modules/formulas?${params}`);
}

export async function getVisuals(
  docId: string,
  pageNo?: number
): Promise<{ visuals: VisualModule[] }> {
  const params = new URLSearchParams({ docId });
  if (pageNo !== undefined) params.set("pageNo", String(pageNo));
  return fetchJSON(`${BASE}/modules/visuals?${params}`);
}

export async function askQuestion(
  docId: string,
  pageNo: number,
  chunkId: string,
  question: string
): Promise<{ answer: string; citations: { pageNo: number; chunkId: string }[] }> {
  const res = await fetch(`${BASE}/qa`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ docId, pageNo, chunkId, question }),
  });
  if (!res.ok) throw new Error(`QA error ${res.status}`);
  return res.json();
}

export async function uploadPDF(
  file: File
): Promise<{ docId: string; title: string; pageCount: number; chunkCount: number }> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${BASE}/documents/upload`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Upload error ${res.status}: ${detail}`);
  }
  return res.json();
}

export async function postReflection(
  docId: string,
  visualId: string,
  trace: unknown
): Promise<{ reflection: string; takeaway: string; nextSuggestion: string }> {
  const res = await fetch(`${BASE}/explore/reflect`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ docId, visualId, trace }),
  });
  if (!res.ok) throw new Error(`Reflect error ${res.status}`);
  return res.json();
}
