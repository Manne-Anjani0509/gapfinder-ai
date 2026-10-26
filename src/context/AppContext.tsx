'use client';

import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import {
  StudyMaterial,
  QuizSubmission,
  RevisionPlan,
  GapReportData,
  SystemStatus,
} from '@/types';
import {
  getStoredUseDemo,
  setStoredUseDemo,
  getStoredMaterials,
  saveStoredMaterials,
  getStoredSubmissions,
  saveStoredSubmissions,
  getStoredPlan,
  saveStoredPlan,
  computeGapReport,
} from '@/lib/storage';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export interface StudentUser {
  id: string;
  email: string;
  fullName: string;
}

interface AppContextType {
  user: StudentUser | null;
  studentName: string;
  studentFirstName: string;
  studentEmail: string;
  accessToken: string | null;
  authFetch: (url: string, options?: RequestInit) => Promise<Response>;
  loadLiveMaterials: () => Promise<void>;
  materials: StudyMaterial[];
  submissions: QuizSubmission[];
  revisionPlan: RevisionPlan | null;
  gapReport: GapReportData;
  isDemoMode: boolean;
  systemStatus: SystemStatus;
  isLoading: boolean;
  toggleDemoMode: () => void;
  addMaterial: (material: StudyMaterial) => void;
  deleteMaterial: (id: string) => void;
  addSubmission: (submission: QuizSubmission) => void;
  setRevisionPlan: (plan: RevisionPlan | null) => void;
  toggleTaskComplete: (taskId: string) => void;
  resetAllData: () => void;
  signOut: () => Promise<void>;
  setUser: (user: StudentUser | null) => void;
  continueAsDemoGuest: () => void;
}

const defaultStatus: SystemStatus = {
  geminiConfigured: false,
  supabaseConfigured: false,
  activeModel: 'Local Semantic AI Engine',
  storageMode: 'Local Browser Storage',
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<StudentUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);
  const [materials, setMaterials] = useState<StudyMaterial[]>([]);
  const [submissions, setSubmissions] = useState<QuizSubmission[]>([]);
  const [revisionPlan, setRevisionPlanState] = useState<RevisionPlan | null>(null);
  const [systemStatus, setSystemStatus] = useState<SystemStatus>(defaultStatus);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const handleSetUser = (newUser: StudentUser | null) => {
    setUser(newUser);
    if (typeof window !== 'undefined') {
      if (newUser) {
        localStorage.setItem('gapfinder_auth_user_v1', JSON.stringify(newUser));
      } else {
        localStorage.removeItem('gapfinder_auth_user_v1');
      }
    }
  };

  // Initialize from storage & Supabase auth on mount
  useEffect(() => {
    let savedLocalUser: StudentUser | null = null;
    const demo = getStoredUseDemo();
    setIsDemoMode(demo);

    if (typeof window !== 'undefined') {
      const rawUser = localStorage.getItem('gapfinder_auth_user_v1');
      if (rawUser) {
        try {
          savedLocalUser = JSON.parse(rawUser);
          setUser(savedLocalUser);
        } catch {
          // ignore corrupted local user
        }
      }
    }

    const loadedMaterials = getStoredMaterials(demo);
    const loadedSubmissions = getStoredSubmissions(demo);
    const loadedPlan = getStoredPlan(demo);

    setMaterials(loadedMaterials);
    setSubmissions(loadedSubmissions);
    setRevisionPlanState(loadedPlan);

    // If local saved user exists (e.g. demo guest), unblock loading immediately
    if (savedLocalUser) {
      setIsLoading(false);
    }

    const isDemoSession =
      demo ||
      Boolean(
        savedLocalUser &&
          (savedLocalUser.id.startsWith('demo') ||
            savedLocalUser.id.startsWith('local-') ||
            savedLocalUser.email.includes('demo'))
      );

    if (supabase && isSupabaseConfigured()) {
      let resolved = false;
      const timer = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          setIsLoading(false);
        }
      }, 3000);

      supabase.auth.getSession().then(async ({ data: { session } }) => {
        if (resolved) return;
        resolved = true;
        clearTimeout(timer);

        if (session?.user) {
          let fullName = session.user.user_metadata?.full_name || session.user.user_metadata?.name || '';
          if (!fullName && supabase) {
            try {
              const { data: prof } = await supabase.from('profiles').select('full_name').eq('id', session.user.id).single();
              if (prof?.full_name) fullName = prof.full_name;
            } catch {
              // profiles table lookup optional
            }
          }

          const profileUser: StudentUser = {
            id: session.user.id,
            email: session.user.email || '',
            fullName: fullName || session.user.email?.split('@')[0] || 'Student',
          };
          handleSetUser(profileUser);
          setAccessToken(session.access_token);
          setIsDemoMode(false);
          setStoredUseDemo(false);

          if (typeof document !== 'undefined') {
            document.cookie = `sb-access-token=${session.access_token}; path=/; max-age=604800; SameSite=Lax`;
          }

          // Fetch user's real study materials from Supabase
          fetch('/api/materials', {
            headers: { Authorization: `Bearer ${session.access_token}` },
          })
            .then((r) => r.json())
            .then((data) => {
              if (data.materials && Array.isArray(data.materials)) {
                setMaterials(data.materials);
                saveStoredMaterials(data.materials);
              }
            })
            .catch((err) => console.warn('Could not load live materials:', err));
        } else if (!isDemoSession) {
          handleSetUser(null);
          setAccessToken(null);
        }
        setIsLoading(false);
      }).catch((err) => {
        if (resolved) return;
        resolved = true;
        clearTimeout(timer);
        console.warn('Session retrieval error:', err);
        setIsLoading(false);
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
        if (session?.user) {
          let fullName = session.user.user_metadata?.full_name || session.user.user_metadata?.name || '';
          if (!fullName && supabase) {
            try {
              const { data: prof } = await supabase.from('profiles').select('full_name').eq('id', session.user.id).single();
              if (prof?.full_name) fullName = prof.full_name;
            } catch {
              // ignore
            }
          }

          const profileUser: StudentUser = {
            id: session.user.id,
            email: session.user.email || '',
            fullName: fullName || session.user.email?.split('@')[0] || 'Student',
          };
          handleSetUser(profileUser);
          setAccessToken(session.access_token);
          setIsDemoMode(false);
          setStoredUseDemo(false);

          if (typeof document !== 'undefined') {
            document.cookie = `sb-access-token=${session.access_token}; path=/; max-age=604800; SameSite=Lax`;
          }
        } else if (_event === 'SIGNED_OUT') {
          handleSetUser(null);
          setAccessToken(null);
          if (typeof document !== 'undefined') {
            document.cookie = 'sb-access-token=; path=/; max-age=0; SameSite=Lax';
          }
        }
      });

      // Fetch server status
      fetch('/api/status')
        .then((res) => res.json())
        .then((data) => {
          setSystemStatus({
            geminiConfigured: data.geminiConfigured,
            supabaseConfigured: data.supabaseConfigured,
            activeModel: data.activeModel,
            storageMode: data.storageMode,
          });
        })
        .catch((err) => console.warn('Could not fetch system status:', err));

      return () => {
        subscription.unsubscribe();
      };
    } else {
      setIsLoading(false);

      fetch('/api/status')
        .then((res) => res.json())
        .then((data) => {
          setSystemStatus({
            geminiConfigured: data.geminiConfigured,
            supabaseConfigured: data.supabaseConfigured,
            activeModel: data.activeModel,
            storageMode: data.storageMode,
          });
        })
        .catch((err) => console.warn('Could not fetch system status:', err));
    }
  }, []);

  const studentName = useMemo(() => {
    if (user?.fullName && user.fullName.trim()) {
      return user.fullName.trim();
    }
    return isDemoMode ? 'Anjani' : 'Student';
  }, [user, isDemoMode]);

  const studentFirstName = useMemo(() => {
    if (user?.fullName && user.fullName.trim()) {
      return user.fullName.trim().split(' ')[0];
    }
    return isDemoMode ? 'Anjani' : 'Student';
  }, [user, isDemoMode]);

  const studentEmail = useMemo(() => {
    if (user?.email && user.email.trim()) {
      return user.email.trim();
    }
    return isDemoMode ? 'demo@gapfinder.ai' : 'student@gapfinder.ai';
  }, [user, isDemoMode]);

  const authFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
    const headers = new Headers(options.headers || {});
    if (isDemoMode) {
      headers.set('x-demo-mode', 'true');
    } else if (supabase && isSupabaseConfigured()) {
      let token = accessToken;
      if (!token) {
        const { data: { session } } = await supabase.auth.getSession();
        token = session?.access_token || null;
        if (token) setAccessToken(token);
      }
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
    }
    return fetch(url, { ...options, headers });
  };

  const loadLiveMaterials = async () => {
    if (isDemoMode) {
      setMaterials(getStoredMaterials(true));
      return;
    }
    try {
      const res = await authFetch('/api/materials');
      const data = await res.json();
      if (data.materials && Array.isArray(data.materials)) {
        setMaterials(data.materials);
        saveStoredMaterials(data.materials);
      }
    } catch (err) {
      console.warn('Failed to refresh materials:', err);
    }
  };

  const continueAsDemoGuest = () => {
    const demoGuest: StudentUser = {
      id: 'demo-guest-001',
      email: 'demo@gapfinder.ai',
      fullName: 'Anjani',
    };
    handleSetUser(demoGuest);
    setIsDemoMode(true);
    setStoredUseDemo(true);
    setIsLoading(false);
    const nextMaterials = getStoredMaterials(true);
    const nextSubmissions = getStoredSubmissions(true);
    const nextPlan = getStoredPlan(true);
    setMaterials(nextMaterials);
    setSubmissions(nextSubmissions);
    setRevisionPlanState(nextPlan);
  };

  const toggleDemoMode = () => {
    const newDemo = !isDemoMode;
    setIsDemoMode(newDemo);
    setStoredUseDemo(newDemo);
    const nextMaterials = getStoredMaterials(newDemo);
    const nextSubmissions = getStoredSubmissions(newDemo);
    const nextPlan = getStoredPlan(newDemo);

    setMaterials(nextMaterials);
    setSubmissions(nextSubmissions);
    setRevisionPlanState(nextPlan);
  };

  const addMaterial = (newMaterial: StudyMaterial) => {
    if (isDemoMode) {
      setIsDemoMode(false);
      setStoredUseDemo(false);
      const updated = [newMaterial];
      setMaterials(updated);
      saveStoredMaterials(updated);
      setSubmissions([]);
      saveStoredSubmissions([]);
      setRevisionPlanState(null);
      saveStoredPlan(null);
      return;
    }

    const updated = [newMaterial, ...materials.filter((m) => m.id !== newMaterial.id)];
    setMaterials(updated);
    saveStoredMaterials(updated);
  };

  const deleteMaterial = (id: string) => {
    const updated = materials.filter((m) => m.id !== id);
    setMaterials(updated);
    if (!isDemoMode) {
      saveStoredMaterials(updated);
    }
    authFetch(`/api/materials?id=${encodeURIComponent(id)}`, { method: 'DELETE' }).catch((e) =>
      console.warn('Backend material delete sync warning:', e)
    );
  };

  const addSubmission = (sub: QuizSubmission) => {
    if (isDemoMode) {
      setIsDemoMode(false);
      setStoredUseDemo(false);
      const updatedSubs = [sub];
      setSubmissions(updatedSubs);
      saveStoredSubmissions(updatedSubs);
      return;
    }

    const updated = [sub, ...submissions];
    setSubmissions(updated);
    saveStoredSubmissions(updated);
  };

  const setRevisionPlan = (plan: RevisionPlan | null) => {
    setRevisionPlanState(plan);
    if (!isDemoMode) {
      saveStoredPlan(plan);
    }
  };

  const toggleTaskComplete = (taskId: string) => {
    if (!revisionPlan) return;
    const updatedTasks = revisionPlan.tasks.map((t) =>
      t.id === taskId ? { ...t, completed: !t.completed } : t
    );
    const updatedPlan: RevisionPlan = {
      ...revisionPlan,
      tasks: updatedTasks,
    };
    setRevisionPlanState(updatedPlan);
    if (!isDemoMode) {
      saveStoredPlan(updatedPlan);
    }
    authFetch('/api/revision/tasks', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        taskId,
        completed: updatedTasks.find((t) => t.id === taskId)?.completed || false,
      }),
    }).catch((e) => console.warn('Backend task update warning:', e));
  };

  const resetAllData = () => {
    setIsDemoMode(false);
    setStoredUseDemo(false);
    setMaterials([]);
    saveStoredMaterials([]);
    setSubmissions([]);
    saveStoredSubmissions([]);
    setRevisionPlanState(null);
    saveStoredPlan(null);
  };

  const signOut = async () => {
    if (supabase && isSupabaseConfigured()) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.warn('Supabase sign out error:', err);
      }
    }
    handleSetUser(null);
    setAccessToken(null);
    setIsDemoMode(false);
    setStoredUseDemo(false);
    setMaterials([]);
    setSubmissions([]);
    setRevisionPlanState(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('gapfinder_auth_user_v1');
      localStorage.removeItem('gapfinder_use_demo_v1');
      document.cookie = 'sb-access-token=; path=/; max-age=0; SameSite=Lax';
    }
  };

  // Compute Gap Report dynamically
  const gapReport = useMemo<GapReportData>(() => {
    return computeGapReport(materials, submissions, isDemoMode);
  }, [materials, submissions, isDemoMode]);

  return (
    <AppContext.Provider
      value={{
        user,
        studentName,
        studentFirstName,
        studentEmail,
        accessToken,
        authFetch,
        loadLiveMaterials,
        materials,
        submissions,
        revisionPlan,
        gapReport,
        isDemoMode,
        systemStatus,
        isLoading,
        toggleDemoMode,
        addMaterial,
        deleteMaterial,
        addSubmission,
        setRevisionPlan,
        toggleTaskComplete,
        resetAllData,
        signOut,
        setUser: handleSetUser,
        continueAsDemoGuest,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
