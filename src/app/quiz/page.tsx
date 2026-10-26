'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { QuizQuestion, UserAnswerRecord, QuizSubmission, TextChunk } from '@/types';
import {
  HelpCircle,
  FileCheck2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowRight,
  RotateCcw,
  Sparkles,
  BookOpen,
  Loader2,
  Layers,
  ChevronRight,
  Award,
} from 'lucide-react';

function QuizLoading() {
  return (
    <div className="flex items-center justify-center p-12">
      <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
    </div>
  );
}

function QuizContent() {
  const searchParams = useSearchParams();
  const preselectedTopic = searchParams?.get('topic') || '';
  const preselectedMaterialId = searchParams?.get('materialId') || '';

  const { materials, addSubmission, isDemoMode, authFetch } = useApp();

  // Generator State
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>(
    preselectedMaterialId || (materials.length > 0 ? materials[0].id : '')
  );
  const [selectedTopicName, setSelectedTopicName] = useState<string>(preselectedTopic || '');
  const [questionCount, setQuestionCount] = useState<number>(5);

  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [genError, setGenError] = useState<string | null>(null);

  // Active Quiz State
  const [quizMode, setQuizMode] = useState<'configure' | 'taking' | 'completed'>('configure');
  const [attemptId, setAttemptId] = useState<string>('');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, number>>({});
  const [quizResults, setQuizResults] = useState<QuizSubmission | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Update selectedMaterialId if materials load
  useEffect(() => {
    if (!selectedMaterialId && materials.length > 0) {
      setSelectedMaterialId(materials[0].id);
    }
  }, [materials, selectedMaterialId]);

  // Generate quiz handler
  const handleGenerateQuiz = async () => {
    if (materials.length === 0) return;

    setIsGenerating(true);
    setGenError(null);

    const targetMaterial = materials.find((m) => m.id === selectedMaterialId) || materials[0];
    let candidateChunks: TextChunk[] = targetMaterial?.chunks || [];

    // If specific topic is chosen, filter chunks matching the topic
    if (selectedTopicName) {
      const topicChunks = candidateChunks.filter(
        (c) =>
          c.sectionHeading?.toLowerCase().includes(selectedTopicName.toLowerCase()) ||
          c.topicTags?.some((t) => t.toLowerCase().includes(selectedTopicName.toLowerCase())) ||
          c.text.toLowerCase().includes(selectedTopicName.toLowerCase())
      );
      if (topicChunks.length > 0) {
        candidateChunks = topicChunks;
      }
    }

    try {
      const res = await authFetch('/api/quiz/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chunks: candidateChunks,
          topicName: selectedTopicName || undefined,
          materialTitle: targetMaterial.title,
          materialId: targetMaterial.id,
          count: questionCount,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate quiz');
      }

      setAttemptId(data.attemptId || `attempt-${Date.now()}`);
      setQuestions(data.questions);
      setUserAnswers({});
      setCurrentIdx(0);
      setQuizMode('taking');
    } catch (err: any) {
      setGenError(err.message || 'Error communicating with quiz generator');
    } finally {
      setIsGenerating(false);
    }
  };

  // Select option
  const handleSelectOption = (optionIndex: number) => {
    const q = questions[currentIdx];
    setUserAnswers((prev) => ({
      ...prev,
      [q.id]: optionIndex,
    }));
  };

  // Submit quiz with server-side grading
  const handleSubmitQuiz = async () => {
    setIsSubmitting(true);
    const targetMaterial = materials.find((m) => m.id === selectedMaterialId);
    const resolvedTitle = `Diagnostic: ${selectedTopicName || targetMaterial?.title || 'Course Diagnostic'}`;

    try {
      const res = await authFetch('/api/quiz/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attemptId: attemptId || `attempt-${Date.now()}`,
          quizTitle: resolvedTitle,
          materialId: selectedMaterialId,
          answers: questions.map((q) => ({
            questionId: q.id,
            selectedOptionIndex: userAnswers[q.id] !== undefined ? userAnswers[q.id] : -1,
            questionText: q.question,
            topicName: q.topicName,
            options: q.options,
            fallbackCorrectIndex: q.correctIndex,
            explanation: q.explanation,
            sourcePassage: q.sourcePassage,
          })),
        }),
      });

      const data = await res.json();
      if (res.ok && data.submission) {
        setQuizResults(data.submission);
        addSubmission(data.submission);
        setQuizMode('completed');
        return;
      }
    } catch (submitErr) {
      console.warn('Server grading fetch failed, falling back to client evaluation:', submitErr);
    } finally {
      setIsSubmitting(false);
    }

    // Client evaluation fallback if network error
    let score = 0;
    const answerRecords: UserAnswerRecord[] = [];
    const topicBreakdown: Record<string, { total: number; correct: number; percentage: number }> = {};

    for (const q of questions) {
      const selected = userAnswers[q.id] !== undefined ? userAnswers[q.id] : -1;
      const isCorrect = selected === q.correctIndex;
      if (isCorrect) score += 1;

      const tName = q.topicName || 'General';
      if (!topicBreakdown[tName]) {
        topicBreakdown[tName] = { total: 0, correct: 0, percentage: 0 };
      }
      topicBreakdown[tName].total += 1;
      if (isCorrect) topicBreakdown[tName].correct += 1;

      answerRecords.push({
        questionId: q.id,
        questionText: q.question,
        selectedOptionIndex: selected,
        correctOptionIndex: q.correctIndex,
        isCorrect,
        topicName: tName,
        explanation: q.explanation,
        sourcePassage: q.sourcePassage,
      });
    }

    for (const tName of Object.keys(topicBreakdown)) {
      const stat = topicBreakdown[tName];
      stat.percentage = Math.round((stat.correct / stat.total) * 100);
    }

    const percentage = Math.round((score / questions.length) * 100);

    const submission: QuizSubmission = {
      id: attemptId || `sub-${Date.now()}`,
      quizTitle: resolvedTitle,
      materialId: selectedMaterialId,
      timestamp: new Date().toISOString(),
      totalQuestions: questions.length,
      score,
      percentage,
      answers: answerRecords,
      topicBreakdown,
      isDemo: false,
    };

    setQuizResults(submission);
    addSubmission(submission);
    setQuizMode('completed');
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900">Diagnostic Assessment</h2>
        <p className="text-xs text-slate-500">
          Multiple-choice quizzes generated directly from your uploaded materials with verifiable source citations.
        </p>
      </div>

      {/* Empty State: No Study Material Uploaded */}
      {materials.length === 0 && (
        <div className="p-10 bg-white rounded-2xl border border-dashed border-slate-300 text-center">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">
            No Study Material Available
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            To generate a grounded, material-specific diagnostic quiz, you must first upload course notes, a syllabus, or textbook excerpts.
          </p>
          <div className="mt-5 flex items-center justify-center gap-3">
            <Link
              href="/materials"
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm"
            >
              Upload Study Material
            </Link>
          </div>
        </div>
      )}

      {/* MODE 1: Configure & Generate */}
      {materials.length > 0 && quizMode === 'configure' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs max-w-2xl mx-auto space-y-5">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Configure Diagnostic Quiz
              </h3>
              <p className="text-xs text-slate-500">
                Select your source material and target topic to evaluate knowledge retention.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Select Material */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Target Study Material
              </label>
              <select
                value={selectedMaterialId}
                onChange={(e) => {
                  setSelectedMaterialId(e.target.value);
                  setSelectedTopicName('');
                }}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                {materials.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.title} ({m.wordCount} words, {m.chunks?.length} chunks)
                  </option>
                ))}
              </select>
            </div>

            {/* Select Topic */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Target Topic (Optional)
              </label>
              <select
                value={selectedTopicName}
                onChange={(e) => setSelectedTopicName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="">Comprehensive Assessment (All Topics in Material)</option>
                {materials
                  .find((m) => m.id === selectedMaterialId)
                  ?.topics?.map((t) => (
                    <option key={t.id} value={t.name}>
                      {t.name}
                    </option>
                  ))}
              </select>
            </div>

            {/* Question Count */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Number of Questions
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[3, 5, 8].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setQuestionCount(num)}
                    className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                      questionCount === num
                        ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-2xs'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {num} Questions
                  </button>
                ))}
              </div>
            </div>

            {genError && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{genError}</span>
              </div>
            )}

            <button
              onClick={handleGenerateQuiz}
              disabled={isGenerating}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-md shadow-indigo-500/25 transition-all disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Synthesizing Grounded Questions...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Start Grounded Diagnostic Quiz</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* MODE 2: Taking the Quiz */}
      {quizMode === 'taking' && questions.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs max-w-3xl mx-auto space-y-6">
          {/* Header & Progress */}
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
              <span className="font-bold text-indigo-600 uppercase tracking-wider">
                Question {currentIdx + 1} of {questions.length}
              </span>
              <span className="font-medium text-slate-400">
                Topic: {questions[currentIdx].topicName}
              </span>
            </div>

            {/* Progress bar */}
            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-600 to-purple-600 transition-all duration-300"
                style={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Question Text */}
          <div className="py-2">
            <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
              {questions[currentIdx].question}
            </h3>
          </div>

          {/* 4 Options */}
          <div className="space-y-3">
            {questions[currentIdx].options.map((option, optIdx) => {
              const isSelected = userAnswers[questions[currentIdx].id] === optIdx;
              const letter = ['A', 'B', 'C', 'D'][optIdx];

              return (
                <button
                  key={optIdx}
                  type="button"
                  onClick={() => handleSelectOption(optIdx)}
                  className={`w-full text-left p-4 rounded-xl border flex items-center gap-3.5 transition-all ${
                    isSelected
                      ? 'bg-indigo-50/80 border-indigo-500 ring-2 ring-indigo-500/20 text-indigo-950 font-medium'
                      : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                  }`}
                >
                  <span
                    className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                      isSelected
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {letter}
                  </span>
                  <span className="text-sm leading-relaxed">{option}</span>
                </button>
              );
            })}
          </div>

          {/* Footer Controls */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <button
              onClick={() => setCurrentIdx((prev) => Math.max(0, prev - 1))}
              disabled={currentIdx === 0}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Previous
            </button>

            <div className="flex items-center gap-3">
              {currentIdx < questions.length - 1 ? (
                <button
                  onClick={() => setCurrentIdx((prev) => prev + 1)}
                  disabled={userAnswers[questions[currentIdx].id] === undefined}
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-sm"
                >
                  <span>Next Question</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={handleSubmitQuiz}
                  disabled={Object.keys(userAnswers).length < questions.length}
                  className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-md shadow-emerald-600/25 transition-all disabled:opacity-50"
                >
                  Submit & Evaluate
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODE 3: Completed Results & Explanations */}
      {quizMode === 'completed' && quizResults && (
        <div className="space-y-6 max-w-3xl mx-auto">
          {/* Score Summary Card */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-8 shadow-xs text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center mx-auto shadow-md shadow-indigo-500/20">
              <Award className="w-8 h-8" />
            </div>

            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                Diagnostic Result
              </span>
              <div className="text-4xl sm:text-5xl font-black text-slate-900 mt-1">
                {quizResults.percentage}%
              </div>
              <p className="text-sm font-medium text-slate-600 mt-1">
                {quizResults.score} out of {quizResults.totalQuestions} questions correct
              </p>
            </div>

            {/* Performance classification */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border">
              {quizResults.percentage < 50 ? (
                <span className="bg-rose-50 text-rose-700 border-rose-200 px-3 py-1 rounded-full">
                  Identified Knowledge Gap (&lt;50%) &bull; High Priority Revision
                </span>
              ) : quizResults.percentage < 80 ? (
                <span className="bg-amber-50 text-amber-700 border-amber-200 px-3 py-1 rounded-full">
                  Developing Understanding (50-79%) &bull; Review Nuances
                </span>
              ) : (
                <span className="bg-emerald-50 text-emerald-700 border-emerald-200 px-3 py-1 rounded-full">
                  Concept Mastery (≥80%) &bull; Strong Recall
                </span>
              )}
            </div>

            <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/gap-report"
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-all"
              >
                Inspect Updated Gap Report
              </Link>

              <Link
                href="/revision-plan"
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-all"
              >
                Generate Revision Plan
              </Link>

              <button
                onClick={() => {
                  setQuizMode('configure');
                  setQuizResults(null);
                }}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>New Quiz</span>
              </button>
            </div>
          </div>

          {/* Question by Question Review */}
          <div className="space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              Detailed Question Analysis & Citations
            </h3>

            {quizResults.answers.map((ans, idx) => {
              const currentQ = questions.find((q) => q.id === ans.questionId);

              return (
                <div
                  key={ans.questionId}
                  className={`p-6 rounded-2xl border transition-all ${
                    ans.isCorrect
                      ? 'bg-white border-emerald-200/80'
                      : 'bg-white border-rose-200/80'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      {ans.isCorrect ? (
                        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Correct</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-xs font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Incorrect</span>
                        </div>
                      )}
                      <span className="text-xs font-semibold text-slate-400">
                        Question #{idx + 1} &bull; {ans.topicName}
                      </span>
                    </div>
                  </div>

                  <h4 className="text-sm font-bold text-slate-900 mt-2">
                    {ans.questionText}
                  </h4>

                  {/* Options review */}
                  {currentQ && (
                    <div className="mt-3 space-y-2 text-xs">
                      {currentQ.options.map((opt, optIdx) => {
                        const isUserChoice = ans.selectedOptionIndex === optIdx;
                        const isCorrectOption = ans.correctOptionIndex === optIdx;

                        let style = 'bg-slate-50 border-slate-200 text-slate-600';
                        if (isCorrectOption) {
                          style = 'bg-emerald-50 border-emerald-300 text-emerald-900 font-semibold';
                        } else if (isUserChoice && !ans.isCorrect) {
                          style = 'bg-rose-50 border-rose-300 text-rose-900 font-semibold';
                        }

                        return (
                          <div
                            key={optIdx}
                            className={`p-2.5 rounded-xl border flex items-center justify-between ${style}`}
                          >
                            <span>
                              <strong>{['A', 'B', 'C', 'D'][optIdx]}.</strong> {opt}
                            </span>
                            {isCorrectOption && (
                              <span className="text-[10px] font-bold text-emerald-700 uppercase">
                                Correct Answer
                              </span>
                            )}
                            {isUserChoice && !ans.isCorrect && (
                              <span className="text-[10px] font-bold text-rose-700 uppercase">
                                Your Choice
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Explanation */}
                  <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs text-slate-700 space-y-1">
                    <p className="font-bold text-slate-800">Explanation:</p>
                    <p className="leading-relaxed">{ans.explanation}</p>
                  </div>

                  {/* Grounded Citation */}
                  <div className="mt-3 p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 text-xs text-indigo-900">
                    <p className="font-bold text-indigo-800 flex items-center gap-1.5 mb-1">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Verifiable Grounding in Source Material:</span>
                    </p>
                    <p className="italic text-slate-700">"{ans.sourcePassage}"</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function DiagnosticQuizPage() {
  return (
    <Suspense fallback={<QuizLoading />}>
      <QuizContent />
    </Suspense>
  );
}
