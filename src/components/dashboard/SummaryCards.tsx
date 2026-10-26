'use client';

import React from 'react';
import Link from 'next/link';
import { Target, AlertCircle, CheckCircle2, Award, ArrowUpRight } from 'lucide-react';
import { useApp } from '@/context/AppContext';

export function SummaryCards() {
  const { gapReport, submissions } = useApp();
  const latestSubmission = submissions.length > 0 ? submissions[0] : null;

  const coveragePct =
    gapReport.totalTopics > 0
      ? Math.round((gapReport.assessedCount / gapReport.totalTopics) * 100)
      : 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Topics Assessed */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
              Topics Assessed
            </span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
              <Target className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-bold text-[#172033] tracking-tight">
              {gapReport.assessedCount}
            </span>
            <span className="text-xs text-[#64748B] font-medium">
              / {gapReport.totalTopics} total
            </span>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
          <span className="text-[#64748B]">
            {gapReport.totalTopics > 0 ? `${coveragePct}% coverage` : 'No topics yet'}
          </span>
          <Link
            href="/topics"
            className="text-xs font-semibold text-[#4F46E5] hover:text-indigo-800 inline-flex items-center gap-0.5"
          >
            <span>View Map</span>
            <ArrowUpRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* 2. Topics Needing Attention */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-red-600 uppercase tracking-wider">
              Topics Needing Attention
            </span>
            <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-red-600 tracking-tight">
              {gapReport.weakCount}
            </span>
            <span className="text-xs text-red-600/80 font-medium">
              Weak (&lt;50%)
            </span>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs gap-2">
          <span className="text-[#64748B] truncate min-w-0">
            {gapReport.weakCount > 0 ? 'Critical gaps found' : 'No critical gaps'}
          </span>
          <Link
            href="/gap-report"
            className="text-xs font-semibold text-red-600 hover:text-red-800 inline-flex items-center gap-0.5 whitespace-nowrap shrink-0"
          >
            <span>Review Gaps</span>
            <ArrowUpRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* 3. Strong Topics */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">
              Strong Topics
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-emerald-700 tracking-tight">
              {gapReport.strongCount}
            </span>
            <span className="text-xs text-emerald-700/80 font-medium">
              Mastered (≥80%)
            </span>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
          <span className="text-[#64748B]">
            High retention
          </span>
          <Link
            href="/gap-report"
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 inline-flex items-center gap-0.5"
          >
            <span>Details</span>
            <ArrowUpRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* 4. Latest Quiz Accuracy */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
              Latest Quiz Accuracy
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-[#4F46E5] flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-[#172033] tracking-tight">
              {latestSubmission ? `${latestSubmission.percentage}%` : '—'}
            </span>
            {latestSubmission && (
              <span className="text-xs text-[#64748B] font-medium">
                ({latestSubmission.score}/{latestSubmission.totalQuestions} correct)
              </span>
            )}
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs gap-2">
          <span className="text-[#64748B] truncate min-w-0" title={latestSubmission?.quizTitle || 'No attempts'}>
            {latestSubmission ? latestSubmission.quizTitle : 'No quiz yet'}
          </span>
          <Link
            href="/quiz"
            className="text-xs font-semibold text-[#4F46E5] hover:text-indigo-800 inline-flex items-center gap-0.5 whitespace-nowrap shrink-0"
          >
            <span>Take Quiz</span>
            <ArrowUpRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
