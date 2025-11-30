#!/usr/bin/env python3
"""
Azure PubSub Service benchmarking

- Run a client benchmark with N workers, each sending M messages, measuring round-trip latency.
- Default: 20 workers x 50 messages.

Requirements: 
    pip install azure-messaging-webpubsubservice

Usage examples:
python3 pub2.py "<connection-string>" "Hub" "message"
"""

import argparse
import csv
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime
from statistics import mean, median
from typing import List, Dict

from azure.messaging.webpubsubservice import WebPubSubServiceClient


def utc_now_iso(with_ms=True):
    if with_ms:
        return datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S.%f")[:-3] + " UTC"
    else:
        return datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S") + " UTC"


def worker_send(worker_id: int, connection_string: str, hub: str, base_message: str, count: int,
                content_type: str, start_perf: float) -> List[Dict]:
    """
    Each worker creates its own WebPubSubServiceClient and sends `count` messages.
    Records per-message send-start (relative to start_perf), duration, and success flag.
    Returns list of per-message dicts.
    """
    client = WebPubSubServiceClient.from_connection_string(connection_string, hub=hub)
    results = []
    for i in range(count):
        # include identifying metadata so messages can be correlated if needed
        msg_payload = f"{base_message} | worker={worker_id} seq={i} ts={utc_now_iso()}"
        send_start = time.perf_counter() - start_perf
        try:
            # SDK call; measure time taken by send_to_all
            t0 = time.perf_counter()
            client.send_to_all(msg_payload, content_type=content_type)
            t1 = time.perf_counter()
            duration = t1 - t0
            results.append({
                "worker": worker_id,
                "seq": i,
                "send_start_s": send_start,
                "send_duration_s": duration,
                "success": True,
                "error": ""
            })
        except Exception as e:
            print(e)
            t1 = time.perf_counter()
            duration = t1 - t0 if 't0' in locals() else 0.0
            results.append({
                "worker": worker_id,
                "seq": i,
                "send_start_s": send_start,
                "send_duration_s": duration,
                "success": False,
                "error": repr(e)
            })
        # Avoid 429 Too many requests
        time.sleep(0.1)
    return results


def parse_args():
    p = argparse.ArgumentParser(
        description="Benchmark publisher for Azure Web PubSub (service-to-service)."
    )
    p.add_argument("connection_string", help="WebPubSub connection string")
    p.add_argument("hub", help="Hub name")
    p.add_argument("message", help="Message payload (base) to send")
    p.add_argument("--workers", type=int, default=20, help="Number of concurrent workers (default: 20)")
    p.add_argument("--msgs", type=int, default=50, help="Messages per worker (default: 50)")
    p.add_argument("--content-type", default="text/plain", help="Content-Type for send_to_all (default: text/plain)")
    p.add_argument("--out-csv", default=None, help="Optional CSV file path to write per-message results")
    return p.parse_args()


def print_summary(all_results: List[Dict], start_time_iso: str, start_perf: float, send_end_perf: float, end_time_dt):
    total_messages = len(all_results)
    successes = sum(1 for r in all_results if r["success"])
    failures = total_messages - successes
    durations = [r["send_duration_s"] for r in all_results if r["success"]]
    if durations:
        avg = mean(durations)
        med = median(durations)
        mn = min(durations)
        mx = max(durations)
        p95 = sorted(durations)[int(len(durations)*0.95)-1] if len(durations) >= 20 else max(durations)
    else:
        avg = med = mn = mx = p95 = 0.0

    wall_send_duration = send_end_perf - 0.0  # since send start perf subtracts start_perf, first send_start may be >0, but we measured until send_end_perf
    if wall_send_duration <= 0:
        wall_send_duration = max(1e-9, max((r["send_start_s"] + r["send_duration_s"] for r in all_results), default=0.0))

    # end-to-end duration using user-provided end time
    start_dt = datetime.strptime(start_time_iso, "%Y-%m-%d %H:%M:%S.%f UTC")
    end_dt = end_time_dt
    total_seconds = (end_dt - start_dt).total_seconds() if end_dt and start_dt else None

    print("\n=== Benchmark Summary ===")
    print(f"Start time (UTC): {start_time_iso}")
    print(f"Send phase duration (wall-clock, seconds): {wall_send_duration:.6f}")
    print(f"Total messages attempted: {total_messages}")
    print(f"Successful sends: {successes}")
    print(f"Failed sends: {failures}")
    print("")
    print("Per-send (client-side) latency statistics (seconds):")
    print(f"  avg: {avg:.6f}")
    print(f"  median: {med:.6f}")
    print(f"  min: {mn:.6f}")
    print(f"  max: {mx:.6f}")
    print(f"  ~95th percentile: {p95:.6f}")
    print("")
    send_phase_throughput = total_messages / wall_send_duration if wall_send_duration > 0 else 0.0
    print(f"Throughput during send phase: {send_phase_throughput:.2f} msgs/sec")
    if total_seconds and total_seconds > 0:
        overall_throughput = total_messages / total_seconds
        print(f"Overall throughput: {overall_throughput:.2f} msgs/sec")
        print(f"End time (UTC): {end_dt.strftime('%Y-%m-%d %H:%M:%S.%f')[:-3]} UTC")
        print(f"Total duration (start -> your end): {total_seconds:.6f} seconds")
    else:
        print("No valid end time provided to compute end-to-end throughput.")


def write_csv(out_path: str, all_results: List[Dict]):
    fieldnames = ["worker", "seq", "send_start_s", "send_duration_s", "success", "error"]
    try:
        with open(out_path, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            for r in all_results:
                writer.writerow(r)
        print(f"Wrote per-message results to {out_path}")
    except Exception as e:
        print(f"Failed to write CSV to {out_path}: {e}")


def main():
    args = parse_args()

    connection_string = args.connection_string
    hub = args.hub
    base_message = args.message
    workers = args.workers
    msgs_per_worker = args.msgs
    content_type = args.content_type
    out_csv = args.out_csv

    total_expected = workers * msgs_per_worker

    print("Starting Azure Web PubSub publisher benchmark")
    print(f"Workers: {workers}, Messages per worker: {msgs_per_worker}, Total messages: {total_expected}")
    start_time_dt = datetime.utcnow()
    start_time_iso = start_time_dt.strftime("%Y-%m-%d %H:%M:%S.%f")[:-3] + " UTC"
    print(f"Start time (UTC): {start_time_iso}")
    print("Beginning send phase...")

    start_perf = time.perf_counter()
    all_results = []

    with ThreadPoolExecutor(max_workers=workers) as exc:
        futures = [exc.submit(worker_send, wid, connection_string, hub, base_message, msgs_per_worker, content_type, start_perf)
                   for wid in range(workers)]
        for fut in as_completed(futures):
            try:
                res = fut.result()
                all_results.extend(res)
            except Exception as e:
                print(f"Worker task raised exception: {e}")

    send_end_perf = time.perf_counter() - start_perf
    end_time_dt = datetime.utcnow()

    # write CSV if requested
    if out_csv:
        write_csv(out_csv, all_results)

    print_summary(all_results, start_time_iso, start_perf, send_end_perf, end_time_dt)


if __name__ == "__main__":
    main()