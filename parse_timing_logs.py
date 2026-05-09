"""
parse_timing_logs.py
--------------------
Parses [TIMING] lines from uvicorn stdout into M3 benchmark CSVs.

Usage:
    # Stream live logs:
    uvicorn backend.main:app --reload --port 8000 2>&1 | tee uvicorn.log

    # Then parse:
    python parse_timing_logs.py --log uvicorn.log --mode text --run-id 1
    python parse_timing_logs.py --log uvicorn.log --mode voice --run-id 1
    python parse_timing_logs.py --log uvicorn.log --mode both --run-id 1

    # Or parse a log file you already saved:
    python parse_timing_logs.py --log logs/run1.txt --mode text --run-id 1 --out benchmarks/results/
"""

import argparse
import ast
import csv
import os
import re
import sys

# ── [TIMING] log formats ────────────────────────────────────────────────────
# backend/main.py and backend/agent/pipeline.py emit a Python dict repr:
#   [TIMING] {'classify_ms': 12, 'embedding_ms': 45, 'retrieval_ms': 88, 'llm_ms': 1203, 'skipped_retrieval': False}
# Voice variants additionally include 'stt_ms' / 'tts_ms'.
# We also accept the legacy key=value form for backward compatibility:
#   [TIMING] classify_ms=12 embedding_ms=45 ...

TIMING_RE = re.compile(r"\[TIMING\]\s+(.+)")
KV_RE = re.compile(r"(\w+)=([^\s,]+)")

TEXT_FIELDS = [
    "run_id", "query_id", "query_text", "query_type",
    "classify_ms", "embedding_ms", "retrieval_ms", "llm_ms",
    "skipped_retrieval", "first_token_latency_ms", "notes",
]

VOICE_FIELDS = [
    "run_id", "query_id", "query_text", "query_type",
    "stt_ms", "classify_ms", "embedding_ms", "retrieval_ms",
    "llm_ms", "tts_ms", "skipped_retrieval",
    "auto_stop_fired", "transcript_match", "ghost_turn", "notes",
]


def parse_timing_line(line: str) -> dict | None:
    m = TIMING_RE.search(line)
    if not m:
        return None
    payload = m.group(1).strip()
    try:
        d = ast.literal_eval(payload)
        if isinstance(d, dict):
            return {str(k): str(v) for k, v in d.items()}
    except (SyntaxError, ValueError):
        pass
    pairs = KV_RE.findall(payload)
    return {k: v for k, v in pairs} if pairs else None


def is_voice(record: dict) -> bool:
    return "stt_ms" in record or "tts_ms" in record


def load_log(path: str) -> list[dict]:
    records = []
    with open(path) as f:
        for line in f:
            rec = parse_timing_line(line)
            if rec:
                records.append(rec)
    return records


def write_csv(path: str, fieldnames: list[str], rows: list[dict], append: bool):
    os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
    mode = "a" if append and os.path.exists(path) else "w"
    with open(path, mode, newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
        if mode == "w":
            writer.writeheader()
        writer.writerows(rows)
    verb = "appended" if mode == "a" else "wrote"
    print(f"  → {verb} {len(rows)} rows to {path}")


def enrich(record: dict, run_id: int, query_id: int) -> dict:
    """Add run/query metadata and normalize booleans."""
    record["run_id"] = run_id
    record["query_id"] = query_id
    # Normalize skipped_retrieval to Python bool string
    if "skipped_retrieval" in record:
        record["skipped_retrieval"] = record["skipped_retrieval"].lower() in ("true", "1", "yes")
    return record


def main():
    parser = argparse.ArgumentParser(description="Parse uvicorn [TIMING] logs into M3 CSVs")
    parser.add_argument("--log", required=True, help="Path to uvicorn log file")
    parser.add_argument("--mode", choices=["text", "voice", "both"], default="both")
    parser.add_argument("--run-id", type=int, default=1, help="Run number (1, 2, or 3)")
    parser.add_argument("--out", default="benchmarks/results/", help="Output directory")
    parser.add_argument("--append", action="store_true",
                        help="Append to existing CSVs (default: overwrite, so seeded placeholder rows get cleared on first real run)")
    args = parser.parse_args()

    print(f"\nParsing: {args.log}")
    records = load_log(args.log)
    print(f"Found {len(records)} [TIMING] entries")

    text_records = [r for r in records if not is_voice(r)]
    voice_records = [r for r in records if is_voice(r)]
    print(f"  Text entries : {len(text_records)}")
    print(f"  Voice entries: {len(voice_records)}")

    if not records:
        print("\n⚠️  No [TIMING] lines found. Make sure your pipeline emits them.")
        print("   Accepted formats:")
        print("     [TIMING] {'classify_ms': 12, 'embedding_ms': 45, ...}")
        print("     [TIMING] classify_ms=12 embedding_ms=45 ...")
        sys.exit(1)

    out = args.out.rstrip("/")

    if args.mode in ("text", "both") and text_records:
        rows = [enrich(r, args.run_id, i + 1) for i, r in enumerate(text_records)]
        write_csv(f"{out}/text_latency_m3.csv", TEXT_FIELDS, rows, args.append)

    if args.mode in ("voice", "both") and voice_records:
        rows = [enrich(r, args.run_id, i + 1) for i, r in enumerate(voice_records)]
        write_csv(f"{out}/voice_latency_m3.csv", VOICE_FIELDS, rows, args.append)

    print("\nDone ✓")
    print("Next: fill in query_text, query_type, first_token_latency_ms, and notes manually.")
    print("      Then run faithfulness evaluation using faithfulness_m3.csv.")


if __name__ == "__main__":
    main()
