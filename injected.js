(function () {
    const originalFetch = window.fetch;    
    console.log('Tidal Atmos Extension injected');
    window.fetch = function (input, init = {}) {
        try {
            const headers = new Headers(init?.headers || {});
            const auth = headers.get("Authorization");
            if (auth && auth.startsWith("Bearer ")) {
                window.postMessage({ type: "TIDAL_AUTH_TOKEN", token: auth }, "*");
            }
        } catch (e) {
            console.warn("[EXT] Fetch patch error:", e);
        }
        return originalFetch.apply(this, arguments);
    };
})();
