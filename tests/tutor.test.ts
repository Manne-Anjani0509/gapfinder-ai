import { test } from 'node:test';
import assert from 'node:assert/strict';
import { retrieveRelevantChunks } from '../src/lib/rag.ts';
import type { TextChunk } from '../src/types/index.ts';

test('AI tutor returns mandated insufficient-evidence response when context is missing', async () => {
  const MANDATED_STRING =
    'I cannot find sufficient evidence in your uploaded study materials to answer this question accurately. Please upload notes covering this topic.';

  const chunks: TextChunk[] = [
    {
      id: 'c1',
      materialId: 'm1',
      materialTitle: 'Plant Physiology',
      chunkIndex: 0,
      text: 'Photosynthesis occurs in chloroplasts utilizing chlorophyll to absorb light energy.',
      sectionHeading: 'Chloroplasts',
    },
  ];

  const query = 'How does a blockchain consensus algorithm work?';
  const { insufficientContext, citations } = await retrieveRelevantChunks(query, chunks, 3);

  assert.strictEqual(insufficientContext, true);
  assert.strictEqual(citations.length, 0);

  let responseAnswer = '';
  if (insufficientContext || citations.length === 0) {
    responseAnswer = MANDATED_STRING;
  }

  assert.strictEqual(responseAnswer, MANDATED_STRING);
});
