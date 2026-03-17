import { describe, it, expect } from "vitest";
import { escapeHtml, formatForTelegram, splitForTelegram } from "./telegram";

describe("escapeHtml", () => {
  it("escapes &, <, >", () => {
    expect(escapeHtml("a & b < c > d")).toBe("a &amp; b &lt; c &gt; d");
  });

  it("returns plain text unchanged", () => {
    expect(escapeHtml("hello world")).toBe("hello world");
  });

  it("escapes multiple occurrences", () => {
    expect(escapeHtml("<<>>&&")).toBe("&lt;&lt;&gt;&gt;&amp;&amp;");
  });
});

describe("formatForTelegram", () => {
  it("converts **bold** to <b>bold</b>", () => {
    expect(formatForTelegram("This is **bold** text")).toBe(
      "This is <b>bold</b> text"
    );
  });

  it("converts __bold__ to <b>bold</b>", () => {
    expect(formatForTelegram("This is __bold__ text")).toBe(
      "This is <b>bold</b> text"
    );
  });

  it("converts *text* to <b>text</b> (WhatsApp convention)", () => {
    expect(formatForTelegram("This is *bold* text")).toBe(
      "This is <b>bold</b> text"
    );
  });

  it("converts ~~strikethrough~~ to <s>strikethrough</s>", () => {
    expect(formatForTelegram("This is ~~deleted~~ text")).toBe(
      "This is <s>deleted</s> text"
    );
  });

  it("converts `inline code` to <code>inline code</code>", () => {
    expect(formatForTelegram("Use `console.log` here")).toBe(
      "Use <code>console.log</code> here"
    );
  });

  it("escapes HTML inside inline code", () => {
    expect(formatForTelegram("Use `a < b & c > d` here")).toBe(
      "Use <code>a &lt; b &amp; c &gt; d</code> here"
    );
  });

  it("converts code blocks with language to <pre><code>", () => {
    const input = "```javascript\nconst x = 1;\n```";
    expect(formatForTelegram(input)).toBe(
      '<pre><code class="language-javascript">const x = 1;</code></pre>'
    );
  });

  it("converts code blocks without language to <pre>", () => {
    const input = "```\nconst x = 1;\n```";
    expect(formatForTelegram(input)).toBe("<pre>const x = 1;</pre>");
  });

  it("escapes HTML inside code blocks", () => {
    const input = "```\nif (a < b && c > d) {}\n```";
    expect(formatForTelegram(input)).toBe(
      "<pre>if (a &lt; b &amp;&amp; c &gt; d) {}</pre>"
    );
  });

  it("converts [link](url) to <a> tags", () => {
    expect(formatForTelegram("[Click here](https://example.com)")).toBe(
      '<a href="https://example.com">Click here</a>'
    );
  });

  it("converts ## headers to <b>", () => {
    expect(formatForTelegram("## My Header")).toBe("<b>My Header</b>");
    expect(formatForTelegram("### Sub Header")).toBe("<b>Sub Header</b>");
  });

  it("converts * list items to bullet points", () => {
    expect(formatForTelegram("* Item one\n* Item two")).toBe(
      "• Item one\n• Item two"
    );
  });

  it("converts - list items to bullet points", () => {
    expect(formatForTelegram("- Item one\n- Item two")).toBe(
      "• Item one\n• Item two"
    );
  });

  it("removes horizontal rules", () => {
    expect(formatForTelegram("Above\n---\nBelow")).toBe("Above\n\nBelow");
  });

  it("collapses excessive blank lines", () => {
    expect(formatForTelegram("A\n\n\n\n\nB")).toBe("A\n\nB");
  });

  it("trims whitespace", () => {
    expect(formatForTelegram("  hello  \n\n")).toBe("hello");
  });

  it("escapes & in plain text", () => {
    expect(formatForTelegram("Tom & Jerry")).toBe("Tom &amp; Jerry");
  });

  it("does not double-escape existing HTML entities", () => {
    // Inside code blocks, & is already escaped by escapeHtml
    const input = "`a & b`";
    const result = formatForTelegram(input);
    expect(result).toContain("&amp;");
    expect(result).not.toContain("&amp;amp;");
  });

  it("handles combined markdown", () => {
    const input = [
      "## Title",
      "",
      "**Bold text** and `code`",
      "",
      "* Item 1",
      "* Item 2",
      "",
      "[Link](https://example.com)",
    ].join("\n");

    const result = formatForTelegram(input);
    expect(result).toContain("<b>Title</b>");
    expect(result).toContain("<b>Bold text</b>");
    expect(result).toContain("<code>code</code>");
    expect(result).toContain("• Item 1");
    expect(result).toContain("• Item 2");
    expect(result).toContain('<a href="https://example.com">Link</a>');
  });
});

describe("splitForTelegram", () => {
  it("returns single chunk for short messages", () => {
    const result = splitForTelegram("Hello world");
    expect(result).toEqual(["Hello world"]);
  });

  it("splits at paragraph boundary", () => {
    const paragraph1 = "A".repeat(3000);
    const paragraph2 = "B".repeat(2000);
    const text = `${paragraph1}\n\n${paragraph2}`;
    const result = splitForTelegram(text);
    expect(result.length).toBe(2);
    expect(result[0]).toBe(paragraph1);
    expect(result[1]).toBe(paragraph2);
  });

  it("respects max 5 chunks", () => {
    // Create text that would need more than 5 chunks
    const text = "A".repeat(3800 * 6);
    const result = splitForTelegram(text);
    expect(result.length).toBeLessThanOrEqual(5);
  });

  it("does not split messages under effective limit", () => {
    const text = "A".repeat(3800);
    const result = splitForTelegram(text);
    expect(result).toEqual([text]);
  });
});
