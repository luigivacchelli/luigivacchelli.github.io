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
     
     function setupAmbientSparks() {
             const targets = document.querySelectorAll('.spark-on-scroll');

             targets.forEach(target => {
                 const canvas = document.createElement('canvas');
                 canvas.className = 'spark-canvas';
                 target.appendChild(canvas);
                 const ctx = canvas.getContext('2d');
                 canvas.width = canvas.offsetWidth;
                 canvas.height = canvas.offsetHeight;

                 let sparks = [];
                 const sparkColor = '#F6C500';
                 const duration = 500;
                 const sparkCount = 8;
                 const sparkRadius = 30;
                 const sparkSize = 8;
                 
                 let hasBeenClicked = false; // A new flag to track interaction

                 function draw(timestamp) {
                     ctx.clearRect(0, 0, canvas.width, canvas.height);
                     sparks = sparks.filter(spark => {
                         const elapsed = timestamp - spark.startTime;
                         if (elapsed >= duration) return false;
                         const progress = elapsed / duration;
                         const eased = progress * (2 - progress);
                         const distance = eased * sparkRadius;
                         const lineLength = sparkSize * (1 - eased);
                         const x1 = spark.x + distance * Math.cos(spark.angle);
                         const y1 = spark.y + distance * Math.sin(spark.angle);
                         const x2 = spark.x + (distance + lineLength) * Math.cos(spark.angle);
                         const y2 = spark.y + (distance + lineLength) * Math.sin(spark.angle);
                         ctx.strokeStyle = sparkColor;
                         ctx.lineWidth = 2;
                         ctx.beginPath();
                         ctx.moveTo(x1, y1);
                         ctx.lineTo(x2, y2);
                         ctx.stroke();
                         return true;
                     });
                     if (sparks.length > 0) {
                         requestAnimationFrame(draw);
                     }
                 }
                 
                 function createSparkBurst() {
                     // If the user has clicked, do not create any new sparks.
                     if (hasBeenClicked) return;

                     const x = canvas.width / 2;
                     const y = canvas.height / 2;
                     const now = performance.now();
                     const newSparks = Array.from({ length: sparkCount }, (_, i) => ({
                         x, y, angle: (2 * Math.PI * i) / sparkCount, startTime: now
                     }));
                     const wasEmpty = sparks.length === 0;
                     sparks.push(...newSparks);
                     if (wasEmpty) {
                         requestAnimationFrame(draw);
                     }
                 }
                 
                 function handleClickInterrupt() {
                     hasBeenClicked = true;
                 }
                 target.addEventListener('click', handleClickInterrupt, { once: true });
                 
                 const observer = new IntersectionObserver((entries, obs) => {
                     entries.forEach(entry => {
                         if (entry.isIntersecting) {
                             setTimeout(createSparkBurst, 200);
                             setTimeout(createSparkBurst, 700);
                             setTimeout(createSparkBurst, 3200);
                             setTimeout(createSparkBurst, 3700);
                             
                             obs.unobserve(target);
                         }
                     });
                 }, { threshold: 1.0 });

                 observer.observe(target);
             });
         }
     
     function setupPoolAnimation() {
         const container = document.getElementById('pool-animation');
         if (!container) return;

         const video = container.querySelector('.pool-video');
         if (!video) return;

         // We preload the video so it's ready to play instantly on click
         video.preload = 'auto';
         video.load();
         
         video.addEventListener('ended', () => {
                 // Wait for 2 seconds (2000 milliseconds)
                 setTimeout(() => {
                     // Remove the 'is-playing' class to fade back to the image
                     container.classList.remove('is-playing');
                 }, 50);
             });

         container.addEventListener('click', () => {
             // If it's already playing, do nothing.
             // The user must leave the overlay or reload to replay.
             if (container.classList.contains('is-playing')) {
                 return;
             }

             // Add the class to trigger the CSS fade
             container.classList.add('is-playing');
             
             // Play the video from the beginning with sound
             video.currentTime = 0;
             video.muted = false; // Make sure sound is on
             video.play();
         });

         // When the overlay closes, we should reset the animation
         aboutTrigger.addEventListener('click', () => {
             // This is a simple observer to detect when the overlay closes
             const observer = new MutationObserver((mutations) => {
                 mutations.forEach((mutation) => {
                     if (mutation.attributeName === 'class' && !aboutOverlay.classList.contains('is-open')) {
                         video.pause();
                         container.classList.remove('is-playing');
                         observer.disconnect(); // Stop observing once it's closed
                     }
                 });
             });
             observer.observe(aboutOverlay, { attributes: true });
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
         if (!container) return;

         const video = container.querySelector('.balls-video');
         if (!video) return;

         // --- 1. Set up the delayed loop ---
         video.addEventListener('ended', () => {
             setTimeout(() => {
                 // Check if it's still supposed to be playing before looping
                 if (container.classList.contains('is-playing')) {
                     video.play();
                 }
             }, 3000);
         });

         // --- 2. The core functions ---
         function playVideo() {
             if (!container.classList.contains('is-playing')) {
                 container.classList.add('is-playing');
                 video.currentTime = 0; // Always start from the beginning
                 video.play();
             }
         }

         function showImage() {
             if (container.classList.contains('is-playing')) {
                 container.classList.remove('is-playing');
                 video.pause();
             }
         }

         // --- 4. The Click Handler ---
         container.addEventListener('click', () => {
             if (container.classList.contains('is-playing')) {
                 showImage();
             } else {
                 playVideo();
             }
         });
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

         // --- A function to handle ONLY hires swapping ---
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

         // --- A function to check which items are visible and load their hires versions ---
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

         // --- 1. Clone items ---
         const firstClone = items[0].cloneNode(true);
         const lastClone = items[items.length - 1].cloneNode(true);
         firstClone.classList.add('clone');
         lastClone.classList.add('clone');
         track.appendChild(firstClone);
         track.insertBefore(lastClone, items[0]);
         items = Array.from(track.children);

         // --- 2. Set initial position and load initial hires ---
         setTimeout(() => {
             track.style.transition = 'none';
             carousel.scrollLeft = carousel.querySelector('.carousel-item:not(.clone)').offsetLeft;
             track.style.transition = '';
             checkAndLoadVisibleItems();
         }, 0);


         // V V V V V  THIS IS THE NEW CODE BLOCK, PLACED BEFORE THE SCROLL LISTENER  V V V V V
         // --- 3. The Peek-a-Boo Animation Trigger ---
         const peekObserver = new IntersectionObserver((entries, obs) => {
             entries.forEach(entry => {
                 if (entry.isIntersecting) {
                     // When the carousel is visible, add the class to trigger the animation
                     // We use a small delay to ensure the initial scroll position is set
                     setTimeout(() => {
                         track.classList.add('has-peeked');
                     }, 500); // 0.5 second delay
                     
                     // Crucially, stop observing so the animation only runs once
                     obs.unobserve(carousel); 
                 }
             });
         }, { threshold: 0.75 }); // Trigger when 75% of the carousel is visible

         // Start observing the main carousel container
         peekObserver.observe(carousel);
         // ^ ^ ^ ^ ^  END OF THE NEW CODE BLOCK  ^ ^ ^ ^ ^

         // --- New logic to cancel the animation on manual scroll ---
            function cancelPeekAnimation() {
                // Remove the class that runs the animation
                track.classList.remove('has-peeked');
                // IMPORTANT: Also remove this event listener so it doesn't fire again
                carousel.removeEventListener('scroll', cancelPeekAnimation);
            }
            // Listen for the first time the user scrolls manually, and cancel the animation
            carousel.addEventListener('scroll', cancelPeekAnimation, { once: true });

         // --- 4. The Teleport and Loading Logic on Scroll ---
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
         const isEasterEggTime = (hours >= 0 && hours <= 5);

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
         setupAmbientSparks();
         setupVideoToggle();
         setupPoolAnimation();
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
