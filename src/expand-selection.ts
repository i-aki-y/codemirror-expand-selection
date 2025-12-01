import { EditorSelection, type Extension, StateEffect, StateField, Transaction } from "@codemirror/state";
import { EditorView, ViewUpdate } from "@codemirror/view";

import { type ExpansionConfig, expansionConfig } from "./config";
import { generateSelectionCandidates, type TaggedSelectionRange } from "./selection";

interface SelectionCandidateState {
  /** Holds all possible expanded selections */
  ranges: TaggedSelectionRange[];
  /** Index of the currently active selection */
  index: number;
}

const setSelectionCandidates = StateEffect.define<SelectionCandidateState>();
const clearSelectionCandidates = StateEffect.define<null>();

const selectionCandidateField = StateField.define<SelectionCandidateState>({
  create: () => ({ ranges: [], index: -1 }),
  update(value, tr) {
    // Update selection candidates when effects are applied
    for (let e of tr.effects) {
      if (e.is(setSelectionCandidates)) return e.value;
      if (e.is(clearSelectionCandidates)) return { ranges: [], index: -1 };
    }
    return value;
  },
});

/**
 * Listener that resets selection candidates whenever
 * the document changes or the user makes a manual selection.
 */
const resetSelectionCandidates = EditorView.updateListener.of((update: ViewUpdate) => {
  const isUserSelection = update.transactions.some((tr) => {
    const event = tr.annotation(Transaction.userEvent);
    return ["select.pointer", "select.keyboard", "select"].includes(event || "");
  });
  if (update.docChanged || isUserSelection) {
    update.view.dispatch({
      effects: clearSelectionCandidates.of(null),
    });
  }
});

/**
 * Expands the current selection to the next larger candidate.
 */
export function expandSelection(view: EditorView): boolean {
  const state = view.state;
  const field = state.field(selectionCandidateField);
  const cyclic = state.facet(expansionConfig).cyclic;
  let ranges = field.ranges;
  let index = field.index;
  if (ranges.length === 0) {
    ranges = generateSelectionCandidates(state);
    // Skip index 0 since it represents the initial cursor position
    index = 1;
  } else if (index + 1 < ranges.length) {
    index += 1;
  } else {
    if (cyclic) {
      index = 0;
    } else {
      // keep selection
      return true;
    }
  }
  const next = ranges[index].range;
  view.dispatch({
    selection: EditorSelection.single(next.anchor, next.head),
    effects: setSelectionCandidates.of({ ranges, index }),
    annotations: [Transaction.userEvent.of("select.expand")],
  });
  return true;
}

/**
 * Shrinks the current selection back to the previous candidate.
 */
export function shrinkSelection(view: EditorView): boolean {
  const state = view.state;
  const field = state.field(selectionCandidateField);
  const cyclic = state.facet(expansionConfig).cyclic;
  if (field.ranges.length === 0) return true;
  let index = field.index - 1;
  if (index < 0) {
    index = cyclic ? field.ranges.length - 1 : 0;
  }
  const next = field.ranges[index].range;
  view.dispatch({
    selection: EditorSelection.single(next.anchor, next.head),
    effects: setSelectionCandidates.of({
      ranges: field.ranges,
      index,
    }),
    annotations: [Transaction.userEvent.of("select.shrink")],
  });
  return true;
}

/**
 * Swaps the anchor and head of the current selection.
 * Useful for reversing selection direction.
 */
export function swapAnchorHead(view: EditorView): boolean {
  const range = view.state.selection.main;
  view.dispatch({
    selection: EditorSelection.single(range.head, range.anchor),
  });
  return true;
}

/** Extension that enables expand/shrink selection functionality */
export function expandSelectionExtension(config: ExpansionConfig = {}): Extension {
  return [
    selectionCandidateField,
    resetSelectionCandidates,
    expansionConfig.of(config),
  ];
}
