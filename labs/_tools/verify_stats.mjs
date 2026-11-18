// The numbers of the parallel examples on the slides and in the practice bank of LDS-PRD-204.
// None of them comes from a lab file: the examples use other services of the fictional ministry,
// so the slides never give a lab's answer. Run from the repository root:
//   node labs/_tools/verify_stats.mjs
const r1 = (x) => Math.round(x * 10) / 10;
const r2 = (x) => Math.round(x * 100) / 100;
const pct = (a, b) => r1((100 * a) / b);
function percentileInc(values, p) {
  const v = [...values].sort((a, b) => a - b);
  const pos = (v.length - 1) * p;
  const lo = Math.floor(pos), hi = Math.ceil(pos);
  return v[lo] + (v[hi] - v[lo]) * (pos - lo);
}
const level = (s) => (s <= 2 ? 'منخفض' : s <= 6 ? 'متوسط' : s <= 12 ? 'مرتفع' : 'كارثي');
const out = {};

// Day 1, session 1: the legal affairs correspondence routing service (typed letters and scanned faxes)
out.routing = {
  typed: { correct: 412, n: 430, pct: pct(412, 430) },
  faxes: { correct: 61, n: 80, pct: pct(61, 80) },
  overall_pct: pct(473, 510)
};

// Day 1, session 2: a reference class of five projects, a 10-week plan
const ratios = [11 / 10, 13 / 10, 12 / 8, 18 / 10, 16 / 8];
out.reference = {
  ratios: ratios.map(r2),
  p20: r2(percentileInc(ratios, 0.2)), p50: r2(percentileInc(ratios, 0.5)), p80: r2(percentileInc(ratios, 0.8)),
  weeks_low: r1(10 * percentileInc(ratios, 0.2)), weeks_mid: r1(10 * percentileInc(ratios, 0.5)), weeks_high: r1(10 * percentileInc(ratios, 0.8))
};

// Day 1, session 2: two risks of the routing service
out.risks = [[3, 4], [2, 2], [4, 3], [1, 2]].map(([l, i]) => ({ likelihood: l, impact: i, score: l * i, level: level(l * i) }));

// Day 1, session 3: a gate on the routing service (exit criterion 90% on 400 letters)
out.gate = { correct: 350, n: 400, pct: pct(350, 400), exit: 90 };

// Day 2, session 2: monitoring of the routing service after launch (weekly audit sample of 200)
out.monitoring = { weeks: [[196, 200], [195, 200], [189, 200]].map(([c, n]) => pct(c, n)), threshold: 96 };

// Bank: a reference class of four projects and an 8-week plan
const bankRatios = [1.2, 1.4, 1.5, 2.1];
out.bank_reference = { p50: r2(percentileInc(bankRatios, 0.5)), p80: r2(percentileInc(bankRatios, 0.8)), weeks_mid: r1(8 * percentileInc(bankRatios, 0.5)), weeks_high: r1(8 * percentileInc(bankRatios, 0.8)) };
// Bank: a gate (exit 92% on 250 fields) and a mixed set
out.bank_gate = { pct: pct(226, 250) };
out.bank_mix = { expected_pct: r1(0.8 * 96 + 0.2 * 70) };

console.log(JSON.stringify(out, null, 2));
