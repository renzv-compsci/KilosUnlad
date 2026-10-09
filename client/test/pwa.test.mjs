import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { runInNewContext } from 'node:vm';

// Inspect the actual production artifact. Run npm run build before this suite.
const source = await readFile(new URL('../dist/service-worker.js', import.meta.url), 'utf8');
const precache = [];
const routes = [];
let skipWaiting = false;
const workbox = {
  clientsClaim() {}, cleanupOutdatedCaches() {},
  precacheAndRoute(entries) { precache.push(...entries); },
  createHandlerBoundToURL(url) { return url; },
  NavigationRoute: class { constructor(handler, options) { this.handler = handler; this.options = options; } },
  registerRoute(route) { routes.push(route); },
};
const define = (dependencies, factory) => factory(workbox);
runInNewContext(source, { define, self: { define, addEventListener() {}, skipWaiting() { skipWaiting = true; } } });

test('production precache includes the exact built shell, scripts, styles and branding', async () => {
  const urls = precache.map(entry => entry.url);
  for (const required of ['index.html', 'manifest.json', 'icon.svg', 'images/login-background.png']) assert.ok(urls.includes(required), required);
  assert.ok(urls.some(url => /^assets\/.*\.js$/.test(url)));
  assert.ok(urls.some(url => /^assets\/.*\.css$/.test(url)));
  for (const entry of precache) {
    assert.doesNotMatch(entry.url, /^(?:api|test)\/|https?:|\.env|\.map$/);
    const bytes = await readFile(new URL(`../dist/${entry.url}`, import.meta.url));
    assert.ok(bytes.length > 0, entry.url);
    if (entry.revision) assert.equal(createHash('md5').update(bytes).digest('hex'), entry.revision, entry.url);
  }
});

test('API and QA navigation never receive app HTML and updates do not interrupt forms', () => {
  assert.equal(routes.length, 1);
  assert.equal(routes[0].handler, '/index.html');
  assert.ok(routes[0].options.denylist.some(pattern => pattern.test('/api/v1/tasks/assigned')));
  assert.ok(routes[0].options.denylist.some(pattern => pattern.test('/test/ux-preview.html')));
  assert.equal(skipWaiting, false);
});
