type XmlElementNode<T extends string = string> = {
  type: "element";
  name: T;
};

type XmlTextNode = {
  type: "text";
  text: string;
};

export type XmlNode = (XmlElementNode | XmlTextNode) & {
  attributes?: Record<string, string>;
  elements?: Array<XmlNode>;
};

export type XmlTree = {
  elements: Array<XmlNode>;
};
