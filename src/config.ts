import { Facet } from "@codemirror/state";
import { combineConfig } from "@codemirror/state";
import { Tag, tags } from "@lezer/highlight";

export type InStringBracketMatchMode = "none" | "loose";

export interface ExpansionConfig {
  /** Whether to cycle back to the smallest range after reaching the maximum */
  cyclic?: boolean;
  /** Bracket matching mode inside strings ("loose" or "none") */
  inStringBracketMatchMode?: InStringBracketMatchMode;
  /** Array of bracket pairs to be recognized; each string must be length 2 with distinct characters */
  inStringBracketPairs?: string[];
  /** Array of CodeMirror's highlighting tags used to identify string nodes */
  stringTags?: Tag[];
}

const defaultConfig: ExpansionConfig = {
  cyclic: false,
  inStringBracketMatchMode: "loose",
  inStringBracketPairs: ["()", "{}", "[]"],
  // Treat string and comment-related nodes as strings
  stringTags: [
    tags.string,
    tags.docString,
    tags.comment,
    tags.lineComment,
    tags.docComment,
    tags.blockComment,
  ],
};

export const expansionConfig = Facet.define<ExpansionConfig, Required<ExpansionConfig>>({
  combine(configs) {
    return combineConfig<Required<ExpansionConfig>>(
      configs,
      defaultConfig,
    );
  },
});
