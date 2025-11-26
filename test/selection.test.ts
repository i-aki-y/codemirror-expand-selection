import { test } from "uvu";
import * as assert from "uvu/assert";
import {
  generateSelectionCandidates,
  // genNodeSelections,
  // genWordSelections,
  // genInitialAnchor,
  // sortSelectionCandidates,
  // mergeTag,
  TaggedSelectionRange,
} from "../src/selection";
import { EditorState, EditorSelection } from "@codemirror/state";

// Helper: create a simple EditorState with given doc and cursor position
function makeState(doc: string, pos: number) {
  return EditorState.create({
    doc,
    selection: { anchor: pos, head: pos },
  });
}

test("generateSelectionCandidates returns cursor candidate", () => {
  const state = makeState("hello world", 0);
  const candidates = generateSelectionCandidates(state);
  assert.ok(candidates[0].tag == "Cursor", "first item should be Cursor")
});

test("generateSelectionCandidates includes word selections", () => {
  const target = "hello-world!!!"
  const state = makeState(target, 1); // cursor inside 'hello'
  const candidates = generateSelectionCandidates(state);
  const word1 = candidates.filter((x) => x.tag.includes("Word:AlphaNum"))[0]
  const word2 = candidates.filter((x) => x.tag.includes("Word:Compound"))[0]
  assert.ok(target.slice(word1.range.from, word1.range.to) == "hello", "word should not include '-'")
  assert.ok(target.slice(word2.range.from, word2.range.to) == "hello-world", "word should include '-'")
});

test("generateSelectionCandidates sorts by length", () => {
  const state = makeState("abc def", 1);
  const candidates = generateSelectionCandidates(state);
  // Ensure sorted order: shorter ranges first
  for (let i = 1; i < candidates.length; i++) {
    const prevLen = candidates[i - 1].range.to - candidates[i - 1].range.from;
    const curLen = candidates[i].range.to - candidates[i].range.from;
    assert.ok(prevLen <= curLen, "candidates should be sorted by length");
  }
});

test("mergeTag merges identical ranges", () => {
  const state = makeState("abc", 1);
  const candidates = generateSelectionCandidates(state);
  assert.ok(candidates[1].tag.includes("Word:AlphaNum,Word:Compound"), "should include merged tags");
});

test.run();
