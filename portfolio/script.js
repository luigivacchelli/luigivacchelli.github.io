 (() => {
     "use strict";
     
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
     const easterEggLayer = document.getElementById('easter-egg-layer');
     
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
     
     // --- FUNCTION DEFINITIONS ---
     function openOverlay() {
         if (aboutOverlay) {
             aboutOverlay.classList.add('is-open');
             document.documentElement.classList.add('overlay-active');
             aboutOverlay.setAttribute('aria-hidden', 'false');
             upgradeOverlayImage();
         }
     }
     
     function closeOverlay() {
         if (aboutOverlay) {
             aboutOverlay.classList.remove('is-open');
             document.documentElement.classList.remove('overlay-active');
             aboutOverlay.setAttribute('aria-hidden', 'true');
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
             webcamContainer.style.display = 'none';
             return;
         }
         navigator.mediaDevices.getUserMedia({ video: true })
         .then(stream => { webcamVideo.srcObject = stream; })
         .catch(() => { webcamContainer.style.display = 'none'; });
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
                     targetSrc = (img.dataset.isSwapped === 'true') ? img.dataset.hiresSrc : originalLoresSrc;
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
             
             const resizeCanvas = () => {
                 canvas.width = canvas.offsetWidth;
                 canvas.height = canvas.offsetHeight;
             };
             resizeCanvas();
             
             let sparks = [];
             const sparkColor = '#F6C500';
             const duration = 500;
             const sparkCount = 8;
             const sparkRadius = 30;
             const sparkSize = 8;
             let hasBeenClicked = false;
             
             function draw(timestamp) {
                 ctx.clearRect(0, 0, canvas.width, canvas.height);
                 for (let i = sparks.length - 1; i >= 0; i--) {
                     const spark = sparks[i];
                     const elapsed = timestamp - spark.startTime;
                     if (elapsed >= duration) { sparks.splice(i, 1); continue; }
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
                 }
                 if (sparks.length > 0) { requestAnimationFrame(draw); }
             }
             
             function createSparkBurst() {
                 if (hasBeenClicked) return;
                 const x = canvas.width / 2;
                 const y = canvas.height / 2;
                 const now = performance.now();
                 for (let i = 0; i < sparkCount; i++) {
                     sparks.push({
                         x, y,
                         angle: (2 * Math.PI * i) / sparkCount,
                         startTime: now
                     });
                 }
                 if (sparks.length === sparkCount) { requestAnimationFrame(draw); }
             }
             
             target.addEventListener('click', () => { hasBeenClicked = true; }, { once: true });
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
             }, { threshold: 0.9 });
             observer.observe(target);
         });
     }
     
     function setupPoolAnimation() {
         const container = document.getElementById('pool-animation');
         if (!container) return;
         const video = container.querySelector('.pool-video');
         if (!video) return;
         video.preload = 'auto';
         video.addEventListener('ended', () => {
             setTimeout(() => { container.classList.remove('is-playing'); }, 50);
         });
         container.addEventListener('click', () => {
             if (container.classList.contains('is-playing')) return;
             container.classList.add('is-playing');
             video.currentTime = 0;
             video.muted = false;
             const playPromise = video.play();
             if (playPromise !== undefined) {
                 playPromise.catch(error => { console.warn("Autoplay prevented:", error); });
             }
         });
         aboutTrigger.addEventListener('click', () => {
             if (video) { video.pause(); container.classList.remove('is-playing'); }
         });
     }
     
     function setupVideoToggle() {
         const container = document.getElementById('dolphin-toggle');
         if (!container) return;

         const vNormal = container.querySelector('.video-normal');
         const vPixel = container.querySelector('.video-pixelated');

         if (!vNormal || !vPixel) return;

         // 1. The Toggle Logic (Pure CSS Visuals, as you insisted)
         container.addEventListener('click', () => {
             container.classList.toggle('is-pixelated');
         });

         // 2. The "Cold Start" Sync Protocol
         // We define a function that checks if BOTH are ready.
         const attemptSyncStart = () => {
             if (vNormal.readyState >= 7 && vPixel.readyState >= 7) {
                 // Both have enough data. Lock timestamps to zero.
                 vNormal.currentTime = 0;
                 vPixel.currentTime = 0;
                 
                 // Fire simultaneously.
                 Promise.all([vNormal.play(), vPixel.play()])
                     .catch(e => console.warn("Automatic sync start failed:", e));
             }
         };

         // 3. If they are already ready (cached), fire. If not, wait.
         if (vNormal.readyState >= 3 && vPixel.readyState >= 3) {
             attemptSyncStart();
         } else {
             // We add listeners to both. The function checks "Are WE both ready?" every time one finishes loading.
             vNormal.addEventListener('canplay', attemptSyncStart, { once: true });
             vPixel.addEventListener('canplay', attemptSyncStart, { once: true });
         }
         
         // 4. Safety Loop (Optional but recommended for long sessions)
         // If the loop ends, re-sync them.
         vNormal.addEventListener('ended', () => {
             vNormal.currentTime = 0;
             vPixel.currentTime = 0;
             vPixel.play();
             vNormal.play();
         });
     }
     
     function setupInteractiveBalls() {
         const container = document.querySelector('.interactive-balls-container');
         if (!container) return;
         const video = container.querySelector('.balls-video');
         if (!video) return;
         video.addEventListener('ended', () => {
             setTimeout(() => {
                 if (container.classList.contains('is-playing')) { video.play(); }
             }, 3000);
         });
         container.addEventListener('click', () => {
             if (container.classList.contains('is-playing')) {
                 container.classList.remove('is-playing');
                 video.pause();
             } else {
                 container.classList.add('is-playing');
                 video.currentTime = 0;
                 video.play().catch(e => console.warn("Balls video play failed", e));
             }
         });
     }
     
     function setupHiresSwapping() {
         if (!('IntersectionObserver' in window)) return;
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
         const observer = new IntersectionObserver(observerCallback, { rootMargin: '200px' });
         galleryImages.forEach(img => { if (img.dataset.hiresSrc) observer.observe(img); });
     }
     
     function upgradeOverlayImage() {
         const overlayImage = document.querySelector('.about-image');
         if (!overlayImage || !overlayImage.dataset.hiresSrc || overlayImage.dataset.isSwapped === 'true') return;
         const hiresSrc = overlayImage.dataset.hiresSrc;
         const hiresImage = new Image();
         hiresImage.src = hiresSrc;
         hiresImage.onload = () => {
             overlayImage.src = hiresSrc;
             overlayImage.dataset.isSwapped = 'true';
         };
     }
     
     function setupInfiniteCarousel(carouselElement) {
         if (!carouselElement) return;
         const track = carouselElement.querySelector('.carousel-track');
         let items = Array.from(track.children);
         let isTeleporting = false;
         function loadHires(item) {
             const img = item.tagName === 'IMG' ? item : item.querySelector('img');
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
             const scrollLeft = carouselElement.scrollLeft;
             const carouselWidth = carouselElement.offsetWidth;
             items.forEach((item) => {
                 const itemLeft = item.offsetLeft;
                 const itemWidth = item.offsetWidth;
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
             carouselElement.scrollLeft = carouselElement.querySelector('.carousel-item:not(.clone)').offsetLeft;
             track.style.transition = '';
             checkAndLoadVisibleItems();
         }, 0);
         let peekTimeout;
         const peekObserver = new IntersectionObserver((entries, obs) => {
             entries.forEach(entry => {
                 if (entry.isIntersecting) {
                     peekTimeout = setTimeout(() => { track.classList.add('has-peeked'); }, 500);
                     obs.unobserve(carouselElement);
                 }
             });
         }, { threshold: 0.75 });
         peekObserver.observe(carouselElement);
         function cancelPeekAnimation() {
             if (peekTimeout) clearTimeout(peekTimeout);
             track.classList.remove('has-peeked');
             carouselElement.removeEventListener('scroll', cancelPeekAnimation);
         }
         carouselElement.addEventListener('scroll', cancelPeekAnimation, { once: true, passive: true });
         carouselElement.addEventListener('scroll', () => {
             checkAndLoadVisibleItems();
             if (isTeleporting) return;
             const firstItem = carouselElement.querySelector('.carousel-item:not(.clone)');
             const lastItem = items[items.length - 2];
             const itemWidth = firstItem.offsetWidth;
             if (carouselElement.scrollLeft < firstItem.offsetLeft - (itemWidth / 2)) {
                 isTeleporting = true;
                 track.style.transition = 'none';
                 carouselElement.scrollLeft = lastItem.offsetLeft;
                 track.style.transition = '';
                 setTimeout(() => { isTeleporting = false; }, 50);
             } else if (carouselElement.scrollLeft > lastItem.offsetLeft + (itemWidth / 2)) {
                 isTeleporting = true;
                 track.style.transition = 'none';
                 carouselElement.scrollLeft = firstItem.offsetLeft;
                 track.style.transition = '';
                 setTimeout(() => { isTeleporting = false; }, 50);
             }
         }, { passive: true });
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
             // CRITICAL FIX: Restore matchMedia for consistent breakpoints
             const isDesktop = window.matchMedia('(min-width: 769px)').matches;
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
     
     // --- EASTER EGG LOGIC ---
     function checkForEasterEgg() {
         const now = new Date();
         const hours = now.getHours();
         const isEasterEggTime = (hours >= 0 && hours < 6);
         
         if (isEasterEggTime && easterEggLayer) {
             if (!headerLeft || !aboutTrigger) return false;
             
             const originalLeftText = headerLeft.textContent;
             const originalRightText = aboutTrigger.textContent;
             
             // 1. Activate Layer
             easterEggLayer.classList.add('active');
             easterEggLayer.setAttribute('aria-hidden', 'false');
             document.body.classList.add('easter-egg-active');
             
             // 2. Force Header to appear INSTANTLY
             pageHeader.style.transition = 'none';
             pageHeader.classList.add('visible');
             void pageHeader.offsetWidth;
             
             const userLang = navigator.language.substring(0, 2);
             const language = userLang === 'it' ? 'it' : 'en';
             headerLeft.textContent = translations[language].easterEggLeftHeader;
             aboutTrigger.textContent = translations[language].easterEggRightHeader;
             
             // --- NEW TIMING LOGIC ---
             
             // 3. START FADING OUT HEADER
             setTimeout(() => {
                 pageHeader.style.transition = '';
                 pageHeader.classList.remove('visible');
             }, 5000);
             
             // 4. SWAP TEXT & FADE IN HEADER at 5.0s
             setTimeout(() => {
                 // Swap Text
                 document.body.classList.remove('easter-egg-active');
                 headerLeft.textContent = originalLeftText;
                 aboutTrigger.textContent = originalRightText;
                 
                 // Fade IN Header (Normal)
                 pageHeader.classList.add('visible');
                 
                 // Fade OUT Layer
                 easterEggLayer.classList.remove('active');
                 easterEggLayer.setAttribute('aria-hidden', 'true');
                 
                 requestWebcamAccess();
             }, 5000);
             
             return true;
         }
         return false;
     }
     
     let isContentLoaded = false;
     let isTimerFinished = false;
     
     function finishLoading() {
         if (isContentLoaded && isTimerFinished) {
             document.body.classList.add('loading-finished');
             // CRITICAL FIX: Apply the class to unlock the scrolling logic in CSS
             document.body.classList.add('layout-ready');
             
             setTimeout(() => {
                 if (preloader) {
                     preloader.classList.add('hidden');
                     preloader.setAttribute('aria-hidden', 'true');
                 }
                 
                 const easterEggActive = checkForEasterEgg();
                 
                 if (mainContainer) mainContainer.classList.add('visible');
                 
                 // If Easter Egg is NOT active, fade in header normally
                 if (!easterEggActive) {
                     if (pageHeader) pageHeader.classList.add('visible');
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
     
     // --- MAIN EVENT LISTENERS ---
     document.addEventListener('DOMContentLoaded', () => {
         if (preloaderContent) preloaderContent.classList.add('ready');
         translatePage();
         setupImageGallery();
         setupAmbientSparks();
         setupVideoToggle();
         setupPoolAnimation();
         setupInteractiveBalls();
         trackCriticalContent();
         const allCarousels = document.querySelectorAll('.carousel-container');
         allCarousels.forEach(setupInfiniteCarousel);
         setupFooterObserver();
         if (aboutTrigger) aboutTrigger.addEventListener('click', openOverlay);
         if (aboutBackground) aboutBackground.addEventListener('click', closeOverlay);
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
     
     // --- SERVICE WORKER REGISTRATION ---
     // if ('serviceWorker' in navigator) {
     //    window.addEventListener('load', () => {
     //        navigator.serviceWorker.register('./sw.js')
     //        .then(registration => {
     //            console.log('ServiceWorker registration
     //                        successful with scope: ',
     //                        registration.scope);
     //        })
     //        .catch(err => {
     //            console.log('ServiceWorker registration
     //                        failed: ', err);
     //        });
     //    });
     // }
     
 })();

//  Created by Luigi Vacchelli on 20/11/25.
