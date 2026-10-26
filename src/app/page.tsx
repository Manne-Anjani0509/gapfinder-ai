'use client';

import React from 'react';
import { WelcomeBanner } from '@/components/dashboard/WelcomeBanner';
import { OverallUnderstandingCard } from '@/components/dashboard/OverallUnderstandingCard';
import { TopicPerformanceCard } from '@/components/dashboard/TopicPerformanceCard';
import { TopicStatusCard } from '@/components/dashboard/TopicStatusCard';
import { TodaysFocusCard } from '@/components/dashboard/TodaysFocusCard';
import { SuggestedStepsCard } from '@/components/dashboard/SuggestedStepsCard';
import { ExplainTopicCard } from '@/components/dashboard/ExplainTopicCard';
import { RecentActivityCard } from '@/components/dashboard/RecentActivityCard';

export default function DashboardPage() {
  return (
    <div className="space-y-5">
      {/* 1. Welcome Greeting & Mountain Illustration Banner */}
      <WelcomeBanner />

      {/* 2. Top Metric Row: Overall Understanding | Topic-wise Performance | Topic Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5 items-stretch">
        <OverallUnderstandingCard />
        <TopicPerformanceCard />
        <TopicStatusCard />
      </div>

      {/* 3. Functional Action Row: Today's Focus | Suggested Next Steps | Explain This Topic */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5 items-stretch">
        <TodaysFocusCard />
        <SuggestedStepsCard />
        <ExplainTopicCard />
      </div>

      {/* 4. Bottom Activity Row: Recent Activity */}
      <RecentActivityCard />
    </div>
  );
}
