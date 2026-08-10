/**
 * Automatic checking of lesson steps.
 *
 * A step may carry a `check` rule. When the child runs their program (Python)
 * or presses "check my work" (Scratch), the workspace produces a `facts` object
 * describing what they actually built, and these rules are matched against it.
 *
 * Facts come from the structure of the work, never from its text:
 *   Scratch — block opcodes read out of the VM
 *   Python  — the parse tree from Python's own `ast` module
 *
 * That distinction matters: `while` written inside a comment is not a loop, and
 * a child who types the right words in the wrong place has not done the step.
 *
 * ---------------------------------------------------------------------------
 * Rule types
 *
 *   Scratch
 *     { block: 'control_forever', min: 1 }        a block is used
 *     { block: 'motion_movesteps', inside: 'control_repeat' }
 *     { variables: 1 }                            at least n variables exist
 *     { variableNamed: 'score' }                  a variable with that name exists
 *     { sprites: 2 }                              at least n sprites exist
 *
 *   Python
 *     { node: 'While', min: 1 }                   While / For / If / FunctionDef …
 *     { call: 'print', min: 2 }                   a function is called
 *     { imports: 'pygame' }                       a module is imported
 *     { assigns: 'score' }                        a variable is created
 *     { nestedLoops: 1 }                          a loop inside a loop
 *
 *   Either
 *     { any: [ruleA, ruleB] }                     one of them is enough
 *     { all: [ruleA, ruleB] }                     both required
 */

/** Does `facts` satisfy `rule`? Returns null when it cannot be judged. */
export function evaluateCheck(rule, facts) {
  if (!rule) return null            // no rule — the child ticks it themselves
  if (!facts) return null           // nothing to judge yet

  if (rule.any) return rule.any.some((inner) => evaluateCheck(inner, facts) === true)
  if (rule.all) return rule.all.every((inner) => evaluateCheck(inner, facts) === true)

  const atLeast = rule.min ?? 1

  /* ------------------------------------------------------------- Scratch */
  if (rule.block) {
    if (facts.kind !== 'scratch') return null
    if (rule.inside) {
      return (facts.inside?.[`${rule.block}<${rule.inside}`] ?? 0) >= atLeast
    }
    return (facts.blocks?.[rule.block] ?? 0) >= atLeast
  }

  if (rule.variables != null) {
    if (facts.kind !== 'scratch') return null
    return (facts.variables?.length ?? 0) >= rule.variables
  }

  /*
   * Checking by name rather than by count, because an empty Scratch project
   * already contains one variable ("mijn variabele" / "my variable"). Counting
   * would tick "make a variable called score" before the child did anything.
   */
  if (rule.variableNamed) {
    if (facts.kind !== 'scratch') return null
    const wanted = rule.variableNamed.toLowerCase()
    return (facts.variables ?? []).some((name) => name.toLowerCase().includes(wanted))
  }

  if (rule.sprites != null) {
    if (facts.kind !== 'scratch') return null
    return (facts.sprites ?? 0) >= rule.sprites
  }

  /* -------------------------------------------------------------- Python */
  if (rule.node) {
    if (facts.kind !== 'python') return null
    return (facts.nodes?.[rule.node] ?? 0) >= atLeast
  }

  if (rule.call) {
    if (facts.kind !== 'python') return null
    return (facts.calls?.[rule.call] ?? 0) >= atLeast
  }

  if (rule.imports) {
    if (facts.kind !== 'python') return null
    return (facts.imports ?? []).includes(rule.imports)
  }

  if (rule.assigns) {
    if (facts.kind !== 'python') return null
    return (facts.names ?? []).includes(rule.assigns)
  }

  if (rule.nestedLoops != null) {
    if (facts.kind !== 'python') return null
    return (facts.loops_nested ?? 0) >= rule.nestedLoops
  }

  return null
}

/**
 * A lesson's steps may be plain strings or objects carrying a check:
 *
 *   'Press Run and watch the console.'
 *   { text: 'Write a while loop.', check: { node: 'While' } }
 *
 * This normalises both into the same shape so the panel does not care.
 */
export function normaliseStep(step) {
  if (typeof step === 'string') return { text: step, check: null }
  return { text: step.text ?? '', check: step.check ?? null }
}
