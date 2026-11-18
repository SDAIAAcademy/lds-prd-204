// The trainer's check of LDS-PRD-204's labs. Run from the repository root:
//   node labs/solutions/check_all.mjs
// 1. The generator writes the same bytes as the files in the repository.
// 2. Every reference number is computed again from the CSV files, the way a participant does it in
//    a spreadsheet with the rules on the lab pages, and compared with solutions/key.json.
// 3. The numbers the Markdown files (status reports, final state, solutions) quote agree with them.
// 4. The blank templates read without error, and the reference matrix keeps its own rules.
// Prints PASS, or the first difference and exits 1.
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const labs = join(dirname(fileURLToPath(import.meta.url)), '..');
const fail = (msg) => { console.log('FAIL: ' + msg); process.exit(1); };
const eq = (a, b, what) => { if (JSON.stringify(a) !== JSON.stringify(b)) fail(`${what}: expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`); };
const r1 = (x) => Math.round(x * 10) / 10;
const r2 = (x) => Math.round(x * 100) / 100;
const pct = (a, b) => r1((100 * a) / b);

function readCsv(rel) {
  const text = readFileSync(join(labs, rel), 'utf8').replace(/^﻿/, '');
  const rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (ch === '"') q = false; else cell += ch; }
    else if (ch === '"') q = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += ch;
  }
  const [head, ...body] = rows;
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h, r[i]])));
}
const text = (rel) => readFileSync(join(labs, rel), 'utf8');
const quotes = (rel, s) => { if (!text(rel).includes(s)) fail(`${rel} does not quote "${s}"`); };
function percentileInc(values, p) {
  const v = [...values].sort((a, b) => a - b);
  const pos = (v.length - 1) * p; const lo = Math.floor(pos), hi = Math.ceil(pos);
  return v[lo] + (v[hi] - v[lo]) * (pos - lo);
}
const level = (s) => (s <= 2 ? 'منخفض' : s <= 6 ? 'متوسط' : s <= 12 ? 'مرتفع' : 'كارثي');
const rate = (rows, f) => { const s = rows.filter(f); return { ok: s.filter((r) => r.correct === '1').length, n: s.length }; };

try {
  execFileSync(process.execPath, [join(labs, '_tools', 'prepare_files.mjs'), '--check'], { stdio: 'pipe' });
} catch (e) { fail('the generator does not reproduce the files: ' + String(e.stdout)); }
const key = JSON.parse(text('solutions/key.json'));

// ---- Lab 1.1 ----
{
  const f = readCsv('files/spike_fields.csv');
  const d = readCsv('files/spike_docs.csv');
  const p = rate(f, (r) => r.script === 'printed'), h = rate(f, (r) => r.script === 'handwritten'), all = rate(f, () => true), c = rate(d, () => true);
  const k = key.lab_1_1;
  eq(pct(p.ok, p.n), k.printed_accuracy_pct, 'lab 1.1 printed');
  eq(pct(h.ok, h.n), k.handwritten_accuracy_pct, 'lab 1.1 handwritten');
  eq(pct(all.ok, all.n), k.overall_accuracy_pct, 'lab 1.1 overall');
  eq(pct(c.ok, c.n), k.classification_accuracy_pct, 'lab 1.1 classification');
  eq(r1(0.65 * (100 * p.ok / p.n) + 0.35 * (100 * h.ok / h.n)), k.expected_at_2025_mix_pct, 'lab 1.1 2025 mix');
  eq(r1((98 - 65) / 35 * 100), k.handwritten_needed_for_98_if_printed_100_pct, 'lab 1.1 needed');
  quotes('files/feasibility_note.md', '35%');
  quotes('solutions/D1_1_increments.md', `${k.printed_accuracy_pct}%`);
  quotes('solutions/D1_1_increments.md', `${k.handwritten_accuracy_pct}%`);
}

// ---- Lab 1.2 ----
{
  const k = key.lab_1_2;
  const rc = readCsv('files/reference_class.csv');
  const ratio = (r) => Number(r.actual_weeks) / Number(r.planned_weeks);
  const ai = rc.filter((r) => r.kind === 'ai').map(ratio), every = rc.map(ratio);
  const weeks = readCsv('files/approved_plan.csv').reduce((s, r) => s + Number(r.weeks), 0);
  eq(weeks, k.plan_weeks, 'lab 1.2 plan weeks');
  eq([0.2, 0.5, 0.8].map((p) => r2(percentileInc(ai, p))), [k.ai_ratio_p20, k.ai_ratio_p50, k.ai_ratio_p80], 'lab 1.2 AI percentiles');
  eq([0.2, 0.5, 0.8].map((p) => r1(weeks * percentileInc(ai, p))), [k.range_weeks_low, k.range_weeks_mid, k.range_weeks_high], 'lab 1.2 range');
  eq(r1(weeks * percentileInc(every, 0.8)), k.range_weeks_high_all_projects, 'lab 1.2 all-projects high');
  const bl = readCsv('files/backlog.csv');
  eq(['I3', 'I4'].map((i) => bl.filter((b) => b.increment === i && b.type === 'evaluation').length), [0, 0], 'lab 1.2 planted backlog gap');
  // Templates read, and the reference matrix keeps its rules
  const tmpl = readCsv('files/raci_template.csv');
  eq(tmpl.length, 10, 'lab 1.2 template rows');
  const ref = readCsv('solutions/raci_reference.csv');
  const roles = ['SP', 'PO', 'DL', 'ML', 'DE', 'EV', 'DG', 'OP'];
  for (const r of ref) {
    eq(roles.filter((c) => r[c] === 'A').length, 1, `lab 1.2 one A in ${r.id}`);
    eq(r, { ...r, ...Object.fromEntries(roles.map((c) => [c, key.lab_1_2.raci[r.id][c] || ''])) }, `lab 1.2 matrix ${r.id}`);
  }
  for (const [d, role] of k.segregation) if (ref.find((r) => r.id === d)[role] === 'A') fail(`lab 1.2 segregation broken in ${d} by ${role}`);
  for (const r of k.risks) eq(level(r.likelihood * r.impact), r.level, `lab 1.2 risk ${r.id}`);
  readCsv('files/risk_log_template.csv');
  quotes('solutions/D1_2_team_estimates_risks.md', `من ${k.range_weeks_low} إلى ${k.range_weeks_high} أسبوعًا`);
}

// ---- Lab 2.1 ----
{
  const k = key.lab_2_1;
  const f1 = readCsv('files/sim/round1_eval_fields.csv'), d1 = readCsv('files/sim/round1_eval_docs.csv');
  const p1 = rate(f1, () => true), c1 = rate(d1, () => true);
  eq(pct(p1.ok, p1.n), k.r1.printed_accuracy_pct, 'round 1 printed');
  eq(pct(c1.ok, c1.n), k.r1.classification_accuracy_pct, 'round 1 classification');
  const f2 = readCsv('files/sim/round2_eval_fields.csv');
  const h2 = rate(f2, (r) => r.script === 'handwritten'), p2 = rate(f2, (r) => r.script === 'printed');
  eq(pct(h2.ok, h2.n), k.r2.handwritten_accuracy_pct, 'round 2 handwritten');
  eq(pct(p2.ok, p2.n), k.r2.printed_accuracy_pct, 'round 2 printed');
  const f3 = readCsv('files/sim/round3_eval_fields.csv');
  const a3 = rate(f3, (r) => r.auto_accepted === 'yes'), ah3 = rate(f3, (r) => r.auto_accepted === 'yes' && r.script === 'handwritten');
  const p3 = rate(f3, (r) => r.script === 'printed'), all3 = rate(f3, () => true);
  eq(pct(a3.ok, a3.n), k.r3.auto_accept_precision_pct, 'round 3 auto-accept precision');
  eq(pct(ah3.ok, ah3.n), k.r3.auto_accept_precision_handwritten_pct, 'round 3 handwritten auto-accept');
  eq(pct(a3.n, all3.n), k.r3.auto_accept_share_pct, 'round 3 auto-accept share');
  eq(pct(p3.ok, p3.n), k.r3.printed_accuracy_pct, 'round 3 printed');
  const s3 = readCsv('files/sim/round3_shadow.csv');
  const mean = s3.reduce((s, r) => s + Number(r.reviewer_minutes), 0) / s3.length;
  eq(r1(mean), k.r3.shadow_mean_minutes, 'round 3 shadow minutes');
  eq(pct(s3.filter((r) => r.error_after_review === '1').length, s3.length), k.r3.shadow_error_pct, 'round 3 shadow errors');
  for (const r of readCsv('files/sim/start_risk_log.csv')) {
    eq(Number(r.score), Number(r.likelihood) * Number(r.impact), `start log ${r.id} score`);
    eq(r.level, level(Number(r.score)), `start log ${r.id} level`);
  }
  readCsv('files/sim/gate_record_template.csv');
  quotes('files/sim/round1_status.md', '600 حقل'); quotes('files/sim/round1_status.md', '331,000');
  quotes('files/sim/round2_status.md', '400 حقل'); quotes('files/sim/round2_status.md', '812,000');
  quotes('files/sim/round3_status.md', '1,162,000'); quotes('files/sim/round3_status.md', '22.0 دقيقة');
  quotes('files/final_state.md', `${k.r3.auto_accept_precision_pct}% (634 من 640)`);
  quotes('files/final_state.md', `${k.r3.auto_accept_precision_handwritten_pct}% (78 من 80)`);
  quotes('files/final_state.md', `| ${k.r3.shadow_mean_minutes} (خط الأساس 22.0)`);
  quotes('solutions/D2_1_simulation.md', `${k.r2.handwritten_accuracy_pct}%`);
  quotes('solutions/D2_1_simulation.md', `${k.r3.auto_accept_precision_handwritten_pct}%`);
}

// ---- Lab 2.2 ----
{
  const k = key.lab_2_2;
  const cl = readCsv('files/readiness_checklist.csv');
  eq(cl.length, k.checklist_items, 'lab 2.2 checklist items');
  const sol = text('solutions/D2_2_handover.md');
  for (const id of k.vendor_draft_gaps) if (!sol.includes(id)) fail(`lab 2.2 solution does not name gap ${id}`);
  const draft = text('files/vendor_runbook_draft.md');
  if (!draft.includes('نعود إلى الإصدار v3')) fail('lab 2.2 vendor draft lost its planted rollback gap');
}

console.log('PASS');
