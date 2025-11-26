# Expand Selection for CodeMirror

Expand/shrink text selections in [CodeMirror 6](https://codemirror.net/6/) inspired by Emacs’ **expand-region** and **expreg**.
This extension allows users to grow their current selection step by step (from cursor → word → syntax node → larger structures) and shrink it back when needed.

## Installation

```bash
npm install codemirror-expand-selection
```

## Usage

```ts
import { EditorState } from "@codemirror/state";
import { EditorView, basicSetup } from "@codemirror/view";
import { expandSelectionExtension, expandSelection, shrinkSelection, swapAnchorHead } from "codemirror-expand-selection";

const view = new EditorView({
  state: EditorState.create({
    doc: "function helloWorld() { console.log('Hello!'); }",
    extensions: [
      basicSetup,
      expandSelectionExtension, // enable expand/shrink selection
    ],
  }),
  parent: document.body,
});

// Example: bind keys
import { keymap } from "@codemirror/view";

view.dispatch({
  effects: keymap.of([
    { key: "Ctrl-Alt-Space", run: expandSelection },
    { key: "Ctrl-Alt-Shift-Space", run: shrinkSelection },
    { key: "Ctrl-t", run: swapAnchorHead },
  ]),
});
```

## License

MIT
