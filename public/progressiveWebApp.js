(function() {
	'use strict';

	// Add service worker
	if ('serviceWorker' in navigator) {
		navigator.serviceWorker
			.register('./serviceWorker.js')
			.then(function(swReg) {
				swReg.addEventListener('updatefound', () => {
				if(swReg.installing){
					let newWorker = swReg.installing;
					console.log('Service Worker Update detected:', newWorker);
					newWorker.postMessage({ action: 'skipWaiting' });
				}
			});
		});
	}
})();