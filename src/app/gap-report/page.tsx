'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import {
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  BarChart3,
  ArrowRight,
  BookOpen,
  CalendarCheck2,
  Sparkles,
  BotMessageSquare,
  FileText,
  ShieldAlert,
} from 'lucide-react';

export default function GapReportPage() {
  const { gapReport, isDemoMode, toggleDemoMode } = useApp();
  const [filter, setFilter] = useState<string>('all');

  const filteredEvidence = gapReport.evidenceList.filter((item) => {
    if (filter === 'all') return true;
    if (filter === 'weak') return item.classification === 'Weak';
    if (filter === 'medium') return item.classification === 'Medium';
    if (filter === 'strong') return item.classification === 'Strong';
    if (filter === 'unassessed') return item.classification === 'Unassessed';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">Knowledge Gap Report</h2>
            <span
              className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                isDemoMode
                  ? 'bg-amber-100 text-amber-800 border-amber-300'
                  : 'bg-emerald-100 text-emerald-800 border-emerald-300'
              }`}
            >
              {isDemoMode ? 'Demo Evidence Data' : 'Live Verified Quiz Logs'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Objective accuracy breakdown with verifiable diagnostic evidence. Weak: &lt;50%, Medium: 50–79%, Strong: ≥80%.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/revision-plan"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-all"
          >
            <CalendarCheck2 className="w-4 h-4" />
            <span>Generate Revision Plan</span>
          </Link>
        </div>
      </div>

      {/* Summary Scoreboard */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <p className="text-xs font-semibold text-slate-500">Overall Accuracy</p>
          <p className="text-2xl font-black text-slate-900 mt-1">
            {gapReport.assessedCount > 0 ? `${gapReport.overallAccuracy}%` : '—'}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Across all assessed topics</p>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-rose-100 shadow-xs">
          <p className="text-xs font-semibold text-rose-600">Weak Topics (&lt;50%)</p>
          <p className="text-2xl font-black text-rose-600 mt-1">{gapReport.weakCount}</p>
          <p className="text-[11px] text-rose-400 mt-1">Immediate gap focus</p>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-amber-100 shadow-xs">
          <p className="text-xs font-semibold text-amber-700">Medium Topics (50-79%)</p>
          <p className="text-2xl font-black text-amber-600 mt-1">{gapReport.mediumCount}</p>
          <p className="text-[11px] text-amber-500 mt-1">Developing mastery</p>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-emerald-100 shadow-xs">
          <p className="text-xs font-semibold text-emerald-700">Strong Topics (≥80%)</p>
          <p className="text-2xl font-black text-emerald-600 mt-1">{gapReport.strongCount}</p>
          <p className="text-[11px] text-emerald-500 mt-1">High retention verified</p>
        </div>
      </div>

      {/* Classification Filters */}
      <div className="flex items-center gap-2 border-b border-slate-200/80 pb-3 overflow-x-auto text-xs">
        <button
          onClick={() => setFilter('all')}
          className={`px-3.5 py-1.5 rounded-xl font-bold transition-all ${
            filter === 'all'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          All Topics ({gapReport.totalTopics})
        </button>

        <button
          onClick={() => setFilter('weak')}
          className={`px-3.5 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
            filter === 'weak'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'text-rose-700 hover:bg-rose-50'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Weak Gaps ({gapReport.weakCount})</span>
        </button>

        <button
          onClick={() => setFilter('medium')}
          className={`px-3.5 py-1.5 rounded-xl font-bold transition-all ${
            filter === 'medium'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'text-amber-800 hover:bg-amber-50'
          }`}
        >
          Medium ({gapReport.mediumCount})
        </button>

        <button
          onClick={() => setFilter('strong')}
          className={`px-3.5 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
            filter === 'strong'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-emerald-800 hover:bg-emerald-50'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Strong ({gapReport.strongCount})</span>
        </button>

        <button
          onClick={() => setFilter('unassessed')}
          className={`px-3.5 py-1.5 rounded-xl font-bold transition-all ${
            filter === 'unassessed'
              ? 'bg-slate-600 text-white shadow-xs'
              : 'text-slate-500 hover:bg-slate-100'
          }`}
        >
          Unassessed ({gapReport.totalTopics - gapReport.assessedCount})
        </button>
      </div>

      {/* Evidence Breakdown Cards */}
      {filteredEvidence.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center text-slate-400">
          <HelpCircle className="w-10 h-10 mx-auto mb-2 text-slate-300" />
          <p className="text-sm font-semibold text-slate-700">No topics in this category</p>
          <p className="text-xs text-slate-500 mt-1">
            Take more diagnostic quizzes to generate assessment evidence across all syllabus sections.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredEvidence.map((item) => {
            const isWeak = item.classification === 'Weak';
            const isMedium = item.classification === 'Medium';
            const isStrong = item.classification === 'Strong';
            const isUnassessed = item.classification === 'Unassessed';

            let cardBorder = 'border-slate-200/80';
            let badgeStyle = 'bg-slate-100 text-slate-600 border-slate-200';
            let progressGradient = 'from-slate-200 to-slate-300';

            if (isWeak) {
              cardBorder = 'border-rose-200/80 bg-rose-50/15';
              badgeStyle = 'bg-rose-50 text-rose-700 border-rose-300';
              progressGradient = 'from-rose-500 to-rose-600';
            } else if (isMedium) {
              cardBorder = 'border-amber-200/80 bg-amber-50/15';
              badgeStyle = 'bg-amber-50 text-amber-700 border-amber-300';
              progressGradient = 'from-amber-400 to-amber-500';
            } else if (isStrong) {
              cardBorder = 'border-emerald-200/80 bg-emerald-50/15';
              badgeStyle = 'bg-emerald-50 text-emerald-700 border-emerald-300';
              progressGradient = 'from-emerald-500 to-teal-500';
            }

            return (
              <div
                key={item.topicId}
                className={`p-6 bg-white rounded-2xl border shadow-xs transition-all ${cardBorder}`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeStyle}`}
                      >
                        {item.classification.toUpperCase()}
                      </span>
                      <span className="text-xs text-slate-400">
                        From: <strong>{item.materialTitle}</strong>
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 mt-1">
                      {item.topicName}
                    </h3>
                  </div>

                  <div className="text-left sm:text-right shrink-0">
                    <div className="text-lg font-black text-slate-900">
                      {isUnassessed ? 'Not Tested' : `${item.accuracy}%`}
                    </div>
                    <div className="text-xs text-slate-500">
                      {isUnassessed
                        ? '0 questions'
                        : `${item.correctAnswers} of ${item.questionsAttempted} correct`}
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="my-3 h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${progressGradient}`}
                    style={{ width: isUnassessed ? '0%' : `${Math.max(item.accuracy, 5)}%` }}
                  />
                </div>

                {/* Evidence reasoning */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-700 space-y-1 my-3">
                  <p className="font-bold text-slate-800 flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Evidence Behind Classification:</span>
                  </p>
                  <p className="leading-relaxed">{item.evidenceNotes}</p>
                </div>

                {/* Recommended Focus Actions */}
                <div className="mt-3">
                  <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                    Recommended Revision Focus:
                  </p>
                  <ul className="space-y-1 text-xs text-slate-600">
                    {item.recommendedFocus.map((rec, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-indigo-500 font-bold">&bull;</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Grounding Source */}
                {item.sourcePassage && (
                  <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500">
                    <span className="font-semibold text-slate-700">Source Anchor: </span>
                    <span className="italic font-mono text-[11px]">
                      "{item.sourcePassage.slice(0, 180)}..."
                    </span>
                  </div>
                )}

                {/* Card Actions */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <Link
                    href={`/tutor?topic=${encodeURIComponent(item.topicName)}`}
                    className="flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-semibold"
                  >
                    <BotMessageSquare className="w-3.5 h-3.5" />
                    <span>Ask Tutor About This Gap</span>
                  </Link>

                  <Link
                    href={`/quiz?topic=${encodeURIComponent(item.topicName)}`}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition-colors"
                  >
                    Retake Diagnostic Quiz
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
