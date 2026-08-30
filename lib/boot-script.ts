/**
 * The tiny pre-paint boot script injected in the document <head>. It applies the
 * saved light/dark theme before first paint to avoid a flash of the wrong theme.
 *
 * It is a static inline script, allowed by the static CSP's `'unsafe-inline'`
 * (see next.config.mjs). It runs before hydration, so the root layout marks its
 * <script> and <html> with suppressHydrationWarning.
 */
export const BOOT_SCRIPT = `try{var m=document.cookie.match(/(?:^|; )theme=([^;]+)/);var t=m?m[1]:'system';var d=t==='dark'||(t!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);}catch(e){}`;
