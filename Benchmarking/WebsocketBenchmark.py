#!/usr/bin/env python3
"""
WebSocket benchmark server+client for latency testing.

- Hosts a simple WebSocket echo API (server) that timestamps receives and echoes back.
- Runs a client benchmark with N workers, each sending M messages, measuring round-trip latency.
- Default: 20 workers x 50 messages.

Requirements:
    pip install websockets

Usage examples:
1) Run server+benchmark in one process (default):
    python ws_benchmark.py --host 0.0.0.0 --port 8765 --workers 20 --msgs 50 --out-csv results.csv

2) Run server-only (useful if you want remote clients to connect):
    python ws_benchmark.py --server-only --host 0.0.0.0 --port 8765

3) Run client-only against an existing server:
    python ws_benchmark.py --client-only ws://localhost:8765 --workers 20 --msgs 50 --out-csv results.csv
"""
import argparse
import asyncio
import csv
import time
from datetime import datetime
from statistics import mean, median
from typing import List, Dict, Optional

import websockets

# Utility
def utc_now_iso(with_ms=True):
    if with_ms:
        return datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S.%f")[:-3] + " UTC"
    return datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S") + " UTC"


# --- WebSocket server handler --- #
async def ws_handler(websocket, path):
    """
    Simple server that echoes incoming messages and appends a server timestamp.
    Keeps running while the client is connected.
    """
    try:
        async for msg in websocket:
            # record server receive timestamp
            server_ts = utc_now_iso()
            # echo back message with server timestamp appended (so clients can inspect if wanted)
            await websocket.send(f"{msg} | server_recv={server_ts}")
    except websockets.ConnectionClosed:
        return


# --- Benchmark client --- #
async def worker_task(worker_id: int, uri: str, msgs_per_worker: int, results: List[Dict]):
    """
    Connects to the WS server and sends msgs_per_worker messages sequentially.
    Measures round-trip time (send -> echo received) for each message and appends results to `results`.
    """
    try:
        async with websockets.connect(uri) as ws:
            for seq in range(msgs_per_worker):
                payload = f"worker={worker_id} seq={seq} client_send_ts={utc_now_iso()}"
                t0 = time.perf_counter()
                await ws.send(payload)
                # await echo
                echo = await ws.recv()
                t1 = time.perf_counter()
                rtt = t1 - t0
                results.append({
                    "worker": worker_id,
                    "seq": seq,
                    "rtt_s": rtt,
                    "error": "",
                    "echo": echo
                })
    except Exception as e:
        # If connection could not be established, record failures for all messages this worker would have sent
        for seq in range(msgs_per_worker):
            results.append({
                "worker": worker_id,
                "seq": seq,
                "rtt_s": None,
                "error": f"connect_error:{repr(e)}",
                "echo": ""
            })


# --- Stats & CSV --- #
def compute_stats(all_results: List[Dict]):
    total = len(all_results)
    successes = [r for r in all_results if r["rtt_s"] is not None]
    failures = [r for r in all_results if r["rtt_s"] is None]
    latencies = [r["rtt_s"] for r in successes]
    if latencies:
        avg = mean(latencies)
        med = median(latencies)
        mn = min(latencies)
        mx = max(latencies)
        sorted_lat = sorted(latencies)
        idx95 = max(0, int(len(sorted_lat) * 0.95) - 1)
        p95 = sorted_lat[idx95]
    else:
        avg = med = mn = mx = p95 = 0.0
    return {
        "total": total,
        "sent_ok": len(successes),
        "failed": len(failures),
        "avg": avg,
        "median": med,
        "min": mn,
        "max": mx,
        "p95": p95,
    }


def write_csv(path: str, all_results: List[Dict]):
    fieldnames = ["worker", "seq", "rtt_s", "error", "echo"]
    try:
        with open(path, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            for r in all_results:
                writer.writerow({
                    "worker": r["worker"],
                    "seq": r["seq"],
                    "rtt_s": "" if r["rtt_s"] is None else f"{r['rtt_s']:.6f}",
                    "error": r["error"],
                    "echo": r["echo"][:1000]  # cap long echoes
                })
        print(f"Wrote per-message results to {path}")
    except Exception as e:
        print(f"Failed to write CSV to {path}: {e}")


# --- Orchestration --- #
async def run_benchmark(uri: str, workers: int, msgs_per_worker: int, out_csv: Optional[str]):
    total_expected = workers * msgs_per_worker
    print(f"Running benchmark against {uri}")
    print(f"Workers: {workers}, Messages/worker: {msgs_per_worker}, Total messages: {total_expected}")
    results: List[Dict] = []

    start_dt = datetime.utcnow()
    start_perf = time.perf_counter()

    # Launch worker tasks concurrently
    tasks = [
        asyncio.create_task(worker_task(wid, uri, msgs_per_worker, results))
        for wid in range(workers)
    ]
    # Wait for all to finish
    await asyncio.gather(*tasks)

    end_perf = time.perf_counter()
    end_dt = datetime.utcnow()

    elapsed = end_perf - start_perf
    stats = compute_stats(results)

    print("\n=== Benchmark Summary ===")
    print(f"Start time (UTC): {start_dt.strftime('%Y-%m-%d %H:%M:%S.%f')[:-3]} UTC")
    print(f"End time   (UTC): {end_dt.strftime('%Y-%m-%d %H:%M:%S.%f')[:-3]} UTC")
    print(f"Wall-clock send+recv duration: {elapsed:.6f} seconds")
    print(f"Total messages attempted: {stats['total']}")
    print(f"Successful round-trips: {stats['sent_ok']}")
    print(f"Failed sends/RTTs: {stats['failed']}")
    print("")
    print("Round-trip latency statistics (seconds):")
    print(f"  avg:    {stats['avg']:.6f}")
    print(f"  median: {stats['median']:.6f}")
    print(f"  min:    {stats['min']:.6f}")
    print(f"  max:    {stats['max']:.6f}")
    print(f"  ~95th:  {stats['p95']:.6f}")
    throughput = stats['total'] / elapsed if elapsed > 0 else 0.0
    print(f"\nAggregate throughput (messages/sec) measured during benchmark: {throughput:.2f} msgs/sec")

    if out_csv:
        write_csv(out_csv, results)


async def main_async(args):
    # Start server if requested
    server = None
    server = await websockets.serve(ws_handler, args.host, args.port)
    print(f"WebSocket server listening on ws://{args.host}:{args.port} (echo service)")

    try:
        await asyncio.Future()  # run forever
    finally:
        if server:
            server.close()
            await server.wait_closed()
    return

    # Decide URI to connect to for clients
    if args.client_uri:
        uri = args.client_uri
    else:
        uri = f"ws://{args.host}:{args.port}"

    # Small delay to ensure server is ready (if started here)
    await asyncio.sleep(0.1)

    # Run benchmark (clients)
    await run_benchmark(uri, args.workers, args.msgs, args.out_csv)

    # Shutdown server if we started it
    if server:
        server.close()
        await server.wait_closed()


def parse_args():
    p = argparse.ArgumentParser(description="WebSocket benchmarking tool (server + client).")
    p.add_argument("--host", default="127.0.0.1", help="Host to bind the server (default: 127.0.0.1)")
    p.add_argument("--port", type=int, default=8765, help="Port to bind the server (default: 8765)")
    p.add_argument("--workers", type=int, default=20, help="Number of concurrent worker clients (default: 20)")
    p.add_argument("--msgs", type=int, default=50, help="Messages per worker (default: 50)")
    p.add_argument("--out-csv", default=None, help="Optional CSV file to write per-message results")
    p.add_argument("--server-only", action="store_true", help="Start server and do not run clients (useful for remote clients)")
    p.add_argument("--client-only", action="store_true", dest="client_only",
                   help="Do not start a server locally; only run client benchmark against --client-uri")
    p.add_argument("--client-uri", default=None, help="WebSocket URI for client-only mode, e.g. ws://host:8765")
    return p.parse_args()


def main():
    args = parse_args()

    try:
        asyncio.run(main_async(args))
    except KeyboardInterrupt:
        print("\nInterrupted by user. Exiting.")


if __name__ == "__main__":
    main()
