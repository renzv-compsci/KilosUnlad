// E2E-03a: RA 11310 (4Ps Act) Sec. 6 covers children aged 0 to 18. A child is
// eligible until the 19th birthday, counted on the Asia/Manila calendar date.
// The "18 and no longer enrolled" branch is not evaluated: no per-child
// enrollment field exists in the frozen schema (named limitation).
const MAX_ELIGIBLE_AGE = 18;
const manila = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' });

const toDate = value => {
  const date = value instanceof Date ? value : typeof value === 'string' ? new Date(value) : null;
  return date && Number.isFinite(date.getTime()) ? date : null;
};

// Birthdates are stored as UTC midnight of the calendar date of birth.
function ageOnManilaDate(birthdate, now) {
  const [y, m, d] = manila.format(now).split('-').map(Number);
  const by = birthdate.getUTCFullYear(), bm = birthdate.getUTCMonth() + 1, bd = birthdate.getUTCDate();
  return y - by - (m < bm || (m === bm && d < bd) ? 1 : 0);
}

function evaluateAgeOut(children = [], now = new Date()) {
  const summary = { total: 0, eligible: 0, aged_out: 0, unknown: 0 };
  const evaluated = (children || []).map(child => {
    summary.total++;
    const birthdate = toDate(child?.birthdate);
    const age = birthdate ? ageOnManilaDate(birthdate, now) : null;
    if (age === null || age < 0) {
      summary.unknown++;
      // Unknown dates never change the stored flag.
      return { birthdate: birthdate || child?.birthdate, is_eligible: child?.is_eligible === true, age: null };
    }
    const is_eligible = age <= MAX_ELIGIBLE_AGE;
    summary[is_eligible ? 'eligible' : 'aged_out']++;
    return { birthdate, is_eligible, age };
  });
  return { children: evaluated, summary };
}

module.exports = { evaluateAgeOut, ageOnManilaDate, MAX_ELIGIBLE_AGE };
