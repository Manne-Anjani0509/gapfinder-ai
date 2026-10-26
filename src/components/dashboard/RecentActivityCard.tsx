'use client';

import React from 'react';
import Link from 'next/link';
import { Clock, Check, FileText, BarChart2, Target } from 'lucide-react';
import { useApp } from '@/context/AppContext';

export function RecentActivityCard() {
  const { submissions, isDemoMode } = useApp();

  // If live submissions exist, we can blend with live activities; default to screenshot activities
  const defaultActivities = [
    {
      id: 'act-1',
      icon: Check,
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-600',
      title: 'Completed Quiz',
      detail: (!isDemoMode && submissions.length > 0) ? submissions[0].quizTitle : 'Current Electricity',
      time: '2 hours ago',
    },
    {
      id: 'act-2',
      icon: FileText,
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600',
      title: 'Studied Material',
      detail: 'Chemical Bonding Notes',
      time: '5 hours ago',
    },
    {
      id: 'act-3',
      icon: BarChart2,
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
      title: 'Identified Gap',
      detail: 'Rotational Motion',
      time: 'Yesterday',
    },
    {
      id: 'act-4',
      icon: Target,
      iconBg: 'bg-indigo-100',
      iconColor: 'text-indigo-600',
      title: 'Started Revision Plan',
      detail: '12 topics • 2 weeks',
      time: 'Yesterday',
    },
    {
      id: 'act-5',
      icon: Check,
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      title: 'Improved Score',
      detail: 'Mathematics (+8%)',
      time: '2 days ago',
    },
  ];

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-[0_8px_30px_rgb(110,130,160,0.06)] border border-slate-100">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-100/80 mb-4">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-700 stroke-[2.2]" />
          <h2 className="text-sm sm:text-base font-bold text-[#1E293B] tracking-tight">
            Recent Activity
          </h2>
        </div>

        <Link
          href="/progress"
          className="inline-flex items-center px-3 py-1 rounded-full bg-slate-50 hover:bg-slate-100 border border-slate-200/70 text-xs font-semibold text-slate-600 transition-colors"
        >
          View All
        </Link>
      </div>

      {/* 5 Horizontal Activity Items */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {defaultActivities.map((act) => {
          const Icon = act.icon;

          return (
            <div
              key={act.id}
              className="flex items-start gap-2.5 p-2 rounded-2xl hover:bg-slate-50 transition-colors"
            >
              <div
                className={`w-7 h-7 rounded-full ${act.iconBg} flex items-center justify-center shrink-0 mt-0.5`}
              >
                <Icon className={`w-3.5 h-3.5 ${act.iconColor} stroke-[2.5]`} />
              </div>

              <div className="min-w-0">
                <h3 className="text-[12px] font-bold text-[#1E293B] leading-tight truncate">
                  {act.title}
                </h3>
                <p className="text-[11px] font-medium text-slate-600 truncate mt-0.5">
                  {act.detail}
                </p>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  {act.time}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
