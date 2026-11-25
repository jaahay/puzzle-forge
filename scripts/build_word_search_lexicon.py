#!/usr/bin/env python3
"""Compile the broad Word Search collection from the pinned familiar-word inventory."""
import argparse
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets/lexicon/word-guess-answers.json"
OUTPUT = ROOT / "public/lexicon/word-search/general.json"

def compiled():
    answers = json.loads(SOURCE.read_text(encoding="utf8"))
    words = sorted({word for length in range(4, 11) for word in answers[str(length)]})
    return json.dumps(words, separators=(",", ":")) + "\n"

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--verify", action="store_true")
    args = parser.parse_args()
    expected = compiled()
    if args.verify:
        if OUTPUT.read_text(encoding="utf8") != expected:
            raise ValueError("General Word Search asset differs from its source.")
    else:
        OUTPUT.parent.mkdir(parents=True, exist_ok=True)
        OUTPUT.write_text(expected, encoding="utf8")
