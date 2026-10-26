import { NextRequest, NextResponse } from 'next/server';
import { chunkDocument, extractTopicsFromChunks } from '@/lib/chunker';
import { getGeminiEmbedding, isGeminiConfigured } from '@/lib/gemini';
import { getAuthenticatedUser } from '@/lib/supabaseServer';
import { StudyMaterial } from '@/types';
import { z } from 'zod';

const UploadJsonSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  content: z.string().min(40, 'Content must be at least 40 characters for diagnostic analysis'),
  subjectId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const authContext = await getAuthenticatedUser(req);
    if (!authContext.user) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in to upload materials.' }, { status: 401 });
    }
    const userId = authContext.user.id;
    const contentType = req.headers.get('content-type') || '';

    let title = '';
    let fileName = '';
    let fileType: 'pdf' | 'txt' | 'pasted' = 'pasted';
    let rawText = '';
    let fileSize = 0;
    let subjectId: string | undefined = undefined;
    let storagePath: string | undefined = undefined;

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      const customTitle = formData.get('title') as string | null;
      const rawSubjectId = formData.get('subjectId') as string | null;
      if (rawSubjectId) subjectId = rawSubjectId;

      if (!file) {
        return NextResponse.json(
          { error: 'No file was provided in the upload request.' },
          { status: 400 }
        );
      }

      fileName = file.name;
      fileSize = file.size;
      title = customTitle?.trim() || fileName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');

      if (fileName.toLowerCase().endsWith('.txt')) {
        fileType = 'txt';
        rawText = await file.text();
      } else if (fileName.toLowerCase().endsWith('.pdf')) {
        fileType = 'pdf';
        try {
          const arrayBuffer = await file.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);

          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const pdfParse = require('pdf-parse');
          const pdfData = await pdfParse(buffer);
          rawText = pdfData.text || '';

          if (!rawText || rawText.trim().length === 0) {
            return NextResponse.json(
              {
                error:
                  'The uploaded PDF appears to be empty or contains only scanned images without selectable text. Please upload an OCR-processed or text-based PDF.',
              },
              { status: 422 }
            );
          }
        } catch (pdfErr: any) {
          console.error('PDF extraction failed:', pdfErr);
          return NextResponse.json(
            {
              error: `PDF extraction failed: ${pdfErr?.message || 'Unable to parse PDF structure'}. Ensure the PDF is unencrypted and contains selectable text.`,
            },
            { status: 422 }
          );
        }
      } else {
        return NextResponse.json(
          { error: 'Unsupported file format. Please upload a .pdf or .txt file.' },
          { status: 400 }
        );
      }
    } else {
      // JSON payload: either storagePath from Supabase Storage or pasted notes
      const body = await req.json();

      if (body.storagePath) {
        storagePath = body.storagePath;
        fileName = body.fileName || 'document.pdf';
        fileSize = body.fileSize || 0;
        title = body.title?.trim() || fileName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
        subjectId = body.subjectId;

        if (!authContext.supabase) {
          return NextResponse.json(
            { error: 'Authenticated Supabase client is required to retrieve files from storage.' },
            { status: 401 }
          );
        }

        const { data: fileBlob, error: downloadErr } = await authContext.supabase.storage
          .from('study-materials')
          .download(storagePath);

        if (downloadErr || !fileBlob) {
          return NextResponse.json(
            { error: `Failed to download file from storage: ${downloadErr?.message || 'File not found'}` },
            { status: 404 }
          );
        }

        const arrayBuffer = await fileBlob.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        if (fileName.toLowerCase().endsWith('.txt')) {
          fileType = 'txt';
          rawText = buffer.toString('utf-8');
        } else {
          fileType = 'pdf';
          try {
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const pdfParse = require('pdf-parse');
            const pdfData = await pdfParse(buffer);
            rawText = pdfData.text || '';

            if (!rawText || rawText.trim().length === 0) {
              return NextResponse.json(
                {
                  error:
                    'The uploaded PDF appears to be empty or contains only scanned images without selectable text. Please upload an OCR-processed or text-based PDF.',
                },
                { status: 422 }
              );
            }
          } catch (pdfErr: any) {
            console.error('PDF extraction failed from storage:', pdfErr);
            return NextResponse.json(
              {
                error: `PDF extraction failed: ${pdfErr?.message || 'Unable to parse PDF structure'}. Ensure the PDF is unencrypted and contains selectable text.`,
              },
              { status: 422 }
            );
          }
        }
      } else {
        // Pasted notes
        const parseResult = UploadJsonSchema.safeParse(body);
        if (!parseResult.success) {
          return NextResponse.json(
            { error: parseResult.error.issues[0]?.message || 'Invalid input payload.' },
            { status: 400 }
          );
        }

        title = parseResult.data.title;
        rawText = parseResult.data.content;
        subjectId = parseResult.data.subjectId;
        fileType = 'pasted';
        fileName = `${title.toLowerCase().replace(/[^a-z0-9]/g, '_')}.txt`;
        fileSize = Buffer.byteLength(rawText, 'utf8');
      }
    }

    if (!rawText || rawText.trim().length < 40) {
      return NextResponse.json(
        {
          error:
            'Extracted content is too short (minimum 40 characters required for diagnostic analysis).',
        },
        { status: 400 }
      );
    }

    const materialId = `mat-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const chunks = chunkDocument(materialId, title, rawText);

    if (chunks.length === 0) {
      return NextResponse.json(
        { error: 'Failed to split content into semantic paragraphs.' },
        { status: 422 }
      );
    }

    // Embed chunks if Gemini is configured (bounded to 12 chunks initially to avoid rate spikes)
    if (isGeminiConfigured()) {
      try {
        for (let i = 0; i < Math.min(chunks.length, 12); i++) {
          const emb = await getGeminiEmbedding(chunks[i].text);
          if (emb) {
            chunks[i].embedding = emb;
          }
        }
      } catch (embErr) {
        console.warn('Embedding generation skipped during initial upload:', embErr);
      }
    }

    const topics = extractTopicsFromChunks(materialId, title, chunks);
    const wordCount = rawText.split(/\s+/).filter(Boolean).length;

    const studyMaterial: StudyMaterial = {
      id: materialId,
      title,
      fileName,
      fileType,
      fileSize,
      wordCount,
      rawContent: rawText,
      chunks,
      topics,
      status: 'ready',
      createdAt: new Date().toISOString(),
      isDemo: false,
    };

    // If Supabase is configured and connected, persist record under authenticated student
    if (authContext.supabase) {
      try {
        const { data: insertedMat, error: matErr } = await authContext.supabase
          .from('materials')
          .insert({
            user_id: userId,
            subject_id: subjectId,
            title,
            file_name: fileName,
            file_type: fileType,
            file_size: fileSize,
            word_count: wordCount,
            storage_path: storagePath || null,
            raw_content: rawText,
            status: 'ready',
            is_demo: false,
          })
          .select('id')
          .single();

        if (matErr) {
          console.warn('Supabase material insert warning:', matErr.message);
        } else if (insertedMat?.id) {
          // Persist chunks with embeddings
          const dbChunks = chunks.map((c) => ({
            material_id: insertedMat.id,
            user_id: userId,
            chunk_index: c.chunkIndex,
            chunk_text: c.text,
            token_count: c.tokenCount,
            section_heading: c.sectionHeading || null,
            page_number: c.pageNumber || null,
            source_offset_start: c.sourceOffsetStart || 0,
            source_offset_end: c.sourceOffsetEnd || 0,
            embedding: c.embedding && c.embedding.length > 0 ? c.embedding : null,
          }));

          await authContext.supabase.from('document_chunks').insert(dbChunks);

          // Persist extracted topics
          const dbTopics = topics.map((t) => ({
            material_id: insertedMat.id,
            user_id: userId,
            name: t.name,
            subtopics: t.subtopics || [],
            key_concepts: t.keyConcepts || [],
          }));

          await authContext.supabase.from('topics').insert(dbTopics);
        }
      } catch (dbErr) {
        console.warn('Supabase DB persistence error:', dbErr);
      }
    }

    return NextResponse.json({
      success: true,
      material: studyMaterial,
      chunksCount: chunks.length,
      topicsCount: topics.length,
    });
  } catch (error: any) {
    console.error('Material upload error:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal server error while processing material.' },
      { status: 500 }
    );
  }
}
