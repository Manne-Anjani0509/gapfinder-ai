import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chunkDocument, extractTopicsFromChunks } from '../src/lib/chunker.ts';

test('chunkDocument splits document into ~220-word windows with overlap', () => {
  // Generate sample text with 500 words
  const words = Array.from({ length: 500 }, (_, i) => `word${i + 1}`);
  const sampleText = `Chapter 1: Virtual Memory\n\n${words.join(' ')}`;

  const chunks = chunkDocument('mat-test-1', 'OS Architecture', sampleText, 220, 40);

  assert.ok(chunks.length >= 2, 'Should produce at least 2 chunks for 500 words');
  assert.strictEqual(chunks[0].chunkIndex, 0);
  assert.strictEqual(chunks[0].sectionHeading, 'Chapter 1: Virtual Memory');

  // Verify overlap: last words of chunk 0 should appear at start of chunk 1
  const chunk0Words = chunks[0].text.split(/\s+/);
  const chunk1Words = chunks[1].text.split(/\s+/);
  const overlapWord = chunk0Words[chunk0Words.length - 1];

  assert.ok(chunk1Words.includes(overlapWord), 'Chunk 1 should contain overlap words from Chunk 0');
});

test('chunkDocument preserves headings and does not orphan them', () => {
  const text = `# Section 2: Page Replacement\n\nPage replacement occurs when a page fault occurs and no free frame is available in physical RAM.`;
  const chunks = chunkDocument('mat-test-2', 'Memory Management', text);

  assert.strictEqual(chunks.length, 1);
  assert.strictEqual(chunks[0].sectionHeading, 'Section 2: Page Replacement');
  assert.ok(chunks[0].text.includes('Page replacement occurs'));
});

test('extractTopicsFromChunks extracts topics with source citations', () => {
  const text = `Chapter 1: Demand Paging\n\nDemand paging is a method of virtual memory management where pages are only loaded when they are demanded.`;
  const chunks = chunkDocument('mat-test-3', 'OS Fundamentals', text);
  const topics = extractTopicsFromChunks('mat-test-3', 'OS Fundamentals', chunks);

  assert.ok(topics.length >= 1, 'Should extract at least one syllabus topic');
  assert.strictEqual(topics[0].materialId, 'mat-test-3');
  assert.ok(topics[0].name.includes('Demand Paging') || topics[0].name.includes('Chapter 1'));
  assert.ok(topics[0].sourcePassage.length > 10, 'Must contain non-empty source passage');
});
