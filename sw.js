/// <reference lib="WebWorker" />

self.addEventListener('install', e => {
    console.log('service worker has been installed');
});

self.addEventListener("fetch", handleFetch);

/**
 * @param {FetchEvent} e
 */
async function handleFetch(e) {
	const { request } = e;

	if (request.url.startsWith("https://api.github.com/search")) {
		const promise = new Promise(async (resolve, reject) => {
            let response = await fetch(request);
            if(response.status === 403){
                //probably exceeded rate limit, fetch from cache instead
                const cache = await caches.open('static');
                response = await cache.match(request);
            } else if(response.status === 200){
                const cache = await caches.open('static');
                await cache.put(request, response.clone());
            }
            if(!response){
                return reject('failed to fetch via github search api');
            }
			resolve(response);
		});
		e.respondWith(promise);
	} else if(/^https:\/\/api.github.com\/repos\/.+\/.+\/contents\/module.json$/g.test(request.url)){
        console.log('intercepted module.json api');
    }
}
