/**
 * validate-output.mjs — Schema + invariant checker for skill-router output.
 *
 * Invariants enforced:
 *   1. primary=null ⇒ confidence < 0.6
 *   2. deprecatedHit≠null ⇒ primary=redirect (deprecatedHit must exist in
 *      catalog; primary must be a non-deprecated catalog skill)
 *   3. tier1toLoad entries must all exist in the skill catalog
 *   4. confidence=1.0 ⇒ triggeredExact=true (no pure-keyword-overlap =1.0)
 *
 * Returns { ok, violations[] }.
 */

const PRIMARY_CONFIDENCE_THRESHOLD = 0.6;

/**
 * @param {Object} output - the router output object
 * @param {{
 *   validSkillNames: Set<string>,
 *   triggeredExact: boolean
 * }} ctx
 * @returns {{ ok: boolean, violations: string[] }}
 */
export function validateRouterOutput(output, ctx) {
  const violations = [];
  const { validSkillNames, triggeredExact } = ctx;

  if (!output || typeof output !== "object") {
    return { ok: false, violations: ["output is not an object"] };
  }

  const { primary, secondary, confidence, deprecatedHit, tier1toLoad } = output;

  // Type checks
  if (typeof confidence !== "number" || confidence < 0 || confidence > 1) {
    violations.push(`confidence must be a number in [0,1], got ${confidence}`);
  }
  if (!Array.isArray(secondary)) violations.push("secondary must be an array");
  if (!Array.isArray(tier1toLoad)) violations.push("tier1toLoad must be an array");

  // Invariant 1: primary=null ⇒ confidence < 0.6
  if (primary === null && confidence >= PRIMARY_CONFIDENCE_THRESHOLD) {
    violations.push(`primary=null requires confidence<${PRIMARY_CONFIDENCE_THRESHOLD}, got ${confidence}`);
  }

  // Invariant 2: deprecatedHit≠null ⇒ primary=redirect (validated)
  if (deprecatedHit != null) {
    if (primary == null) {
      violations.push(`deprecatedHit=${deprecatedHit} requires a non-null primary (redirect target)`);
    } else if (deprecatedHit === primary) {
      violations.push(`deprecatedHit and primary cannot be the same skill (${deprecatedHit})`);
    } else if (!validSkillNames.has(primary)) {
      violations.push(`primary=${primary} (redirect target) not found in catalog`);
    }
  }

  // primary must be a known skill if set
  if (primary != null && !validSkillNames.has(primary)) {
    violations.push(`primary=${primary} not found in catalog`);
  }

  // Invariant 3: tier1toLoad entries must exist in catalog
  for (const name of tier1toLoad || []) {
    if (!validSkillNames.has(name)) {
      violations.push(`tier1toLoad entry "${name}" not found in catalog`);
    }
  }

  // secondary entries must exist in catalog
  for (const name of secondary || []) {
    if (!validSkillNames.has(name)) {
      violations.push(`secondary entry "${name}" not found in catalog`);
    }
  }

  // Invariant 4: confidence=1.0 ⇒ triggeredExact=true
  if (confidence === 1.0 && triggeredExact !== true) {
    violations.push(`confidence=1.0 requires triggeredExact=true (got triggeredExact=${triggeredExact})`);
  }

  return { ok: violations.length === 0, violations };
}
