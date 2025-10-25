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

function translatePage() {
    const userLang = navigator.language.substring(0, 2);
    const language = userLang === 'it' ? 'it' : 'en';
    document.querySelectorAll('[data-i18n-key]').forEach(element => {
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

function requestWebcamAccess() {
    navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
            const video = document.getElementById('webcam');
            if (video) { video.srcObject = stream; }
        })
        .catch(error => { console.log("Webcam access was not granted:", error.name); });
}

function setupImageGallery() {
    document.querySelectorAll('.media-link img').forEach(img => {
        const originalSrc = img.src;
        const gallery = img.dataset.gallery ? img.dataset.gallery.split(',') : [];
        let index = 0;
        img.addEventListener('click', () => {
            if (gallery.length === 0) return;
            index = (index + 1) % (gallery.length + 1);
            img.src = index === 0 ? originalSrc : gallery[index - 1];
        });
    });
}

// --- ELEGANT PRELOADER LOGIC ---

let isContentLoaded = false;
let isTimerFinished = false;

function finishLoading() {
    // Only proceed if BOTH the timer is done AND critical content is loaded
    if (isContentLoaded && isTimerFinished) {
        document.body.classList.add('loading-finished');

        setTimeout(() => {
            const preloader = document.getElementById('preloader');
            const pageHeader = document.querySelector('.page-header');
            const mainContainer = document.querySelector('.container');

            preloader.classList.add('hidden');
            pageHeader.classList.add('visible');
            mainContainer.classList.add('visible');
            
            requestWebcamAccess();
        }, 1100); // Wait for the final fill animation
    }
}

// --- NEW: CRITICAL CONTENT TRACKING ---
function trackCriticalContent() {
    // Select the first 4 media items from each column
    const leftMedia = Array.from(document.querySelectorAll('.column.left .media-link img, .column.left .media-link video')).slice(0, 3);
    const rightMedia = Array.from(document.querySelectorAll('.column.right .media-link img, .column.right .media-link video')).slice(0, 3);
    
    // Combine them into one list of critical items to watch
    const criticalItems = [...leftMedia, ...rightMedia];
    let loadedCount = 0;
    const targetCount = criticalItems.length;

    // If there's no media at all, we're done instantly
    if (targetCount === 0) {
        isContentLoaded = true;
        finishLoading();
        return;
    }

    function checkItemLoaded() {
        loadedCount++;
        // If all critical items are loaded, mark content as ready
        if (loadedCount >= targetCount && !isContentLoaded) {
            isContentLoaded = true;
            finishLoading();
        }
    }

    criticalItems.forEach(media => {
        // Check if already loaded (from cache)
        if (media.tagName === 'IMG' && media.complete) {
            checkItemLoaded();
        } else if (media.tagName === 'VIDEO' && media.readyState >= 3) { // HAVE_FUTURE_DATA
             checkItemLoaded();
        } else {
            // Not loaded yet, wait for it
            // We use 'error' too, so a broken link doesn't hang the preloader forever
            media.addEventListener('load', checkItemLoaded, { once: true });
            media.addEventListener('canplay', checkItemLoaded, { once: true });
            media.addEventListener('error', checkItemLoaded, { once: true });
        }
    });
}

// --- MAIN EVENT LISTENERS ---

document.addEventListener('DOMContentLoaded', () => {
    document.querySelector('.preloader-content').classList.add('ready');
    translatePage();
    setupImageGallery();
    
    // Start tracking the critical images/videos immediately
    trackCriticalContent();
});

// Minimum 3-second timer
setTimeout(() => {
    isTimerFinished = true;
    finishLoading();
}, 4000);

// Backup safety net: if something goes wrong with tracking,
// ensure site still loads when everything is officially done.
window.addEventListener('load', () => {
    if (!isContentLoaded) {
        isContentLoaded = true;
        finishLoading();
    }
});
