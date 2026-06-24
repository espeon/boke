import { visit } from "unist-util-visit";

const TYPES = new Set([
  "note",
  "tip",
  "info",
  "warning",
  "danger",
  "important",
  "caution",
]);

const ALIASES = {
  hint: "tip",
  warn: "warning",
  caution: "warning",
  attention: "warning",
  error: "danger",
};

const CALLOUT_REGEX =
  /^\[!(?<type>[a-zA-Z]+)\][ \t]*(?<title>[^\n\r]*?)[ \t]*$/;

const div = (className, children) => ({
  type: "paragraph",
  data: {
    hName: "div",
    hProperties: { className: [className] },
  },
  children,
});

export default function remarkCallouts() {
  return (tree) => {
    visit(tree, "blockquote", (node, _index, parent) => {
      if (!parent) return;

      const firstChild = node.children[0];
      if (!firstChild || firstChild.type !== "paragraph") return;

      const firstInline = firstChild.children[0];
      if (!firstInline || firstInline.type !== "text") return;

      const match = CALLOUT_REGEX.exec(firstInline.value);
      if (!match || !match.groups) return;

      const rawType = match.groups.type.toLowerCase();
      const type = ALIASES[rawType] ?? (TYPES.has(rawType) ? rawType : "note");
      const title = (match.groups.title ?? "").trim();
      const displayTitle =
        title.length > 0
          ? title
          : type.charAt(0).toUpperCase() + type.slice(1);

      const remaining = firstInline.value.slice(match[0].length);
      if (remaining === "") {
        firstChild.children.shift();
        if (firstChild.children.length === 0) {
          firstChild.children.push({ type: "text", value: "" });
        }
      } else {
        firstInline.value = remaining;
      }

      const first = firstChild.children[0];
      if (first && first.type === "break") {
        firstChild.children.shift();
      } else if (first && first.type === "text") {
        first.value = first.value.replace(/^\s+/, "");
        if (first.value === "") firstChild.children.shift();
      }

      const bodyChildren =
        node.children.length > 0 ? node.children : [firstChild];

      const titleBlock = div("callout-title", [
        {
          type: "strong",
          children: [{ type: "text", value: displayTitle }],
        },
      ]);
      const contentBlock = div("callout-content", bodyChildren);

      node.data = {
        ...(node.data ?? {}),
        hName: "aside",
        hProperties: {
          className: ["callout"],
          "data-type": type,
        },
      };
      node.children = [titleBlock, contentBlock];
    });
  };
}
