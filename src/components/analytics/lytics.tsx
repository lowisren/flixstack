import { Suspense } from "react";
import Script from "next/script";
import { LyticsPageViews } from "./lytics-page-views";

// Lytics Tracking Tag, version 3 — copied verbatim from the Lytics dashboard except
// for the trailing jstag.pageView() call, which lives in <LyticsPageViews /> instead so
// that client-side route changes are also counted (without double-counting the first
// view). The stub below queues any jstag.* calls made before the real library lands.
const LYTICS_TAG = `!function(){"use strict";var o=window.jstag||(window.jstag={}),r=[];function n(e){o[e]=function(){for(var n=arguments.length,t=new Array(n),i=0;i<n;i++)t[i]=arguments[i];r.push([e,t])}}n("send"),n("mock"),n("identify"),n("pageView"),n("unblock"),n("getid"),n("setid"),n("loadEntity"),n("getEntity"),n("on"),n("once"),n("call"),o.loadScript=function(n,t,i){var e=document.createElement("script");e.async=!0,e.src=n,e.onload=t,e.onerror=i;var o=document.getElementsByTagName("script")[0],r=o&&o.parentNode||document.head||document.body,c=o||r.lastChild;return null!=c?r.insertBefore(e,c):r.appendChild(e),this},o.init=function n(t){return this.config=t,this.loadScript(t.src,function(){if(o.init===n)throw new Error("Load error!");o.init(o.config),function(){for(var n=0;n<r.length;n++){var t=r[n][0],i=r[n][1];o[t].apply(o,i)}r=void 0}()}),this}}();

jstag.init({
  src: 'https://c.lytics.io/api/tag/e6698b06b5b2cc040909842d6606ad87/latest.min.js'
});`;

// Mounted once in the root layout. "beforeInteractive" is the App Router equivalent of
// dropping the tag in <head>: Next serialises the snippet into the initial HTML and runs
// it via its own runtime before any hydration, so window.jstag exists before app code.
export function Lytics() {
  return (
    <>
      {/* The rule below predates the App Router and asks for pages/_document.js; in the
          App Router the root layout is the documented home for beforeInteractive. */}
      {/* eslint-disable-next-line @next/next/no-before-interactive-script-outside-document */}
      <Script
        id="lytics-tag"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{ __html: LYTICS_TAG }}
      />
      {/* useSearchParams opts its subtree into client rendering — the boundary keeps
          statically prerendered routes prerendered. */}
      <Suspense fallback={null}>
        <LyticsPageViews />
      </Suspense>
    </>
  );
}
