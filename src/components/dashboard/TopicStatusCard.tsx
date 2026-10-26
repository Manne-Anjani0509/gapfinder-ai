'use client';

import React from 'react';
import Link from 'next/link';
import { Info, ChevronRight } from 'lucide-react';
import { useApp } from '@/context/AppContext';

export function TopicStatusCard() {
  const { gapReport } = useApp();

  // Match the screenshot defaults (28, 16, 12) in demo mode or live student counts
  const strongCount = gapReport.isDemo ? 28 : (gapReport.strongCount || 0);
  const mediumCount = gapReport.isDemo ? 16 : (gapReport.mediumCount || 0);
  const weakCount = gapReport.isDemo ? 12 : (gapReport.weakCount || 0);

  const statusRows = [
    {
      title: 'Strong Topics',
      subtitle: 'Well understood',
      count: strongCount,
      bgColor: 'bg-emerald-100',
      dotColor: 'bg-emerald-500',
      href: '/topics?status=strong',
    },
    {
      title: 'Medium Topics',
      subtitle: 'Needs more practice',
      count: mediumCount,
      bgColor: 'bg-amber-100',
      dotColor: 'bg-amber-500',
      href: '/topics?status=medium',
    },
    {
      title: 'Weak Topics',
      subtitle: 'Priority revision',
      count: weakCount,
      bgColor: 'bg-rose-100',
      dotColor: 'bg-rose-500',
      href: '/topics?status=weak',
    },
  ];

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-[0_8px_30px_rgb(110,130,160,0.06)] border border-slate-100 flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center gap-1.5 mb-3">
        <h2 className="text-sm sm:text-base font-bold text-[#1E293B] tracking-tight">
          Topic Status
        </h2>
        <button className="text-slate-400 hover:text-slate-600" title="Distribution of syllabus topic mastery">
          <Info className="w-4 h-4" />
        </button>
      </div>

      {/* 3 Status Rows */}
      <div className="space-y-3 flex-1 flex flex-col justify-center">
        {statusRows.map((row) => (
          <Link
            key={row.title}
            href={row.href}
            className="flex items-center justify-between p-2.5 rounded-2xl hover:bg-slate-50 transition-colors group"
          >
            {/* Left: Indicator Dot + Title/Subtitle */}
            <div className="flex items-center gap-3.5">
              <div
                className={`w-7 h-7 rounded-full ${row.bgColor} flex items-center justify-center shrink-0`}
              >
                <div className={`w-2.5 h-2.5 rounded-full ${row.dotColor}`} />
              </div>

              <div>
                <h3 className="text-[13px] font-bold text-[#1E293B] tracking-tight group-hover:text-[#4F46E5] transition-colors">
                  {row.title}
                </h3>
                <p className="text-[11px] text-[#64748B] font-medium">
                  {row.subtitle}
                </p>
              </div>
            </div>

            {/* Right: Count + Chevron */}
            <div className="flex items-center gap-2">
              <span className="text-lg font-extrabold text-[#1E293B]">
                {row.count}
              </span>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
