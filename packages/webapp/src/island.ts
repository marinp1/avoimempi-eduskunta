/**
 * Island initialization utility.
 * Registers a module to run on DOMContentLoaded and after every htmx swap.
 * Use this instead of manually adding both event listeners.
 */
export function island(fn: () => void): void {
  document.addEventListener("DOMContentLoaded", fn);
  document.addEventListener("htmx:after:settle", fn);
}
