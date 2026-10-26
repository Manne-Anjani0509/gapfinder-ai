import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { TopicGapEvidence } from '../src/types/index.ts';

test('Revision plan time allocation does not exceed budget and prioritizes weak topics', () => {
  const evidenceList: TopicGapEvidence[] = [
    {
      topicId: 't1',
      topicName: 'Page Replacement Algorithms',
      materialTitle: 'OS Notes',
      questionsAttempted: 4,
      correctAnswers: 1,
      accuracy: 25,
      classification: 'Weak',
      evidenceNotes: '',
      recommendedFocus: [],
      sourcePassage: '',
    },
    {
      topicId: 't2',
      topicName: 'Demand Paging',
      materialTitle: 'OS Notes',
      questionsAttempted: 4,
      correctAnswers: 3,
      accuracy: 75,
      classification: 'Medium',
      evidenceNotes: '',
      recommendedFocus: [],
      sourcePassage: '',
    },
    {
      topicId: 't3',
      topicName: 'TLB Translation',
      materialTitle: 'OS Notes',
      questionsAttempted: 5,
      correctAnswers: 5,
      accuracy: 100,
      classification: 'Strong',
      evidenceNotes: '',
      recommendedFocus: [],
      sourcePassage: '',
    },
  ];

  const totalMinutes = 45;
  const weak = evidenceList.filter((e) => e.classification === 'Weak');
  const medium = evidenceList.filter((e) => e.classification === 'Medium');

  let remaining = totalMinutes;
  const tasks: { title: string; minutes: number; priority: string }[] = [];

  if (weak.length > 0) {
    const minutesPerWeak = Math.max(Math.floor((totalMinutes * 0.55) / weak.length), 10);
    for (const w of weak) {
      const taskMin = Math.min(minutesPerWeak, remaining);
      remaining -= taskMin;
      tasks.push({ title: w.topicName, minutes: taskMin, priority: 'high' });
    }
  }

  if (medium.length > 0 && remaining >= 10) {
    const minutesPerMed = Math.max(Math.floor(remaining / medium.length), 10);
    for (const m of medium) {
      if (remaining < 10) break;
      const taskMin = Math.min(minutesPerMed, remaining);
      remaining -= taskMin;
      tasks.push({ title: m.topicName, minutes: taskMin, priority: 'medium' });
    }
  }

  const allocated = tasks.reduce((acc, t) => acc + t.minutes, 0);
  assert.ok(allocated <= totalMinutes, `Allocated minutes (${allocated}) must be <= budget (${totalMinutes})`);
  assert.strictEqual(tasks[0].priority, 'high', 'Highest priority task must target Weak topic');
  assert.strictEqual(tasks[0].title, 'Page Replacement Algorithms');
});
