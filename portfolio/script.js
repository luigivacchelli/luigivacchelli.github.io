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
             welcomeMessage: `This site uses your webcam to enhance the experience. <br> Please don't be shy!`,
             aboutLink: "whoami",
             easterEggLeftHeader: "what are you doing up so late?",
             easterEggRightHeader: "go to sleep!",
             aboutBio: `Director and photographer, born in '98. I live in Rome, but my heart is in Genoa. <br> I work on short films, photographic projects and international film productions. <br> Also, there's a good chance I'll beat you at <a href="https://www.chess.com/member/lksmrkds" target="_blank" rel="noopener noreferrer">chess</a>.`,
             copyright: "© 2025 Luigi Vacchelli. All rights reserved."
         },
         'it': {
             welcomeMessage: `Questo sito richiede l'accesso alla webcam per essere più bello.<br> Non fate i timidi!`,
             aboutLink: "chisono",
             easterEggLeftHeader: "cosa ci fai ancora in piedi?",
             easterEggRightHeader: "corri a letto!",
             aboutBio: `Regista e fotografo, classe '98. Vivo a Roma, ma ho lasciato il cuore a Genova. <br> Lavoro a cortometraggi, progetti fotografici e produzioni cinematografiche internazionali. <br> Inoltre, ci sono buone probabilità che ti batta a <a href="https://www.chess.com/member/lksmrkds" target="_blank" rel="noopener noreferrer">scacchi</a>.`,
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
     
     function setupVideoToggle() {
         const container = document.getElementById('dolphin-toggle');
         if (!container) return;

         // No need to get the videos or call .play() anymore!
         // The browser handles autoplay via the HTML attribute.

         container.addEventListener('click', () => {
             // Just toggle the class. The CSS will handle the rest.
             container.classList.toggle('is-pixelated');
         });
     }

     
     function setupInteractiveBalls() {
         const container = document.querySelector('.interactive-balls-container');
         if (!container) return; // Exit if the container isn't found

         const video = container.querySelector('.balls-video');
         if (!video) return; // Exit if the video isn't found
         // This event fires every time the video finishes playing
             video.addEventListener('ended', () => {
                 // Wait for 3 seconds (3000 milliseconds)
                 setTimeout(() => {
                     // After the wait, play the video again from the start
                     video.play();
                 }, 3000);
             });
         // The function to start the video
         function playVideo() {
             // Check if the video is already ready to play without interruption.
             // A readyState of 3 (HAVE_FUTURE_DATA) or 4 (HAVE_ENOUGH_DATA) is a good sign.
             if (video.readyState > 2) {
                 // If it's ready, do the swap and play immediately.
                 container.classList.add('is-playing');
                 video.play();
             } else {
                 // If not ready, wait for the 'canplay' event.
                 // This event fires when the browser has downloaded enough data to start playing.
                 // The '{ once: true }' option is crucial to ensure this only runs once.
                 video.addEventListener('canplay', () => {
                     container.classList.add('is-playing');
                     video.play();
                 }, { once: true });
             }
         }

         // The function to show the static image
         function showImage() {
             container.classList.remove('is-playing');
             video.pause();
         }

         // --- Start the animation automatically when it scrolls into view ---
         const observer = new IntersectionObserver((entries, obs) => {
             entries.forEach(entry => {
                 if (entry.isIntersecting) {
                     // When it's visible, wait 3 seconds, THEN play the video
                     setTimeout(playVideo, 3000);
                     obs.unobserve(container); // Stop observing
                 }
             });
         }, { threshold: 0.1 });

         // --- Handle the click-to-toggle interaction ---
         container.addEventListener('click', () => {
             // Is the 'is-playing' class present?
             if (container.classList.contains('is-playing')) {
                 // If it's playing, show the image
                 showImage();
             } else {
                 // If it's paused, play the video
                 playVideo();
             }
         });

         // Start observing the container
         observer.observe(container);
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
     
     function setupInfiniteCarousel(carouselElement) {
             const carousel = carouselElement;
             if (!carousel) return;

             const track = carousel.querySelector('.carousel-track');
             let items = Array.from(track.children);
             let isTeleporting = false;

             function loadHires(item) {
                 const img = item.querySelector('img');
                 if (img && img.dataset.hiresSrc && !img.dataset.isSwapped) {
                     const hiresSrc = img.dataset.hiresSrc;
                     const hiresImage = new Image();
                     hiresImage.src = hiresSrc;
                     hiresImage.onload = () => {
                         img.src = hiresSrc;
                         img.dataset.isSwapped = 'true';
                     };
                 }
             }

             function checkAndLoadVisibleItems() {
                 items.forEach((item) => {
                     const itemLeft = item.offsetLeft;
                     const itemWidth = item.offsetWidth;
                     const scrollLeft = carousel.scrollLeft;
                     const carouselWidth = carousel.offsetWidth;
                     if (itemLeft < scrollLeft + carouselWidth + itemWidth && itemLeft + itemWidth > scrollLeft - itemWidth) {
                         loadHires(item);
                     }
                 });
             }

             const firstClone = items[0].cloneNode(true);
             const lastClone = items[items.length - 1].cloneNode(true);
             firstClone.classList.add('clone');
             lastClone.classList.add('clone');
             track.appendChild(firstClone);
             track.insertBefore(lastClone, items[0]);
             items = Array.from(track.children);

             setTimeout(() => {
                 track.style.transition = 'none';
                 carousel.scrollLeft = carousel.querySelector('.carousel-item:not(.clone)').offsetLeft;
                 track.style.transition = '';
                 checkAndLoadVisibleItems();
             }, 0);

             carousel.addEventListener('scroll', () => {
                 checkAndLoadVisibleItems();
                 if (isTeleporting) return;
                 const firstItem = carousel.querySelector('.carousel-item:not(.clone)');
                 const lastItem = items[items.length - 2];
                 const itemWidth = firstItem.offsetWidth;
                 if (carousel.scrollLeft < firstItem.offsetLeft - (itemWidth / 2)) {
                     isTeleporting = true;
                     track.style.transition = 'none';
                     carousel.scrollLeft = lastItem.offsetLeft;
                     track.style.transition = '';
                     setTimeout(() => { isTeleporting = false; }, 50);
                 }
                 if (carousel.scrollLeft > lastItem.offsetLeft + (itemWidth / 2)) {
                     isTeleporting = true;
                     track.style.transition = 'none';
                     carousel.scrollLeft = firstItem.offsetLeft;
                     track.style.transition = '';
                     setTimeout(() => { isTeleporting = false; }, 50);
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
         setupVideoToggle();
         setupInteractiveBalls();
         trackCriticalContent();
         const allCarousels = document.querySelectorAll('.carousel-container');
         allCarousels.forEach(carousel => {
             setupInfiniteCarousel(carousel); // Call the function for EACH carousel found
         });
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
