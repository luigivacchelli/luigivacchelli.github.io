(() => {
    "use strict";
    
    // --- 1. CACHE DOM ELEMENTS ---
    const preloader         = document.getElementById('preloader');
    const preloaderContent  = document.querySelector('.preloader-content');
    const pageHeader        = document.querySelector('.page-header');
    const mainContainer     = document.querySelector('.container');
    const webcamVideo       = document.getElementById('webcam');
    const webcamContainer   = document.querySelector('.webcam-container');
    // FIX: Scoped to `main` to exclude the .about-image inside the overlay.
    // Previously, document.querySelectorAll('.media-link img') also matched the overlay
    // photo, causing it to receive a redundant IntersectionObserver in setupHiresSwapping
    // on top of the dedicated upgradeOverlayImage() handler.
    const galleryImages     = document.querySelectorAll('main .media-link img');
    const i18nElements      = document.querySelectorAll('[data-i18n-key]');
    const headerLeft        = document.querySelector('.header-left');
    const aboutTrigger      = document.getElementById('about-trigger');
    const aboutOverlay      = document.getElementById('about-overlay');
    const aboutBackground   = document.getElementById('about-background');
    const easterEggLayer    = document.getElementById('easter-egg-layer');
    let webcamStream = null;
    let webcamRequestPending = false;
    
    // --- DICTIONARY FOR TRANSLATIONS ---
    const translations = {
        'en': {
            welcomeMessage:         `This site uses your webcam to enhance the experience. <br> Please don't be shy!`,
            aboutLink:              "whoami",
            easterEggLeftHeader:    "what are you doing up so late?",
            easterEggRightHeader:   "go to sleep!",
            aboutBio:               `Director and photographer, born in '98. I live in Rome, but my heart is in Genoa. <br> I work on short films, photographic projects and international film productions. <br> Also, there's a good chance I'll beat you at <a href="https://www.chess.com/member/lksmrkds" target="_blank" rel="noopener noreferrer">chess</a>.`,
            copyright:              "© 2026 Luigi Vacchelli. All rights reserved."
        },
        'it': {
            welcomeMessage:         `Questo sito richiede l'accesso alla webcam per essere più bello.<br> Non fate i timidi!`,
            aboutLink:              "chisono",
            easterEggLeftHeader:    "cosa ci fai ancora in piedi?",
            easterEggRightHeader:   "corri a letto!",
            aboutBio:               `Regista e fotografo, classe '98. Vivo a Roma, ma ho lasciato il cuore a Genova. <br> Lavoro a cortometraggi, progetti fotografici e produzioni cinematografiche internazionali. <br> Inoltre, ci sono buone probabilità che ti batta a <a href="https://www.chess.com/member/lksmrkds" target="_blank" rel="noopener noreferrer">scacchi</a>.`,
            copyright:              "© 2026 Luigi Vacchelli. Tutti i diritti riservati."
        }
    };

    // --- HELPER: Detect language ---
    // FIX: Added .toLowerCase() — the BCP 47 spec does not guarantee lowercase language tags,
    // even though all major browsers currently return them that way. This makes detection
    // defensive against edge cases at zero cost.
    function getLanguage() {
        return navigator.language.substring(0, 2).toLowerCase() === 'it' ? 'it' : 'en';
    }
    
    // --- FUNCTION DEFINITIONS ---
    function openOverlay() {
        if (aboutOverlay) {
            aboutOverlay.classList.add('is-open');
            document.documentElement.classList.add('overlay-active');
            aboutOverlay.setAttribute('aria-hidden', 'false');
            upgradeOverlayImage();
            requestWebcamAccess();
        }
    }
    
    function closeOverlay() {
        if (aboutOverlay) {
            aboutOverlay.classList.remove('is-open');
            document.documentElement.classList.remove('overlay-active');
            aboutOverlay.setAttribute('aria-hidden', 'true');
            stopWebcam();
        }
    }
    
    function translatePage() {
        const language = getLanguage();
        i18nElements.forEach(element => {
            const key         = element.dataset.i18nKey;
            const translation = translations[language][key];
            if (translation !== undefined) {
                element.innerHTML = translation;
            }
        });
    }
    
    function requestWebcamAccess() {
        if (!webcamVideo || !webcamContainer || webcamStream || webcamRequestPending) return;
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            webcamContainer.style.display = 'none';
            return;
        }
        webcamRequestPending = true;
        navigator.mediaDevices.getUserMedia({ video: true })
            .then(stream => {
                webcamRequestPending = false;
                if (!aboutOverlay || !aboutOverlay.classList.contains('is-open')) {
                    stream.getTracks().forEach(track => track.stop());
                    return;
                }
                webcamStream = stream;
                webcamVideo.srcObject = stream;
            })
            .catch(() => {
                webcamRequestPending = false;
                webcamContainer.style.display = 'none';
            });
    }

    function stopWebcam() {
        if (webcamStream) {
            webcamStream.getTracks().forEach(track => track.stop());
            webcamStream = null;
        }
        if (webcamVideo) webcamVideo.srcObject = null;
    }
    
    function setupImageGallery() {
        galleryImages.forEach(img => {
            const originalLoresSrc = img.src;
            const loresGallery     = img.dataset.gallery      ? img.dataset.gallery.split(',')      : [];
            const hiresGallery     = img.dataset.hiresGallery ? img.dataset.hiresGallery.split(',') : [];
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
    
    function setupResponsiveGalleryOrder() {
        if (!mainContainer) return;
        const leftColumn = mainContainer.querySelector('.column.left');
        const rightColumn = mainContainer.querySelector('.column.right');
        if (!leftColumn || !rightColumn) return;

        const leftItems = Array.from(leftColumn.querySelectorAll('.media-link'));
        const rightItems = Array.from(rightColumn.querySelectorAll('.media-link'));
        const leftTrigger = leftColumn.querySelector('.scroll-trigger');
        const rightTrigger = rightColumn.querySelector('.scroll-trigger');
        const mobileQuery = window.matchMedia('(max-width: 768px)');
        let mobileColumn = null;

        function applyOrder(isMobile) {
            if (isMobile) {
                if (!mobileColumn) {
                    mobileColumn = document.createElement('div');
                    mobileColumn.className = 'column mobile-column';
                    mainContainer.appendChild(mobileColumn);
                }
                const orderedItems = [];
                const itemCount = Math.max(leftItems.length, rightItems.length);
                for (let index = 0; index < itemCount; index++) {
                    if (leftItems[index]) orderedItems.push(leftItems[index]);
                    if (rightItems[index]) orderedItems.push(rightItems[index]);
                }
                orderedItems.forEach(item => mobileColumn.appendChild(item));
                if (leftTrigger) mobileColumn.appendChild(leftTrigger);
                if (rightTrigger) mobileColumn.appendChild(rightTrigger);
                mainContainer.classList.add('mobile-stacked');
                return;
            }

            mainContainer.classList.remove('mobile-stacked');
            if (!mobileColumn) return;
            leftItems.forEach(item => leftColumn.appendChild(item));
            if (leftTrigger) leftColumn.appendChild(leftTrigger);
            rightItems.forEach(item => rightColumn.appendChild(item));
            if (rightTrigger) rightColumn.appendChild(rightTrigger);
            mobileColumn.remove();
            mobileColumn = null;
        }

        applyOrder(mobileQuery.matches);
        mobileQuery.addEventListener('change', event => applyOrder(event.matches));
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

        // Pause pool video when the about overlay opens.
        // NOTE: This side-effect lives here because the pool video needs to pause when
        // the overlay opens. It is not called more than once, so duplicate listener
        // accumulation is not a risk in the current architecture. If setupPoolAnimation
        // is ever refactored to be callable multiple times, move this listener to the
        // main DOMContentLoaded block alongside the other aboutTrigger listeners.
        aboutTrigger.addEventListener('click', () => {
            if (video) { video.pause(); container.classList.remove('is-playing'); }
        });
    }

    function setupVideoLoading() {
        const videos = Array.from(document.querySelectorAll('main video'));
        const waitingToPlay = new WeakSet();

        function loadVideo(video) {
            if (video.dataset.mediaLoaded === 'true') return;
            let hasSource = false;
            if (video.dataset.src) {
                video.src = video.dataset.src;
                hasSource = true;
            }
            video.querySelectorAll('source[data-src]').forEach(source => {
                source.src = source.dataset.src;
                source.removeAttribute('data-src');
                hasSource = true;
            });
            if (!hasSource) return;
            video.dataset.mediaLoaded = 'true';
            video.preload = 'auto';
            video.load();
        }

        function playWhenReady(video) {
            if (video.dataset.inView !== 'true') return;
            const play = () => {
                waitingToPlay.delete(video);
                if (video.dataset.inView === 'true') video.play().catch(() => {});
            };
            if (video.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) play();
            else if (!waitingToPlay.has(video)) {
                waitingToPlay.add(video);
                video.addEventListener('canplay', play, { once: true });
            }
        }

        if (!('IntersectionObserver' in window)) {
            videos.forEach(video => {
                loadVideo(video);
                if (video.dataset.autoplay === 'true') {
                    video.dataset.inView = 'true';
                    playWhenReady(video);
                }
            });
            return;
        }

        const preloadObserver = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    loadVideo(entry.target);
                    preloadObserver.unobserve(entry.target);
                }
            });
        }, { rootMargin: '900px 0px' });

        const playbackObserver = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                const video = entry.target;
                video.dataset.inView = String(entry.isIntersecting);
                if (entry.isIntersecting) {
                    loadVideo(video);
                    if (video.dataset.autoplay === 'true') playWhenReady(video);
                } else if (video.dataset.autoplay === 'true') {
                    video.pause();
                }
            });
        }, { threshold: 0.1 });

        videos.forEach(video => {
            preloadObserver.observe(video);
            if (video.dataset.autoplay === 'true') playbackObserver.observe(video);
        });
    }

    function setupVideoToggle() {
        const container = document.getElementById('dolphin-toggle');
        if (!container) return;

        const vNormal = container.querySelector('.video-normal');
        const vPixel  = container.querySelector('.video-pixelated');
        if (!vNormal || !vPixel) return;

        // --- Toggle Logic ---
        container.addEventListener('click', () => {
            container.classList.toggle('is-pixelated');
        });

    }
    
    function setupInteractiveBalls() {
        const container = document.querySelector('.interactive-balls-container');
        if (!container) return;
        const video = container.querySelector('.balls-video');
        if (!video) return;

        // FIX: Store the replay timeout reference so it can be cancelled on click.
        // Previously, if a user clicked during the 3-second replay delay, `video.play()`
        // could be called both by the click handler AND by the timeout, producing
        // a "play() called on an already-playing element" console error.
        let replayTimeout = null;

        video.addEventListener('ended', () => {
            replayTimeout = setTimeout(() => {
                replayTimeout = null;
                if (container.classList.contains('is-playing')) {
                    video.play();
                }
            }, 3000);
        });

        container.addEventListener('click', () => {
            if (container.classList.contains('is-playing')) {
                // Turning OFF: cancel any pending replay and pause immediately.
                if (replayTimeout) {
                    clearTimeout(replayTimeout);
                    replayTimeout = null;
                }
                container.classList.remove('is-playing');
                video.pause();
            } else {
                // Turning ON: cancel any pending replay (shouldn't exist, but be safe)
                // then start from the beginning.
                if (replayTimeout) {
                    clearTimeout(replayTimeout);
                    replayTimeout = null;
                }
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
                    const img      = entry.target;
                    const hiresSrc = img.dataset.hiresSrc;
                    if (hiresSrc && !img.dataset.isSwapped) {
                        const hiresImage   = new Image();
                        hiresImage.src     = hiresSrc;
                        hiresImage.onload  = () => {
                            img.src                = hiresSrc;
                            img.dataset.isSwapped  = 'true';
                        };
                        observer.unobserve(img);
                    }
                }
            });
        };
        const observer = new IntersectionObserver(observerCallback, { rootMargin: '200px' });
        // galleryImages is already scoped to `main .media-link img` — the overlay photo
        // is handled separately by upgradeOverlayImage() and will not receive a duplicate observer.
        galleryImages.forEach(img => { if (img.dataset.hiresSrc) observer.observe(img); });
    }
    
    function upgradeOverlayImage() {
        const overlayImage = document.querySelector('.about-image');
        if (!overlayImage || !overlayImage.dataset.hiresSrc || overlayImage.dataset.isSwapped === 'true') return;
        const hiresSrc       = overlayImage.dataset.hiresSrc;
        const hiresImage     = new Image();
        hiresImage.src       = hiresSrc;
        hiresImage.onload    = () => {
            overlayImage.src               = hiresSrc;
            overlayImage.dataset.isSwapped = 'true';
        };
    }
    
    function setupInfiniteCarousel(carouselElement) {
        if (!carouselElement) return;
        const track = carouselElement.querySelector('.carousel-track');
        let items   = Array.from(track.children);
        let isTeleporting = false;
        let isDown        = false;
        let startX;
        let scrollLeft;

        function loadHires(item) {
            const img = item.tagName === 'IMG' ? item : item.querySelector('img');
            if (img && img.dataset.hiresSrc && !img.dataset.isSwapped) {
                const hiresSrc   = img.dataset.hiresSrc;
                const hiresImage = new Image();
                hiresImage.src   = hiresSrc;
                hiresImage.onload = () => {
                    img.src                = hiresSrc;
                    img.dataset.isSwapped  = 'true';
                };
            }
        }

        function checkAndLoadVisibleItems() {
            const scrollLeft    = carouselElement.scrollLeft;
            const carouselWidth = carouselElement.offsetWidth;
            items.forEach((item) => {
                const itemLeft  = item.offsetLeft;
                const itemWidth = item.offsetWidth;
                if (itemLeft < scrollLeft + carouselWidth + itemWidth &&
                    itemLeft + itemWidth > scrollLeft - itemWidth) {
                    loadHires(item);
                }
            });
        }

        // --- Mouse Drag Logic ---
        const dragMove = (e) => {
            e.preventDefault();
            const x    = e.pageX - carouselElement.offsetLeft;
            const walk = (x - startX);
            carouselElement.scrollLeft = scrollLeft - walk;
        };

        const dragEnd = () => {
            isDown = false;
            carouselElement.classList.remove('active-drag');
            document.removeEventListener('mousemove', dragMove);
            document.removeEventListener('mouseup',   dragEnd);
        };

        carouselElement.addEventListener('mousedown', (e) => {
            e.preventDefault();
            isDown     = true;
            carouselElement.classList.add('active-drag');
            startX     = e.pageX - carouselElement.offsetLeft;
            scrollLeft = carouselElement.scrollLeft;
            document.addEventListener('mousemove', dragMove);
            document.addEventListener('mouseup',   dragEnd);
        });

        carouselElement.addEventListener('mouseleave', () => {
            if (isDown) dragEnd();
        });
        // --- End Mouse Drag Logic ---

        const firstClone = items[0].cloneNode(true);
        const lastClone  = items[items.length - 1].cloneNode(true);
        firstClone.classList.add('clone');
        lastClone.classList.add('clone');
        track.appendChild(firstClone);
        track.insertBefore(lastClone, items[0]);
        items = Array.from(track.children);

        setTimeout(() => {
            track.style.transition       = 'none';
            carouselElement.scrollLeft   = carouselElement.querySelector('.carousel-item:not(.clone)').offsetLeft;
            track.style.transition       = '';
            checkAndLoadVisibleItems();
        }, 75);

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
            const lastItem  = items[items.length - 2];
            const itemWidth = firstItem.offsetWidth;
            if (carouselElement.scrollLeft < firstItem.offsetLeft - (itemWidth / 2)) {
                isTeleporting                = true;
                track.style.transition       = 'none';
                carouselElement.scrollLeft   = lastItem.offsetLeft;
                track.style.transition       = '';
                setTimeout(() => { isTeleporting = false; }, 50);
            } else if (carouselElement.scrollLeft > lastItem.offsetLeft + (itemWidth / 2)) {
                isTeleporting                = true;
                track.style.transition       = 'none';
                carouselElement.scrollLeft   = firstItem.offsetLeft;
                track.style.transition       = '';
                setTimeout(() => { isTeleporting = false; }, 50);
            }
        }, { passive: true });
    }
    
    function setupFooterObserver() {
        if (!('IntersectionObserver' in window)) return;
        const footer = document.querySelector('.site-footer');
        if (!footer) return;
        let isLeftAtEnd  = false;
        let isRightAtEnd = false;
        const observerCallback = (entries) => {
            entries.forEach(entry => {
                if (entry.target.dataset.column === 'left')  isLeftAtEnd  = entry.isIntersecting;
                if (entry.target.dataset.column === 'right') isRightAtEnd = entry.isIntersecting;
            });
            const isDesktop = window.matchMedia('(min-width: 769px)').matches;
            if (isDesktop) {
                footer.classList.toggle('visible', isLeftAtEnd && isRightAtEnd);
            } else {
                footer.classList.toggle('visible', isRightAtEnd);
            }
        };
        const observer      = new IntersectionObserver(observerCallback);
        const scrollTriggers = document.querySelectorAll('.scroll-trigger');
        scrollTriggers.forEach(trigger => observer.observe(trigger));
    }
    
    // --- EASTER EGG LOGIC ---
    function checkForEasterEgg() {
        const now   = new Date();
        const hours = now.getHours();
        const isEasterEggTime = (hours >= 0 && hours < 6);
        
        if (isEasterEggTime && easterEggLayer) {
            if (!headerLeft || !aboutTrigger) return false;
            
            const originalLeftText  = headerLeft.textContent;
            const originalRightText = aboutTrigger.textContent;
            
            // 1. Activate Layer
            easterEggLayer.classList.add('active');
            easterEggLayer.setAttribute('aria-hidden', 'false');
            document.body.classList.add('easter-egg-active');
            
            // 2. Force Header to appear INSTANTLY (no transition)
            pageHeader.style.transition = 'none';
            pageHeader.classList.add('visible');
            void pageHeader.offsetWidth; // Force reflow to apply the no-transition state

            const language = getLanguage();
            headerLeft.textContent    = translations[language].easterEggLeftHeader;
            aboutTrigger.textContent  = translations[language].easterEggRightHeader;
            
            // 3. Start fading OUT header at 5s
            setTimeout(() => {
                pageHeader.style.transition = ''; // Restore transition
                pageHeader.classList.remove('visible');
            }, 5000);
            
            // FIX: Second timeout moved from 5000ms to 6000ms.
            // Previously both timeouts fired at exactly 5000ms. The remove('visible') and
            // add('visible') calls landed in the same JS tick, meaning the CSS fade-out
            // transition never had time to run — the header text swapped abruptly with
            // no animation. 6000ms gives the 1s opacity transition room to complete first.
            setTimeout(() => {
                document.body.classList.remove('easter-egg-active');
                headerLeft.textContent   = originalLeftText;
                aboutTrigger.textContent = originalRightText;
                
                // Fade IN the header with normal text
                pageHeader.classList.add('visible');
                
                // Fade OUT the easter egg layer
                easterEggLayer.classList.remove('active');
                easterEggLayer.setAttribute('aria-hidden', 'true');
                
            }, 6000);
            
            return true;
        }
        return false;
    }
    
    let isContentLoaded = false;
    let isTimerFinished = false;
    
    function finishLoading() {
        if (isContentLoaded && isTimerFinished) {
            document.body.classList.add('loading-finished');
            document.body.classList.add('layout-ready');

            if (preloader) {
                const requestAfterFade = event => {
                    if (event.target === preloader && event.propertyName === 'opacity') {
                        preloader.removeEventListener('transitionend', requestAfterFade);
                        requestWebcamAccess();
                    }
                };
                preloader.addEventListener('transitionend', requestAfterFade);
                preloader.classList.add('hidden');
                preloader.setAttribute('aria-hidden', 'true');
            } else {
                requestWebcamAccess();
            }

            const easterEggActive = checkForEasterEgg();

            if (mainContainer) mainContainer.classList.add('visible');
            if (!easterEggActive && pageHeader) pageHeader.classList.add('visible');
            setupHiresSwapping();
        }
    }
    
    function trackCriticalContent() {
        const leftMedia  = Array.from(document.querySelectorAll('.column.left .media-link img, .column.left .media-link video')).slice(0, 3);
        const rightMedia = Array.from(document.querySelectorAll('.column.right .media-link img, .column.right .media-link video')).slice(0, 3);
        const criticalItems = [...leftMedia, ...rightMedia];

        if (criticalItems.length === 0) {
            isContentLoaded = true;
            finishLoading();
            return;
        }

        const promises = criticalItems.map(media => {
            return new Promise((resolve) => {
                if ((media.tagName === 'IMG'   && media.complete)         ||
                    (media.tagName === 'VIDEO' && media.readyState >= 3)) {
                    resolve();
                } else {
                    media.addEventListener('load',    resolve, { once: true });
                    media.addEventListener('canplay', resolve, { once: true });
                    media.addEventListener('error',   resolve, { once: true });
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
        setupResponsiveGalleryOrder();
        setupImageGallery();
        setupVideoLoading();
        setupVideoToggle();
        setupPoolAnimation();
        setupInteractiveBalls();
        trackCriticalContent();
        const allCarousels = document.querySelectorAll('.carousel-container');
        allCarousels.forEach(setupInfiniteCarousel);
        setupFooterObserver();
        if (aboutTrigger)    aboutTrigger.addEventListener('click', openOverlay);
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

})();

// Created by Luigi Vacchelli on 26/11/25.
