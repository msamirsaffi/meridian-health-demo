/* Customer.io helper used by every page: identifyUser(), trackEvent(), getUser(), plus web push helpers.

   Two modes:
   1. JavaScript source (needed for web push). Set WRITE_KEY. Add VAPID_PUBLIC_KEY to enable web push.
   2. Classic Site ID snippet (fallback when WRITE_KEY is empty).
   If neither is set, calls only log to the console. */
(function () {
  var WRITE_KEY = "pk_us_oRe2NwLfCoAVtFN412DQIHwGZKlKPlxz_1e1eEF";              // JavaScript source public key (Data & Integrations > Sources > JavaScript)
  var VAPID_PUBLIC_KEY = "BBKwdaGVxWffArBkLYUWLdJMRRDplhyuiSOpqoTF9HqQDUkklgsMjvtDIf9FSjDnW2iUIuleBfZuFKWwvi1OGTg";       // Settings > Push > Web > Copy public key
  var SITE_ID = "c5cb2083499c59d8055b"; // classic fallback
  var REGION = "us";                  // "us" or "eu"
  var STORE_KEY = "meridian_user";

  var EU = REGION === "eu";
  var CDN = EU ? "https://cdp-eu.customer.io" : "https://cdp.customer.io";
  var TRACK = EU ? "https://track-eu.customer.io" : "https://track.customer.io";
  var modern = !!WRITE_KEY;
  var classic = !modern && !!SITE_ID && SITE_ID !== "YOUR_SITE_ID";

  function loadScript(src, cb) {
    var s = document.createElement("script");
    s.async = true; s.src = src;
    if (cb) { s.onload = cb; s.onerror = function () { console.warn("[cio] failed to load", src); }; }
    document.head.appendChild(s);
  }

  /* ---- Mode 1: JavaScript source ---- */
  if (modern) {
    var i = "cioanalytics", a = (window[i] = window[i] || []);
    if (!a.initialize && !a.invoked) {
      a.invoked = true;
      a.methods = ["trackSubmit","trackClick","trackLink","trackForm","pageview","identify","reset","group","track","ready","alias","debug","page","once","off","on","addSourceMiddleware","addIntegrationMiddleware","setAnonymousId","addDestinationMiddleware"];
      a.factory = function (m) { return function () { var t = Array.prototype.slice.call(arguments); t.unshift(m); a.push(t); return a; }; };
      for (var k = 0; k < a.methods.length; k++) a[a.methods[k]] = a.factory(a.methods[k]);
      a.load = function (key, opts) {
        var t = document.createElement("script");
        t.type = "text/javascript"; t.async = true;
        t.setAttribute("data-global-customerio-analytics-key", i);
        t.src = CDN + "/v1/analytics-js/snippet/" + key + "/analytics.min.js";
        var n = document.getElementsByTagName("script")[0];
        n.parentNode.insertBefore(t, n);
        a._loadOptions = opts;
      };
      a._writeKey = WRITE_KEY;
      a.SNIPPET_VERSION = "4.15.3";
      a.load(WRITE_KEY);
      a.page();
    }

    if (VAPID_PUBLIC_KEY) {
      loadScript(CDN + "/v1/analytics-js/webPushPlugin.js", function () {
        window.cioanalytics.ready(async function () {
          if (!window.CustomerIOWebPush) { console.warn("[cio] web push plugin did not load"); return; }
          await window.cioanalytics.register(window.CustomerIOWebPush.WebPushPlugin({
            vapidPublicKey: VAPID_PUBLIC_KEY,
            serviceWorkerUrl: "/cio-webpush-sw.js",
            trackUrl: TRACK
          }));
          window._cioWebPushReady = true;
          document.dispatchEvent(new Event("cio-webpush-ready"));
        });
      });
    }
  }

  /* ---- Mode 2: classic snippet ---- */
  if (classic) {
    window._cio = window._cio || [];
    ["load", "identify", "sidstatus", "track", "page"].forEach(function (f) {
      window._cio[f] = function () { window._cio.push([f].concat([].slice.call(arguments, 0))); };
    });
    var t = document.createElement("script");
    t.async = true; t.id = "cio-tracker";
    t.setAttribute("data-site-id", SITE_ID);
    t.setAttribute("data-use-array-params", "true");
    t.src = EU ? "https://assets.customer.io/assets/track-eu.js" : "https://assets.customer.io/assets/track.js";
    document.head.appendChild(t);
  }

  /* ---- Public helpers ---- */
  window.getUser = function () {
    try { return JSON.parse(localStorage.getItem(STORE_KEY) || "null"); } catch (e) { return null; }
  };

  window.identifyUser = function (attrs) {
    var merged = Object.assign({}, window.getUser() || {}, attrs);
    try { localStorage.setItem(STORE_KEY, JSON.stringify(merged)); } catch (e) {}
    var traits = Object.assign({}, attrs, { email: merged.email });
    console.log("[cio] identify", merged.email, traits);
    if (modern) window.cioanalytics.identify(merged.email, traits);
    else if (classic) window._cio.identify(Object.assign({ id: merged.email }, traits));
  };

  window.trackEvent = function (name, data) {
    console.log("[cio] track", name, data || {});
    if (modern) window.cioanalytics.track(name, data || {});
    else if (classic) window._cio.track(name, data || {});
  };

  window.cioMode = modern ? "javascript-source" : classic ? "classic" : "console-only";

  /* ---- Web push helpers (call from a click handler) ---- */
  window.webPushSupported = function () {
    return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  };
  window.webPushReady = function () {
    return !!(modern && VAPID_PUBLIC_KEY && window._cioWebPushReady && window.cioanalytics.webPush);
  };
  // Call subscribe() synchronously inside the click so Safari shows the prompt.
  window.webPushSubscribe = function () { return window.cioanalytics.webPush.subscribe(); };
  window.webPushUnsubscribe = function () { return window.cioanalytics.webPush.unsubscribe(); };
  window.webPushStatus = function () {
    return window.webPushReady() ? window.cioanalytics.webPush.subscription() : Promise.resolve(null);
  };
})();
