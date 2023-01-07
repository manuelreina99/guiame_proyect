
var dataCacheName = 'guiameData';
var cacheName = 'guiame';
var filesToCache = [
  '/',
  '/index.html'
];

const NOTIFICATION_OPTION_NAMES = [
    'actions', 'body', 'dir', 'icon', 'lang', 'renotify', 'requireInteraction', 'tag', 'vibrate', 'data'
];

self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(cacheName).then(function(cache) {
      return cache.addAll(filesToCache);
    })
  );
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keyList) {
      return Promise.all(keyList.map(function(key) {
        if (key !== cacheName && key !== dataCacheName) {
          return caches.delete(key);
        }
      }));
    })
  );
  /*
   * Fixes a corner case in which the app wasn't returning the latest data.
   * You can reproduce the corner case by commenting out the line below and
   * then doing the following steps: 1) load app for first time so that the
   * initial New York City data is shown 2) press the refresh button on the
   * app 3) go offline 4) reload the app. You expect to see the newer NYC
   * data, but you actually see the initial data. This happens because the
   * service worker is not yet activated. The code below essentially lets
   * you activate the service worker faster.
   */
  return self.clients.claim();
});

self.addEventListener('fetch', function(e) {
  //console.log('[Service Worker] Fetch', e.request.url);
});

self.addEventListener('push', function(event) {
  const desc = event.data.json().notification;
  console.log('Received push event:', desc);
  var options = {};
  NOTIFICATION_OPTION_NAMES.filter(name => desc.hasOwnProperty(name))
    .forEach(name => options[name] = desc[name]);

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(
        desc['title'], options),
    ])
  );
});

self.addEventListener('notificationclick', function(event) {
  console.log('notificationclick.event:', event);
  if (event.action === 'close') {
    event.notification.close();
  } else {
    var clickResponsePromise = Promise.resolve();
    if (event.notification.data && event.notification.data.url) {
      clickResponsePromise = clients.openWindow(event.notification.data.url);
    }
    if (event.notification.data && event.notification.data.idgrupo && event.notification.data.from) {
      clickResponsePromise = clients.openWindow(
        //to-do: app production url
        'localhost:5000/#/markasreaded?idgrupo=' +
        event.notification.data.idgrupo +
        '&idfrom=' + event.notification.data.idfrom +
        '&from=' + event.notification.data.from
        );
    }
    event.notification.close();
  }

  event.waitUntil(
    Promise.all([
      clickResponsePromise,
    ])
  );
});

self.addEventListener('notificationclose', function(event) {
  event.waitUntil(
    Promise.all([
    ])
  );
});

self.addEventListener('message', function (event) {
  if (event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});