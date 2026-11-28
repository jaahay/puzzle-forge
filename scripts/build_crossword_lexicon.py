#!/usr/bin/env python3
"""Compile authored clues; optionally inspect and verify the pinned WordNet archive."""
import argparse
import gzip
import hashlib
import json
import re
import xml.etree.ElementTree as ET
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets/lexicon"
EDITORIAL = ASSETS / "crossword"
OUTPUT = ROOT / "public/lexicon/crossword/mini-clues.json"


def read_json(path):
    return json.loads(path.read_text(encoding="utf8"))


def candidate_grid_form(expression):
    """Return a potential A-Z grid form without losing the natural expression."""
    if not re.fullmatch(r"[A-Za-z '\u2019-]+", expression):
        return None
    answer = re.sub(r"[ '\u2019-]", "", expression).upper()
    return answer if len(answer) >= 3 else None


def wordnet_rows():
    """Read exact source sense IDs without reconstructing them from spellings."""
    rows = []
    seen = set()
    paths = [EDITORIAL / "wordnet-clues.tsv", *sorted(EDITORIAL.glob("wordnet-clues-*.tsv"))]
    for path in paths:
        for line in path.read_text(encoding="utf8").splitlines():
            parts = line.split("|")
            if len(parts) not in (5, 6):
                raise ValueError(f"Invalid WordNet editorial row in {path.name}")
            answer, sense_id, meaning, topic, clue = parts[:5]
            if not re.fullmatch(r"[A-Z]{3,}", answer) or not sense_id.startswith("oewn-") or not all((meaning, topic, clue)):
                raise ValueError(f"Invalid WordNet editorial record: {answer}")
            if sense_id in seen:
                raise ValueError(f"Duplicate source sense: {sense_id}")
            seen.add(sense_id)
            sense = {"meaning": meaning, "topics": [topic], "clues": [clue]}
            if len(parts) == 6:
                sense["expression"] = parts[5]
            rows.append((answer, sense_id, sense))
    if not rows:
        raise ValueError("Empty WordNet editorial batch.")
    return rows


def compile_bank(rows):
    authored = read_json(EDITORIAL / "authored.json")
    for path in sorted(EDITORIAL.glob("authored-*.json")):
        authored.extend(read_json(path))
    bank = {record["answer"]: record for record in authored}
    if len(bank) != len(authored):
        raise ValueError("Duplicate authored answer.")
    for answer, _, sense in rows:
        record = bank.setdefault(answer, {"answer": answer, "senses": []})
        record["senses"].append(sense)
    for answer, record in bank.items():
        if not re.fullmatch(r"[A-Z]{3,}", answer) or not record["senses"]:
            raise ValueError(f"Malformed answer: {answer}")
        meanings = set()
        clues = set()
        for sense in record["senses"]:
            if "expression" in sense and candidate_grid_form(sense["expression"]) != answer:
                raise ValueError(f"Natural expression does not match grid form: {answer}")
            meaning = sense["meaning"]
            topics = sense["topics"]
            texts = sense["clues"]
            if (not isinstance(meaning, str) or not meaning.strip() or meaning != meaning.strip()
                    or meaning in meanings or not topics or not texts
                    or any(not isinstance(t, str) or not t or t != t.strip() for t in topics + texts)
                    or len(set(topics)) != len(topics) or len(set(texts)) != len(texts)
                    or clues.intersection(texts)):
                raise ValueError(f"Malformed or duplicate clue/sense: {answer}")
            meanings.add(meaning)
            clues.update(texts)
    return [
        {"answer": answer, "senses": [
            {"meaning": sense["meaning"], "topics": sense["topics"], "clues": sense["clues"]}
            for sense in bank[answer]["senses"]
        ]}
        for answer in sorted(bank)
    ]


def draft_queue(entries, synsets, familiarity, admitted_forms):
    """Yield source-grounded editorial work, never automatically approved clues.

    Group by grid projection so a reviewer can compare competing natural
    expressions and senses. Favor familiar expressions, but retain every
    supported, not-yet-admitted form regardless of length or synonym count.
    """
    members = defaultdict(set)
    groups = defaultdict(list)
    for sense_id, entry in entries.items():
        members[entry["synset"], entry["partOfSpeech"]].add(entry["spelling"])
        if entry["answer"] is not None and entry["answer"] not in admitted_forms:
            groups[entry["answer"]].append(sense_id)

    def familiar(spelling):
        return spelling.upper() in familiarity

    def hints(entry):
        answer = entry["answer"]
        alternatives = []
        for spelling in members[entry["synset"], entry["partOfSpeech"]]:
            other = candidate_grid_form(spelling)
            if other and other not in answer and answer not in other:
                alternatives.append(spelling)
        return sorted(alternatives, key=lambda spelling: (not familiar(spelling), spelling))

    def group_key(answer):
        senses = groups[answer]
        return (not any(familiar(entries[sense_id]["spelling"]) for sense_id in senses),
                len(senses), answer)

    for answer in sorted(groups, key=group_key):
        evidence = []
        for sense_id in sorted(groups[answer]):
            entry = entries[sense_id]
            synset = synsets[entry["synset"]]
            evidence.append({
                "senseId": sense_id,
                "expression": entry["spelling"],
                "partOfSpeech": entry["partOfSpeech"],
                "synset": entry["synset"],
                "familiar": familiar(entry["spelling"]),
                "definitions": synset["definitions"],
                "examples": synset["examples"],
                "synonymHints": hints(entry),
            })
        evidence.sort(key=lambda sense: (not sense["familiar"],
                                        not any(familiar(s) for s in sense["synonymHints"]),
                                        not sense["synonymHints"], sense["senseId"]))
        yield {"answer": answer, "senses": evidence}


def inspect_archive(archive, manifest, rows, candidates, drafts=None, admitted_forms=()):
    data = archive.read_bytes()
    source = manifest["wordnet"]
    if len(data) != source["bytes"] or hashlib.sha256(data).hexdigest() != source["sha256"]:
        raise ValueError("WordNet archive does not match pinned bytes.")
    # XML metadata and references come from the verified archive, never the network.
    entries = {}
    synsets = {}
    lexicons = []
    with gzip.open(archive, "rb") as stream:
        for _, element in ET.iterparse(stream, events=("end",)):
            if element.tag == "LexicalEntry":
                lemma = element.find("Lemma")
                spelling = lemma.attrib["writtenForm"]
                answer = candidate_grid_form(spelling)
                for sense in element.findall("Sense"):
                    key = sense.attrib["id"]
                    if key in entries:
                        raise ValueError(f"Duplicate source sense ID: {key}")
                    entries[key] = {
                        "spelling": spelling,
                        "answer": answer,
                        "partOfSpeech": lemma.attrib["partOfSpeech"],
                        "synset": sense.attrib["synset"],
                        "relations": [dict(relation.attrib) for relation in sense.findall("SenseRelation")],
                    }
                element.clear()
            elif element.tag == "Synset":
                key = element.attrib["id"]
                if key in synsets:
                    raise ValueError(f"Duplicate source synset: {key}")
                synsets[key] = {
                    "definitions": [definition.text or "" for definition in element.findall("Definition")],
                    "examples": [example.text or "" for example in element.findall("Example")],
                    "relations": [dict(relation.attrib) for relation in element.findall("SynsetRelation")],
                }
                element.clear()
            elif element.tag == "Lexicon":
                lexicons.append(dict(element.attrib))
    if len(lexicons) != 1 or any(lexicons[0].get(k) != v for k, v in {
        "id": "oewn", "version": "2025", "language": "en",
        "license": "https://creativecommons.org/licenses/by/4.0",
    }.items()):
        raise ValueError("Unexpected WordNet lexicon metadata.")
    for answer, sense_id, sense in rows:
        record = entries.get(sense_id)
        if (not record or record["answer"] != answer or record["synset"] not in synsets
                or ("expression" in sense and record["spelling"] != sense["expression"])):
            raise ValueError(f"Unresolved or mismatched source sense: {answer} {sense_id}")

    familiarity = set()
    for band in manifest["familiarity"]["bands"]:
        path = ROOT / band["path"]
        raw = path.read_bytes()
        if hashlib.sha256(raw).hexdigest() != band["sha256"]:
            raise ValueError("Familiarity source digest mismatch.")
        familiarity.update(w.upper() for w in json.loads(raw)["words"] if isinstance(w, str))
    by_length = {}
    expressions_by_answer = {}
    for record in entries.values():
        answer = record["answer"]
        if answer is not None:
            by_length.setdefault(len(answer), []).append(record)
            expressions_by_answer.setdefault(answer, set()).add(record["spelling"])
    for length, senses in sorted(by_length.items()):
        words = {record["answer"] for record in senses}
        familiar_senses = [record for record in senses if record["spelling"].upper() in familiarity]
        guess_bank = ROOT / f"public/lexicon/word-guess/banks/{length}.json"
        accepted = set(read_json(guess_bank)["validGuesses"]) if guess_bank.is_file() else None
        summary = {
            "length": length, "spellings": len(words), "senses": len(senses),
            "familiarSpellings": len({record["answer"] for record in familiar_senses}),
            "familiarSenses": len(familiar_senses),
            "broadSpellingOverlap": len(words & accepted) if accepted is not None else None,
        }
        print(json.dumps(summary))
    print(json.dumps({
        "sourceSenses": len(entries),
        "candidateGridForms": len(expressions_by_answer),
        "gridFormsWithMultipleExpressions": sum(len(forms) > 1 for forms in expressions_by_answer.values()),
        "sensesWithoutGridForm": sum(record["answer"] is None for record in entries.values()),
    }))
    # Both outputs are editorial evidence, not approved fill.
    for path in (candidates, drafts):
        if path and path.resolve().is_relative_to((ROOT / "public").resolve()):
            raise ValueError("Do not publish raw WordNet evidence in public/.")
    if candidates:
        with candidates.open("w", encoding="utf8", newline="\n") as stream:
            for sense_id, record in sorted(entries.items()):
                synset = synsets[record["synset"]]
                stream.write(json.dumps({
                    "senseId": sense_id, **record,
                    "familiar": record["spelling"].upper() in familiarity,
                    "definitions": synset["definitions"], "examples": synset["examples"],
                    "synsetRelations": synset["relations"],
                }, ensure_ascii=False) + "\n")
    if drafts:
        count = 0
        with drafts.open("w", encoding="utf8", newline="\n") as stream:
            for record in draft_queue(entries, synsets, familiarity, set(admitted_forms)):
                stream.write(json.dumps(record, ensure_ascii=False) + "\n")
                count += 1
        print(f"{count} not-yet-admitted grid forms in the editorial draft queue.")
    print(f"Verified {len(rows)} source sense references against the pinned archive.")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--archive", type=Path, help="Exact pinned OEWN XML gzip archive")
    parser.add_argument("--candidates", type=Path, help="Optional offline editorial evidence JSONL output")
    parser.add_argument("--drafts", type=Path, help="Optional ranked offline editorial work queue (JSONL)")
    parser.add_argument("--verify", action="store_true", help="Check committed runtime asset without rewriting")
    args = parser.parse_args()
    if (args.candidates or args.drafts) and not args.archive:
        parser.error("--candidates and --drafts require --archive")
    evidence_paths = [p.resolve() for p in (args.archive, args.candidates, args.drafts) if p]
    if len(evidence_paths) != len(set(evidence_paths)):
        parser.error("Archive and evidence paths must be distinct")
    manifest = read_json(ASSETS / "sources.json")
    rows = wordnet_rows()
    corpus = compile_bank(rows)
    if args.archive:
        inspect_archive(args.archive, manifest, rows, args.candidates, args.drafts,
                        {record["answer"] for record in corpus})
    bank = [record for record in corpus if 3 <= len(record["answer"]) <= 5]
    print(f"{len(corpus)} distinct editorial grid forms across all lengths.")
    encoded = (json.dumps(bank, ensure_ascii=False, indent=2) + "\n").encode("utf8")
    if args.verify:
        if OUTPUT.read_bytes() != encoded:
            raise ValueError("Compiled Crossword asset differs; regenerate it.")
    else:
        OUTPUT.write_bytes(encoded)
    print(f"{len(bank)} answers, {sum(len(r['senses']) for r in bank)} senses, "
          f"{sum(len(s['clues']) for r in bank for s in r['senses'])} clues.")


if __name__ == "__main__":
    main()
