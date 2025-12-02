import { syntaxTree } from "@codemirror/language";
import { EditorSelection, EditorState, SelectionRange } from "@codemirror/state";
import { getStyleTags, Tag } from "@lezer/highlight";

import { type SyntaxNode } from "@lezer/common";
import { expansionConfig } from "./config";

export interface TaggedSelectionRange {
  /** The selection range */
  range: SelectionRange;
  /** Tag describing which rule generated this range (for debugging) */
  tag: string;
}

/**
 * Collects all possible selection candidates (cursor, words, syntax nodes).
 * Returns them sorted and merged by range length.
 */
export function generateSelectionCandidates(state: EditorState): TaggedSelectionRange[] {
  const generateFunctions = [
    genInitialAnchor,
    genNodeSelections,
    genInStringBracketSelections,
    genWordSelections,
    genLineSelections,
  ];

  let selections: TaggedSelectionRange[] = [];
  for (let genFunc of generateFunctions) {
    selections = selections.concat(genFunc(state));
  }
  selections = sortSelectionCandidates(selections);
  selections = mergeTag(selections);
  return selections;
}

/**
 * Generates selections based on syntax tree nodes,
 * starting from the innermost node and expanding outward.
 */
export function genNodeSelections(state: EditorState): TaggedSelectionRange[] {
  let ranges: TaggedSelectionRange[] = [];
  const tree = syntaxTree(state);
  const pos = state.selection.main.head;
  let node: SyntaxNode | null = tree.resolve(pos);
  while (node) {
    if (node != null && node.name != "") {
      let range = EditorSelection.range(node.from, node.to);
      let tag: string = "Node:" + node.type.name;
      ranges.push({ range: range, tag: tag });
    }
    node = node.parent;
  }
  return ranges;
}

/**
 * Generates selections based on words around the cursor.
 * Includes default word detection and regex-based variants.
 */
export function genWordSelections(state: EditorState): TaggedSelectionRange[] {
  const pos = state.selection.main.head;
  let ranges: TaggedSelectionRange[] = [];

  // codemirror default word
  let word = state.wordAt(pos);
  if (word != null) {
    ranges.push({ range: EditorSelection.range(word.from, word.to), tag: "Word:Default" });
  }

  // Default word detection from CodeMirror
  function findWord(state: EditorState, regex: RegExp) {
    const pos = state.selection.main.head;
    const line = state.doc.lineAt(pos);
    const text = line.text;

    // cursol offset
    const offset = pos - line.from;

    let m;
    while ((m = regex.exec(text))) {
      if (m.index <= offset && offset <= m.index + m[0].length) {
        return { from: line.from + m.index, to: line.from + m.index + m[0].length };
      }
    }
    return null;
  }

  // Alphanumeric words
  let found = findWord(state, /[A-Za-z0-9]+/g);
  if (found != null) {
    ranges.push({ range: EditorSelection.range(found.from, found.to), tag: "Word:AlphaNum" });
  }
  // Alphanumeric + "-" + "_"
  found = findWord(state, /[A-Za-z0-9\-_]+/g);
  if (found != null) {
    ranges.push({ range: EditorSelection.range(found.from, found.to), tag: "Word:Compound" });
  }
  return ranges;
}

/**
 * Generates selections based on line around the cursor.
 */
export function genLineSelections(state: EditorState): TaggedSelectionRange[] {
  const pos = state.selection.main.head;
  let ranges: TaggedSelectionRange[] = [];
  const line = state.doc.lineAt(pos);
  const indentLength = line.text.search(/\S|$/);
  ranges.push({ range: EditorSelection.range(line.from, line.to), tag: "Line:Whole" });
  if (indentLength > 0) {
    ranges.push({ range: EditorSelection.range(line.from + indentLength, line.to), tag: "Line:Indented" });
  }
  return ranges;
}

/**
 * Generates the initial cursor position as a selection candidate.
 */
function genInitialAnchor(state: EditorState): TaggedSelectionRange[] {
  const pos = state.selection.main.head;
  let ranges: TaggedSelectionRange[] = [];
  ranges.push({ range: EditorSelection.range(pos, pos), tag: "Cursor" });
  return ranges;
}

function getUnmatched(str: string, bracketPairs: string[]): any[] {
  const openChars = bracketPairs.map(x => x[0]);
  const closeChars = bracketPairs.map(x => x[1]);
  let stack: any[] = [];
  for (const [pos, char] of [...str].entries()) {
    if (openChars.includes(char) || closeChars.includes(char)) {
      if (stack.length == 0) {
        stack.push({ "char": char, "pos": pos });
      } else {
        const top = stack[stack.length - 1]["char"];
        if (openChars.includes(top) && closeChars.includes(char)) {
          stack.pop();
        } else {
          stack.push({ "char": char, "pos": pos });
        }
      }
    }
  }
  return stack;
}

function hasStyleTags(node: SyntaxNode, tags: Tag[]): boolean {
  const nodeTags = getStyleTags(node);
  if (!nodeTags) {
    return false;
  }
  return tags.some(tag => nodeTags.tags.includes(tag));
}

/**
 * Generate selection ranges for matching brackets inside a string node.
 */
export function genInStringBracketSelections(state: EditorState): TaggedSelectionRange[] {
  if (state.facet(expansionConfig).inStringBracketMatchMode == "none") {
    return [];
  }
  const bracketPairs = state.facet(expansionConfig).inStringBracketPairs;
  const targetTags = state.facet(expansionConfig).stringTags;
  const tree = syntaxTree(state);
  const pos = state.selection.main.head;
  let node: SyntaxNode | null = tree.resolve(pos);
  while (node) {
    if (hasStyleTags(node, targetTags)) {
      break;
    }
    node = node.parent;
  }
  if (!node) {
    return [];
  }
  let ranges: TaggedSelectionRange[] = [];

  // splits the string into two at the cursor's position.
  // If the cursor is pointing to a bracket, the splitting is adjusted depending on
  // the type of bracket (left or right side) to make sure the bracket is innermost.
  let lStr = state.doc.sliceString(node.from, pos);
  let rStr = state.doc.sliceString(pos + 1, node.to);
  const cStr = state.doc.sliceString(pos, pos + 1);

  const openChars = bracketPairs.map(x => x[0]);
  const closeChars = bracketPairs.map(x => x[1]);

  if (openChars.includes(cStr)) {
    lStr = lStr + cStr;
  } else if (closeChars.includes(cStr)) {
    rStr = cStr + rStr;
  } else {
    lStr = lStr + cStr;
  }
  const lOffset = node.from;
  const rOffset = node.from + lStr.length + 1;

  // collect unmatched brackets
  let unclosed = getUnmatched(lStr, bracketPairs).filter(x => openChars.includes(x.char));
  let unopened = getUnmatched(rStr, bracketPairs).filter(x => closeChars.includes(x.char));

  const n = Math.min(unclosed.length, unopened.length);
  for (let i = 0; i < n; i++) {
    let lBracket = unclosed.pop().pos + lOffset;
    let rBracket = unopened.shift().pos + rOffset;

    ranges.push({ range: EditorSelection.range(lBracket, rBracket), tag: "InStringBracket:Whole" });
    if (rBracket - lBracket > 2) {
      ranges.push({ range: EditorSelection.range(lBracket + 1, rBracket - 1), tag: "InStringBracket:Inner" });
    }
  }

  return ranges;
}

/**
 * Sorts selection candidates by length, then position, then tag.
 * Ensures deterministic ordering and groups identical ranges together.
 */
export function sortSelectionCandidates(selections: TaggedSelectionRange[]): TaggedSelectionRange[] {
  selections = [...selections].sort((a, b) => {
    let lenA = a.range.to - a.range.from;
    let lenB = b.range.to - b.range.from;
    if (lenA != lenB) {
      return lenA - lenB;
    }
    let compLeft = a.range.from - b.range.from;
    if (compLeft != 0) {
      return compLeft;
    }
    return a.tag.localeCompare(b.tag);
  });
  return selections;
}

/**
 * Merges tags for identical ranges so that multiple rules
 * contributing the same range are combined into one entry.
 */
export function mergeTag(sortedSelections: TaggedSelectionRange[]): TaggedSelectionRange[] {
  // Assuming the input is already sorted.
  let merged: TaggedSelectionRange[] = [];
  for (let item of sortedSelections) {
    if (merged.length == 0) {
      merged.push({ range: item.range, tag: item.tag });
      continue;
    }
    let cur = merged[merged.length - 1];
    if (cur.range.from == item.range.from && cur.range.to == item.range.to) {
      cur.tag = cur.tag + "," + item.tag;
    } else {
      merged.push(item);
    }
  }
  return merged;
}
