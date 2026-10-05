// dom-accessibility-api (a transitive dependency of @testing-library/dom,
// not a new dependency of this project) ships its exports map with no
// "types" condition, so tsconfig.json's "bundler" moduleResolution cannot
// resolve its real .d.ts even though it exists on disk - a known upstream
// packaging gap. This declares just the one export UserManagement.test.tsx
// uses (STYLE-11), computing the ARIA accessible-name algorithm rather than
// a hand-rolled check that would miss a <label for> association.
declare module "dom-accessibility-api" {
  export function computeAccessibleName(node: Element, options?: unknown): string;
}
