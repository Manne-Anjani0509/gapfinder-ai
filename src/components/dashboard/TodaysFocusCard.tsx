'use client';

import React from 'react';
import Link from 'next/link';
import { Target } from 'lucide-react';
import { useApp } from '@/context/AppContext';

export function TodaysFocusCard() {
  const { gapReport } = useApp();

  // If live weak topics exist, use them, otherwise default to screenshot items
  const defaultItems = [
    {
      id: 'focus-1',
      rank: 1,
      title: 'Rotational Motion',
      subject: 'Physics',
      category: 'Weak topic',
      priority: 'High Priority',
      isHigh: true,
      rankColor: 'text-rose-500',
    },
    {
      id: 'focus-2',
      rank: 2,
      title: 'Chemical Bonding',
      subject: 'Chemistry',
      category: 'Weak topic',
      priority: 'High Priority',
      isHigh: true,
      rankColor: 'text-rose-500',
    },
    {
      id: 'focus-3',
      rank: 3,
      title: 'Probability',
      subject: 'Mathematics',
      category: 'Weak topic',
      priority: 'Medium Priority',
      isHigh: false,
      rankColor: 'text-amber-500',
    },
  ];

  const liveWeak = gapReport.evidenceList
    ? gapReport.evidenceList.filter((e) => e.classification === 'Weak')
    : [];

  const items = !gapReport.isDemo && liveWeak.length >= 3
    ? liveWeak.slice(0, 3).map((w, idx) => ({
        id: `focus-live-${idx}`,
        rank: idx + 1,
        title: w.topicName,
        subject: w.materialTitle || 'General',
        category: 'Weak topic',
        priority: idx < 2 ? 'High Priority' : 'Medium Priority',
        isHigh: idx < 2,
        rankColor: idx < 2 ? 'text-rose-500' : 'text-amber-500',
      }))
    : defaultItems;

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-[0_8px_30px_rgb(110,130,160,0.06)] border border-slate-100 flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
            <Target className="w-4 h-4 stroke-[2.2]" />
          </div>
          <h2 className="text-sm sm:text-base font-bold text-[#1E293B] tracking-tight">
            Today&apos;s Focus
          </h2>
        </div>

        <Link
          href="/gap-report"
          className="inline-flex items-center px-3 py-1 rounded-full bg-slate-50 hover:bg-slate-100 border border-slate-200/70 text-xs font-semibold text-slate-600 transition-colors"
        >
          View All
        </Link>
      </div>

      {/* 3 Ranked Items */}
      <div className="space-y-3 flex-1 flex flex-col justify-center">
        {items.map((item) => (
          <Link
            key={item.id}
            href={`/quiz`}
            className="flex items-center justify-between p-2 rounded-2xl hover:bg-slate-50 transition-colors group"
          >
            {/* Rank + Titles */}
            <div className="flex items-center gap-3 min-w-0">
              <span
                className={`w-6 text-center text-base font-extrabold ${item.rankColor} shrink-0`}
              >
                {item.rank}
              </span>

              <div className="min-w-0">
                <h3 className="text-[13px] font-bold text-[#1E293B] tracking-tight truncate group-hover:text-[#4F46E5] transition-colors">
                  {item.title}
                </h3>
                <p className="text-[11px] text-[#64748B] flex items-center gap-1.5 truncate">
                  <span>{item.subject}</span>
                  <span className="text-slate-300">•</span>
                  <span className={item.isHigh ? 'text-rose-500 font-medium' : 'text-amber-500 font-medium'}>
                    {item.category}
                  </span>
                </p>
              </div>
            </div>

            {/* Priority Badge */}
            <div className="shrink-0 ml-2">
              <span
                className={`inline-block text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                  item.isHigh
                    ? 'bg-rose-50 text-rose-600 border-rose-100'
                    : 'bg-amber-50 text-amber-700 border-amber-100'
                }`}
              >
                {item.priority}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
