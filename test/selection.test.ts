import { javascript } from "@codemirror/lang-javascript";
import { EditorSelection, EditorState, Extension } from "@codemirror/state";
import { test } from "uvu";
import * as assert from "uvu/assert";
import {
  generateSelectionCandidates,
  // genNodeSelections,
  // genWordSelections,
  // genInitialAnchor,
  // sortSelectionCandidates,
  // mergeTag,
  genInStringBracketSelections,
  TaggedSelectionRange,
} from "../src/selection";

// Helper: create a simple EditorState with given doc and cursor position
function makeState(doc: string, pos: number, extensions?: Extension[]) {
  return EditorState.create({
    doc,
    extensions: extensions,
    selection: { anchor: pos, head: pos },
  });
}

test("generateSelectionCandidates returns cursor candidate", () => {
  const state = makeState("hello world", 0);
  const candidates = generateSelectionCandidates(state);
  assert.ok(candidates[0].tag == "Cursor", "first item should be Cursor");
});

test("generateSelectionCandidates includes word selections", () => {
  const target = "hello-world!!!";
  const state = makeState(target, 1); // cursor inside 'hello'
  const candidates = generateSelectionCandidates(state);
  const word1 = candidates.filter((x) => x.tag.includes("Word:AlphaNum"))[0];
  const word2 = candidates.filter((x) => x.tag.includes("Word:Compound"))[0];
  assert.ok(target.slice(word1.range.from, word1.range.to) == "hello", "word should not include '-'");
  assert.ok(target.slice(word2.range.from, word2.range.to) == "hello-world", "word should include '-'");
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

test("genInStringBracketSelections includes loosely matched brackets", () => {
  const doc = `console.log(' {Aaa(BbbCcc])Ddd} ');`;
  let pos = doc.indexOf("C");
  const state = makeState(doc, pos, [javascript()]);
  const candidates = genInStringBracketSelections(state);
  assert.ok(candidates.length == 4);
  assert.ok(candidates.some(x => state.doc.sliceString(x.range.from, x.range.to) == "(BbbCcc]"));
  assert.ok(candidates.some(x => state.doc.sliceString(x.range.from, x.range.to) == "BbbCcc"));
  assert.ok(candidates.some(x => state.doc.sliceString(x.range.from, x.range.to) == "{Aaa(BbbCcc])"));
  assert.ok(candidates.some(x => state.doc.sliceString(x.range.from, x.range.to) == "Aaa(BbbCcc]"));
});

test("genInStringBracketSelections includes the string containing an OPEN bracket at the cursor's position", () => {
  const doc = `console.log(' {Aaa(BbbCcc])Ddd} ');`;
  let pos = doc.indexOf("(Bb"); // set cursor on open bracket
  const state = makeState(doc, pos, [javascript()]);
  const candidates = genInStringBracketSelections(state);
  assert.ok(candidates.some(x => state.doc.sliceString(x.range.from, x.range.to) == "(BbbCcc]"));
});

test("genInStringBracketSelections includes the string containing an CLOSE bracket at the cursor's position", () => {
  const doc = `console.log(' {Aaa(BbbCcc])Ddd} ');`;
  let pos = doc.indexOf("])D"); // set cursor on close bracket
  const state = makeState(doc, pos, [javascript()]);
  const candidates = genInStringBracketSelections(state);
  assert.ok(candidates.some(x => state.doc.sliceString(x.range.from, x.range.to) == "(BbbCcc]"));
});

test("genInStringBracketSelections returns an empty array when the cursor is outside the brackets", () => {
  const doc = `console.log(' {Aaa(BbbCcc])Ddd} ');`;
  let pos = doc.indexOf("' {"); // beginning of string
  let state = makeState(doc, pos, [javascript()]);
  let candidates = genInStringBracketSelections(state);
  assert.ok(candidates.length == 0);

  pos = doc.indexOf("} '"); // end of string
  state = makeState(doc, pos, [javascript()]);
  candidates = genInStringBracketSelections(state);
  assert.ok(candidates.length == 0);
});

test("genInStringBracketSelections returns an empty bracket", () => {
  const doc = `console.log(' {} ');`;
  let pos = doc.indexOf("{"); // beginning of string
  let state = makeState(doc, pos, [javascript()]);
  let candidates = genInStringBracketSelections(state);
  assert.ok(candidates.length == 1);
  assert.ok(candidates.some(x => state.doc.sliceString(x.range.from, x.range.to) == "{}"));
});

test.run();
