import { visit, SKIP } from "unist-util-visit";
import { visitParents } from "unist-util-visit-parents";

export default function remarkMarginNotes() {
  return (tree) => {
    const definitions = new Map();
    const definitionsToRemove = [];

    visit(tree, "footnoteDefinition", (node, index, parent) => {
      if (parent && typeof index === "number") {
        definitions.set(node.identifier, node.children);
        definitionsToRemove.push({ parent, index });
      }
    });

    for (let i = definitionsToRemove.length - 1; i >= 0; i--) {
      const { parent, index } = definitionsToRemove[i];
      parent.children.splice(index, 1);
    }

    visitParents(tree, "footnoteReference", (node, ancestors) => {
      let paraIndex = -1;
      let paragraph = null;
      let blockParent = null;

      for (let i = ancestors.length - 1; i >= 0; i--) {
        const a = ancestors[i];
        if (
          a.type === "paragraph" ||
          a.type === "heading" ||
          a.type === "listItem" ||
          a.type === "tableCell" ||
          a.type === "blockquote"
        ) {
          paragraph = a;
          if (i > 0) {
            blockParent = ancestors[i - 1];
            paraIndex = blockParent.children.indexOf(paragraph);
          }
          break;
        }
      }

      if (!paragraph || !blockParent || paraIndex === -1) return;

      const indexInPara = paragraph.children.indexOf(node);
      if (indexInPara === -1) return;

      const noteContent = definitions.get(node.identifier);
      if (!noteContent) return;

      const label = node.label || node.identifier;
      const markerHtml = {
        type: "html",
        value: `<a href="#note-${label}" class="margin-note-marker" id="ref-${label}"><sup>${label}</sup></a>`,
      };
      const asideOpen = {
        type: "html",
        value: `<aside class="margin-note" data-note="${label}" id="note-${label}">`,
      };
      const asideIdMarker = {
        type: "html",
        value: `<span class="margin-note-id-marker" id="note-${label}-marker"><sup>${label}</sup></span>`,
      };
      const backref = {
        type: "html",
        value: `<a href="#ref-${label}" class="margin-note-backref" aria-label="Back to reference ${label}">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-corner-down-left-icon lucide-corner-down-left"><path d="M20 4v7a4 4 0 0 1-4 4H4"/><path d="m9 10-5 5 5 5"/></svg>
        </a>`,
      };
      const asideClose = {
        type: "html",
        value: "</aside>",
      };

      paragraph.children.splice(indexInPara, 1, markerHtml);

      // Tufte-style: prefix the note's first line with the id marker.
      const firstNote = noteContent[0];
      const inlineMarker = firstNote && firstNote.type === "paragraph";
      if (inlineMarker) {
        firstNote.children.unshift(asideIdMarker);
      }

      // Wrap the block and its notes together so CSS can place the note
      // beside the block (margin mode) or after it (inline/collapsed mode).
      const isWrapper =
        blockParent.data?.hName === "div" &&
        blockParent.data?.hProperties?.className?.includes("margin-note-block");

      let wrapper = blockParent;
      let insertIndex = paraIndex;
      if (!isWrapper) {
        wrapper = {
          type: "paragraph",
          data: {
            hName: "div",
            hProperties: { className: ["margin-note-block"] },
          },
          children: [paragraph],
        };
        blockParent.children.splice(paraIndex, 1, wrapper);
        insertIndex = 0;
      } else {
        insertIndex = wrapper.children.indexOf(paragraph);
      }

      wrapper.children.splice(
        insertIndex,
        0,
        asideOpen,
        ...(inlineMarker ? [] : [asideIdMarker]),
        ...noteContent,
        backref,
        asideClose,
      );

      return [SKIP, paraIndex + 3 + noteContent.length];
    });
  };
}
