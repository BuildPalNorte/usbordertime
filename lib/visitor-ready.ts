/**
 * Client-safe. A first-time guest has no visitor cookie until `/api/visitor` answers. Anything that
 * posts guest activity waits on this first, or two requests with no cookie would each make their own
 * visitor. With no guest note pending, `whenVisitorNoted()` resolves at once.
 */
let pending: Promise<unknown> = Promise.resolve();

export function holdForVisitor(note: Promise<unknown>): void {
  pending = note.catch(() => {});
}

export function whenVisitorNoted(): Promise<unknown> {
  return pending;
}
