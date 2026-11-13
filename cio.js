/* Customer.io helper used by every page: identifyUser(), trackEvent(), getUser().
   Set SITE_ID below. While it is "YOUR_SITE_ID" the calls only log to the console. */
(function () {
  var SITE_ID = "YOUR_SITE_ID";
  var REGION = "us"; // "us" or "eu"
  var STORE_KEY = "meridian_user";
  var live = SITE_ID && SITE_ID !== "YOUR_SITE_ID";

  window._cio = window._cio || [];
  ["load", "identify", "sidstatus", "track", "page"].forEach(function (f) {
    window._cio[f] = function () { window._cio.push([f].concat([].slice.call(arguments, 0))); };
  });

  if (live) {
    var t = document.createElement("script");
    t.async = true;
    t.id = "cio-tracker";
    t.setAttribute("data-site-id", SITE_ID);
    t.setAttribute("data-use-array-params", "true");
    t.src = REGION === "eu" ? "https://assets.customer.io/assets/track-eu.js" : "https://assets.customer.io/assets/track.js";
    document.head.appendChild(t);
  }

  window.getUser = function () {
    try { return JSON.parse(localStorage.getItem(STORE_KEY) || "null"); } catch (e) { return null; }
  };

  window.identifyUser = function (attrs) {
    var merged = Object.assign({}, window.getUser() || {}, attrs);
    try { localStorage.setItem(STORE_KEY, JSON.stringify(merged)); } catch (e) {}
    var payload = Object.assign({ id: merged.email }, attrs, { email: merged.email });
    console.log("[cio] identify", payload);
    if (live) window._cio.identify(payload);
  };

  window.trackEvent = function (name, data) {
    console.log("[cio] track", name, data || {});
    if (live) window._cio.track(name, data || {});
  };
})();
