'use client';

import React from 'react';
import { Info, ChevronDown, ArrowUp } from 'lucide-react';
import { useApp } from '@/context/AppContext';

export function OverallUnderstandingCard() {
  const { gapReport } = useApp();
  // Default to 72% from the screenshot in demo mode, or live calculated score
  const score = gapReport.isDemo ? 72 : (gapReport.overallAccuracy || 72);

  // Calculate SVG stroke parameters for 120px circle, radius 48, strokeWidth 11
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-[0_8px_30px_rgb(110,130,160,0.06)] border border-slate-100 flex flex-col justify-between">
      {/* Card Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1.5">
          <h2 className="text-sm sm:text-base font-bold text-[#1E293B] tracking-tight">
            Overall Understanding
          </h2>
          <button className="text-slate-400 hover:text-slate-600" title="Overall diagnostic mastery score">
            <Info className="w-4 h-4" />
          </button>
        </div>

        <button className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-50 hover:bg-slate-100 border border-slate-200/70 text-xs font-medium text-slate-600 transition-colors">
          <span>All Subjects</span>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
        </button>
      </div>

      {/* Content: Gauge + Text */}
      <div className="flex items-center gap-5 sm:gap-6 flex-1 py-1">
        {/* Radial Progress Ring */}
        <div className="relative w-28 h-28 shrink-0 flex items-center justify-center">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
            {/* Background Track */}
            <circle
              cx="60"
              cy="60"
              r={radius}
              stroke="#F1F5F9"
              strokeWidth="11"
              fill="transparent"
            />
            {/* Gradient definition */}
            <defs>
              <linearGradient id="masteryGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#3B82F6" />
                <stop offset="100%" stopColor="#6366F1" />
              </linearGradient>
            </defs>
            {/* Progress Stroke */}
            <circle
              cx="60"
              cy="60"
              r={radius}
              stroke="url(#masteryGradient)"
              strokeWidth="11"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
              className="transition-all duration-700 ease-out"
            />
          </svg>

          {/* Centered Percentage */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-2xl font-black text-[#1E293B] tracking-tight leading-none">
              {score}%
            </span>
            <span className="text-[10px] font-semibold text-slate-400 mt-0.5">
              Mastery Score
            </span>
          </div>
        </div>

        {/* Right Descriptive Status */}
        <div className="space-y-2 flex-1">
          <div>
            <h3 className="text-sm font-bold text-[#1E293B] tracking-tight">
              You&apos;re on track!
            </h3>
            <p className="text-xs text-[#64748B] leading-relaxed mt-0.5">
              You understand {score}% of your topics. Focus on the remaining gaps to boost your score.
            </p>
          </div>

          <div className="pt-0.5">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-[11px] font-bold text-emerald-600">
              <ArrowUp className="w-3 h-3 stroke-[2.5]" />
              <span>+6%</span>
              <span className="font-medium text-emerald-600/80">vs last week</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
