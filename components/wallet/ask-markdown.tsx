import type { ReactNode } from "react";

/**
 * The slice of markdown an answer uses: paragraphs, bold, italics, lists, and links.
 * Text becomes elements. Nothing is inserted as HTML.
 */

type Inline =
  | { type: "text"; text: string }
  | { type: "bold"; children: Inline[] }
  | { type: "em"; children: Inline[] }
  | { type: "link"; href: string; text: string };

type Block =
  | { type: "p"; lines: string[] }
  | { type: "list"; ordered: boolean; items: string[] };

const TOKEN = /(\*\*[^*\n]+?\*\*|\*[^*\n]+?\*|\[[^\]\n]+\]\(https?:\/\/[^\s)]+\))/g;

function parseInline(source: string): Inline[] {
  const nodes: Inline[] = [];
  let last = 0;
  for (const match of source.matchAll(TOKEN)) {
    const index = match.index ?? 0;
    if (index > last) nodes.push({ type: "text", text: source.slice(last, index) });
    const token = match[0];
    if (token.startsWith("**")) {
      nodes.push({ type: "bold", children: parseInline(token.slice(2, -2)) });
    } else if (token.startsWith("*")) {
      nodes.push({ type: "em", children: parseInline(token.slice(1, -1)) });
    } else {
      const link = /^\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)$/.exec(token);
      if (link) nodes.push({ type: "link", href: link[2], text: link[1] });
    }
    last = index + token.length;
  }
  if (last < source.length) nodes.push({ type: "text", text: source.slice(last) });
  return nodes;
}

function blocks(source: string): Block[] {
  const out: Block[] = [];
  let lines: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;

  function flushParagraph() {
    if (lines.length === 0) return;
    out.push({ type: "p", lines });
    lines = [];
  }

  function flushList() {
    if (!list) return;
    out.push({ type: "list", ordered: list.ordered, items: list.items });
    list = null;
  }

  for (const raw of source.replace(/\r\n/g, "\n").split("\n")) {
    const line = raw.trim();
    const bullet = /^[-*]\s+(.+)$/.exec(line);
    const numbered = /^\d+\.\s+(.+)$/.exec(line);
    if (bullet || numbered) {
      flushParagraph();
      const ordered = Boolean(numbered);
      if (!list || list.ordered !== ordered) {
        flushList();
        list = { ordered, items: [] };
      }
      list.items.push((bullet ?? numbered)![1]);
      continue;
    }
    flushList();
    if (!line) {
      flushParagraph();
      continue;
    }
    lines.push(line);
  }
  flushList();
  flushParagraph();
  return out;
}

function inlineNodes(nodes: Inline[], key: string): ReactNode[] {
  return nodes.map((node, index) => {
    const id = `${key}-${index}`;
    if (node.type === "text") return node.text;
    if (node.type === "bold") return <strong key={id}>{inlineNodes(node.children, id)}</strong>;
    if (node.type === "em") return <em key={id}>{inlineNodes(node.children, id)}</em>;
    return (
      <a key={id} href={node.href} target="_blank" rel="noreferrer" className="underline">
        {node.text}
      </a>
    );
  });
}

export function AskMarkdown({ text }: { text: string }) {
  const parts = blocks(text);
  if (parts.length === 0) return text;
  return (
    <div className="flex flex-col gap-2">
      {parts.map((part, index) => {
        if (part.type === "p") {
          return (
            <p key={index}>
              {part.lines.map((line, lineIndex) => (
                <span key={lineIndex}>
                  {lineIndex > 0 && <br />}
                  {inlineNodes(parseInline(line), `${index}-${lineIndex}`)}
                </span>
              ))}
            </p>
          );
        }
        const List = part.ordered ? "ol" : "ul";
        return (
          <List
            key={index}
            className={part.ordered ? "list-decimal space-y-1 pl-5" : "list-disc space-y-1 pl-5"}
          >
            {part.items.map((item, itemIndex) => (
              <li key={itemIndex}>{inlineNodes(parseInline(item), `${index}-${itemIndex}`)}</li>
            ))}
          </List>
        );
      })}
    </div>
  );
}
