'use client';

import React from 'react';
import Link from 'next/link';
import { Zap, BookOpen, FileCheck, BarChart3, ChevronRight } from 'lucide-react';

export function SuggestedStepsCard() {
  const steps = [
    {
      title: 'Revise Weak Topics',
      subtitle: 'Start with your top priority gaps',
      href: '/revision-plan',
      icon: BookOpen,
      iconColor: 'text-[#4F46E5]',
      iconBg: 'bg-indigo-50',
    },
    {
      title: 'Attempt Targeted Quiz',
      subtitle: 'Practice questions for weak areas',
      href: '/quiz',
      icon: FileCheck,
      iconColor: 'text-[#3B82F6]',
      iconBg: 'bg-blue-50',
    },
    {
      title: 'Explore Topic Map',
      subtitle: 'Visualize connections and gaps',
      href: '/topics',
      icon: BarChart3,
      iconColor: 'text-[#6366F1]',
      iconBg: 'bg-purple-50',
    },
  ];

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-[0_8px_30px_rgb(110,130,160,0.06)] border border-slate-100 flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
            <Zap className="w-4 h-4 stroke-[2.2] fill-indigo-500" />
          </div>
          <h2 className="text-sm sm:text-base font-bold text-[#1E293B] tracking-tight">
            Suggested Next Steps
          </h2>
        </div>

        <Link
          href="/revision-plan"
          className="inline-flex items-center px-3 py-1 rounded-full bg-slate-50 hover:bg-slate-100 border border-slate-200/70 text-xs font-semibold text-slate-600 transition-colors"
        >
          View Plan
        </Link>
      </div>

      {/* 3 Step Cards */}
      <div className="space-y-2.5 flex-1 flex flex-col justify-center">
        {steps.map((step) => {
          const Icon = step.icon;

          return (
            <Link
              key={step.title}
              href={step.href}
              className="flex items-center justify-between p-3 rounded-2xl border border-slate-100 hover:border-indigo-100 hover:bg-slate-50/80 transition-all group"
            >
              <div className="flex items-center gap-3.5">
                <div
                  className={`w-9 h-9 rounded-xl ${step.iconBg} flex items-center justify-center shrink-0`}
                >
                  <Icon className={`w-4 h-4 ${step.iconColor}`} />
                </div>

                <div>
                  <h3 className="text-[13px] font-bold text-[#1E293B] tracking-tight group-hover:text-[#4F46E5] transition-colors">
                    {step.title}
                  </h3>
                  <p className="text-[11px] text-[#64748B] font-medium">
                    {step.subtitle}
                  </p>
                </div>
              </div>

              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
