/**
 * Ambient declarations for CSS imports.
 *
 * `animated-icon.web.tsx` and `constants/theme.ts` import CSS (Metro's web
 * bundler handles the actual stylesheets). TypeScript needs to be told those
 * specifiers resolve, otherwise the side-effect import is an error under
 * `noUncheckedSideEffectImports`.
 */

declare module "*.module.css" {
  const classes: Record<string, string>;
  export default classes;
}

declare module "*.css";