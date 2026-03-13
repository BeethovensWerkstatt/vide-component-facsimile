/**
 * data-cache.js
 * Shared fetch-once promise cache stored on window.__BW_DataCache.
 *
 * Both SPA islands (facsimile, transcriptions) import this module from their
 * own src/. Because ES modules are evaluated once per realm and both modules
 * point to the same window object, whichever island fires first will populate
 * the cache entry; the second island receives the already-resolved promise and
 * makes no additional network request.
 */

const cache = (window.__BW_DataCache ??= new Map())

/**
 * Fetch a URL and cache the parsed JSON promise.
 * Subsequent calls with the same URL return the identical promise.
 * @param {string} url
 * @returns {Promise<any>}
 */
export function fetchCached(url) {
  if (!cache.has(url)) {
    cache.set(
      url,
      fetch(url).then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status} ${r.statusText} — ${url}`)
        return r.json()
      })
    )
  }
  return cache.get(url)
}
