// The passphrase screen in front of the CMS at /admin on the public site.
//
// The CMS pages are injected by @codeyam/cms with their own document shell, so
// the screen is added after the build: `astro.config.mjs` runs
// `injectAdminGate` over every built page under `admin/`. Only the SHA-256 hash
// of the ADMIN_PASSPHRASE secret is written into the page — never the
// passphrase itself — and the browser hashes what the visitor types and
// compares. Deterrent-level, like the old preview gate: the CMS pages still
// carry content in their HTML, and saving an edit needs a GitHub token anyway.
import { createHash } from 'node:crypto';

export const ADMIN_PASSPHRASE = process.env.ADMIN_PASSPHRASE ?? '';

/** Lowercase hex SHA-256 of the trimmed passphrase (what the browser computes). */
export function passphraseHash(pass: string): string {
  return createHash('sha256').update(pass.trim(), 'utf8').digest('hex');
}

/** Throw when /admin is being built for deployment without a passphrase. */
export function assertAdminPassphrase(pass: string = ADMIN_PASSPHRASE): void {
  if (pass.trim() === '') {
    throw new Error(
      'ADMIN_PASSPHRASE is empty. Set it with `gh secret set ADMIN_PASSPHRASE` ' +
        '(see DEPLOY_SETUP.md). Shipping /admin without it would leave the CMS ' +
        'with no passphrase screen.',
    );
  }
}

/** The <head> markup: noindex plus a script that blocks the page until unlocked. */
export function adminGateMarkup(hash: string): string {
  return `<meta name="robots" content="noindex, nofollow">
<script>(function(){var K='hait-admin-ok',H='${hash}';try{if(sessionStorage.getItem(K)===H)return;}catch(e){}
var st=document.createElement('style');st.id='admin-gate-hide';st.textContent='body>*:not(#admin-gate){display:none!important}';(document.head||document.documentElement).appendChild(st);
function hex(b){return Array.prototype.map.call(new Uint8Array(b),function(x){return('0'+x.toString(16)).slice(-2)}).join('')}
function build(){if(document.getElementById('admin-gate'))return;var w=document.createElement('div');w.id='admin-gate';
w.setAttribute('style','position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;background:#1e1a1b;padding:24px;font-family:Helvetica Neue,Helvetica,Arial,sans-serif');
w.innerHTML='<form style="background:#fff;border-radius:6px;padding:34px 30px;max-width:380px;width:100%;text-align:center"><h1 style="font-size:18px;margin:0 0 6px;color:#1e1a1b">Harvard Alumni in Tech</h1><p style="color:#5c5559;font-size:13px;margin:0 0 18px">Site editors only. Enter the admin passphrase.</p><input id="ag-pass" type="password" placeholder="Passphrase" autocomplete="current-password" style="width:100%;padding:11px 12px;font-size:15px;border:1px solid rgba(30,26,27,.2);border-radius:4px;margin-bottom:12px;box-sizing:border-box"><button style="width:100%;padding:11px;font-size:14px;font-weight:700;color:#fff;background:#a41034;border:0;border-radius:4px;cursor:pointer">Enter</button><div id="ag-err" style="color:#a4102f;font-size:12px;min-height:16px;margin-top:8px"></div></form>';
document.body.appendChild(w);var i=w.querySelector('#ag-pass'),e=w.querySelector('#ag-err');i.focus();
w.querySelector('form').addEventListener('submit',function(ev){ev.preventDefault();crypto.subtle.digest('SHA-256',new TextEncoder().encode(i.value.trim())).then(function(b){
if(hex(b)===H){try{sessionStorage.setItem(K,H)}catch(x){}st.remove();w.remove();}else{e.textContent='Incorrect passphrase.';i.value='';i.focus();}});});}
if(document.body)build();else document.addEventListener('DOMContentLoaded',build);})();</script>`;
}

/** Insert the gate right after <head>. Idempotent. */
export function injectAdminGate(html: string, hash: string): string {
  if (html.includes('hait-admin-ok')) return html;
  const markup = adminGateMarkup(hash);
  const m = html.match(/<head[^>]*>/i);
  if (!m || m.index === undefined) return markup + html;
  const at = m.index + m[0].length;
  return html.slice(0, at) + markup + html.slice(at);
}
