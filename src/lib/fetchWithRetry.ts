/** Bounded, retryable fetch for idempotent data reads. */
export async function fetchWithRetry(
  input: RequestInfo | URL,
  init: RequestInit = {},
  options: { timeoutMs?: number; retries?: number } = {},
): Promise<Response> {
  const timeoutMs = options.timeoutMs ?? 10_000;
  const retries = options.retries ?? 1;
  const method = (init.method ?? "GET").toUpperCase();
  const mayRetry = method === "GET" || method === "HEAD";

  for (let attempt = 0; ; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(new Error("Request timed out")), timeoutMs);
    const abortExternal = () => controller.abort(init.signal?.reason);
    init.signal?.addEventListener("abort", abortExternal, { once: true });
    try {
      const response = await fetch(input, { ...init, signal: controller.signal });
      if (!(mayRetry && attempt < retries && (response.status === 408 || response.status === 429 || response.status >= 500))) {
        return response;
      }
      await response.body?.cancel().catch(() => {});
    } catch (error) {
      if (init.signal?.aborted || !mayRetry || attempt >= retries) throw error;
    } finally {
      clearTimeout(timeout);
      init.signal?.removeEventListener("abort", abortExternal);
    }
    await new Promise((resolve) => setTimeout(resolve, Math.min(1_200, 250 * 2 ** attempt)));
  }
}
