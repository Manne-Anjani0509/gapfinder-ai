import type { TextChunk, ExtractedTopic } from '../types/index.ts';

/**
 * Splits document text into coherent chunks with overlap and metadata.
 */
export function chunkDocument(
  materialId: string,
  materialTitle: string,
  rawText: string,
  maxWordsPerChunk: number = 220,
  overlapWords: number = 40
): TextChunk[] {
  if (!rawText || !rawText.trim()) return [];

  // Normalize line endings
  const normalized = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const paragraphs = normalized
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  const chunks: TextChunk[] = [];
  let currentChunkWords: string[] = [];
  let currentHeading = materialTitle;
  let chunkIdx = 0;

  for (const para of paragraphs) {
    // Check if paragraph looks like a heading
    const firstLine = para.split('\n')[0].trim();
    if (
      firstLine.startsWith('#') ||
      firstLine.startsWith('Chapter') ||
      firstLine.startsWith('Section') ||
      firstLine.startsWith('Topic:') ||
      (firstLine.length < 60 && /^[A-Z0-9\s:.-]+$/.test(firstLine))
    ) {
      currentHeading = firstLine.replace(/^[#\s:-]+/, '').trim();
    }

    const words = para.split(/\s+/).filter(Boolean);
    if (words.length === 0) continue;

    if (currentChunkWords.length + words.length <= maxWordsPerChunk) {
      currentChunkWords.push(...words);
    } else {
      // Chunk exceeds size: flush current chunk if not empty
      if (currentChunkWords.length > 0) {
        const chunkText = currentChunkWords.join(' ');
        const offsetStart = rawText.indexOf(chunkText);
        const offsetEnd = offsetStart !== -1 ? offsetStart + chunkText.length : undefined;

        // Try to identify page number from text or markers
        const pageMatch = chunkText.match(/(?:Page|p\.)\s*(\d+)/i) || para.match(/---\s*Page\s*(\d+)\s*---/i);
        const pageNumber = pageMatch ? parseInt(pageMatch[1], 10) : undefined;

        const thisIdx = chunkIdx++;
        chunks.push({
          id: `${materialId}-chunk-${thisIdx}`,
          materialId,
          materialTitle,
          chunkIndex: thisIdx,
          text: chunkText,
          tokenCount: currentChunkWords.length,
          sectionHeading: currentHeading,
          pageNumber,
          sourceOffsetStart: offsetStart !== -1 ? offsetStart : undefined,
          sourceOffsetEnd: offsetEnd,
          topicTags: extractPotentialTopicNames(chunkText),
        });

        // Retain overlap
        const overlap = currentChunkWords.slice(-overlapWords);
        currentChunkWords = [...overlap, ...words];
      } else {
        // Single paragraph larger than maxWordsPerChunk
        for (let i = 0; i < words.length; i += maxWordsPerChunk - overlapWords) {
          const slice = words.slice(i, i + maxWordsPerChunk);
          const chunkText = slice.join(' ');
          const thisIdx = chunkIdx++;
          chunks.push({
            id: `${materialId}-chunk-${thisIdx}`,
            materialId,
            materialTitle,
            chunkIndex: thisIdx,
            text: chunkText,
            tokenCount: slice.length,
            sectionHeading: currentHeading,
            topicTags: extractPotentialTopicNames(chunkText),
          });
        }
        currentChunkWords = [];
      }
    }
  }

  // Flush remaining words
  if (currentChunkWords.length > 0) {
    const chunkText = currentChunkWords.join(' ');
    const thisIdx = chunkIdx++;
    chunks.push({
      id: `${materialId}-chunk-${thisIdx}`,
      materialId,
      materialTitle,
      chunkIndex: thisIdx,
      text: chunkText,
      tokenCount: currentChunkWords.length,
      sectionHeading: currentHeading,
      topicTags: extractPotentialTopicNames(chunkText),
    });
  }

  return chunks;
}

/**
 * Deterministically extracts candidate topic names from text.
 */
function extractPotentialTopicNames(text: string): string[] {
  const tags = new Set<string>();
  // Match Title Cased Phrases (e.g., "Virtual Memory", "Operating System", "Cellular Respiration")
  const matches = text.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})\b/g);
  if (matches) {
    for (const match of matches) {
      const clean = match.trim();
      if (clean.length > 4 && !/^(This|That|These|Those|There|Here|When|Where|Because|Although)\b/i.test(clean)) {
        tags.add(clean);
      }
    }
  }
  return Array.from(tags).slice(0, 5);
}

/**
 * Extracts syllabus topics, subtopics, and key concepts from document text and chunks.
 */
export function extractTopicsFromChunks(
  materialId: string,
  materialTitle: string,
  chunks: TextChunk[]
): ExtractedTopic[] {
  const topicsMap = new Map<string, ExtractedTopic>();

  for (const chunk of chunks) {
    const heading = chunk.sectionHeading || materialTitle;
    const existing = topicsMap.get(heading);

    // Extract subtopics and key definitions from this chunk
    const sentences = chunk.text
      .split(/(?<=[.?!])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 25);

    const definitions = sentences.filter(
      (s) =>
        /\b(is defined as|refers to|is a process|consists of|plays a key role in|functions as|causes|enables)\b/i.test(
          s
        )
    );

    const concepts = Array.from(
      new Set(
        (chunk.text.match(/\b([A-Z][a-z]{2,}(?:\s+[a-z]{2,})?(?:\s+[A-Z][a-z]{2,})?)\b/g) || [])
          .map((c) => c.trim())
          .filter((c) => c.length > 5 && !/^(However|Therefore|Furthermore|In addition|For example)\b/i.test(c))
      )
    ).slice(0, 4);

    if (!existing) {
      topicsMap.set(heading, {
        id: `topic-${materialId}-${topicsMap.size + 1}`,
        materialId,
        materialTitle,
        name: heading,
        description:
          definitions[0] ||
          sentences[0] ||
          `Core concepts and principles regarding ${heading} as outlined in ${materialTitle}.`,
        subtopics: chunk.topicTags && chunk.topicTags.length > 0 ? chunk.topicTags : [heading],
        keyConcepts: concepts,
        sourcePassage: chunk.text.slice(0, 350) + (chunk.text.length > 350 ? '...' : ''),
        chunkId: chunk.id,
        questionCount: 0,
        assessed: false,
        accuracy: 0,
        status: 'Unassessed',
      });
    } else {
      // Merge subtopics and concepts
      const mergedSubtopics = Array.from(new Set([...existing.subtopics, ...(chunk.topicTags || [])]));
      const mergedConcepts = Array.from(new Set([...existing.keyConcepts, ...concepts]));
      existing.subtopics = mergedSubtopics.slice(0, 6);
      existing.keyConcepts = mergedConcepts.slice(0, 6);
    }
  }

  // If only one topic found (e.g. document didn't have headings), split by prominent subtopic tags
  if (topicsMap.size <= 1 && chunks.length > 1) {
    const allTags = Array.from(new Set(chunks.flatMap((c) => c.topicTags || [])));
    if (allTags.length >= 2) {
      return allTags.slice(0, 5).map((tagName, i) => {
        const matchingChunk = chunks.find((c) => c.text.includes(tagName)) || chunks[i % chunks.length];
        const sentences = matchingChunk.text.split(/(?<=[.?!])\s+/);
        return {
          id: `topic-${materialId}-${i + 1}`,
          materialId,
          materialTitle,
          name: tagName,
          description: `Key principles and foundational mechanics of ${tagName}.`,
          subtopics: [`${tagName} Fundamentals`, `${tagName} Applications`],
          keyConcepts: [tagName],
          sourcePassage: matchingChunk.text.slice(0, 300) + '...',
          chunkId: matchingChunk.id,
          questionCount: 0,
          assessed: false,
          accuracy: 0,
          status: 'Unassessed',
        };
      });
    }
  }

  return Array.from(topicsMap.values());
}
