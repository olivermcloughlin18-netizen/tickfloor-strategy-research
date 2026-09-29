"""Minimal example: load the dataset and reproduce the headline numbers.

Run: python load_example.py
"""
import json
from pathlib import Path

rows = json.loads((Path(__file__).parent / "data" / "strategy-results.json").read_text())

families = sorted(set(r["family"] for r in rows))
raw_ahead = [r for r in rows if r["excess"] > 0]
raw_significant = [r for r in raw_ahead if r["p"] < 0.05]
survived_fdr = [r for r in rows if r["q"] is not None and r["q"] < 0.05]
min_q = min(r["q"] for r in rows if r["q"] is not None)

print(f"{len(rows)} strategies across {len(families)} families")
print(f"{len(raw_ahead)} beat buy-and-hold on the raw excess return")
print(f"{len(raw_significant)} of those clear p < 0.05 before correction")
print(f"{len(survived_fdr)} clear q < 0.05 after Benjamini-Hochberg FDR correction")
print(f"lowest q-value in this file ({len(rows)} strategies): {min_q:.3f}")


def test():
    assert len(rows) == 517
    assert len(survived_fdr) == 0
    assert min_q > 0.05
    print("self-check passed")


if __name__ == "__main__":
    test()
