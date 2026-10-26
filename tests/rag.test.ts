import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cosineSimilarity, bm25Retrieve, retrieveRelevantChunks } from '../src/lib/rag.ts';
import type { TextChunk } from '../src/types/index.ts';

test('cosineSimilarity calculates accurate vector similarity', () => {
  const vecA = [1, 0, 0];
  const vecB = [1, 0, 0];
  const vecC = [0, 1, 0];

  assert.strictEqual(cosineSimilarity(vecA, vecB), 1, 'Identical vectors should have similarity 1.0');
  assert.strictEqual(cosineSimilarity(vecA, vecC), 0, 'Orthogonal vectors should have similarity 0.0');
});

test('bm25Retrieve retrieves matching passages with technical bigrams', () => {
  const chunks: TextChunk[] = [
    {
      id: 'c1',
      materialId: 'm1',
      materialTitle: 'Operating Systems',
      chunkIndex: 0,
      text: 'The translation lookaside buffer TLB is a hardware cache used to speed up virtual address translation.',
      sectionHeading: 'TLB Mechanics',
    },
    {
      id: 'c2',
      materialId: 'm1',
      materialTitle: 'Operating Systems',
      chunkIndex: 1,
      text: 'Cellular respiration occurs in the mitochondria where ATP is synthesized via chemiosmosis.',
      sectionHeading: 'Cellular Biology',
    },
  ];

  const results = bm25Retrieve('translation lookaside buffer', chunks, 1);
  assert.strictEqual(results.length, 1);
  assert.strictEqual(results[0].chunk.id, 'c1');
  assert.ok(results[0].score > 0);
});

test('retrieveRelevantChunks flags insufficient context when query cannot be matched', async () => {
  const chunks: TextChunk[] = [
    {
      id: 'c1',
      materialId: 'm1',
      materialTitle: 'Calculus',
      chunkIndex: 0,
      text: 'Derivatives represent the rate of change of a function with respect to an independent variable.',
      sectionHeading: 'Differentiation',
    },
  ];

  const res = await retrieveRelevantChunks('quantum teleportation entanglement protocol', chunks, 3);
  assert.strictEqual(res.insufficientContext, true, 'Unrelated query must trigger insufficientContext: true');
});
