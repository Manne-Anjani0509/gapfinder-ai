'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import {
  TrendingUp,
  FileCheck2,
  Calendar,
  CheckCircle2,
  XCircle,
  Award,
  ChevronDown,
  ChevronUp,
  Download,
  RotateCcw,
  BookOpen,
} from 'lucide-react';

export default function ProgressPage() {
  const { submissions, gapReport, isDemoMode, resetAllData } = useApp();
  const [expandedSubId, setExpandedSubId] = useState<string | null>(null);

  const totalAttemptedQuestions = submissions.reduce((acc, s) => acc + s.totalQuestions, 0);
  const totalCorrectQuestions = submissions.reduce((acc, s) => acc + s.score, 0);
  const averageAccuracy =
    totalAttemptedQuestions > 0
      ? Math.round((totalCorrectQuestions / totalAttemptedQuestions) * 100)
      : 0;

  const highestScore =
    submissions.length > 0 ? Math.max(...submissions.map((s) => s.percentage)) : 0;

  // Export JSON
  const handleExportData = () => {
    const dataStr = JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        isDemoMode,
        submissions,
        gapReport,
      },
      null,
      2
    );
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gapfinder_progress_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">Student Progress & Mastery Trajectory</h2>
            <span
              className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                isDemoMode
                  ? 'bg-amber-100 text-amber-800 border-amber-300'
                  : 'bg-emerald-100 text-emerald-800 border-emerald-300'
              }`}
            >
              {isDemoMode ? 'Sample Demo Log' : 'Verified Student History'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Diagnostic analytics and chronological assessment records persisted from actual test runs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportData}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 shadow-xs transition-all"
          >
            <Download className="w-3.5 h-3.5 text-indigo-600" />
            <span>Export Analytics JSON</span>
          </button>
        </div>
      </div>

      {/* Aggregate Progress Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">Total Quizzes</span>
          <p className="text-2xl font-black text-slate-900 mt-1">{submissions.length}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Completed assessments</p>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">Average Accuracy</span>
          <p className="text-2xl font-black text-indigo-600 mt-1">{averageAccuracy}%</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Across all attempted items</p>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">Highest Score</span>
          <p className="text-2xl font-black text-emerald-600 mt-1">{highestScore}%</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Peak diagnostic score</p>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">Questions Answered</span>
          <p className="text-2xl font-black text-purple-600 mt-1">
            {totalCorrectQuestions} / {totalAttemptedQuestions}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Verified answers</p>
        </div>
      </div>

      {/* Historical Accuracy Progression */}
      <div className="p-6 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
        <h3 className="text-base font-bold text-slate-900 mb-1">
          Chronological Accuracy Progression
        </h3>
        <p className="text-xs text-slate-500 mb-6">
          Diagnostic accuracy over consecutive assessment attempts
        </p>

        {submissions.length === 0 ? (
          <div className="py-8 text-center text-slate-400">
            <TrendingUp className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <p className="text-sm font-semibold">No assessment records yet</p>
            <p className="text-xs text-slate-500 mt-1">
              Complete diagnostic quizzes to generate your historical learning trajectory.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-end justify-between gap-2 h-36 pt-6 px-2 border-b border-slate-200">
              {submissions.map((sub, i) => {
                const heightPercent = Math.max(sub.percentage, 10);
                const isHigh = sub.percentage >= 80;
                const isLow = sub.percentage < 50;

                let barColor = 'bg-amber-500';
                if (isHigh) barColor = 'bg-emerald-500';
                if (isLow) barColor = 'bg-rose-500';

                return (
                  <div key={sub.id} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                    <span className="text-[10px] font-bold text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity">
                      {sub.percentage}%
                    </span>
                    <div
                      className={`w-full max-w-[48px] rounded-t-lg transition-all ${barColor}`}
                      style={{ height: `${heightPercent}%` }}
                    />
                    <span className="text-[10px] text-slate-400 truncate max-w-[50px]">
                      Quiz #{submissions.length - i}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 pt-2">
              <span>Oldest Attempt</span>
              <span>Latest Attempt</span>
            </div>
          </div>
        )}
      </div>

      {/* Comprehensive Historical Log */}
      <div className="p-6 bg-white rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Diagnostic Assessment Logs ({submissions.length})
            </h3>
            <p className="text-xs text-slate-500">
              Expand any session to inspect specific question selections and grounded explanations.
            </p>
          </div>

          <Link
            href="/quiz"
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm"
          >
            Take New Quiz
          </Link>
        </div>

        {submissions.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-6">
            No quiz logs saved yet.
          </p>
        ) : (
          <div className="space-y-3">
            {submissions.map((sub, idx) => {
              const isExpanded = expandedSubId === sub.id;
              const isHigh = sub.percentage >= 80;
              const isLow = sub.percentage < 50;

              let badgeStyle = 'bg-amber-50 text-amber-700 border-amber-200';
              if (isHigh) badgeStyle = 'bg-emerald-50 text-emerald-700 border-emerald-200';
              if (isLow) badgeStyle = 'bg-rose-50 text-rose-700 border-rose-200';

              return (
                <div
                  key={sub.id}
                  className="rounded-2xl border border-slate-200/80 overflow-hidden transition-all"
                >
                  <div
                    onClick={() => setExpandedSubId(isExpanded ? null : sub.id)}
                    className="p-4 bg-slate-50/50 hover:bg-slate-50 flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-white border border-slate-200 text-indigo-600">
                        <FileCheck2 className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">
                          {sub.quizTitle}
                        </h4>
                        <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                          <Calendar className="w-3 h-3" />
                          <span>
                            {new Date(sub.timestamp).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-sm font-black text-slate-900">
                        {sub.score}/{sub.totalQuestions} ({sub.percentage}%)
                      </span>

                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeStyle}`}
                      >
                        {isLow ? 'Critical Gap' : isHigh ? 'Mastered' : 'Developing'}
                      </span>

                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                  </div>

                  {/* Expanded Questions Breakdown */}
                  {isExpanded && (
                    <div className="p-5 bg-white border-t border-slate-100 space-y-3">
                      <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                        Questions & Diagnostic Grounding:
                      </p>

                      {sub.answers.map((ans, aIdx) => (
                        <div
                          key={ans.questionId}
                          className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/60 text-xs space-y-1.5"
                        >
                          <div className="flex items-center justify-between font-semibold">
                            <span className="text-slate-800">
                              #{aIdx + 1}. {ans.questionText}
                            </span>
                            {ans.isCorrect ? (
                              <span className="text-emerald-600 font-bold flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Correct
                              </span>
                            ) : (
                              <span className="text-rose-600 font-bold flex items-center gap-1">
                                <XCircle className="w-3.5 h-3.5" /> Incorrect
                              </span>
                            )}
                          </div>

                          <p className="text-slate-600">
                            <strong>Explanation: </strong> {ans.explanation}
                          </p>

                          <p className="text-[11px] text-slate-500 italic font-mono bg-white p-2 rounded-lg border border-slate-200/60">
                            "{ans.sourcePassage}"
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Danger Zone / Reset */}
      <div className="p-4 rounded-2xl bg-slate-100 border border-slate-200/80 flex items-center justify-between flex-wrap gap-3 text-xs text-slate-500">
        <div>
          <p className="font-semibold text-slate-700">Storage Reset Option</p>
          <p className="text-[11px] text-slate-400">
            Clear all cached study materials and assessment records to start fresh.
          </p>
        </div>

        <button
          onClick={() => {
            if (confirm('Are you sure you want to clear all materials and quiz logs?')) {
              resetAllData();
            }
          }}
          className="px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 transition-colors"
        >
          Reset All Data
        </button>
      </div>
    </div>
  );
}
