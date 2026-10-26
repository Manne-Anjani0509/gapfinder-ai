# GapFinder AI — Production Backend Engineering & Architecture

GapFinder AI is an evidence-grounded educational intelligence platform built with **Next.js App Router (TypeScript)**, **Supabase PostgreSQL (with pgvector)**, and **Google Gemini Generative AI**. It diagnoses students’ knowledge gaps directly from their own uploaded study material, generates verifiable multiple-choice diagnostic assessments, updates mastery records server-side, constructs time-bounded revision plans, and provides a conversational RAG AI tutor with strict citation grounding.

---

## 1. Architectural Foundations: Separation of Concerns

GapFinder AI adheres to strict architectural separation between **retrieval**, **generative synthesis**, **deterministic evaluation**, and **revision scheduling**:

| Concern | Engine | Description & Invariants |
| :--- | :--- | :--- |
| **Retrieval** | `src/lib/rag.ts` | Hybrid cosine semantic search (768-dim `text-embedding-004`) + lexical BM25 fallback. Always scoped to the authenticated student's documents. Never retrieves cross-student data. |
| **Generative Synthesis** | `src/lib/gemini.ts` | `gemini-2.5-flash` with Zod schema validation (`GeneratedQuizQuestionSchema`), bounded 20-second timeout, and exponential backoff retry. |
| **Diagnostic Evaluation** | `src/lib/quizStore.ts` & `/api/quiz/submit` | **100% deterministic and server-side**. Correct answers are never sent to the browser during the quiz. Submissions are graded against server session state. Replay submissions are rejected. |
| **Gap Classification** | `src/lib/gapAnalysis.ts` | Pure mathematical classification: **Weak (<50%)**, **Medium (50–79%)**, **Strong (≥80%)**, and **Unassessed**. Confidence ratings flag low-evidence topics (<3 questions) as provisional. |
| **Adaptive Scheduling** | `/api/revision` | Constraint-bounded scheduler prioritizing high-weakness, low-confidence, and recently missed topics. Enforces $\sum \text{task duration} \le \text{budget}$. |

---

## 2. Technology Stack

- **Framework**: Next.js 16 (App Router) with TypeScript 5 & React 19.
- **AI / LLM SDK**: Official Google Gen AI SDK (`@google/genai`) with Gemini 2.5 Flash and `text-embedding-004`.
- **Database**: Supabase PostgreSQL with `pgvector` extension and Row Level Security (RLS).
- **Validation**: Zod for request payloads, environment variables, and LLM JSON outputs.
- **Document Processing**: `pdf-parse` (server-compatible extraction) and custom sliding-window chunker with character offset tracking.
- **Test Runner**: Node 24 native test runner (`node --test --experimental-strip-types`).

---

## 3. Database Schema & Supabase Migrations

The complete SQL migration is located at [`supabase/migrations/20261026000000_gapfinder_schema.sql`](supabase/migrations/20261026000000_gapfinder_schema.sql).

### Table Schema (11 Relational Entities)

1. `profiles`: Authenticated student profile referencing `auth.users(id)`.
2. `subjects`: Student-owned courses (e.g., Computer Science, Organic Chemistry).
3. `materials`: Uploaded document metadata, processing status, storage path, and file type (`pdf`, `txt`, `pasted`).
4. `topics`: Hierarchical syllabus topics and subtopics linked to materials and subjects.
5. `document_chunks`: Extracted text passages (~220 words, 40-word overlap), character offsets (`source_offset_start`, `source_offset_end`), page numbers, and dense vector embeddings (`vector(768)`). Indexed with HNSW cosine distance (`vector_cosine_ops`).
6. `quiz_attempts`: Diagnostic test sessions, subject scope, total questions, score, and completion timestamp.
7. `quiz_questions`: Generated 4-option MCQs, server-validated correct index, pedagogical explanation, and source chunk citation.
8. `student_answers`: Server-graded student responses, selected index, correctness flag, and evaluation timestamp.
9. `topic_mastery`: Aggregated diagnostic statistics per student and topic (accuracy, question count, attempt count, last assessment date, confidence level).
10. `revision_plans`: Time-budgeted revision schedules (15, 30, 45, 60, or 90 minutes).
11. `revision_tasks`: Actionable study tasks referencing topics, estimated minutes, status (`pending`, `completed`), and grounding.

### Row Level Security (RLS) & Vector RPC

- **RLS Enabled on all tables**: Every table enforces `auth.uid() = user_id` for `SELECT`, `INSERT`, `UPDATE`, and `DELETE`.
- **Vector Cosine Match RPC**:
  ```sql
  CREATE OR REPLACE FUNCTION match_document_chunks(
      query_embedding vector(768),
      match_threshold double precision,
      match_count integer,
      filter_user_id uuid,
      filter_material_id uuid DEFAULT NULL
  ) RETURNS TABLE ( ... );
  ```

---

## 4. Document Processing Pipeline

```
Raw File (PDF / TXT / Pasted Text)
            │
            ▼
[Validation & Cleaning] (Size < 15MB, UTF-8 normalization)
            │
            ▼
[Sliding-Window Chunker] (approx. 220 words, 40-word overlap)
  - Preserves section headings
  - Tracks character offsets (sourceOffsetStart, sourceOffsetEnd)
  - Identifies page numbers
            │
            ▼
[Syllabus Topic Extractor] (Extracts core concepts and subtopics)
            │
            ▼
[Dense Embedding Generation] (text-embedding-004, 768 dimensions)
            │
            ▼
[Supabase Persistence] (Stores material record, chunks, and topics)
```

---

## 5. API Reference & Endpoint Catalog

All routes reside in `src/app/api/` and utilize standard JSON envelopes.

### 5.1 System Health (`GET /api/status`)
Checks backend readiness, active Gemini models, vector dimension, and available endpoints.
```json
{
  "status": "healthy",
  "gemini": {
    "configured": true,
    "generationModel": "gemini-2.5-flash",
    "embeddingModel": "text-embedding-004",
    "dimensions": 768
  },
  "vectorRag": {
    "available": true,
    "strategy": "hybrid (vector cosine + BM25 lexical)"
  }
}
```

### 5.2 Material Ingestion (`POST /api/materials/upload`)
Accepts `multipart/form-data` with `file` (PDF/TXT) or `text` (pasted notes), along with `title` and optional `subjectId`.
- **Validation**: Enforces 15MB max limit, rejects empty or corrupt documents.
- **Response**:
```json
{
  "success": true,
  "material": {
    "id": "mat-1730000000000",
    "title": "Operating Systems Chapter 8",
    "fileName": "virtual_memory.pdf",
    "fileType": "pdf",
    "wordCount": 1850,
    "status": "ready"
  },
  "chunkCount": 9,
  "topicCount": 3,
  "topics": [
    {
      "name": "Virtual Memory Management",
      "subtopics": ["Paging", "Page Fault Handling", "TLB Translation"],
      "keyConcepts": ["Page Table", "Frame", "Swap Space"]
    }
  ]
}
```

### 5.3 Grounded Quiz Generation (`POST /api/quiz/generate`)
Generates 4-option MCQs grounded strictly in the student's indexed material chunks.
- **Request**:
```json
{
  "subjectId": "cs-os-101",
  "numQuestions": 5
}
```
- **Response (Correct answers omitted for security)**:
```json
{
  "quizId": "quiz-1730000000000",
  "subjectId": "cs-os-101",
  "questions": [
    {
      "id": "q-1",
      "topic": "Virtual Memory Management",
      "question": "What happens immediately when a referenced page is not present in physical RAM?",
      "options": [
        "The CPU executes a page fault trap to the OS kernel",
        "The process is terminated by the memory manager",
        "The Translation Lookaside Buffer is permanently cleared",
        "The memory bus doubles its clock speed"
      ],
      "sourceEvidence": {
        "materialTitle": "Operating Systems Chapter 8",
        "pageNumber": 14,
        "chunkId": "chunk-os-02",
        "sectionHeading": "8.2 Page Fault Mechanism"
      }
    }
  ]
}
```

### 5.4 Server-Side Quiz Grading (`POST /api/quiz/submit`)
Grades student responses securely against server session records. Replay submissions return HTTP 409.
- **Request**:
```json
{
  "quizId": "quiz-1730000000000",
  "answers": [
    { "questionId": "q-1", "selectedOption": 0 }
  ]
}
```
- **Response**:
```json
{
  "success": true,
  "attemptId": "quiz-1730000000000",
  "score": 100,
  "correctCount": 1,
  "totalQuestions": 1,
  "results": [
    {
      "questionId": "q-1",
      "correct": true,
      "selectedOption": 0,
      "correctAnswer": 0,
      "explanation": "A reference to an invalid page triggers a hardware trap known as a page fault.",
      "citation": {
        "materialTitle": "Operating Systems Chapter 8",
        "pageNumber": 14
      }
    }
  ],
  "topicMasteryUpdates": [
    {
      "topic": "Virtual Memory Management",
      "accuracy": 100,
      "level": "strong",
      "isProvisional": true
    }
  ]
}
```

### 5.5 Knowledge Gap Report (`POST /api/gap-report`)
Returns mathematically verified gap classifications with evidence breakdown and priority ranking.
- **Accuracy Thresholds**:
  - `weak`: `< 50%`
  - `medium`: `50% – 79%`
  - `strong`: `≥ 80%`
  - `unassessed`: No completed diagnostic assessments
- **Evidence Confidence**: Topics with fewer than 3 completed questions are explicitly labeled `isProvisional: true`.

### 5.6 Adaptive Revision Planner (`POST /api/revision`)
Allocates study time into prioritized tasks without exceeding the selected budget.
- **Allowed Budgets**: `15`, `30`, `45`, `60`, `90` minutes.
- **Task Duration Rule**: $\sum \text{allocatedMinutes} \le \text{timeBudgetMinutes}$.
- **Status Toggling**: `PATCH /api/revision/tasks` allows toggling task completion state.

### 5.7 Grounded AI Tutor (`POST /api/tutor`)
RAG-powered conversational assistant with verifiable citation passages.
- **Insufficient Evidence Guardrail**: If query similarity falls below the relevance threshold or no relevant chunks exist, the model returns the exact mandated response:
  > *"I cannot find sufficient evidence in your uploaded study materials to answer this question accurately. Please upload notes covering this topic."*

### 5.8 Progress History & Export (`GET /api/progress`)
Returns historical quiz attempts, topic mastery trajectories, and full diagnostic JSON exports.

---

## 6. Automated Backend Tests

The backend includes a comprehensive, deterministic automated test suite using the Node 24 native runner:

```bash
npm test
```

### Test Suite Coverage (`tests/`):
- `tests/chunker.test.ts`: Word sliding window, overlap constraints, and character offset tracking.
- `tests/rag.test.ts`: Hybrid vector & BM25 ranking, user scoping, and citation generation.
- `tests/quiz.test.ts`: 4-option validation, correct answer concealment, server-side grading, and replay rejection.
- `tests/gapAnalysis.test.ts`: Threshold boundaries (49% weak, 50% medium, 79% medium, 80% strong), provisional confidence tags, and evidence summaries.
- `tests/revision.test.ts`: Strict time budget allocation, weak topic prioritization, and task generation.
- `tests/tutor.test.ts`: Zero-hallucination guardrail text and prompt-injection defense.
- `tests/demoSeparation.test.ts`: Complete data isolation between pre-seeded demo records and authenticated student live data.

---

## 7. Setup & Local Development

1. **Clone repository and install dependencies:**
   ```bash
   git clone <repo-url>
   cd "gapfolder ai"
   npm install
   ```

2. **Configure environment variables:**
   ```bash
   cp .env.example .env.local
   ```
   Add your `GEMINI_API_KEY` from Google AI Studio and Supabase credentials.

3. **Run database migrations (Supabase):**
   Execute the migration SQL file [`supabase/migrations/20261026000000_gapfinder_schema.sql`](supabase/migrations/20261026000000_gapfinder_schema.sql) in your Supabase SQL Editor.

4. **Run automated tests:**
   ```bash
   npm test
   ```

5. **Start development server:**
   ```bash
   npm run dev
   ```
   Navigate to [http://localhost:3000](http://localhost:3000).

6. **Verify production build:**
   ```bash
   npm run build
   ```
