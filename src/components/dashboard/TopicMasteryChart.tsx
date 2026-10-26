'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { ArrowRight, HelpCircle } from 'lucide-react';

export function TopicMasteryChart() {
  const { gapReport } = useApp();

  // Prioritize assessed topics first, sorting weakest first so urgent gaps are visible near the top
  const sortedTopics = useMemo(() => {
    return [...gapReport.evidenceList]
      .sort((a, b) => {
        if (a.classification === 'Unassessed' && b.classification !== 'Unassessed') return 1;
        if (b.classification === 'Unassessed' && a.classification !== 'Unassessed') return -1;
        return a.accuracy - b.accuracy;
      })
      .slice(0, 5);
  }, [gapReport.evidenceList]);

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 sm:p-6 shadow-xs flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between pb-4 border-b border-[#E2E8F0]">
          <div>
            <h2 className="text-sm font-bold text-[#172033] tracking-tight">
              Topic Mastery
            </h2>
            <p className="text-xs text-[#64748B] mt-0.5">
              Accuracy across assessed syllabus topics
            </p>
          </div>

          <Link
            href="/gap-report"
            className="text-xs font-semibold text-[#4F46E5] hover:text-indigo-800 inline-flex items-center gap-1"
          >
            <span>Detailed Evidence</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {gapReport.evidenceList.length === 0 ? (
          <div className="py-10 text-center text-slate-400">
            <HelpCircle className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <p className="text-sm font-medium text-slate-700">No topics available yet</p>
            <p className="text-xs mt-1 text-[#64748B]">
              Upload study materials to extract syllabus topics and begin diagnostic evaluation.
            </p>
            <Link
              href="/materials"
              className="inline-block mt-3 px-3.5 py-1.5 bg-[#4F46E5] text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition-colors"
            >
              Upload Material
            </Link>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {sortedTopics.map((item) => {
              const isUnassessed = item.classification === 'Unassessed';
              const isWeak = item.classification === 'Weak';
              const isMedium = item.classification === 'Medium';
              const isStrong = item.classification === 'Strong';

              let badgeClass = 'bg-slate-100 text-slate-700 border-slate-200';
              let barColor = 'bg-slate-300';

              if (isWeak) {
                badgeClass = 'bg-red-50 text-red-700 border-red-200';
                barColor = 'bg-red-500';
              } else if (isMedium) {
                badgeClass = 'bg-amber-50 text-amber-700 border-amber-200';
                barColor = 'bg-amber-500';
              } else if (isStrong) {
                badgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                barColor = 'bg-emerald-600';
              }

              return (
                <div key={item.topicId} className="space-y-1.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-semibold text-[#172033] leading-snug break-words">
                        {item.topicName}
                      </span>
                      <p className="text-[11px] text-[#64748B] mt-0.5 truncate" title={item.materialTitle}>
                        {item.materialTitle}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 pt-0.5">
                      <span className="text-xs font-bold text-[#172033]">
                        {isUnassessed ? '—' : `${item.accuracy}%`}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${badgeClass}`}
                      >
                        {item.classification}
                      </span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ease-out ${barColor}`}
                      style={{
                        width: isUnassessed ? '0%' : `${Math.max(item.accuracy, 4)}%`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Legend & Summary */}
      <div className="mt-5 pt-3.5 border-t border-[#E2E8F0] flex items-center justify-between flex-wrap gap-2 text-[11px] text-[#64748B]">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <span>Weak (&lt;50%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span>Medium (50–79%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-600" />
            <span>Strong (≥80%)</span>
          </div>
        </div>

        <span className="text-[10px] text-slate-400">
          Source-verified logs
        </span>
      </div>
    </div>
  );
}
