// Writes every synthetic CSV file of LDS-PRD-204 into labs/files/ and the trainer's reference
// numbers into labs/solutions/key.json. A fixed seed: every run gives the same bytes.
// Run from the repository root: node labs/_tools/prepare_files.mjs
// With --check it writes nothing and exits 1 if any file on disk differs from what it would write.
//
// Everything here is invented for the course: the Ministry of Community Partnership, its grants
// programme, the service Ghirbal, the people, the project history and every number. The
// evaluation rows are designed by the course to give exact, known rates; they were not produced
// by a model. The Markdown files in labs/files/ (briefs, round status reports, the final state,
// the vendor's draft) are written by hand; labs/solutions/check_all.mjs checks that the numbers
// they quote agree with these files.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const labs = join(here, '..');
const CHECK = process.argv.includes('--check');

const out = new Map();
const BOM = '﻿';
export function csv(rows) {
  const esc = (v) => {
    const s = typeof v === 'number' ? String(v) : String(v ?? '');
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  return BOM + rows.map((r) => r.map(esc).join(',')).join('\n') + '\n';
}
const put = (rel, text) => out.set(rel, text);
const r1 = (x) => Math.round(x * 10) / 10;
const r2 = (x) => Math.round(x * 100) / 100;
const pct = (a, b) => r1((100 * a) / b);

// A small seeded generator (mulberry32), so error positions are spread but fixed.
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// Exactly k ones among n, at seeded positions.
function exactly(n, k, seed) {
  const r = rng(seed);
  const idx = [...Array(n).keys()];
  for (let i = n - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
  const ones = new Set(idx.slice(0, k));
  return [...Array(n).keys()].map((i) => (ones.has(i) ? 1 : 0));
}

// ======================================================================================
// Document types and fields of a grant application pack
// ======================================================================================
export const DOC_TYPES = {
  APP: 'استمارة طلب المنحة',
  REG: 'شهادة تسجيل المبادرة',
  LTR: 'خطاب الجهة الشريكة',
  QUO: 'عرض السعر',
  BUD: 'الميزانية التفصيلية',
  SITE: 'تصريح استخدام الموقع',
  DEC: 'إقرار المسؤولية'
};
const PRINTED_TYPES = ['APP', 'REG', 'LTR', 'QUO', 'BUD', 'SITE'];
const HAND_TYPES = ['APP', 'DEC'];
const FIELDS = {
  APP: ['initiative_name', 'requested_amount', 'duration_months', 'signatory_name', 'start_date'],
  REG: ['initiative_name', 'registration_no', 'issue_date', 'expiry_date'],
  LTR: ['partner_name', 'signatory_name', 'issue_date', 'initiative_name'],
  QUO: ['supplier_name', 'quote_amount', 'issue_date', 'expiry_date'],
  BUD: ['requested_amount', 'duration_months', 'initiative_name', 'item_count'],
  SITE: ['site_permit_no', 'issue_date', 'expiry_date', 'initiative_name'],
  DEC: ['signatory_name', 'initiative_name', 'issue_date', 'requested_amount', 'duration_months']
};

// Field rows for `docs` documents of the given types, `per` fields each, `correct` of them right.
function fieldRows({ prefix, docs, types, per, script, correct, seed, version, extra }) {
  const n = docs * per;
  const ok = exactly(n, correct, seed);
  const rows = [];
  let i = 0;
  for (let d = 0; d < docs; d++) {
    const type = types[d % types.length];
    const id = `${prefix}${String(d + 1).padStart(3, '0')}`;
    for (let f = 0; f < per; f++) {
      const row = { doc_id: id, doc_type: type, script, field: FIELDS[type][f], correct: ok[i] };
      if (version) row.model_version = version;
      if (extra) Object.assign(row, extra(i, ok[i]));
      rows.push(row);
      i++;
    }
  }
  return rows;
}
const toCsv = (rows, cols) => csv([cols, ...rows.map((r) => cols.map((c) => r[c]))]);

// ======================================================================================
// Lab 1.1: the feasibility spike (120 documents from 2025 packs, field level and type level)
// ======================================================================================
const SPIKE = {
  printed: { docs: 90, per: 4, correct: 343 },
  handwritten: { docs: 30, per: 5, correct: 121 },
  classification: { docs: 120, correct: 117 },
  handwritten_share_2025: 35 // percent of documents in the 2025 intake that are handwritten (stated in the note)
};
{
  const p = fieldRows({ prefix: 'SP-P', docs: SPIKE.printed.docs, types: PRINTED_TYPES, per: SPIKE.printed.per, script: 'printed', correct: SPIKE.printed.correct, seed: 11 });
  const h = fieldRows({ prefix: 'SP-H', docs: SPIKE.handwritten.docs, types: HAND_TYPES, per: SPIKE.handwritten.per, script: 'handwritten', correct: SPIKE.handwritten.correct, seed: 12 });
  put('files/spike_fields.csv', toCsv([...p, ...h], ['doc_id', 'doc_type', 'script', 'field', 'correct']));
  const ids = [...new Set([...p, ...h].map((r) => r.doc_id))];
  const typeOf = Object.fromEntries([...p, ...h].map((r) => [r.doc_id, r.doc_type]));
  const ok = exactly(ids.length, SPIKE.classification.correct, 13);
  const docs = ids.map((id, i) => ({ doc_id: id, true_type: typeOf[id], predicted_type: ok[i] ? typeOf[id] : (typeOf[id] === 'LTR' ? 'SITE' : 'LTR'), correct: ok[i] }));
  put('files/spike_docs.csv', toCsv(docs, ['doc_id', 'true_type', 'predicted_type', 'correct']));
}

// ======================================================================================
// Lab 1.2: the approved plan, the team, decisions, backlog, reference class, risk signals
// ======================================================================================
export const ROLES = [
  ['SP', 'الراعية', 'رغد الجهيم', 'وكيلة الوزارة لبرامج المنح. تملك الميزانية والقرار عند البوابات. ليست من فريق التسليم.'],
  ['PO', 'مالك المنتج', 'باسل السرحان', 'مدير عمليات المنح. يملك الخدمة ونطاقها ومعايير قبولها.'],
  ['DL', 'قائد التسليم', 'أنت', 'يخطط ويقدّر ويدير سجل المخاطر ويوصي عند البوابات.'],
  ['ML', 'مهندس تعلم الآلة لدى المورِّد المنفِّذ', 'طارق السهلي', 'يبني التصنيف والاستخراج ويضبطهما. موظف لدى المورِّد لا لدى الوزارة.'],
  ['DE', 'مهندس البيانات', 'فهد الرويس', 'يجهز البيانات وخطوط إدخال المستندات ويعد طلبات البيانات.'],
  ['EV', 'قائدة التقييم', 'جود العجلان', 'تبني مجموعات الاختبار الثابتة وتشغّل التقييم وتكتب نتائجه.'],
  ['DG', 'مديرة مكتب إدارة البيانات', 'أسماء الهديثي', 'تصنيف البيانات، وحماية البيانات الشخصية، وطلبات مشاركة البيانات.'],
  ['OP', 'مدير العمليات التقنية', 'مطلق الدخيل', 'يستلم الخدمة بعد الإطلاق ويشغّلها ويدير الحوادث.']
];
put('files/team.csv', csv([['code', 'role', 'name', 'responsibility'], ...ROLES]));

export const DECISIONS = [
  ['D01', 'تثبيت معايير الخروج ومجموعة الاختبار لمرحلة قبل بدئها'],
  ['D02', 'تشغيل التقييم على مجموعة الاختبار وكتابة نتائجه'],
  ['D03', 'قرار البوابة: المضي أو التوقف أو تغيير الاتجاه'],
  ['D04', 'قبول إصدار جديد من النموذج يفرضه المزوّد'],
  ['D05', 'تقديم طلب مشاركة البيانات إلى الجهة المصدر'],
  ['D06', 'تصنيف بيانات المشروع واعتماد وصول الفريق إليها'],
  ['D07', 'تعديل الهدف أو النطاق المعتمد للخدمة'],
  ['D08', 'قبول خطر متبقٍّ مستواه مرتفع'],
  ['D09', 'استلام الخدمة في التشغيل واعتماد وثيقة التسليم'],
  ['D10', 'تسمية مالك الحوادث ونائبه']
];
const ROLE_CODES = ROLES.map((r) => r[0]);
put('files/decisions.csv', csv([['id', 'decision'], ...DECISIONS]));
put('files/raci_template.csv', csv([['id', 'decision', ...ROLE_CODES], ...DECISIONS.map((d) => [...d, ...ROLE_CODES.map(() => '')])]));

// The reference matrix (trainer). R responsible, A accountable (exactly one), C consulted, I informed.
export const RACI = {
  D01: { PO: 'A', EV: 'R', DL: 'C', ML: 'C', SP: 'I' },
  D02: { EV: 'A', DE: 'R', ML: 'C', DL: 'I', PO: 'I' },
  D03: { SP: 'A', DL: 'R', PO: 'C', EV: 'C', DG: 'C', ML: 'I', OP: 'I' },
  D04: { PO: 'A', EV: 'R', ML: 'C', DL: 'C', OP: 'C' },
  D05: { DG: 'A', DE: 'R', DL: 'C', PO: 'C' },
  D06: { DG: 'A', DE: 'R', PO: 'C', DL: 'I' },
  D07: { SP: 'A', PO: 'R', DL: 'C', EV: 'C' },
  D08: { SP: 'A', DL: 'R', DG: 'C', PO: 'C' },
  D09: { OP: 'A', DL: 'R', PO: 'C', EV: 'C', DG: 'C', ML: 'C' },
  D10: { OP: 'A', DL: 'C', PO: 'I', SP: 'I' }
};
// The pairs that must never be the same role: who produces the evidence or the request, and who approves it.
export const SEGREGATION = [
  ['D03', 'EV', 'قائدة التقييم تنتج الدليل ولا تقرر البوابة'],
  ['D03', 'ML', 'المورِّد لا يقرر بوابة على نتائج عمله'],
  ['D04', 'ML', 'المورِّد لا يقبل تغييرًا يمس عمله'],
  ['D06', 'DE', 'من يطلب الوصول لا يعتمده'],
  ['D09', 'DL', 'قائد التسليم لا يستلم عمله بنفسه']
];
put('../labs/solutions/raci_reference.csv', csv([['id', 'decision', ...ROLE_CODES], ...DECISIONS.map(([id, d]) => [id, d, ...ROLE_CODES.map((c) => RACI[id][c] || '')])]));

// The plan the steering committee approved (released when lab 1.2 starts; it is not the answer of lab 1.1)
export const APPROVED_PLAN = [
  ['I1', 3, 'المستندات المطبوعة', 'يصل الاستخراج من المستندات المطبوعة إلى دقة 95% أو أكثر على مستوى الحقل', 'دقة الحقول المطبوعة 95% أو أكثر، ودقة تصنيف المستند 98% أو أكثر، على 600 حقل و200 مستند ثُبِّتت قبل التشغيل'],
  ['I2', 4, 'الاستمارات المكتوبة بخط اليد', 'يصل الاستخراج من المكتوب بخط اليد إلى دقة 90% أو أكثر بعد الضبط على الأرشيف الموسوم', 'دقة الحقول المكتوبة بخط اليد 90% أو أكثر على 400 حقل ثُبِّتت قبل التشغيل'],
  ['I3', 4, 'طابور المراجعة البشرية', 'تقل دقائق الموظف لكل طلب بنسبة 30% أو أكثر دون زيادة الأخطاء بعد المراجعة', 'متوسط دقائق المراجع لكل طلب 15.4 أو أقل (خط الأساس 22.0)، ونسبة الطلبات التي فيها خطأ بعد المراجعة 2.0% أو أقل، في تشغيل ظلّي على 300 طلب'],
  ['I4', 3, 'الإطلاق المحدود', 'تعمل الخدمة في منطقة واحدة دون أن ترتفع الشكاوى أو زمن المعالجة', 'لا حادث مستواه مرتفع في 4 أسابيع، وزمن المعالجة لكل طلب لا يزيد على خط الأساس']
];
put('files/approved_plan.csv', csv([['increment', 'weeks', 'scope', 'hypothesis', 'exit_criterion'], ...APPROVED_PLAN]));

// Backlog of the approved plan: holds too little evaluation and data work (planted).
export const BACKLOG = [
  ['B01', 'I1', 'build', 'إدخال الحزم الممسوحة ضوئيًا إلى الخدمة'],
  ['B02', 'I1', 'build', 'تصنيف المستند إلى أحد الأنواع السبعة'],
  ['B03', 'I1', 'build', 'استخراج الحقول من المستندات المطبوعة'],
  ['B04', 'I1', 'evaluation', 'بناء مجموعة اختبار ثابتة من 600 حقل مطبوع و200 مستند'],
  ['B05', 'I1', 'evaluation', 'تشغيل التقييم وكتابة تقرير المرحلة الأولى'],
  ['B06', 'I2', 'build', 'ضبط الاستخراج على الاستمارات المكتوبة بخط اليد'],
  ['B07', 'I2', 'data', 'وسم 400 حقل مكتوب بخط اليد للاختبار'],
  ['B08', 'I2', 'evaluation', 'تقييم الاستخراج من المكتوب بخط اليد'],
  ['B09', 'I3', 'build', 'شاشات طابور المراجعة للموظفين'],
  ['B10', 'I3', 'build', 'توجيه الحقول بحسب درجة الثقة'],
  ['B11', 'I3', 'adoption', 'تدريب المراجعين على الطابور'],
  ['B12', 'I3', 'build', 'الربط بنظام إدارة المنح'],
  ['B13', 'I4', 'build', 'تجهيز بيئة الإنتاج'],
  ['B14', 'I4', 'build', 'لوحة متابعة تشغيلية'],
  ['B15', 'I4', 'build', 'اختبار الأمن السيبراني'],
  ['B16', 'I4', 'adoption', 'أدلة المستخدم للموظفين'],
  ['B17', 'I4', 'adoption', 'إعلان الإطلاق للمبادرات المتقدمة'],
  ['B18', 'I4', 'data', 'ضبط مدة الاحتفاظ بالمستندات وحذفها']
];
put('files/backlog.csv', csv([['id', 'increment', 'type', 'title'], ...BACKLOG]));

// Reference class: past digital projects of the ministry and its peers (planned and actual weeks)
export const REFERENCE_CLASS = [
  ['RC01', 'ai', 'تصنيف رسائل البريد الوارد', 10, 12],
  ['RC02', 'non-ai', 'بوابة تقديم إلكترونية', 12, 12],
  ['RC03', 'ai', 'استخراج بيانات الفواتير', 12, 17],
  ['RC04', 'non-ai', 'نظام إدارة الاجتماعات', 20, 22],
  ['RC05', 'non-ai', 'تحديث موقع الوزارة', 8, 9],
  ['RC06', 'ai', 'مساعد أسئلة الموظفين', 8, 13],
  ['RC07', 'non-ai', 'ترحيل نظام الأرشيف', 15, 18],
  ['RC08', 'ai', 'قراءة النماذج الممسوحة في الموارد البشرية', 16, 28],
  ['RC09', 'non-ai', 'لوحة مؤشرات الأداء', 10, 13],
  ['RC10', 'non-ai', 'نظام المشتريات الصغيرة', 24, 30],
  ['RC11', 'ai', 'تلخيص محاضر اللجان', 6, 11],
  ['RC12', 'non-ai', 'تطبيق حجز القاعات', 6, 7],
  ['RC13', 'ai', 'مطابقة سجلات المستفيدين', 10, 22],
  ['RC14', 'non-ai', 'ربط نظام الرواتب', 14, 19]
];
put('files/reference_class.csv', csv([['id', 'kind', 'project', 'planned_weeks', 'actual_weeks'], ...REFERENCE_CLASS]));

// PERCENTILE.INC as spreadsheets compute it
export function percentileInc(values, p) {
  const v = [...values].sort((a, b) => a - b);
  const pos = (v.length - 1) * p;
  const lo = Math.floor(pos), hi = Math.ceil(pos);
  return v[lo] + (v[hi] - v[lo]) * (pos - lo);
}

export const RISK_SIGNALS = [
  ['S01', 'مذكرة الجدوى', 'دقة الحقول المكتوبة بخط اليد في التجربة أقل كثيرًا من المطبوعة، والراعية تطلب 98% للمعالجة دون تدخل بشري'],
  ['S02', 'مهندس البيانات', 'الأرشيف الموسوم لسنوات 2019 إلى 2025 لدى صندوق المبادرات الأهلية، ولم يُطلب بعد، وفيه بيانات شخصية'],
  ['S03', 'عقد المورِّد', 'النموذج إصدار يقدمه مزوّد النماذج في المستأجَر الحكومي، والعقد لا يذكر مدة إشعار قبل سحب الإصدار'],
  ['S04', 'مدير عمليات المنح', 'حقل المبلغ المطلوب يحدد قيمة المنحة، وخطأ فيه يعني منحة خاطئة أو رفض مبادرة مستحقة'],
  ['S05', 'مكتب إدارة البيانات', 'الحزم فيها أسماء ممثلي المبادرات وأرقام هوياتهم وأرقام تواصلهم، ومصنفة «مقيد»'],
  ['S06', 'مقابلات المراجعين', 'بعض المراجعين يقول إنه سيوقّع على ما تملؤه الخدمة إذا ازدحم الطابور'],
  ['S07', 'المورِّد', 'مهندس تعلم الآلة يعمل أيضًا لعميل آخر حتى نهاية الربع'],
  ['S08', 'الفئة المرجعية', 'مشروعات الذكاء الاصطناعي السابقة تجاوزت مددها المخططة أكثر من غيرها'],
  ['S09', 'إحصاء طلبات 2025', 'الاستمارات المكتوبة بخط اليد تأتي أكثر من المبادرات الصغيرة في القرى والأحياء البعيدة'],
  ['S10', 'المورِّد', 'تكلفة المعالجة لكل طلب في التجربة أعلى من تقدير العرض الفني']
];
put('files/risk_signals.csv', csv([['id', 'source', 'signal'], ...RISK_SIGNALS]));
put('files/risk_log_template.csv', csv([['id', 'signal', 'category', 'description', 'likelihood', 'impact', 'score', 'level', 'owner', 'treatment', 'trigger', 'status']]));

// National AI Risk Management Framework: level = likelihood x impact, each 1 to 4
export function riskLevel(score) {
  if (score <= 2) return 'منخفض';
  if (score <= 6) return 'متوسط';
  if (score <= 12) return 'مرتفع';
  return 'كارثي';
}
// Reference risk log after lab 1.2 (round 0), the trainer's: [id, signal, category, likelihood, impact, owner, treatment]
export const RISKS_REF = [
  ['R01', 'S01', 'model', 4, 3, 'PO', 'التخفيف'],
  ['R02', 'S02', 'data', 3, 3, 'DG', 'التخفيف'],
  ['R03', 'S03', 'vendor model change', 3, 3, 'PO', 'النقل والتخفيف'],
  ['R04', 'S04', 'people served', 2, 3, 'PO', 'التخفيف'],
  ['R05', 'S05', 'personal and classified data', 2, 4, 'DG', 'التخفيف'],
  ['R06', 'S06', 'adoption', 3, 2, 'PO', 'التخفيف'],
  ['R07', 'S07', 'vendor', 2, 2, 'DL', 'القبول'],
  ['R08', 'S08', 'schedule', 3, 2, 'DL', 'التخفيف'],
  ['R09', 'S09', 'people served', 3, 3, 'PO', 'التخفيف'],
  ['R10', 'S10', 'cost', 2, 2, 'DL', 'القبول']
];

// ======================================================================================
// Lab 2.1: the simulation. The committee's starting log, then three round packs
// ======================================================================================
// The committee's official log at the start of the simulation (released when lab 2.1 starts)
export const START_LOG = [
  ['R01', 'النموذج', 'دقة المكتوب بخط اليد تبقى دون معيار الخروج', 4, 3, 'PO', 'التخفيف', 'نتيجة تقييم المرحلة الثانية'],
  ['R02', 'البيانات', 'تأخر موافقة صندوق المبادرات الأهلية على مشاركة الأرشيف أو رفضها', 3, 3, 'DG', 'التخفيف', 'رد الجهة المصدر على الطلب'],
  ['R03', 'تغيير النموذج', 'سحب المزوّد لإصدار النموذج أثناء المشروع', 2, 3, 'PO', 'النقل', 'إشعار من المزوّد'],
  ['R04', 'الناس المخدومون', 'خطأ في المبلغ المطلوب يغيّر قيمة المنحة أو يرفض مبادرة مستحقة', 2, 3, 'PO', 'التخفيف', 'شكوى أو تدقيق عينة'],
  ['R05', 'البيانات الشخصية والمصنفة', 'وصول غير لازم إلى بيانات شخصية مصنفة «مقيد»', 2, 4, 'DG', 'التخفيف', 'مراجعة الصلاحيات الشهرية'],
  ['R06', 'التبني', 'المراجعون يعتمدون ما تملؤه الخدمة دون تحقق', 3, 2, 'PO', 'التخفيف', 'عينة التدقيق الأسبوعية'],
  ['R07', 'المورِّد', 'مهندس المورِّد غير متفرغ', 2, 2, 'DL', 'القبول', 'تأخر بند في اللوحة أكثر من أسبوع'],
  ['R08', 'المدة', 'تجاوز المدة المخططة', 3, 2, 'DL', 'التخفيف', 'تأخر بوابة عن موعدها'],
  ['R09', 'الناس المخدومون', 'أخطاء المكتوب بخط اليد تقع أكثر على المبادرات الصغيرة', 2, 3, 'PO', 'التخفيف', 'نتائج التقييم مقسومة بحسب نوع الكتابة']
];
put('files/sim/start_risk_log.csv', csv([['id', 'category', 'description', 'likelihood', 'impact', 'score', 'level', 'owner', 'treatment', 'trigger'], ...START_LOG.map(([id, c, d, l, i, o, t, tr]) => [id, c, d, l, i, l * i, riskLevel(l * i), o, t, tr])]));
put('files/sim/gate_record_template.csv', csv([['round', 'increment', 'exit_criterion', 'measured', 'met', 'cost_evidence', 'risk_evidence', 'decision', 'conditions', 'recommended_by', 'decided_by', 'evidence_by']]));

export const ROUNDS = {
  r1: {
    printed: { docs: 150, per: 4, correct: 574 },
    classification: { docs: 200, correct: 197 },
    budget: 1400000, planned_spend: 300000, actual_spend: 331000, week: 3, planned_week: 3
  },
  r2: {
    handwritten: { docs: 80, per: 5, correct: 338 },
    printed: { docs: 50, per: 4, correct: 191 },
    budget: 1400000, planned_spend: 700000, actual_spend: 812000, week: 8, planned_week: 7
  },
  r3: {
    // model version 4; auto-accepted fields and the rest, by script
    printed_auto: { n: 560, correct: 556 }, printed_rest: { n: 40, correct: 27 },
    hand_auto: { n: 80, correct: 78 }, hand_rest: { n: 320, correct: 264 },
    shadow: { packs: 300, minutes_total: 4080, packs_with_error: 5 },
    baseline_minutes: 22.0, baseline_error_pct: 2.0,
    budget: 1400000, planned_spend: 1100000, actual_spend: 1162000, week: 15, planned_week: 11
  }
};
{
  const R = ROUNDS.r1;
  const f = fieldRows({ prefix: 'R1-P', docs: R.printed.docs, types: PRINTED_TYPES, per: R.printed.per, script: 'printed', correct: R.printed.correct, seed: 21, version: 'v3' });
  put('files/sim/round1_eval_fields.csv', toCsv(f, ['doc_id', 'doc_type', 'script', 'field', 'model_version', 'correct']));
  const types = [...PRINTED_TYPES, 'DEC'];
  const ok = exactly(R.classification.docs, R.classification.correct, 22);
  const docs = ok.map((c, i) => { const t = types[i % types.length]; return { doc_id: `R1-D${String(i + 1).padStart(3, '0')}`, true_type: t, predicted_type: c ? t : (t === 'QUO' ? 'BUD' : 'QUO'), correct: c }; });
  put('files/sim/round1_eval_docs.csv', toCsv(docs, ['doc_id', 'true_type', 'predicted_type', 'correct']));
}
{
  const R = ROUNDS.r2;
  const h = fieldRows({ prefix: 'R2-H', docs: R.handwritten.docs, types: HAND_TYPES, per: R.handwritten.per, script: 'handwritten', correct: R.handwritten.correct, seed: 31, version: 'v3' });
  const p = fieldRows({ prefix: 'R2-P', docs: R.printed.docs, types: PRINTED_TYPES, per: R.printed.per, script: 'printed', correct: R.printed.correct, seed: 32, version: 'v3' });
  put('files/sim/round2_eval_fields.csv', toCsv([...h, ...p], ['doc_id', 'doc_type', 'script', 'field', 'model_version', 'correct']));
}
{
  const R = ROUNDS.r3;
  // 150 printed documents x 4 fields, 80 handwritten x 5; auto-accept flags placed among each script's rows
  const build = (prefix, docs, types, per, script, auto, rest, seed) => {
    const n = docs * per;
    const isAuto = exactly(n, auto.n, seed);
    const okAuto = exactly(auto.n, auto.correct, seed + 1);
    const okRest = exactly(rest.n, rest.correct, seed + 2);
    let a = 0, b = 0, i = 0;
    const rows = [];
    for (let d = 0; d < docs; d++) {
      const type = types[d % types.length];
      for (let f = 0; f < per; f++) {
        const auto1 = isAuto[i];
        const correct = auto1 ? okAuto[a++] : okRest[b++];
        rows.push({ doc_id: `${prefix}${String(d + 1).padStart(3, '0')}`, doc_type: type, script, field: FIELDS[type][f], model_version: 'v4', auto_accepted: auto1 ? 'yes' : 'no', correct });
        i++;
      }
    }
    return rows;
  };
  const p = build('R3-P', 150, PRINTED_TYPES, 4, 'printed', R.printed_auto, R.printed_rest, 41);
  const h = build('R3-H', 80, HAND_TYPES, 5, 'handwritten', R.hand_auto, R.hand_rest, 45);
  put('files/sim/round3_eval_fields.csv', toCsv([...p, ...h], ['doc_id', 'doc_type', 'script', 'field', 'model_version', 'auto_accepted', 'correct']));
  // Shadow run: 300 packs, reviewer minutes per pack (whole tenths) summing to minutes_total, 5 packs with an error after review
  const r = rng(47);
  const mins = [];
  for (let k = 0; k < R.shadow.packs; k++) mins.push(Math.round((9 + r() * 9.2) * 10) / 10);
  let diff = Math.round((R.shadow.minutes_total - mins.reduce((s, x) => s + x, 0)) * 10);
  for (let k = 0; diff !== 0; k = (k + 1) % mins.length) {
    const step = diff > 0 ? 1 : -1;
    const next = Math.round((mins[k] + step / 10) * 10) / 10;
    if (next >= 6 && next <= 24) { mins[k] = next; diff -= step; }
  }
  const err = exactly(R.shadow.packs, R.shadow.packs_with_error, 48);
  const rows = mins.map((m, k) => [`S3-${String(k + 1).padStart(3, '0')}`, k % 3 === 0 ? 'handwritten_present' : 'printed_only', m.toFixed(1), err[k]]);
  put('files/sim/round3_shadow.csv', csv([['pack_id', 'pack_kind', 'reviewer_minutes', 'error_after_review'], ...rows]));
}

// ======================================================================================
// Lab 2.2: the readiness checklist (course's own)
// ======================================================================================
export const CHECKLIST = [
  ['C01', 'مستوى الخدمة مكتوب بأرقام: زمن معالجة الطلب، وساعات التوفر'],
  ['C02', 'لكل مقياس مراقبة عتبة: دقة الحقول المقبولة آليًّا في عينة أسبوعية، ونسبة القبول الآلي، ودقائق المراجع، ونتائج كل نوع كتابة'],
  ['C03', 'لكل مقياس من يراقبه وكم مرة'],
  ['C04', 'مالك بشري للحوادث باسمه ونائبه، وطريق الإبلاغ عن الحادث بما فيه تسرب البيانات الشخصية'],
  ['C05', 'مستويات الحوادث وزمن الاستجابة لكل مستوى'],
  ['C06', 'إجراء تغيير النموذج: متابعة إشعارات المزوّد، وإعادة التقييم على مجموعة الاختبار الثابتة قبل التحويل، ومن يعتمد (ليس المورِّد)'],
  ['C07', 'تقويم السحب: الإصدار الحالي، وتاريخ سحبه إن أُعلن، والإصدار التالي الذي قُيِّم'],
  ['C08', 'التراجع: إلى أي حالة، ومن يقرره، وأقصى مدة للتحويل، ومتى اختُبر آخر مرة'],
  ['C09', 'معايير إيقاف الخدمة وخطواته: متى تتوقف، وما يحدث للبيانات والمستندات'],
  ['C10', 'البيانات: الاحتفاظ والحذف للأرشيف المشترك بحسب ضوابط المشاركة، والوصول داخل المستأجَر فقط'],
  ['C11', 'الناس المخدومون: كيف تطلب المبادرة تصحيح حقل، وحقل المبلغ يؤكده موظف دائمًا'],
  ['C12', 'جهات الاتصال: دعم المورِّد وساعاته بحسب العقد، وفريق التشغيل'],
  ['C13', 'الحدود المعروفة: ما لا تعالجه الخدمة آليًّا، ولماذا'],
  ['C14', 'الاستلام: يعتمده مدير العمليات التقنية، لا قائد التسليم ولا المورِّد، مع موعد أول مراجعة']
];
put('files/readiness_checklist.csv', csv([['id', 'item', 'section_in_handover', 'passed'], ...CHECKLIST.map(([id, t]) => [id, t, '', ''])]));
// Items the vendor's draft fails (planted): the trainer's key
export const VENDOR_DRAFT_GAPS = ['C02', 'C03', 'C04', 'C05', 'C06', 'C07', 'C08', 'C09', 'C10', 'C11', 'C14'];

// ======================================================================================
// Reference numbers
// ======================================================================================
const aiRatios = REFERENCE_CLASS.filter((r) => r[1] === 'ai').map((r) => r[4] / r[3]);
const allRatios = REFERENCE_CLASS.map((r) => r[4] / r[3]);
const planWeeks = APPROVED_PLAN.reduce((s, r) => s + r[1], 0);
const R3 = ROUNDS.r3;
const r3auto = R3.printed_auto.n + R3.hand_auto.n;
const r3autoOk = R3.printed_auto.correct + R3.hand_auto.correct;
const key = {
  lab_1_1: {
    printed_accuracy_pct: pct(SPIKE.printed.correct, SPIKE.printed.docs * SPIKE.printed.per),
    handwritten_accuracy_pct: pct(SPIKE.handwritten.correct, SPIKE.handwritten.docs * SPIKE.handwritten.per),
    overall_accuracy_pct: pct(SPIKE.printed.correct + SPIKE.handwritten.correct, SPIKE.printed.docs * SPIKE.printed.per + SPIKE.handwritten.docs * SPIKE.handwritten.per),
    classification_accuracy_pct: pct(SPIKE.classification.correct, SPIKE.classification.docs),
    fields_printed: SPIKE.printed.docs * SPIKE.printed.per,
    fields_handwritten: SPIKE.handwritten.docs * SPIKE.handwritten.per,
    expected_at_2025_mix_pct: r1((100 - SPIKE.handwritten_share_2025) / 100 * (100 * SPIKE.printed.correct / (SPIKE.printed.docs * SPIKE.printed.per)) + SPIKE.handwritten_share_2025 / 100 * (100 * SPIKE.handwritten.correct / (SPIKE.handwritten.docs * SPIKE.handwritten.per))),
    handwritten_needed_for_98_if_printed_100_pct: r1((98 - (100 - SPIKE.handwritten_share_2025)) / SPIKE.handwritten_share_2025 * 100)
  },
  lab_1_2: {
    plan_weeks: planWeeks,
    ai_ratio_p20: r2(percentileInc(aiRatios, 0.2)),
    ai_ratio_p50: r2(percentileInc(aiRatios, 0.5)),
    ai_ratio_p80: r2(percentileInc(aiRatios, 0.8)),
    all_ratio_p50: r2(percentileInc(allRatios, 0.5)),
    all_ratio_p80: r2(percentileInc(allRatios, 0.8)),
    range_weeks_low: r1(planWeeks * percentileInc(aiRatios, 0.2)),
    range_weeks_mid: r1(planWeeks * percentileInc(aiRatios, 0.5)),
    range_weeks_high: r1(planWeeks * percentileInc(aiRatios, 0.8)),
    range_weeks_high_all_projects: r1(planWeeks * percentileInc(allRatios, 0.8)),
    backlog_counts: BACKLOG.reduce((m, b) => { m[b[2]] = (m[b[2]] || 0) + 1; return m; }, {}),
    backlog_evaluation_by_increment: ['I1', 'I2', 'I3', 'I4'].reduce((m, inc) => { m[inc] = BACKLOG.filter((b) => b[1] === inc && b[2] === 'evaluation').length; return m; }, {}),
    raci: RACI,
    segregation: SEGREGATION.map(([d, role]) => [d, role]),
    risks: RISKS_REF.map(([id, s, c, l, i, o, t]) => ({ id, signal: s, category: c, likelihood: l, impact: i, score: l * i, level: riskLevel(l * i), owner: o, treatment: t }))
  },
  lab_2_1: {
    r1: {
      printed_accuracy_pct: pct(ROUNDS.r1.printed.correct, ROUNDS.r1.printed.docs * ROUNDS.r1.printed.per),
      classification_accuracy_pct: pct(ROUNDS.r1.classification.correct, ROUNDS.r1.classification.docs),
      spend_pct: pct(ROUNDS.r1.actual_spend, ROUNDS.r1.budget), planned_spend_pct: pct(ROUNDS.r1.planned_spend, ROUNDS.r1.budget),
      decision: 'go'
    },
    r2: {
      handwritten_accuracy_pct: pct(ROUNDS.r2.handwritten.correct, ROUNDS.r2.handwritten.docs * ROUNDS.r2.handwritten.per),
      printed_accuracy_pct: pct(ROUNDS.r2.printed.correct, ROUNDS.r2.printed.docs * ROUNDS.r2.printed.per),
      spend_pct: pct(ROUNDS.r2.actual_spend, ROUNDS.r2.budget), planned_spend_pct: pct(ROUNDS.r2.planned_spend, ROUNDS.r2.budget),
      decision: 'pivot'
    },
    r3: {
      printed_accuracy_pct: pct(R3.printed_auto.correct + R3.printed_rest.correct, R3.printed_auto.n + R3.printed_rest.n),
      handwritten_accuracy_pct: pct(R3.hand_auto.correct + R3.hand_rest.correct, R3.hand_auto.n + R3.hand_rest.n),
      overall_accuracy_pct: pct(R3.printed_auto.correct + R3.printed_rest.correct + R3.hand_auto.correct + R3.hand_rest.correct, 1000),
      auto_accept_share_pct: pct(r3auto, 1000),
      auto_accept_precision_pct: pct(r3autoOk, r3auto),
      auto_accept_precision_handwritten_pct: pct(R3.hand_auto.correct, R3.hand_auto.n),
      shadow_mean_minutes: r1(R3.shadow.minutes_total / R3.shadow.packs),
      shadow_reduction_pct: r1(100 * (1 - R3.shadow.minutes_total / R3.shadow.packs / R3.baseline_minutes)),
      shadow_error_pct: pct(R3.shadow.packs_with_error, R3.shadow.packs),
      spend_pct: pct(R3.actual_spend, R3.budget), planned_spend_pct: pct(R3.planned_spend, R3.budget),
      decision: 'go-limited'
    }
  },
  lab_2_2: { checklist_items: CHECKLIST.length, vendor_draft_gaps: VENDOR_DRAFT_GAPS }
};
put('../labs/solutions/key.json', JSON.stringify(key, null, 2) + '\n');

// ======================================================================================
// Write or compare
// ======================================================================================
let differ = 0;
for (const [rel, text] of out) {
  const path = join(labs, rel.startsWith('../labs/') ? rel.slice('../labs/'.length) : rel);
  if (CHECK) {
    const now = existsSync(path) ? readFileSync(path, 'utf8') : null;
    if (now !== text) { console.log('differs: ' + rel.replace('../labs/', '')); differ++; }
  } else {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, text);
  }
}
if (CHECK) {
  if (differ) process.exit(1);
  console.log(`same bytes: ${out.size} files`);
} else {
  console.log(`wrote ${out.size} files`);
}
