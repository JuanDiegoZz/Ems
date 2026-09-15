export type PeopleRequest = { profileId: string; page: number; search?: string; type?: "" | "civil" | "police"; deliveryType?: "civil" | "police" };

type Inflight<T> = { controller: AbortController; consumers: number; promise: Promise<T> };
const firstPages = new Map<string, unknown>();
const inflight = new Map<string, Inflight<unknown>>();

function typeKey(type: PeopleRequest["type"]) { return type === "civil" || type === "police" ? type : "all"; }
function requestKey(request: PeopleRequest) { return `${request.profileId}:${request.page}:${request.search?.trim() ?? ""}:${typeKey(request.type)}:${request.deliveryType ?? ""}`; }
function firstPageKey(request: PeopleRequest) { return `${request.profileId}:${typeKey(request.type)}`; }
function cacheable(request: PeopleRequest) { return request.page === 1 && !request.search?.trim() && !request.deliveryType; }

export function readPeopleFirstPage<T>(request: PeopleRequest): T | undefined { return cacheable(request) ? firstPages.get(firstPageKey(request)) as T | undefined : undefined; }
export function writePeopleFirstPage<T>(request: PeopleRequest, value: T) { if (cacheable(request)) firstPages.set(firstPageKey(request), value); }
export function invalidatePeopleFirstPages() { firstPages.clear(); }
export function clearPeopleSessionCache() { firstPages.clear(); for (const request of inflight.values()) request.controller.abort(); inflight.clear(); }

export function joinPeopleRequest<T>(request: PeopleRequest, load: (signal: AbortSignal) => Promise<T>) {
  const key = requestKey(request);
  let requestInFlight = inflight.get(key) as Inflight<T> | undefined;
  if (!requestInFlight) {
    const controller = new AbortController();
    const promise = load(controller.signal).finally(() => inflight.delete(key));
    requestInFlight = { controller, consumers: 0, promise };
    inflight.set(key, requestInFlight);
  }
  requestInFlight.consumers += 1;
  let canceled = false;
  return { promise: requestInFlight.promise, cancel() { if (canceled) return; canceled = true; requestInFlight!.consumers -= 1; if (requestInFlight!.consumers === 0) requestInFlight!.controller.abort(); } };
}
