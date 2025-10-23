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
            if (isContentLoaded && isTimerFinished) {
                // Add a class to the body to trigger all final animations
                document.body.classList.add('loading-finished');

                // Set a timer for the fade-out to happen AFTER the bar fills
                setTimeout(() => {
                    const preloader = document.getElementById('preloader');
                    const pageHeader = document.querySelector('.page-header');
                    const mainContainer = document.querySelector('.container');

                    preloader.classList.add('hidden');
                    pageHeader.classList.add('visible');
                    mainContainer.classList.add('visible');
                    
                    requestWebcamAccess();
                }, 1100); // Wait 1000ms for the bar to finish animating to 100%
            }
        }

        // This event fires as soon as the HTML is ready.
        document.addEventListener('DOMContentLoaded', () => {
            document.querySelector('.preloader-content').classList.add('ready');
            translatePage();
            setupImageGallery();
        });

        // This event fires ONLY when ALL content is fully loaded.
        window.addEventListener('load', () => {
            isContentLoaded = true;
            finishLoading();
        });

        // This timer will run for 6 seconds.
        setTimeout(() => {
            isTimerFinished = true;
            finishLoading();
        }, 6000);
