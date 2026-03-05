// Bun tree-shakes victory-vendor/d3-scale because d3-scale has "sideEffects": false
// and recharts v3 only accesses scale functions dynamically (d3Scales[name]()).
// This explicit import forces all scale functions into the bundle so recharts can find them.
import {
  scaleBand,
  scaleDiverging,
  scaleIdentity,
  scaleLinear,
  scaleLog,
  scaleOrdinal,
  scalePoint,
  scalePow,
  scaleQuantile,
  scaleQuantize,
  scaleRadial,
  scaleSequential,
  scaleSequentialQuantile,
  scaleSymlog,
  scaleThreshold,
  scaleTime,
  scaleUtc,
} from "victory-vendor/d3-scale";

// Reference all imports to prevent them from being tree-shaken themselves
export const _d3ScaleKeepAlive = {
  scaleBand,
  scaleDiverging,
  scaleIdentity,
  scaleLinear,
  scaleLog,
  scaleOrdinal,
  scalePoint,
  scalePow,
  scaleQuantile,
  scaleQuantize,
  scaleRadial,
  scaleSequential,
  scaleSequentialQuantile,
  scaleSymlog,
  scaleThreshold,
  scaleTime,
  scaleUtc,
};
