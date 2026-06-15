/** Tiny deterministic vector helpers for memory graph similarity. */
import { words } from '../system/text.js';

const VECTOR_SIZE = 48;

export function embed(text: string): number[] {
  const vector = Array(VECTOR_SIZE).fill(0);
  for (const word of words(text)) vector[hash(word) % VECTOR_SIZE] += 1;
  const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
  return norm ? vector.map((value) => Number((value / norm).toFixed(4))) : vector;
}

export function cosine(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i += 1) sum += a[i] * b[i];
  return sum;
}

function hash(input: string): number {
  let value = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    value ^= input.charCodeAt(i);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}
