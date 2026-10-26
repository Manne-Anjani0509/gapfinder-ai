-- ==============================================================================
-- GapFinder AI: Production Supabase PostgreSQL Schema & Migrations
-- Complete schema with pgvector semantic search, full Row Level Security (RLS),
-- foreign key cascades, and automated timestamps.
-- ==============================================================================

-- 1. Enable required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Profiles Table: Stores authenticated student profiles linked to Supabase Auth
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Subjects / Courses Table
CREATE TABLE IF NOT EXISTS public.subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_user_subject_name UNIQUE (user_id, name)
);

-- 4. Materials Table: Uploaded documents (PDF, TXT, Pasted notes)
CREATE TABLE IF NOT EXISTS public.materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL CHECK (file_type IN ('pdf', 'txt', 'pasted')),
    file_size INTEGER,
    word_count INTEGER NOT NULL DEFAULT 0,
    storage_path TEXT,
    raw_content TEXT,
    status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'ready', 'error')),
    error_message TEXT,
    is_demo BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Syllabus Topics Table
CREATE TABLE IF NOT EXISTS public.topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    material_id UUID REFERENCES public.materials(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
    parent_topic_id UUID REFERENCES public.topics(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT,
    subtopics JSONB NOT NULL DEFAULT '[]'::jsonb,
    key_concepts JSONB NOT NULL DEFAULT '[]'::jsonb,
    source_passage TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Document Chunks Table: 220-word windows with 40-word overlap + 768-dim embeddings
CREATE TABLE IF NOT EXISTS public.document_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    material_id UUID NOT NULL REFERENCES public.materials(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    token_count INTEGER,
    section_heading TEXT,
    page_number INTEGER,
    source_offset_start INTEGER,
    source_offset_end INTEGER,
    topic_tags JSONB NOT NULL DEFAULT '[]'::jsonb,
    embedding vector(768),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Diagnostic Quiz Attempts Table
CREATE TABLE IF NOT EXISTS public.quiz_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
    material_id UUID REFERENCES public.materials(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    total_questions INTEGER NOT NULL,
    score INTEGER NOT NULL DEFAULT 0,
    percentage NUMERIC(5, 2) NOT NULL DEFAULT 0,
    topic_breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('in_progress', 'completed', 'abandoned')),
    is_demo BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Quiz Questions Table: Verifiable MCQs grounded in source chunks
CREATE TABLE IF NOT EXISTS public.quiz_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id UUID REFERENCES public.quiz_attempts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    topic_id UUID REFERENCES public.topics(id) ON DELETE SET NULL,
    topic_name TEXT NOT NULL,
    chunk_id UUID REFERENCES public.document_chunks(id) ON DELETE SET NULL,
    question TEXT NOT NULL,
    options JSONB NOT NULL,
    correct_index INTEGER NOT NULL CHECK (correct_index >= 0 AND correct_index <= 3),
    explanation TEXT NOT NULL,
    source_passage TEXT NOT NULL,
    difficulty TEXT NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Student Answers Table: Graded responses per attempt
CREATE TABLE IF NOT EXISTS public.student_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id UUID NOT NULL REFERENCES public.quiz_attempts(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES public.quiz_questions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    selected_index INTEGER NOT NULL CHECK (selected_index >= 0 AND selected_index <= 3),
    is_correct BOOLEAN NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_attempt_question_answer UNIQUE (attempt_id, question_id)
);

-- 10. Topic Mastery Analytics Table: Deterministic diagnostic statistics per student
CREATE TABLE IF NOT EXISTS public.topic_mastery (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    topic_name TEXT NOT NULL,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
    questions_attempted INTEGER NOT NULL DEFAULT 0,
    correct_answers INTEGER NOT NULL DEFAULT 0,
    accuracy NUMERIC(5, 2) NOT NULL DEFAULT 0,
    classification TEXT NOT NULL DEFAULT 'Unassessed' CHECK (classification IN ('Unassessed', 'Weak', 'Medium', 'Strong')),
    confidence TEXT NOT NULL DEFAULT 'low' CHECK (confidence IN ('low', 'medium', 'high')),
    attempt_count INTEGER NOT NULL DEFAULT 0,
    last_assessed_at TIMESTAMPTZ,
    evidence_notes TEXT,
    incorrect_concepts JSONB NOT NULL DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_user_topic_mastery UNIQUE (user_id, topic_name)
);

-- 11. Revision Plans Table
CREATE TABLE IF NOT EXISTS public.revision_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
    available_minutes INTEGER NOT NULL CHECK (available_minutes IN (15, 30, 45, 60, 90, 120, 180)),
    is_demo BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. Revision Tasks Table
CREATE TABLE IF NOT EXISTS public.revision_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL REFERENCES public.revision_plans(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    topic_name TEXT NOT NULL,
    title TEXT NOT NULL,
    priority TEXT NOT NULL CHECK (priority IN ('high', 'medium', 'low')),
    estimated_minutes INTEGER NOT NULL,
    action_items JSONB NOT NULL DEFAULT '[]'::jsonb,
    target_concept TEXT,
    source_passage TEXT,
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- INDEXES FOR HIGH-PERFORMANCE QUERYING & VECTOR SEARCH
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_materials_user_id ON public.materials(user_id);
CREATE INDEX IF NOT EXISTS idx_topics_user_material ON public.topics(user_id, material_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_user_material ON public.document_chunks(user_id, material_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user ON public.quiz_attempts(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_attempt ON public.quiz_questions(attempt_id);
CREATE INDEX IF NOT EXISTS idx_student_answers_attempt ON public.student_answers(attempt_id);
CREATE INDEX IF NOT EXISTS idx_topic_mastery_user ON public.topic_mastery(user_id, classification);
CREATE INDEX IF NOT EXISTS idx_revision_tasks_plan ON public.revision_tasks(plan_id, completed);

-- pgvector Index: HNSW index on embeddings for fast cosine similarity search
CREATE INDEX IF NOT EXISTS idx_chunks_embedding_hnsw 
ON public.document_chunks USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Strict Isolation: Authenticated students can access ONLY their own records.
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topic_mastery ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revision_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revision_tasks ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Subjects Policies
CREATE POLICY "Users can CRUD own subjects" ON public.subjects FOR ALL USING (auth.uid() = user_id);

-- Materials Policies
CREATE POLICY "Users can CRUD own materials" ON public.materials FOR ALL USING (auth.uid() = user_id);

-- Topics Policies
CREATE POLICY "Users can CRUD own topics" ON public.topics FOR ALL USING (auth.uid() = user_id);

-- Document Chunks Policies
CREATE POLICY "Users can CRUD own document chunks" ON public.document_chunks FOR ALL USING (auth.uid() = user_id);

-- Quiz Attempts Policies
CREATE POLICY "Users can CRUD own quiz attempts" ON public.quiz_attempts FOR ALL USING (auth.uid() = user_id);

-- Quiz Questions Policies
CREATE POLICY "Users can CRUD own quiz questions" ON public.quiz_questions FOR ALL USING (auth.uid() = user_id);

-- Student Answers Policies
CREATE POLICY "Users can CRUD own answers" ON public.student_answers FOR ALL USING (auth.uid() = user_id);

-- Topic Mastery Policies
CREATE POLICY "Users can CRUD own topic mastery" ON public.topic_mastery FOR ALL USING (auth.uid() = user_id);

-- Revision Plans Policies
CREATE POLICY "Users can CRUD own revision plans" ON public.revision_plans FOR ALL USING (auth.uid() = user_id);

-- Revision Tasks Policies
CREATE POLICY "Users can CRUD own revision tasks" ON public.revision_tasks FOR ALL USING (auth.uid() = user_id);

-- ==============================================================================
-- DATABASE FUNCTIONS & STORED PROCEDURES
-- ==============================================================================

-- 1. match_document_chunks: Authenticated pgvector Cosine Similarity Search
CREATE OR REPLACE FUNCTION public.match_document_chunks(
    query_embedding vector(768),
    match_threshold float,
    match_count int,
    filter_user_id uuid,
    filter_material_id uuid DEFAULT NULL
)
RETURNS TABLE (
    id uuid,
    material_id uuid,
    material_title text,
    chunk_index int,
    content text,
    section_heading text,
    page_number int,
    similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        dc.id,
        dc.material_id,
        m.title AS material_title,
        dc.chunk_index,
        dc.content,
        dc.section_heading,
        dc.page_number,
        1 - (dc.embedding <=> query_embedding) AS similarity
    FROM public.document_chunks dc
    JOIN public.materials m ON m.id = dc.material_id
    WHERE dc.user_id = filter_user_id
      AND (filter_material_id IS NULL OR dc.material_id = filter_material_id)
      AND dc.embedding IS NOT NULL
      AND 1 - (dc.embedding <=> query_embedding) > match_threshold
    ORDER BY dc.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- 2. Trigger for automatic profile creation upon Supabase Auth signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
