import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const repoRoot = process.cwd();

function repoPath(...parts: string[]) {
  return path.join(repoRoot, ...parts);
}

async function readRepoFile(...parts: string[]) {
  return readFile(repoPath(...parts), 'utf8');
}

test('index.html exposes SignalDesk PWA metadata', async () => {
  const html = await readRepoFile('index.html');

  assert.match(html, /<title>SignalDesk<\/title>/);
  assert.match(
    html,
    /<meta\s+name="description"\s+content="Chinese-first personal intelligence dashboard for high-signal AI, crypto, markets, policy, robotics, and energy information\."\s*\/?>/,
  );
  assert.match(html, /<meta\s+name="theme-color"\s+content="#111318"\s*\/?>/);
  assert.match(html, /<meta\s+name="application-name"\s+content="SignalDesk"\s*\/?>/);
  assert.match(html, /<meta\s+name="apple-mobile-web-app-capable"\s+content="yes"\s*\/?>/);
  assert.match(html, /<meta\s+name="apple-mobile-web-app-title"\s+content="SignalDesk"\s*\/?>/);
  assert.match(html, /<meta\s+name="apple-mobile-web-app-status-bar-style"\s+content="black-translucent"\s*\/?>/);
  assert.match(html, /<meta\s+name="viewport"\s+content="width=device-width,\s*initial-scale=1(?:\.0)?,\s*viewport-fit=cover"\s*\/?>/);
  assert.match(html, /<meta\s+name="color-scheme"\s+content="dark"\s*\/?>/);
  assert.match(html, /<link\s+rel="manifest"\s+href="\/manifest\.webmanifest"\s*\/?>/);
  assert.match(html, /<link\s+rel="apple-touch-icon"\s+sizes="120x120"\s+href="\/apple-touch-icon-120x120\.png"\s*\/?>/);
  assert.match(html, /<link\s+rel="apple-touch-icon"\s+sizes="152x152"\s+href="\/apple-touch-icon-152x152\.png"\s*\/?>/);
  assert.match(html, /<link\s+rel="apple-touch-icon"\s+sizes="167x167"\s+href="\/apple-touch-icon-167x167\.png"\s*\/?>/);
  assert.match(html, /<link\s+rel="apple-touch-icon"\s+sizes="180x180"\s+href="\/apple-touch-icon-180x180\.png"\s*\/?>/);
  assert.match(html, /<link\s+rel="icon"\s+type="image\/png"\s+href="\/icons\/icon-192\.png"\s*\/?>/);
  assert.doesNotMatch(html, /My Google AI Studio App/);
});

test('manifest declares standalone SignalDesk install metadata and icons', async () => {
  const manifest = JSON.parse(await readRepoFile('public', 'manifest.webmanifest'));

  assert.equal(manifest.name, 'SignalDesk');
  assert.equal(manifest.short_name, 'SignalDesk');
  assert.equal(
    manifest.description,
    'Chinese-first personal intelligence dashboard for high-signal AI, crypto, markets, policy, robotics, and energy information.',
  );
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.start_url, '/');
  assert.equal(manifest.scope, '/');
  assert.equal(manifest.orientation, 'portrait');
  assert.equal(manifest.theme_color, '#111318');
  assert.equal(manifest.background_color, '#111318');

  assert.deepEqual(
    manifest.icons,
    [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/icons/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  );
});

test('offline fallback is self-contained and keeps the dark SignalDesk look', async () => {
  const offlineHtml = await readRepoFile('public', 'offline.html');

  assert.match(offlineHtml, /SignalDesk/);
  assert.match(offlineHtml, /当前处于离线状态|离线/);
  assert.match(offlineHtml, /#111318/i);
  assert.match(offlineHtml, /#00e5ff/i);
  assert.doesNotMatch(offlineHtml, /fonts\.googleapis\.com/);
  assert.doesNotMatch(offlineHtml, /fonts\.gstatic\.com/);
  assert.doesNotMatch(offlineHtml, /https?:\/\/[^"'\s>]+/);
});

test('apple touch icon is available from both explicit and root iOS paths', async () => {
  const filenames = [
    'apple-touch-icon.png',
    'apple-touch-icon-120x120.png',
    'apple-touch-icon-152x152.png',
    'apple-touch-icon-167x167.png',
    'apple-touch-icon-180x180.png',
  ];

  for (const filename of filenames) {
    const icon = await readFile(repoPath('public', filename));
    assert.ok(icon.length > 0, `${filename} should exist`);
  }
});

test('service worker uses versioned shell caching with cleanup and strict exclusions', async () => {
  const serviceWorker = await readRepoFile('public', 'sw.js');

  assert.match(serviceWorker, /signaldesk-shell-v\d+/);
  assert.match(serviceWorker, /self\.addEventListener\('install'/);
  assert.match(serviceWorker, /self\.addEventListener\('activate'/);
  assert.match(serviceWorker, /caches\.keys\(\)/);
  assert.match(serviceWorker, /cache\.addAll/);
  assert.match(serviceWorker, /offline\.html/);
  assert.match(serviceWorker, /apple-touch-icon-180x180\.png/);
  assert.match(serviceWorker, /request\.method\s*!==\s*'GET'/);
  assert.match(serviceWorker, /url\.origin\s*!==\s*self\.location\.origin/);
  assert.match(serviceWorker, /url\.pathname\.startsWith\('\/api\/'\)/);
  assert.match(serviceWorker, /request\.mode\s*===\s*'navigate'/);
});

test('production-only service worker registration helper registers exactly /sw.js', async () => {
  const {registerServiceWorker} = await import('./registerServiceWorker');

  const calls: string[] = [];
  await registerServiceWorker({
    isProd: false,
    serviceWorker: {
      register: async (url: string) => {
        calls.push(url);
        return {} as ServiceWorkerRegistration;
      },
    },
  });
  assert.deepEqual(calls, []);

  await registerServiceWorker({
    isProd: true,
    serviceWorker: undefined,
  });
  assert.deepEqual(calls, []);

  await registerServiceWorker({
    isProd: true,
    serviceWorker: {
      register: async (url: string) => {
        calls.push(url);
        return {} as ServiceWorkerRegistration;
      },
    },
  });

  assert.deepEqual(calls, ['/sw.js']);
});

test('bottom navigation and app shell reserve iPhone safe-area space', async () => {
  const appSource = await readRepoFile('src', 'App.tsx');
  const navSource = await readRepoFile('src', 'components', 'BottomNav.tsx');

  assert.match(appSource, /safe-area-inset-bottom/);
  assert.match(navSource, /safe-area-inset-bottom/);
});

test('detail-style standalone views keep interactive headers below the iPhone status bar', async () => {
  const detailSource = await readRepoFile('src', 'views', 'DetailView.tsx');
  const topicSource = await readRepoFile('src', 'views', 'TopicSynthesisView.tsx');
  const watchlistSource = await readRepoFile('src', 'views', 'WatchlistItemDetailView.tsx');

  assert.match(detailSource, /safe-area-inset-top/);
  assert.match(detailSource, /calc\(4rem \+ env\(safe-area-inset-top, 0px\)\)/);
  assert.match(topicSource, /safe-area-inset-top/);
  assert.match(watchlistSource, /safe-area-inset-top/);
});
