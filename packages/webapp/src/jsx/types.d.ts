declare namespace JSX {
  type Element = string;

  interface IntrinsicElements {
    [tag: string]: any;
  }
}
