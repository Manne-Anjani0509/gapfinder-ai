'use client';

import React, { useMemo } from 'react';
import { useApp } from '@/context/AppContext';

export function WelcomeBanner() {
  const { studentFirstName } = useApp();

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  return (
    <div className="relative overflow-hidden rounded-3xl bg-transparent flex flex-col md:flex-row md:items-center justify-between gap-4 pt-1 pb-2">
      {/* Left Greeting Text */}
      <div className="z-10">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1E293B] tracking-tight flex items-center gap-2">
          <span>{greeting}, {studentFirstName}</span>
          <span className="text-2xl select-none">👋</span>
        </h1>
        <p className="text-sm font-medium text-[#64748B] mt-1">
          Let&apos;s close your learning gaps and make progress today.
        </p>
      </div>

      {/* Right Mountain Silhouette + Inspirational Quote */}
      <div className="relative flex items-center md:justify-end min-h-[70px] flex-1 max-w-lg">
        {/* Soft mountain graphic in pastel lavender/blue */}
        <div className="absolute right-0 top-0 bottom-0 w-full max-w-md pointer-events-none opacity-80 overflow-hidden">
          <svg
            viewBox="0 0 450 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full object-cover"
            preserveAspectRatio="none"
          >
            {/* Soft Sun Glow */}
            <circle cx="280" cy="30" r="16" fill="#FDE68A" fillOpacity="0.8" />
            <circle cx="280" cy="30" r="28" fill="#FEF3C7" fillOpacity="0.4" />
            {/* Background Mountain Peaks */}
            <path
              d="M50 100L160 30L260 100Z"
              fill="#DDD6FE"
              fillOpacity="0.6"
            />
            <path
              d="M190 100L290 20L390 100Z"
              fill="#C7D2FE"
              fillOpacity="0.5"
            />
            {/* Midground Ridge */}
            <path
              d="M120 100L220 40L330 100Z"
              fill="#A5B4FC"
              fillOpacity="0.45"
            />
            <path
              d="M260 100L350 45L440 100Z"
              fill="#818CF8"
              fillOpacity="0.35"
            />
            {/* Foreground Soft Hills */}
            <path
              d="M180 100C250 80 320 70 450 85L450 100Z"
              fill="#6366F1"
              fillOpacity="0.15"
            />
          </svg>
        </div>

        {/* Quote on the right */}
        <div className="relative z-10 text-right pr-2">
          <p className="text-[13px] font-medium text-[#475569] leading-snug">
            Consistent revision<br />
            today, a stronger you<br />
            tomorrow.
          </p>
          <div className="w-8 h-[2px] bg-[#6366F1]/40 ml-auto mt-1 rounded-full" />
        </div>
      </div>
    </div>
  );
}
