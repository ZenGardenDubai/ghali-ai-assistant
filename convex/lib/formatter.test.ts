import { describe, it, expect } from "vitest";
import { formatForWhatsApp } from "./formatter";

describe("formatForWhatsApp", () => {
  it("converts **bold** to *bold*", () => {
    expect(formatForWhatsApp("This is **bold** text")).toBe(
      "This is *bold* text"
    );
  });

  it("strips ## headers", () => {
    expect(formatForWhatsApp("## My Header")).toBe("My Header");
    expect(formatForWhatsApp("### Sub Header")).toBe("Sub Header");
  });

  it("converts [link](url) to link text only", () => {
    expect(formatForWhatsApp("[Click here](https://example.com)")).toBe(
      "Click here"
    );
  });

  it("strips code block markers but keeps content", () => {
    const input = "```javascript\nconst x = 1;\n```";
    expect(formatForWhatsApp(input)).toBe("const x = 1;");
  });

  it("converts inline code to plain text", () => {
    expect(formatForWhatsApp("Use `console.log` here")).toBe(
      "Use console.log here"
    );
  });

  it("strips blockquote markers", () => {
    expect(formatForWhatsApp("> This is a quote")).toBe("This is a quote");
  });

  it("removes horizontal rules", () => {
    expect(formatForWhatsApp("Above\n---\nBelow")).toBe("Above\n\nBelow");
  });

  it("converts * list items to - list items", () => {
    expect(formatForWhatsApp("* Item one\n* Item two")).toBe(
      "- Item one\n- Item two"
    );
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
      "> A quote",
      "",
      "[Link](https://example.com)",
    ].join("\n");

    const expected = [
      "Title",
      "",
      "*Bold text* and code",
      "",
      "- Item 1",
      "- Item 2",
      "",
      "A quote",
      "",
      "Link",
    ].join("\n");

    expect(formatForWhatsApp(input)).toBe(expected);
  });

  it("collapses excessive blank lines", () => {
    expect(formatForWhatsApp("A\n\n\n\n\nB")).toBe("A\n\nB");
  });

  it("trims whitespace", () => {
    expect(formatForWhatsApp("  hello  \n\n")).toBe("hello");
  });
});
