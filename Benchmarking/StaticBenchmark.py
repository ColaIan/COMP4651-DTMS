#!/usr/bin/env python3
"""
bench_swa_load_test.py

Asynchronous concurrent HTTP benchmarking script intended to test load-balancing behavior (e.g., Azure Static Web Apps).
Features:
- Async concurrency using httpx.AsyncClient (optionally HTTP/2)
- Control by total requests OR duration
- Rate limiting (approx) per worker
- Collects latencies, status codes, errors; prints summary and writes CSV/JSON
- Graceful shutdown on Ctrl+C

Install dependencies:
    pip install httpx[http2] tqdm

Example usage:
    python bench_swa_load_test.py https://example.azurestaticapps.net/api/health -c 200 -n 20000 --http2 --timeout 10 --csv out.csv
"""
import argparse
import asyncio
import csv
import json
import signal
import sys
import time
from collections import Counter, defaultdict
from typing import List, Optional

import httpx
from tqdm import tqdm

# ---- Helpers ----


def percentile(sorted_list: List[float], p: float) -> float:
    if not sorted_list:
        return 0.0
    k = (len(sorted_list) - 1) * (p / 100.0)
    f = int(k)
    c = min(f + 1, len(sorted_list) - 1)
    if f == c:
        return sorted_list[int(k)]
    d0 = sorted_list[f] * (c - k)
    d1 = sorted_list[c] * (k - f)
    return d0 + d1


# ---- Benchmark runner ----


class BenchRunner:
    def __init__(
        self,
        url: str,
        concurrency: int,
        total_requests: Optional[int],
        duration: Optional[float],
        timeout: float,
        method: str,
        data: Optional[str],
        headers: Optional[dict],
        http2: bool,
        rate_per_worker: Optional[float],
        csv_out: Optional[str],
        json_out: Optional[str],
    ):
        self.url = url
        self.concurrency = max(1, concurrency)
        self.total_requests = total_requests
        self.duration = duration
        self.timeout = timeout
        self.method = method.upper()
        self.data = data
        self.headers = headers or {}
        self.http2 = http2
        self.rate_per_worker = rate_per_worker
        self.csv_out = csv_out
        self.json_out = json_out

        self._start_time = None
        self._stop_event = asyncio.Event()
        self._counter = 0
        self._counter_lock = asyncio.Lock()

        # results: lightweight records
        self.latencies_ms: List[float] = []
        self.status_counter = Counter()
        self.errors_counter = Counter()
        self.resp_sizes = []
        self.records = []  # may be large; optional if you want per-request CSV

    async def _should_continue(self):
        if self._stop_event.is_set():
            return False
        if self.total_requests is not None:
            async with self._counter_lock:
                if self._counter >= self.total_requests:
                    return False
        if self.duration is not None:
            if (time.monotonic() - self._start_time) >= self.duration:
                return False
        return True

    async def _increment_counter(self):
        async with self._counter_lock:
            self._counter += 1
            return self._counter

    async def _worker(self, client: httpx.AsyncClient, pbar: Optional[tqdm] = None, worker_id: int = 0):
        while await self._should_continue():
            n = await self._increment_counter()
            # double-check after increment (if total_requests was hit exactly by another)
            if self.total_requests is not None and n > self.total_requests:
                break

            t0 = time.monotonic()
            try:
                resp = await client.request(self.method, self.url, headers=self.headers, data=self.data, timeout=self.timeout)
                latency_ms = (time.monotonic() - t0) * 1000.0
                self.latencies_ms.append(latency_ms)
                self.status_counter[str(resp.status_code)] += 1
                self.resp_sizes.append(len(resp.content) if resp.content is not None else 0)

                # small record (timestamp, latency, status)
                self.records.append(
                    {
                        "ts": time.time(),
                        "latency_ms": round(latency_ms, 3),
                        "status_code": resp.status_code,
                        "size_bytes": len(resp.content) if resp.content is not None else 0,
                    }
                )
            except Exception as exc:
                latency_ms = (time.monotonic() - t0) * 1000.0
                self.latencies_ms.append(latency_ms)
                self.errors_counter[type(exc).__name__] += 1
                self.records.append(
                    {"ts": time.time(), "latency_ms": round(latency_ms, 3), "status_code": None, "error": str(exc)}
                )
            if pbar:
                pbar.update(1)

            # optional per-worker pacing
            if self.rate_per_worker and self.rate_per_worker > 0:
                # rate_per_worker is requests per second per worker -> wait 1/rate between requests
                await asyncio.sleep(max(0.0, (1.0 / self.rate_per_worker)))
        # worker ends
        return

    async def run(self):
        # Setup client
        limits = httpx.Limits(max_keepalive_connections=self.concurrency * 2, max_connections=self.concurrency * 4)
        async with httpx.AsyncClient(http2=self.http2, limits=limits, trust_env=True) as client:
            # prepare progress bar if total_requests is known
            total_for_pbar = self.total_requests if self.total_requests is not None else None
            pbar = tqdm(total=total_for_pbar, unit="req", desc="requests", leave=True) if total_for_pbar else None

            self._start_time = time.monotonic()

            # Configure graceful stop on signal (in case running in blocking loop)
            loop = asyncio.get_running_loop()
            def _on_sig(*_):
                self._stop_event.set()
            for sig in (signal.SIGINT, signal.SIGTERM):
                try:
                    loop.add_signal_handler(sig, _on_sig)
                except NotImplementedError:
                    # Windows may throw; rely on KeyboardInterrupt
                    pass

            # Launch workers
            tasks = []
            for i in range(self.concurrency):
                tasks.append(asyncio.create_task(self._worker(client, pbar=pbar, worker_id=i)))
            # If duration is set, schedule a stopper
            if self.duration is not None:
                async def _stopper():
                    await asyncio.sleep(self.duration)
                    self._stop_event.set()
                stopper = asyncio.create_task(_stopper())
            try:
                # Wait for all tasks to finish
                await asyncio.gather(*tasks)
            except asyncio.CancelledError:
                pass
            finally:
                if pbar:
                    pbar.close()
                # compute stats
                self._stop_event.set()

    def summary(self):
        total_reqs = len(self.latencies_ms)
        total_errs = sum(self.errors_counter.values())
        elapsed = max(1e-6, time.monotonic() - (self._start_time or time.monotonic()))
        rps = total_reqs / elapsed
        lat_sorted = sorted(self.latencies_ms)
        return {
            "total_requests_recorded": total_reqs,
            "total_errors": total_errs,
            "by_status": dict(self.status_counter),
            "by_error": dict(self.errors_counter),
            "requests_per_second": rps,
            "latency_ms": {
                "min": min(lat_sorted) if lat_sorted else 0.0,
                "max": max(lat_sorted) if lat_sorted else 0.0,
                "mean": (sum(lat_sorted) / len(lat_sorted)) if lat_sorted else 0.0,
                "p50": percentile(lat_sorted, 50),
                "p90": percentile(lat_sorted, 90),
                "p95": percentile(lat_sorted, 95),
                "p99": percentile(lat_sorted, 99),
            },
        }

    def write_outputs(self):
        summary = self.summary()
        if self.csv_out:
            fieldnames = ["ts", "latency_ms", "status_code", "size_bytes", "error"]
            try:
                with open(self.csv_out, "w", newline="") as f:
                    writer = csv.DictWriter(f, fieldnames=fieldnames)
                    writer.writeheader()
                    for r in self.records:
                        row = {
                            "ts": r.get("ts"),
                            "latency_ms": r.get("latency_ms"),
                            "status_code": r.get("status_code"),
                            "size_bytes": r.get("size_bytes", ""),
                            "error": r.get("error", ""),
                        }
                        writer.writerow(row)
                print(f"Wrote per-request CSV to {self.csv_out}")
            except Exception as exc:
                print(f"Failed to write CSV: {exc}", file=sys.stderr)

        if self.json_out:
            try:
                with open(self.json_out, "w") as f:
                    json.dump({"summary": summary, "records": self.records}, f, indent=2)
                print(f"Wrote JSON output to {self.json_out}")
            except Exception as exc:
                print(f"Failed to write JSON: {exc}", file=sys.stderr)

        return summary


# ---- CLI ----


def parse_headers(header_list: Optional[List[str]]):
    if not header_list:
        return {}
    hdrs = {}
    for h in header_list:
        if ":" in h:
            k, v = h.split(":", 1)
            hdrs[k.strip()] = v.strip()
    return hdrs


def main():
    parser = argparse.ArgumentParser(description="Async benchmarking tool for testing Azure SWA load balancing behavior.")
    parser.add_argument("url", help="Target URL to request (e.g., https://<app>.azurestaticapps.net/)")
    parser.add_argument("-c", "--concurrency", type=int, default=50, help="Number of concurrent workers (default: 50)")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("-n", "--requests", type=int, help="Total number of requests to send")
    group.add_argument("-d", "--duration", type=float, help="Duration to run in seconds")
    parser.add_argument("--timeout", type=float, default=10.0, help="Request timeout seconds (default: 10)")
    parser.add_argument("--method", default="GET", help="HTTP method (default: GET)")
    parser.add_argument("--data", help="Request body for POST/PUT")
    parser.add_argument("--header", "-H", action="append", help="Add header (e.g., -H 'User-Agent: bencher')")
    parser.add_argument("--http2", action="store_true", help="Enable HTTP/2 (httpx)")
    parser.add_argument("--rate", type=float, default=0.0, help="Per-worker rate (requests/sec) to throttle each worker. 0 = no pacing")
    parser.add_argument("--csv", help="Write per-request CSV file path")
    parser.add_argument("--json", help="Write full JSON file path")
    args = parser.parse_args()

    headers = parse_headers(args.header)

    runner = BenchRunner(
        url=args.url,
        concurrency=args.concurrency,
        total_requests=args.requests,
        duration=args.duration,
        timeout=args.timeout,
        method=args.method,
        data=args.data,
        headers=headers,
        http2=args.http2,
        rate_per_worker=args.rate if args.rate and args.rate > 0 else None,
        csv_out=args.csv,
        json_out=args.json,
    )

    try:
        asyncio.run(runner.run())
    except KeyboardInterrupt:
        print("Interrupted by user; finishing...")


    summary = runner.write_outputs()
    # print summary
    print("\nSUMMARY")
    print(json.dumps(summary, indent=2))

if __name__ == "__main__":
    main()