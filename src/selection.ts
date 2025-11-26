import { syntaxTree } from "@codemirror/language";
import { EditorSelection, EditorState, SelectionRange } from "@codemirror/state";
import { type SyntaxNode } from "@lezer/common";

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
    genWordSelections,
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
    if (node != null && node.name != '') {
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
 * Generates the initial cursor position as a selection candidate.
 */
function genInitialAnchor(state: EditorState): TaggedSelectionRange[] {
  const pos = state.selection.main.head;
  let ranges: TaggedSelectionRange[] = [];
  ranges.push({ range: EditorSelection.range(pos, pos), tag: "Cursor" });
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
      merged.push(item);
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
