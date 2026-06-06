// Tagged template for HTML strings — gives IDEs syntax highlighting.
// Must NOT use String.raw: Bun's transpiler encodes non-ASCII characters
// (ä, ö, …) as \uXXXX in raw template strings, corrupting Finnish text.
// https://github.com/oven-sh/bun/issues/8745
export function html(strings: TemplateStringsArray, ...values: unknown[]): string {
  return strings.reduce<string>(
    (result, str, i) => result + str + (i < values.length ? String(values[i] ?? "") : ""),
    "",
  );
}
