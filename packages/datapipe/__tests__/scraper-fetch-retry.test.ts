import { describe, expect, test } from "bun:test";
import { fetchWithRetry } from "../scraper/fetch-retry";

const noSleep = async () => {};

function sequence(
  results: Array<Response | Error>,
): [typeof fetch, () => number] {
  let calls = 0;
  const fn = (async () => {
    const result = results[Math.min(calls, results.length - 1)]!;
    calls++;
    if (result instanceof Error) throw result;
    return result;
  }) as unknown as typeof fetch;
  return [fn, () => calls];
}

describe("fetchWithRetry", () => {
  test("returns an ok response on the first attempt", async () => {
    const [fetchFn, calls] = sequence([new Response("ok", { status: 200 })]);
    const resp = await fetchWithRetry("http://x", undefined, {
      fetchFn,
      sleep: noSleep,
    });
    expect(resp.status).toBe(200);
    expect(calls()).toBe(1);
  });

  test("retries network errors and succeeds", async () => {
    const [fetchFn, calls] = sequence([
      new Error("ECONNRESET"),
      new Error("ECONNRESET"),
      new Response("ok", { status: 200 }),
    ]);
    const resp = await fetchWithRetry("http://x", undefined, {
      fetchFn,
      sleep: noSleep,
    });
    expect(resp.status).toBe(200);
    expect(calls()).toBe(3);
  });

  test("retries 5xx responses and succeeds", async () => {
    const [fetchFn, calls] = sequence([
      new Response("bad", { status: 503 }),
      new Response("ok", { status: 200 }),
    ]);
    const resp = await fetchWithRetry("http://x", undefined, {
      fetchFn,
      sleep: noSleep,
    });
    expect(resp.status).toBe(200);
    expect(calls()).toBe(2);
  });

  test("retries 429 responses", async () => {
    const [fetchFn, calls] = sequence([
      new Response("slow down", { status: 429 }),
      new Response("ok", { status: 200 }),
    ]);
    const resp = await fetchWithRetry("http://x", undefined, {
      fetchFn,
      sleep: noSleep,
    });
    expect(resp.status).toBe(200);
    expect(calls()).toBe(2);
  });

  test("does not retry non-retryable 4xx; returns it for the caller to handle", async () => {
    const [fetchFn, calls] = sequence([
      new Response("nope", { status: 404 }),
      new Response("ok", { status: 200 }),
    ]);
    const resp = await fetchWithRetry("http://x", undefined, {
      fetchFn,
      sleep: noSleep,
    });
    expect(resp.status).toBe(404);
    expect(calls()).toBe(1);
  });

  test("returns the last 5xx response after exhausting attempts", async () => {
    const [fetchFn, calls] = sequence([new Response("bad", { status: 502 })]);
    const resp = await fetchWithRetry("http://x", undefined, {
      fetchFn,
      sleep: noSleep,
      attempts: 3,
    });
    expect(resp.status).toBe(502);
    expect(calls()).toBe(3);
  });

  test("throws the last network error after exhausting attempts", async () => {
    const [fetchFn, calls] = sequence([new Error("ECONNREFUSED")]);
    await expect(
      fetchWithRetry("http://x", undefined, {
        fetchFn,
        sleep: noSleep,
        attempts: 3,
      }),
    ).rejects.toThrow("ECONNREFUSED");
    expect(calls()).toBe(3);
  });

  test("backs off exponentially between attempts", async () => {
    const delays: number[] = [];
    const [fetchFn] = sequence([
      new Error("boom"),
      new Error("boom"),
      new Response("ok", { status: 200 }),
    ]);
    await fetchWithRetry("http://x", undefined, {
      fetchFn,
      sleep: async (ms) => {
        delays.push(ms);
      },
      baseDelayMs: 100,
    });
    expect(delays).toEqual([100, 200]);
  });
});
