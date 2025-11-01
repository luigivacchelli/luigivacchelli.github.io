 (() => {
     // --- 1. CACHE DOM ELEMENTS ---
     const preloader = document.getElementById('preloader');
     const preloaderContent = document.querySelector('.preloader-content');
     const pageHeader = document.querySelector('.page-header');
     const mainContainer = document.querySelector('.container');
     const webcamVideo = document.getElementById('webcam');
     const webcamContainer = document.querySelector('.webcam-container');
     const galleryImages = document.querySelectorAll('.media-link img');
     const i18nElements = document.querySelectorAll('[data-i18n-key]');
     const headerLeft = document.querySelector('.header-left');
     const aboutTrigger = document.getElementById('about-trigger');
     const aboutOverlay = document.getElementById('about-overlay');
     const aboutBackground = document.getElementById('about-background');


     // --- DICTIONARY FOR TRANSLATIONS ---
     const translations = {
         'en': {
             welcomeMessage: "This site uses your webcam to enhance the experience. <br> Please don't be shy!",
             aboutLink: "whoami",
             easterEggLeftHeader: "what are you doing up so late?",
             easterEggRightHeader: "go to sleep!",
             copyright: "© 2025 Luigi Vacchelli. All rights reserved."
         },
         'it': {
             welcomeMessage: "Questo sito è più bello con la vostra webcam. <br> Non fate i timidi!",
             aboutLink: "chisono",
             easterEggLeftHeader: "cosa ci fai ancora in piedi?",
             easterEggRightHeader: "corri a letto!",
             copyright: "© 2025 Luigi Vacchelli. Tutti i diritti riservati."
         }
     };

     // --- FUNCTION DEFINITIONS  ---
     
     // Function to open the overlay
     function openOverlay() {
         if (aboutOverlay) {
             aboutOverlay.classList.add('is-open');
             // MODIFIED: Target the <html> element for a more robust lock
             document.documentElement.classList.add('overlay-active');
             upgradeOverlayImage();
         }
     }

     // Function to close the overlay
     function closeOverlay() {
         if (aboutOverlay) {
             aboutOverlay.classList.remove('is-open');
             // MODIFIED: Target the <html> element for a more robust lock
             document.documentElement.classList.remove('overlay-active');
         }
     }

     function translatePage() {
         const userLang = navigator.language.substring(0, 2);
         const language = userLang === 'it' ? 'it' : 'en';

         i18nElements.forEach(element => {
             const key = element.dataset.i18nKey;
             const translation = translations[language][key];
             if (translation !== undefined) {
                 element.innerHTML = translation;
             }
         });
     }

     function requestWebcamAccess() {
         if (!webcamVideo || !webcamContainer) return;
         if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                 console.warn("getUserMedia not supported by this browser.");
                 webcamContainer.style.display = 'none';
                 return;
             }

         navigator.mediaDevices.getUserMedia({ video: true })
             .then(stream => {
                 webcamVideo.srcObject = stream;
             })
         .catch(error => { console.log("Webcam access was not granted:", error.name);
             webcamContainer.style.display = 'none';
         });
     }

     function setupImageGallery() {
         galleryImages.forEach(img => {
             const originalLoresSrc = img.src;
             const loresGallery = img.dataset.gallery ? img.dataset.gallery.split(',') : [];
             const hiresGallery = img.dataset.hiresGallery ? img.dataset.hiresGallery.split(',') : [];
             let index = 0;
             
             if (loresGallery.length === 0) return;

             img.addEventListener('click', () => {
                 index = (index + 1) % (loresGallery.length + 1);
                 let targetSrc;

                 if (index === 0) {
                     if (img.dataset.isSwapped === 'true') {
                         targetSrc = img.dataset.hiresSrc;
                     } else {
                         targetSrc = originalLoresSrc;
                     }
                 } else {
                     const hiresAvailable = hiresGallery.length >= index;
                     targetSrc = hiresAvailable ? hiresGallery[index - 1] : loresGallery[index - 1];
                 }
                 
                 img.src = targetSrc;
             });
         });
     }
     
     function setupInteractiveBalls() {
         const ballsImage = document.querySelector('img[src*="balls.jpg"]');
         if (!ballsImage) {
             console.warn('Interactive balls image not found.');
             return;
         }

         const staticSrc = 'pictures/bw/hires/balls.jpg';
         const transitionSrc = 'graphics/lores/balls1.gif';
         const loopSrc = 'graphics/lores/balls2.gif';
         const TRANSITION_GIF_DURATION = 1050;
         let timerId = null;
         let currentState = 'paused';
         let activePromise = null;

         const switchToLoopingGif = () => {
             ballsImage.src = loopSrc;
             currentState = 'looping';
         };

         const playSequenceAfterDelay = (delay) => {
             currentState = 'loading';
             const timerPromise = new Promise(resolve => setTimeout(resolve, delay));
             const imageLoadPromise = new Promise((resolve, reject) => {
                 const transitionGif = new Image();
                 transitionGif.src = transitionSrc;
                 transitionGif.onload = resolve;
                 transitionGif.onerror = reject;
             });

             const currentPromise = Promise.all([timerPromise, imageLoadPromise]);
             activePromise = currentPromise;

             currentPromise.then(() => {
                 if (activePromise !== currentPromise) return;
                 ballsImage.src = transitionSrc;
                 currentState = 'transitioning';
                 timerId = setTimeout(switchToLoopingGif, TRANSITION_GIF_DURATION);
             })
             .catch(() => {
                 if (activePromise !== currentPromise) return;
                 console.error("Failed to load transition GIF, switching directly to loop.");
                 switchToLoopingGif();
             });
         };

         const stopSequence = () => {
             clearTimeout(timerId);
             activePromise = null;
             ballsImage.src = staticSrc;
             currentState = 'paused';
         };

         const observer = new IntersectionObserver((entries, obs) => {
             entries.forEach(entry => {
                 if (entry.isIntersecting) {
                     playSequenceAfterDelay(3000);
                     obs.unobserve(ballsImage);
                 }
             });
         }, { threshold: 0.1 });

         ballsImage.addEventListener('click', () => {
             if (currentState === 'paused') {
                 playSequenceAfterDelay(0);
             } else {
                 stopSequence();
             }
         });

         observer.observe(ballsImage);
     }

     function setupHiresSwapping() {
         if (!('IntersectionObserver' in window)) {
             console.log("IntersectionObserver not supported, skipping hi-res swap.");
             return;
         }

         const observerCallback = (entries, observer) => {
             entries.forEach(entry => {
                 if (entry.isIntersecting) {
                     const img = entry.target;
                     const hiresSrc = img.dataset.hiresSrc;

                     if (hiresSrc && !img.dataset.isSwapped) {
                         const hiresImage = new Image();
                         hiresImage.src = hiresSrc;

                         hiresImage.onload = () => {
                             img.src = hiresSrc;
                             img.dataset.isSwapped = 'true';
                         };
                         
                         observer.unobserve(img);
                     }
                 }
             });
         };

         const observerOptions = {
             rootMargin: '200px 0px 200px 0px'
         };

         const observer = new IntersectionObserver(observerCallback, observerOptions);

         galleryImages.forEach(img => {
             if (img.dataset.hiresSrc) {
                 observer.observe(img);
             }
         });
     }
     
     function upgradeOverlayImage() {
         const overlayImage = document.querySelector('.about-image');
         
         if (!overlayImage || !overlayImage.dataset.hiresSrc || overlayImage.dataset.isSwapped === 'true') {
             return;
         }

         const hiresSrc = overlayImage.dataset.hiresSrc;
         const hiresImage = new Image();
         hiresImage.src = hiresSrc;

         hiresImage.onload = () => {
             overlayImage.src = hiresSrc;
             overlayImage.dataset.isSwapped = 'true';
         };
     }

     let isContentLoaded = false;
     let isTimerFinished = false;

     function finishLoading() {
         if (isContentLoaded && isTimerFinished) {
             document.body.classList.add('loading-finished');

             setTimeout(() => {
                 const easterEggWasActivated = checkForEasterEgg();
                 if (preloader) preloader.classList.add('hidden');
                 if (pageHeader) pageHeader.classList.add('visible');
                 if (mainContainer) mainContainer.classList.add('visible');

                 // THIS IS THE CRITICAL FIX for the blank page bug.
                 // It ensures the body is styled correctly for the dual-scroll layout.
                 document.body.style.overflow = 'hidden';
                 
                 if (!easterEggWasActivated) {
                     requestWebcamAccess();
                 }
                 setupHiresSwapping();
             }, 1100);
         }
     }

     function trackCriticalContent() {
         const leftMedia = Array.from(document.querySelectorAll('.column.left .media-link img, .column.left .media-link video')).slice(0, 3);
         const rightMedia = Array.from(document.querySelectorAll('.column.right .media-link img, .column.right .media-link video')).slice(0, 3);
         const criticalItems = [...leftMedia, ...rightMedia];

         if (criticalItems.length === 0) {
             isContentLoaded = true;
             finishLoading();
             return;
         }

         const promises = criticalItems.map(media => {
             return new Promise((resolve) => {
                 if ((media.tagName === 'IMG' && media.complete) || (media.tagName === 'VIDEO' && media.readyState >= 3)) {
                     resolve();
                 } else {
                     media.addEventListener('load', resolve, { once: true });
                     media.addEventListener('canplay', resolve, { once: true });
                     media.addEventListener('error', resolve, { once: true });
                 }
             });
         });

         Promise.all(promises).then(() => {
             if (!isContentLoaded) {
                 isContentLoaded = true;
                 finishLoading();
             }
         });
     }
     
     function setupFooterObserver() {
         if (!('IntersectionObserver' in window)) return;
         const footer = document.querySelector('.site-footer');
         if (!footer) return;

         let isLeftAtEnd = false;
         let isRightAtEnd = false;

         const observerCallback = (entries) => {
             entries.forEach(entry => {
                 if (entry.target.dataset.column === 'left') isLeftAtEnd = entry.isIntersecting;
                 if (entry.target.dataset.column === 'right') isRightAtEnd = entry.isIntersecting;
             });

             const isDesktop = window.innerWidth > 768;

             if (isDesktop) {
                 footer.classList.toggle('visible', isLeftAtEnd && isRightAtEnd);
             } else {
                 footer.classList.toggle('visible', isRightAtEnd);
             }
         };

         const observer = new IntersectionObserver(observerCallback);
         const scrollTriggers = document.querySelectorAll('.scroll-trigger');
         scrollTriggers.forEach(trigger => observer.observe(trigger));
     }
     
     function checkForEasterEgg() {
         const now = new Date();
         const hours = now.getHours();
         const isEasterEggTime = (hours >= 0 && hours <= 6);

         if (isEasterEggTime) {
             if (!headerLeft || !aboutTrigger) return false;

             const originalLeftText = headerLeft.textContent;
             const originalRightText = aboutTrigger.textContent;
             
             document.body.classList.add('easter-egg-active');
             
             // 1. Determine the language, just like in translatePage()
                     const userLang = navigator.language.substring(0, 2);
                     const language = userLang === 'it' ? 'it' : 'en';

                     // 2. Get the correct translations from the object
                     const question = translations[language].easterEggLeftHeader;
                     const action = translations[language].easterEggRightHeader;

                     // 3. Apply the translated text
                     headerLeft.textContent = question;
                     aboutTrigger.textContent = action;

             setTimeout(() => {
                 document.body.classList.remove('easter-egg-active');
                 headerLeft.textContent = originalLeftText;
                 aboutTrigger.textContent = originalRightText;
                 requestWebcamAccess();
             }, 5000);

             return true;
         }
         return false;
     }

     // --- MAIN EVENT LISTENERS ---
     document.addEventListener('DOMContentLoaded', () => {
         if (preloaderContent) {
             preloaderContent.classList.add('ready');
         }
         translatePage();
         setupImageGallery();
         setupInteractiveBalls();
         trackCriticalContent();
         setupFooterObserver();

         // Replaced old checkbox logic with new event listeners
         if (aboutTrigger) {
             aboutTrigger.addEventListener('click', openOverlay);
         }

         if (aboutBackground) {
             aboutBackground.addEventListener('click', closeOverlay);
         }
         
         // Added Escape key listener for better accessibility and user experience
         document.addEventListener('keydown', (event) => {
             if (event.key === 'Escape' && aboutOverlay.classList.contains('is-open')) {
                 closeOverlay();
             }
         });
     });

     setTimeout(() => {
         isTimerFinished = true;
         finishLoading();
     }, 4000);

     window.addEventListener('load', () => {
         if (!isContentLoaded) {
             isContentLoaded = true;
             finishLoading();
         }
     });

 })();
