import { Fragment } from "react";

type Token =
  | { t: "heading"; level: 1 | 2 | 3; text: string }
  | { t: "hr" }
  | { t: "table"; head: string[]; rows: string[][] }
  | { t: "ul"; items: string[] }
  | { t: "ol"; items: string[] }
  | { t: "codeblock"; code: string }
  | { t: "paragraph"; text: string };

function parseInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const pattern = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|__[^_]+__|_[^_]+_)/g;
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    const raw = match[0];
    if (raw.startsWith("`")) {
      parts.push(<code key={match.index} className="md-code-inline">{raw.slice(1, -1)}</code>);
    } else if (raw.startsWith("**") || raw.startsWith("__")) {
      parts.push(<strong key={match.index}>{raw.slice(2, -2)}</strong>);
    } else if (raw.startsWith("*") || raw.startsWith("_")) {
      parts.push(<em key={match.index}>{raw.slice(1, -1)}</em>);
    }
    last = match.index + raw.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

function tokenize(md: string): Token[] {
  const lines = md.split("\n");
  const tokens: Token[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim() === "") { i++; continue; }

    if (/^```/.test(line)) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) {
        codeLines.push(lines[i]);
        i++;
      }
      i++;
      tokens.push({ t: "codeblock", code: codeLines.join("\n") });
      continue;
    }

    const hMatch = line.match(/^(#{1,3})\s+(.+)/);
    if (hMatch) {
      tokens.push({ t: "heading", level: hMatch[1].length as 1|2|3, text: hMatch[2] });
      i++; continue;
    }

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
      tokens.push({ t: "hr" });
      i++; continue;
    }

    if (/^\|/.test(line)) {
      const tableLines: string[] = [];
      while (i < lines.length && /^\|/.test(lines[i])) {
        tableLines.push(lines[i]);
        i++;
      }
      if (tableLines.length >= 2) {
        const parseRow = (r: string) =>
          r.split("|").slice(1, -1).map((c) => c.trim());
        const head = parseRow(tableLines[0]);
        const rows = tableLines.slice(2).map(parseRow);
        tokens.push({ t: "table", head, rows });
      }
      continue;
    }

    if (/^[-*+]\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*+]\s/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*+]\s+/, ""));
        i++;
      }
      tokens.push({ t: "ul", items });
      continue;
    }

    if (/^\d+\.\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s+/, ""));
        i++;
      }
      tokens.push({ t: "ol", items });
      continue;
    }

    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !/^(#{1,3}\s|```|[-*+]\s|\d+\.\s|\||-{3,}|\*{3,})/.test(lines[i])
    ) {
      paraLines.push(lines[i]);
      i++;
    }
    if (paraLines.length) {
      tokens.push({ t: "paragraph", text: paraLines.join(" ") });
    }
  }

  return tokens;
}

export function MarkdownMessage({ content }: { content: string }) {
  const tokens = tokenize(content);

  return (
    <div className="md-body">
      {tokens.map((tok, idx) => {
        if (tok.t === "heading") {
          const Tag = `h${tok.level}` as "h1" | "h2" | "h3";
          return <Tag key={idx} className={`md-h${tok.level}`}>{parseInline(tok.text)}</Tag>;
        }
        if (tok.t === "hr") {
          return <hr key={idx} className="md-hr" />;
        }
        if (tok.t === "codeblock") {
          return (
            <pre key={idx} className="md-pre">
              <code>{tok.code}</code>
            </pre>
          );
        }
        if (tok.t === "table") {
          return (
            <div key={idx} className="md-table-wrap">
              <table className="md-table">
                <thead>
                  <tr>
                    {tok.head.map((cell, ci) => (
                      <th key={ci} className="md-th">{parseInline(cell)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tok.rows.map((row, ri) => (
                    <tr key={ri} className="md-tr">
                      {row.map((cell, ci) => (
                        <td key={ci} className="md-td">{parseInline(cell)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        if (tok.t === "ul") {
          return (
            <ul key={idx} className="md-ul">
              {tok.items.map((item, ii) => (
                <li key={ii} className="md-li">{parseInline(item)}</li>
              ))}
            </ul>
          );
        }
        if (tok.t === "ol") {
          return (
            <ol key={idx} className="md-ol">
              {tok.items.map((item, ii) => (
                <li key={ii} className="md-li">{parseInline(item)}</li>
              ))}
            </ol>
          );
        }
        if (tok.t === "paragraph") {
          const parts = tok.text.split(/(\n)/);
          return (
            <p key={idx} className="md-p">
              {parts.map((part, pi) =>
                part === "\n" ? <br key={pi} /> : <Fragment key={pi}>{parseInline(part)}</Fragment>
              )}
            </p>
          );
        }
        return null;
      })}
    </div>
  );
}
