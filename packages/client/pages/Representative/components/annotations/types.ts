/**
 * Forward-compat annotation contracts. The server `fetchPersonAnnotations`
 * stub returns `[]` until the EntityAnnotation table is migrated; the shapes
 * here define what each annotation `kind` is expected to look like once that
 * pipeline lands. UI components consume these so they can ship today and
 * automatically light up when real annotations arrive.
 */

export interface AnnotationBase {
  kind: string;
  model: string;
  modelVersion: string;
  confidence: number | null;
  generatedAt: string;
}

export interface AiSummaryAnnotation extends AnnotationBase {
  kind: "ai_summary";
  value: {
    headline: string;
    body: string;
  };
}

export interface SentimentAnnotation extends AnnotationBase {
  kind: "sentiment";
  value: {
    label: "positiivinen" | "neutraali" | "kriittinen";
    score: number;
  };
}

export interface TopicTagAnnotation extends AnnotationBase {
  kind: "topic_tag";
  value: {
    label: string;
    weight: number;
  };
}

export type Annotation =
  | AiSummaryAnnotation
  | SentimentAnnotation
  | TopicTagAnnotation
  | (AnnotationBase & { value: unknown });
