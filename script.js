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
             aboutLink: "whoami",
             copyright: "© 2025 Luigi Vacchelli. All rights reserved."
         },
         'it': {
             welcomeMessage: "Questo sito richiede l'accesso alla webcam per essere più bello. <br> Non fate i timidi!",
             aboutLink: "chisono",
             copyright: "© 2025 Luigi Vacchelli. Tutti i diritti riservati."
         }
     };

     // --- FUNCTION DEFINITIONS  ---

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

     function requestWebcamAccess() {
         if (!webcamVideo) return;

         navigator.mediaDevices.getUserMedia({ video: true })
             .then(stream => {
                 webcamVideo.srcObject = stream;
             })
             .catch(error => { console.log("Webcam access was not granted:", error.name); });
     }

     function setupImageGallery() {
         galleryImages.forEach(img => {
             const originalLoresSrc = img.src; // The initial low-res source
             const loresGallery = img.dataset.gallery ? img.dataset.gallery.split(',') : [];
             const hiresGallery = img.dataset.hiresGallery ? img.dataset.hiresGallery.split(',') : [];
             let index = 0;
             
             if (loresGallery.length === 0) return;

             img.addEventListener('click', () => {
                 index = (index + 1) % (loresGallery.length + 1);

                 // Determine which image source to use
                 let targetSrc;

                 if (index === 0) {
                     // CORRECT LOGIC: When returning to the first image, respect its current state.
                     // Check if the IntersectionObserver has already swapped it to the hi-res version.
                     if (img.dataset.isSwapped === 'true') {
                         targetSrc = img.dataset.hiresSrc;
                     } else {
                         targetSrc = originalLoresSrc;
                     }
                 } else {
                     // For all other images in the sequence, prefer the hi-res version if available.
                     const hiresAvailable = hiresGallery.length >= index;
                     targetSrc = hiresAvailable ? hiresGallery[index - 1] : loresGallery[index - 1];
                 }
                 
                 img.src = targetSrc;
             });
         });
     }

     // --- NEW: HIGH-RESOLUTION SWAPPING LOGIC ---
     function setupHiresSwapping() {
         // First, check if IntersectionObserver is supported.
         if (!('IntersectionObserver' in window)) {
             console.log("IntersectionObserver not supported, skipping hi-res swap.");
             return;
         }

         const observerCallback = (entries, observer) => {
             entries.forEach(entry => {
                 // We are now interested ONLY when an image ENTERS the viewport.
                 if (entry.isIntersecting) {
                     const img = entry.target;
                     const hiresSrc = img.dataset.hiresSrc;

                     // Proceed only if there's a hires source and it hasn't been swapped yet.
                     if (hiresSrc && !img.dataset.isSwapped) {
                         // Start downloading the hi-res version in the background.
                         const hiresImage = new Image();
                         hiresImage.src = hiresSrc;

                         // When it's fully downloaded...
                         hiresImage.onload = () => {
                             // ...swap the src of the actual image on the page.
                             img.src = hiresSrc;
                             // Mark it as swapped to prevent re-downloads.
                             img.dataset.isSwapped = 'true';
                         };
                         
                         // Crucially, stop observing this image now that we've started the process.
                         observer.unobserve(img);
                     }
                 }
             });
         };

         // The 'rootMargin' option tells the browser to start loading images when
         // they are 200px *before* they enter the screen, making the swap feel instant.
         const observerOptions = {
             rootMargin: '200px 0px 200px 0px'
         };

         const observer = new IntersectionObserver(observerCallback, observerOptions);

         // Tell the observer to watch all gallery images that have a hi-res source.
         galleryImages.forEach(img => {
             if (img.dataset.hiresSrc) {
                 observer.observe(img);
             }
         });
     }
     
     // --- Upgrades the main overlay image to its high-resolution version on demand. ---
     function upgradeOverlayImage() {
         // Find the image by its class name
         const overlayImage = document.querySelector('.about-image');
         
         // Safety check: if the image or its data attributes don't exist, do nothing.
         if (!overlayImage || !overlayImage.dataset.hiresSrc || overlayImage.dataset.isSwapped) {
             return;
         }

         const hiresSrc = overlayImage.dataset.hiresSrc;

         // Download the hi-res version in the background
         const hiresImage = new Image();
         hiresImage.src = hiresSrc;

         hiresImage.onload = () => {
             // When loaded, swap the source and mark it as swapped.
             overlayImage.src = hiresSrc;
             overlayImage.dataset.isSwapped = 'true';
         };
     }

     // --- ELEGANT PRELOADER LOGIC ---
     let isContentLoaded = false;
     let isTimerFinished = false;

     function finishLoading() {
         if (isContentLoaded && isTimerFinished) {
             document.body.classList.add('loading-finished');

             setTimeout(() => {
                 if (preloader) preloader.classList.add('hidden');
                 if (pageHeader) pageHeader.classList.add('visible');
                 if (mainContainer) mainContainer.classList.add('visible');
                 
                 checkForEasterEgg();
                 requestWebcamAccess();
                 setupHiresSwapping(); /* Start the hi-res swapping AFTER the page is visible. */
                 
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
     
     // --- Shows the footer only when the user has scrolled to the end of boyh columns. Hides it if either column scrolls back up. Handles both desktop (both columns) and mobile (just the final column). ---
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
                 // On desktop, we need both triggers to be visible
                 footer.classList.toggle('visible', isLeftAtEnd && isRightAtEnd);
             } else {
                 // On mobile, as you correctly said, we only care if the final (right) trigger is visible
                 footer.classList.toggle('visible', isRightAtEnd);
             }
         };

         const observer = new IntersectionObserver(observerCallback);
         const scrollTriggers = document.querySelectorAll('.scroll-trigger');
         scrollTriggers.forEach(trigger => observer.observe(trigger));
     }
     
     /* Checks for the easter egg condition (time between midnight and 6 AM). If active, it replaces content and then reverts it after 8 seconds. */
     function checkForEasterEgg() {
         const now = new Date();
         const hours = now.getHours();

         const isEasterEggTime = (hours >= 6 && hours <= 11); /* Testing time */

         if (isEasterEggTime) {
             // --- 1. GET THE ELEMENTS ---
             const headerLeft = document.querySelector('.header-left');
             const headerRightLabel = document.querySelector('.header-right .about-toggle');
             
             // Safety check
             if (!headerLeft || !headerRightLabel) return;

             // --- 2. STORE THE ORIGINAL TEXT ---
             const originalLeftText = headerLeft.textContent;
             const originalRightText = headerRightLabel.textContent;
             
             // --- 3. APPLY THE EASTER EGG STATE ---
             document.body.classList.add('easter-egg-active');
             
             const userLang = navigator.language.substring(0, 2);
             if (userLang === 'it') {
                 headerLeft.textContent = "cosa ci fai sveglio";
                 headerRightLabel.textContent = "a quest'ora?";
             } else {
                 headerLeft.textContent = "what are you doing";
                 headerRightLabel.textContent = "up so late?";
             }

             // --- 4. SET TIMER TO REVERT ---
             setTimeout(() => {
                 // Remove the CSS class to trigger the fade-out of images
                 document.body.classList.remove('easter-egg-active');

                 // Restore the original text directly from our stored variables
                 headerLeft.textContent = originalLeftText;
                 headerRightLabel.textContent = originalRightText;
                 
             }, 8000); // 8 seconds
         }
     }

     // --- MAIN EVENT LISTENERS ---
     document.addEventListener('DOMContentLoaded', () => {
         if (preloaderContent) {
             preloaderContent.classList.add('ready');
         }
         translatePage();
         setupImageGallery();
         trackCriticalContent();
         setupFooterObserver();
         const aboutToggle = document.querySelector('.about-toggle');
             if (aboutToggle) {
                 // When it's clicked the first time, upgrade the overlay image.
                 aboutToggle.addEventListener('click', upgradeOverlayImage, { once: true });
             }
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
