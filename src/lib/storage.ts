import {
  StudyMaterial,
  QuizSubmission,
  RevisionPlan,
  ExtractedTopic,
  TopicGapEvidence,
  GapReportData,
  TopicStatus,
} from '@/types';
import { DEMO_MATERIALS, DEMO_QUIZ_SUBMISSIONS, DEMO_REVISION_PLAN } from './demoData';
import { supabase, isSupabaseConfigured } from './supabase';
import { computeDeterministicGaps } from './gapAnalysis';

const STORAGE_KEYS = {
  MATERIALS: 'gapfinder_materials_v1',
  SUBMISSIONS: 'gapfinder_submissions_v1',
  REVISION_PLAN: 'gapfinder_plan_v1',
  USE_DEMO: 'gapfinder_use_demo_v1',
};

export function getStoredUseDemo(): boolean {
  if (typeof window === 'undefined') return true;
  const val = localStorage.getItem(STORAGE_KEYS.USE_DEMO);
  // Default to true on initial launch so the user sees a rich working application, with a clear banner
  return val === null ? true : val === 'true';
}

export function setStoredUseDemo(useDemo: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.USE_DEMO, String(useDemo));
}

export function getStoredMaterials(isDemo: boolean): StudyMaterial[] {
  if (typeof window === 'undefined') return isDemo ? DEMO_MATERIALS : [];

  if (isDemo) {
    return DEMO_MATERIALS;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEYS.MATERIALS);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to parse stored materials:', e);
    return [];
  }
}

export function saveStoredMaterials(materials: StudyMaterial[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.MATERIALS, JSON.stringify(materials));
    if (isSupabaseConfigured() && supabase) {
      // Async background sync to Supabase if configured
      supabase
        .from('study_materials')
        .upsert(
          materials.map((m) => ({
            id: m.id,
            title: m.title,
            file_name: m.fileName,
            raw_content: m.rawContent,
            word_count: m.wordCount,
            updated_at: new Date().toISOString(),
          }))
        )
        .then(({ error }) => {
          if (error) console.warn('Supabase sync warning:', error);
        });
    }
  } catch (e) {
    console.error('Failed to save materials to localStorage:', e);
  }
}

export function getStoredSubmissions(isDemo: boolean): QuizSubmission[] {
  if (typeof window === 'undefined') return isDemo ? DEMO_QUIZ_SUBMISSIONS : [];

  if (isDemo) {
    return DEMO_QUIZ_SUBMISSIONS;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SUBMISSIONS);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to parse stored submissions:', e);
    return [];
  }
}

export function saveStoredSubmissions(submissions: QuizSubmission[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.SUBMISSIONS, JSON.stringify(submissions));
    if (isSupabaseConfigured() && supabase) {
      supabase
        .from('quiz_submissions')
        .upsert(
          submissions.map((s) => ({
            id: s.id,
            quiz_title: s.quizTitle,
            score: s.score,
            total_questions: s.totalQuestions,
            percentage: s.percentage,
            answers: s.answers,
            timestamp: s.timestamp,
          }))
        )
        .then(({ error }) => {
          if (error) console.warn('Supabase submission sync warning:', error);
        });
    }
  } catch (e) {
    console.error('Failed to save submissions to localStorage:', e);
  }
}

export function getStoredPlan(isDemo: boolean): RevisionPlan | null {
  if (typeof window === 'undefined') return isDemo ? DEMO_REVISION_PLAN : null;

  if (isDemo) {
    return DEMO_REVISION_PLAN;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEYS.REVISION_PLAN);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to parse revision plan:', e);
    return null;
  }
}

export function saveStoredPlan(plan: RevisionPlan | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (plan === null) {
      localStorage.removeItem(STORAGE_KEYS.REVISION_PLAN);
    } else {
      localStorage.setItem(STORAGE_KEYS.REVISION_PLAN, JSON.stringify(plan));
    }
  } catch (e) {
    console.error('Failed to save plan to localStorage:', e);
  }
}

/**
 * Computes evidence-based Gap Report from actual quiz submissions.
 * Rule:
 *  - Weak: < 50%
 *  - Medium: 50% - 79%
 *  - Strong: >= 80%
 */
export function computeGapReport(
  materials: StudyMaterial[],
  submissions: QuizSubmission[],
  isDemo: boolean
): GapReportData {
  return computeDeterministicGaps(materials, submissions, isDemo).report;
}
