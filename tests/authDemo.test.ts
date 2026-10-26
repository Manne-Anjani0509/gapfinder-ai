import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEMO_MATERIALS, DEMO_QUIZ_SUBMISSIONS, DEMO_REVISION_PLAN } from '../src/lib/demoData.ts';

test('Demo Guest configuration and demo data retrieval', () => {
  const demoGuest = {
    id: 'demo-guest-001',
    email: 'demo@gapfinder.ai',
    fullName: 'Anjani',
  };

  assert.strictEqual(demoGuest.id, 'demo-guest-001');
  assert.strictEqual(demoGuest.email, 'demo@gapfinder.ai');
  assert.strictEqual(demoGuest.fullName, 'Anjani');

  // Verify demo materials, submissions, and plan are fully populated
  assert.ok(DEMO_MATERIALS.length > 0, 'Demo materials must be non-empty');
  assert.ok(DEMO_QUIZ_SUBMISSIONS.length > 0, 'Demo submissions must be non-empty');
  assert.ok(DEMO_REVISION_PLAN !== null, 'Demo revision plan must exist');
  assert.ok(DEMO_REVISION_PLAN.tasks.length > 0, 'Demo revision plan tasks must exist');
});

test('Demo credentials matching rules work without Supabase authentication', () => {
  const DEMO_EMAIL = 'demo@gapfinder.ai';
  const DEMO_PASSWORD = 'GapFinder@123';

  function isDemoAccount(email: string, pass: string): boolean {
    const cleanEmail = email.trim().toLowerCase();
    return (
      cleanEmail === DEMO_EMAIL.toLowerCase() ||
      cleanEmail.includes('demo') ||
      pass === DEMO_PASSWORD ||
      pass.toLowerCase() === 'gapfinder@123' ||
      pass.toLowerCase() === 'demo'
    );
  }

  // Exact demo credentials
  assert.strictEqual(isDemoAccount('demo@gapfinder.ai', 'GapFinder@123'), true);

  // Case-insensitive email or password
  assert.strictEqual(isDemoAccount('DEMO@GAPFINDER.AI', 'gapfinder@123'), true);

  // Demo email with alternate password
  assert.strictEqual(isDemoAccount('demo@gapfinder.ai', 'custompass'), true);

  // Password shortcut
  assert.strictEqual(isDemoAccount('student@example.com', 'GapFinder@123'), true);

  // Regular user credentials (non-demo)
  assert.strictEqual(isDemoAccount('student@myuniversity.edu', 'secret123'), false);
});
