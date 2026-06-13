import { describe, expect, test } from "bun:test";
import { Fragment, jsx, SafeHtml, trustedHtml } from "../src/jsx/jsx-runtime";

const render = (value: unknown): string => String(value);

describe("jsx runtime", () => {
  test("renders a simple element", () => {
    expect(render(jsx("div", { class: "a", children: "hello" }))).toBe(
      '<div class="a">hello</div>',
    );
  });

  test("escapes string children by default", () => {
    expect(render(jsx("div", { children: '<img src=x> & "quoted"' }))).toBe(
      "<div>&lt;img src=x&gt; &amp; &quot;quoted&quot;</div>",
    );
  });

  test("does not escape nested elements", () => {
    const inner = jsx("span", { children: "x" });
    expect(render(jsx("div", { children: inner }))).toBe(
      "<div><span>x</span></div>",
    );
  });

  test("escapes plain strings mixed with elements in arrays", () => {
    const inner = jsx("b", { children: "ok" });
    expect(render(jsx("div", { children: ["<i>", inner] }))).toBe(
      "<div>&lt;i&gt;<b>ok</b></div>",
    );
  });

  test("trustedHtml passes raw markup through", () => {
    expect(render(jsx("div", { children: trustedHtml("<em>raw</em>") }))).toBe(
      "<div><em>raw</em></div>",
    );
  });

  test("escapes attribute values exactly once", () => {
    expect(render(jsx("input", { value: 'a"b<i>' }))).toBe(
      '<input value="a&quot;b&lt;i&gt;">',
    );
  });

  test("renders numbers and skips null/undefined/false children", () => {
    expect(
      render(jsx("div", { children: [0, null, undefined, false, 1] })),
    ).toBe("<div>01</div>");
  });

  test("renders boolean attributes and skips false/null ones", () => {
    expect(
      render(jsx("input", { disabled: true, checked: false, id: null })),
    ).toBe("<input disabled>");
  });

  test("renders void elements without closing tag", () => {
    expect(render(jsx("br", null))).toBe("<br>");
  });

  test("fragment concatenates children and stays trusted when nested", () => {
    const frag = jsx(Fragment, {
      children: [jsx("i", { children: "a" }), "b<"],
    });
    expect(render(frag)).toBe("<i>a</i>b&lt;");
    expect(render(jsx("div", { children: frag }))).toBe(
      "<div><i>a</i>b&lt;</div>",
    );
  });

  test("function component output is trusted (components may build raw HTML)", () => {
    const Raw = () => "<u>built</u>";
    expect(render(jsx("div", { children: jsx(Raw, {}) }))).toBe(
      "<div><u>built</u></div>",
    );
  });

  test("function component returning jsx is not double-escaped", () => {
    const Comp = () => jsx("span", { children: "x & y" });
    expect(render(jsx("div", { children: jsx(Comp, {}) }))).toBe(
      "<div><span>x &amp; y</span></div>",
    );
  });

  test("dangerouslySetInnerHTML injects raw HTML and emits no attribute", () => {
    expect(
      render(
        jsx("span", {
          dangerouslySetInnerHTML: { __html: "<b>bold</b>" },
          children: "ignored",
        }),
      ),
    ).toBe("<span><b>bold</b></span>");
  });

  test("jsx output is a SafeHtml instance that stringifies to its markup", () => {
    const el = jsx("p", { children: "x" });
    expect(el).toBeInstanceOf(SafeHtml);
    expect(`${el}`).toBe("<p>x</p>");
    expect("" + (el as unknown as string)).toBe("<p>x</p>");
  });
});
