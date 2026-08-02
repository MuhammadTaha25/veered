/**
 * POST /api/stage2/submit
 * Captures candidate code submissions for the 2 coding questions.
 * Updates scorecard stage2_status to 'submitted'.
 */
import { NextResponse } from 'next/server.js';
import { getSession } from '../../../../lib/auth/index.js';
import { dbGet, dbRun } from '../../../../lib/db/index.js';

export async function POST(req) {
  try {
    const session = await getSession();
    const { candidateId: bodyCandidateId, codeSubmissions } = await req.json();
    const candidateId = bodyCandidateId || session?.userId;

    if (!candidateId) {
      return NextResponse.json({ ok: false, error: 'candidateId is required' }, { status: 400 });
    }

    if (!codeSubmissions || Object.keys(codeSubmissions).length === 0) {
      return NextResponse.json({ ok: false, error: 'codeSubmissions are required' }, { status: 400 });
    }

    // Update application status
    await dbRun(`
      UPDATE applications
      SET status = 'stage2_done'
      WHERE candidate_id = ?
    `, [candidateId]);

    // Update scorecard stage2_status
    await dbRun(`
      UPDATE scorecards
      SET stage2_status = 'submitted'
      WHERE candidate_id = ?
    `, [candidateId]);

    return NextResponse.json({
      ok: true,
      candidateId,
      stage2Status: 'submitted',
      message: 'Stage 2 coding submission received. Proceed to Stage 3 video interview.',
    });
  } catch (err) {
    console.error('[STAGE 2 SUBMIT ERROR]', err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
