// Wrap the entire script in an IIFE to create a private scope and protect the global namespace.
(() => {
    // --- 1. CACHE DOM ELEMENTS ---
    const preloader = document.getElementById('preloader');
    const preloaderContent = document.querySelector('.preloader-content');
    const pageHeader = document.querySelector('.page-header');
    const mainContainer = document.querySelector('.container');
    const webcamVideo = document.getElementById('webcam');
    const galleryImages = document.querySelectorAll('.media-link img');
    const i18nElements = document.querySelectorAll('[data-i18n-key]');

    // --- DICTIONARY FOR TRANSLATIONS ---
    const translations = {
        'en': {
            welcomeMessage: "This site uses your webcam to enhance the experience. <br> Please don't be shy!",
            aboutLink: "whoami"
        },
        'it': {
            welcomeMessage: "Questo sito richiede l'accesso alla webcam per essere più bello. <br> Non fate i timidi!",
            aboutLink: "chisono"
        }
    };

    // --- FUNCTION DEFINITIONS  ---

    /**
     * Translates page content based on the browser's language.
     */
    function translatePage() {
        const userLang = navigator.language.substring(0, 2);
        const language = userLang === 'it' ? 'it' : 'en';

        i18nElements.forEach(element => {
            const key = element.dataset.i18nKey;
            const translation = translations[language][key];
            if (translation !== undefined) {
                element.innerHTML = translation;
                if (key === 'welcomeMessage') {
                    element.setAttribute('data-text', element.innerText);
                }
            }
        });
    }

    /**
     * Requests access to the user's webcam and streams it to the video element.
     */
    function requestWebcamAccess() {
        if (!webcamVideo) return;

        navigator.mediaDevices.getUserMedia({ video: true })
            .then(stream => {
                webcamVideo.srcObject = stream;
            })
            .catch(error => { console.log("Webcam access was not granted:", error.name); });
    }

    /**
     * Sets up the clickable image gallery functionality.
     */
    function setupImageGallery() {
        galleryImages.forEach(img => {
            const originalSrc = img.src;
            const gallery = img.dataset.gallery ? img.dataset.gallery.split(',') : [];
            let index = 0;
            
            if (gallery.length === 0) return;

            img.addEventListener('click', () => {
                index = (index + 1) % (gallery.length + 1);
                img.src = index === 0 ? originalSrc : gallery[index - 1];
            });
        });
    }

    // --- PRELOADER LOGIC ---

    let isContentLoaded = false;
    let isTimerFinished = false;

    /**
     * This is the final function that hides the preloader.
     */
    function finishLoading() {
        if (isContentLoaded && isTimerFinished) {
            document.body.classList.add('loading-finished');

            setTimeout(() => {
                if (preloader) preloader.classList.add('hidden');
                if (pageHeader) pageHeader.classList.add('visible');
                if (mainContainer) mainContainer.classList.add('visible');
                
                requestWebcamAccess();
            }, 1100);
        }
    }

    /**
     * REFACTORED: PROMISE-BASED, ROBUST CONTENT TRACKING.
     * This version is cleaner and more declarative.
     */
    function trackCriticalContent() {
        const leftMedia = Array.from(document.querySelectorAll('.column.left .media-link img, .column.left .media-link video')).slice(0, 3);
        const rightMedia = Array.from(document.querySelectorAll('.column.right .media-link img, .column.right .media-link video')).slice(0, 3);
        const criticalItems = [...leftMedia, ...rightMedia];

        if (criticalItems.length === 0) {
            isContentLoaded = true;
            finishLoading();
            return;
        }

        // Create an array of promises, one for each critical media item.
        const promises = criticalItems.map(media => {
            return new Promise((resolve) => {
                // Check if the media is already loaded (from cache).
                // If so, the promise resolves immediately.
                if ((media.tagName === 'IMG' && media.complete) || (media.tagName === 'VIDEO' && media.readyState >= 3)) {
                    resolve();
                } else {
                    // Otherwise, add event listeners. The promise will resolve when any of these fire.
                    media.addEventListener('load', resolve, { once: true });
                    media.addEventListener('canplay', resolve, { once: true });
                    media.addEventListener('error', resolve, { once: true }); // Also resolve on error so the preloader doesn't get stuck.
                }
            });
        });

        // Promise.all() waits for every single promise in the array to be resolved.
        Promise.all(promises).then(() => {
            // This code block runs ONLY after all 6 items are confirmed loaded or have errored.
            if (!isContentLoaded) {
                isContentLoaded = true;
                finishLoading();
            }
        });
    }

    // --- MAIN EVENT LISTENERS ---

    document.addEventListener('DOMContentLoaded', () => {
        if (preloaderContent) {
            preloaderContent.classList.add('ready');
        }

        translatePage();
        setupImageGallery();
        trackCriticalContent();
    });

    // Minimum 4-second timer
    setTimeout(() => {
        isTimerFinished = true;
        finishLoading();
    }, 4000);

    // Final safety net.
    window.addEventListener('load', () => {
        if (!isContentLoaded) {
            isContentLoaded = true;
            finishLoading();
        }
    });

})();
