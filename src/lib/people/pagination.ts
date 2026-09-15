export const PEOPLE_PAGE_SIZE = 15;
export const PEOPLE_PICKER_LIMIT = 50;
export const PEOPLE_PAGE_MAX_SIZE = 100;

export type PeopleQuery = {
  search: string;
  type: "" | "civil" | "police";
  page: number;
  pageSize: number;
  includeArchived: boolean;
};

export type PeoplePageMeta = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  from: number;
  to: number;
};

function positiveInteger(value: unknown, fallback: number, max?: number) {
  const parsed = typeof value === "number" || typeof value === "string" ? Number(value) : NaN;
  if (!Number.isSafeInteger(parsed) || parsed < 1) return fallback;
  return max ? Math.min(parsed, max) : parsed;
}

export function normalizePeoplePage(value: unknown) {
  return positiveInteger(value, 1);
}

export function normalizePeoplePageSize(value: unknown) {
  return positiveInteger(value, PEOPLE_PAGE_SIZE, PEOPLE_PAGE_MAX_SIZE);
}

export function parsePeopleQuery(params: Pick<URLSearchParams, "get">): PeopleQuery {
  const rawType = params.get("type");
  return {
    search: (params.get("search") ?? params.get("q") ?? "").trim(),
    type: rawType === "civil" || rawType === "police" ? rawType : "",
    page: normalizePeoplePage(params.get("page")),
    pageSize: normalizePeoplePageSize(params.get("pageSize")),
    includeArchived: params.get("archived") === "1",
  };
}

export function getPeoplePageMeta(total: number, page: number, pageSize: number): PeoplePageMeta {
  const safeTotal = Math.max(0, total);
  const safePageSize = normalizePeoplePageSize(pageSize);
  const totalPages = Math.max(1, Math.ceil(safeTotal / safePageSize));
  const safePage = Math.min(normalizePeoplePage(page), totalPages);
  return {
    page: safePage,
    pageSize: safePageSize,
    total: safeTotal,
    totalPages,
    from: safeTotal === 0 ? 0 : (safePage - 1) * safePageSize + 1,
    to: safeTotal === 0 ? 0 : Math.min(safePage * safePageSize, safeTotal),
  };
}

export function pageAfterCriteriaChange(page: number, previousSearch: string, previousType: string, nextSearch: string, nextType: string) {
  return previousSearch === nextSearch && previousType === nextType ? page : 1;
}
