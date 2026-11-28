"""Offline checks for the Crossword source-evidence projection."""
import contextlib
import gzip
import hashlib
import io
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from xml.sax.saxutils import quoteattr

import build_crossword_lexicon as compiler


class CandidateProjectionTest(unittest.TestCase):
    def test_grid_projection_is_not_a_lexical_identity(self):
        for expression, expected in [
            ("No dice", "NODICE"),
            ("O'Neill", "ONEILL"),
            ("O\u2019Neill", "ONEILL"),
            ("unionized", "UNIONIZED"),
            ("un-ionized", "UNIONIZED"),
            ("a dime a dozen", "ADIMEADOZEN"),
            ("R2-D2", None),
            ("caf\u00e9", None),
            ("U.S.A.", None),
            ("an", None),
            ("---", None),
        ]:
            with self.subTest(expression=expression):
                self.assertEqual(compiler.candidate_grid_form(expression), expected)

    def test_compile_validates_all_lengths_and_loads_editorial_shards(self):
        def record(answer, expression):
            return {"answer": answer, "senses": [{
                "meaning": "test meaning", "topics": ["test"],
                "clues": ["A test clue"], "expression": expression,
            }]}
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "authored.json").write_text(json.dumps([record("CAT", "cat")]), encoding="utf8")
            shard = root / "authored-test.json"
            shard.write_text(json.dumps([record("NODICE", "No dice")]), encoding="utf8")
            with patch.object(compiler, "EDITORIAL", root):
                bank = compiler.compile_bank([])
                self.assertEqual([r["answer"] for r in bank], ["CAT", "NODICE"])
                self.assertEqual([r["answer"] for r in bank if len(r["answer"]) <= 5], ["CAT"])
                self.assertNotIn("expression", bank[1]["senses"][0])
                shard.write_text(json.dumps([record("NODICE", "No chance")]), encoding="utf8")
                with self.assertRaisesRegex(ValueError, "Natural expression"):
                    compiler.compile_bank([])
                shard.write_text(json.dumps([record("CAT", "cat")]), encoding="utf8")
                with self.assertRaisesRegex(ValueError, "Duplicate authored answer"):
                    compiler.compile_bank([])

    def test_full_archive_evidence_retains_collisions_and_unsupported_forms(self):
        expressions = ["cat", "unionized", "un-ionized", "a dime a dozen", "R2-D2", "caf\u00e9"]
        records = []
        for i, expression in enumerate(expressions):
            records.append(
                f'<LexicalEntry id="entry-{i}"><Lemma writtenForm={quoteattr(expression)} partOfSpeech="n"/>'
                f'<Sense id="oewn-test-{i}" synset="synset-{i}"/></LexicalEntry>'
                f'<Synset id="synset-{i}"><Definition>Evidence {i}</Definition></Synset>'
            )
        xml = (
            '<LexicalResource><Lexicon id="oewn" version="2025" language="en" '
            'license="https://creativecommons.org/licenses/by/4.0">'
            + "".join(records) + '</Lexicon></LexicalResource>'
        )
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            archive = root / "source.xml.gz"
            data = gzip.compress(xml.encode("utf8"))
            archive.write_bytes(data)
            band = root / "familiar.json"
            familiar = b'{"words":["cat","unionized"]}'
            band.write_bytes(familiar)
            manifest = {
                "wordnet": {"bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()},
                "familiarity": {"bands": [{"path": band.name, "sha256": hashlib.sha256(familiar).hexdigest()}]},
            }
            output = root / "candidates.jsonl"
            stdout = io.StringIO()
            with patch.object(compiler, "ROOT", root), contextlib.redirect_stdout(stdout):
                compiler.inspect_archive(archive, manifest, [("CAT", "oewn-test-0", {})], output)
            evidence = [json.loads(line) for line in output.read_text(encoding="utf8").splitlines()]
            self.assertEqual([record["spelling"] for record in evidence], expressions)
            self.assertEqual([record["answer"] for record in evidence],
                             ["CAT", "UNIONIZED", "UNIONIZED", "ADIMEADOZEN", None, None])
            self.assertEqual([record["familiar"] for record in evidence],
                             [True, True, False, False, False, False])
            self.assertEqual(evidence[-1]["definitions"], ["Evidence 5"])
            summary = [json.loads(line) for line in stdout.getvalue().splitlines() if line.startswith("{")]
            self.assertEqual(summary[-1], {
                "sourceSenses": 6, "candidateGridForms": 3,
                "gridFormsWithMultipleExpressions": 1, "sensesWithoutGridForm": 2,
            })

            with patch.object(compiler, "ROOT", root), contextlib.redirect_stdout(io.StringIO()):
                with self.assertRaisesRegex(ValueError, "Unresolved or mismatched"):
                    compiler.inspect_archive(archive, manifest, [("DOG", "oewn-test-0", {})], None)


if __name__ == "__main__":
    unittest.main()
