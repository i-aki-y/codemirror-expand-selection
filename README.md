# Expand Selection for CodeMirror

Expand/shrink text selections in [CodeMirror 6](https://codemirror.net/6/) inspired by Emacs’ **expand-region** and **expreg**.
This extension allows users to grow their current selection step by step (from cursor → word → syntax node → larger structures) and shrink it back when needed.

## Installation

```bash
npm install codemirror-expand-selection
```

## Usage

```ts
import { keymap } from "@codemirror/view";
import { basicSetup, EditorView } from "codemirror";
import { javascript } from "@codemirror/lang-javascript"
import { expandSelection, expandSelectionExtension, shrinkSelection, swapAnchorHead } from "../src/expand-selection";

const view = new EditorView({
  doc: "function helloWorld() { console.log('Hello!'); }",
  extensions: [
    basicSetup,
    expandSelectionExtension, // enable expand/shrink selection
    keymap.of([
      { key: "Ctrl-Alt-Space", run: expandSelection },
      { key: "Ctrl-Alt-Shift-Space", run: shrinkSelection },
      { key: "Ctrl-t", run: swapAnchorHead },
    ]),
    javascript(),
  ],
  parent: document.body,
});

```

## License

MIT
