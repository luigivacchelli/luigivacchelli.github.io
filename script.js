(() => {
    "use strict";
    
    // --- 1. CACHE DOM ELEMENTS ---
    const preloader         = document.getElementById('preloader');
    const preloaderContent  = document.querySelector('.preloader-content');
    const pageHeader        = document.querySelector('.page-header');
    const mainContainer     = document.querySelector('.container');
    const webcamVideo       = document.getElementById('webcam');
    const webcamContainer   = document.querySelector('.webcam-container');
    // The About portrait has a separate high-resolution upgrade path.
    const galleryImages     = document.querySelectorAll('main .media-link img');
    const i18nElements      = document.querySelectorAll('[data-i18n-key]');
    const headerLeft        = document.querySelector('.header-left');
    const aboutTrigger      = document.getElementById('about-trigger');
    const aboutOverlay      = document.getElementById('about-overlay');
    const aboutBackground   = document.getElementById('about-background');
    const aboutCloseButton  = document.getElementById('about-close');
    const easterEggLayer    = document.getElementById('easter-egg-layer');
    let webcamStream = null;
    let webcamRequestPending = false;
    let pageIsLeaving = false;
    let previouslyFocusedElement = null;
    const loadingStartedAt = performance.now();
    
    // --- DICTIONARY FOR TRANSLATIONS ---
    const translations = {
        'en': {
            documentTitle:          "Luigi Vacchelli | Director and Photographer",
            metaDescription:        "Luigi Vacchelli is a director and photographer based in Rome, Italy. Explore his photography and film work.",
            welcomeMessage:         `This site uses your webcam to enhance the experience. <br> Please don't be shy!`,
            aboutLink:              "whoami",
            aboutOpen:              "Open About Me",
            aboutDialog:            "About Luigi Vacchelli",
            aboutClose:             "Close About",
            galleryNext:            "Show next gallery image",
            colorCycle:             "Change the graphic color",
            carouselName:           "Photograph carousel",
            carouselSlideStatus:    "Image {index} of {total}",
            poolPlay:               "Play pool video with sound",
            dolphinToggle:          "Toggle pixelated dolphin video",
            ballsToggle:            "Play or pause juggling animation",
            easterEggLeftHeader:    "what are you doing up so late?",
            easterEggRightHeader:   "go to sleep!",
            aboutBio:               `Director and photographer, born in '98. I live in Rome, but my heart is in Genoa. <br> I work on short films, photographic projects and international film productions. <br> Also, there's a good chance I'll beat you at <a href="https://www.chess.com/member/lksmrkds" target="_blank" rel="noopener noreferrer">chess</a>.`,
            copyright:              "© 2026 Luigi Vacchelli. All rights reserved."
        },
        'it': {
            documentTitle:          "Luigi Vacchelli | Regista e Fotografo",
            metaDescription:        "Luigi Vacchelli, regista e fotografo genovese trapiantato a Roma. Nel mio portfolio troverete una collezione di fotografie e riprese video.",
            welcomeMessage:         `Questo sito richiede l'accesso alla webcam per essere più bello.<br> Non fate i timidi!`,
            aboutLink:              "chisono",
            aboutOpen:              "Apri Chi Sono",
            aboutDialog:            "Chi sono Luigi Vacchelli",
            aboutClose:             "Chiudi Chi Sono",
            galleryNext:            "Mostra l'immagine successiva",
            colorCycle:             "Cambia il colore dell'elemento grafico",
            carouselName:           "Carosello fotografico",
            carouselSlideStatus:    "Immagine {index} di {total}",
            poolPlay:               "Riproduci il video del biliardo con audio",
            dolphinToggle:          "Attiva o disattiva l'effetto pixelato sui delfini",
            ballsToggle:            "Riproduci o metti in pausa l'animazione delle palline",
            easterEggLeftHeader:    "cosa ci fai ancora in piedi?",
            easterEggRightHeader:   "corri a letto!",
            aboutBio:               `Regista e fotografo, classe '98. Vivo a Roma, ma ho lasciato il cuore a Genova. <br> Lavoro a cortometraggi, progetti fotografici e produzioni cinematografiche internazionali. <br> Inoltre, ci sono buone probabilità che ti batta a <a href="https://www.chess.com/member/lksmrkds" target="_blank" rel="noopener noreferrer">scacchi</a>.`,
            copyright:              "© 2026 Luigi Vacchelli. Tutti i diritti riservati."
        }
    };

    // Use the primary language subtag, regardless of its casing.
    function getLanguage() {
        return navigator.language.substring(0, 2).toLowerCase() === 'it' ? 'it' : 'en';
    }
    
    // --- FUNCTION DEFINITIONS ---
    function openOverlay() {
        if (!aboutOverlay || aboutOverlay.classList.contains('is-open')) return;
        previouslyFocusedElement = document.activeElement;
        aboutOverlay.inert = false;
        aboutOverlay.removeAttribute('inert');
        aboutOverlay.setAttribute('aria-hidden', 'false');
        aboutOverlay.classList.add('is-open');
        document.documentElement.classList.add('overlay-active');
        requestAnimationFrame(() => (aboutCloseButton || aboutOverlay).focus({ preventScroll: true }));
        upgradeOverlayImage();
        requestWebcamAccess();
    }
    
    function closeOverlay() {
        if (!aboutOverlay || !aboutOverlay.classList.contains('is-open')) return;
        aboutOverlay.classList.remove('is-open');
        aboutOverlay.setAttribute('aria-hidden', 'true');
        aboutOverlay.inert = true;
        aboutOverlay.setAttribute('inert', '');
        document.documentElement.classList.remove('overlay-active');
        if (previouslyFocusedElement instanceof HTMLElement) {
            previouslyFocusedElement.focus({ preventScroll: true });
        }
        previouslyFocusedElement = null;
        // Keep the granted stream ready so the feed is present on the next open.
    }
    
    function translatePage() {
        const language = getLanguage();
        document.documentElement.lang = language;
        document.title = translations[language].documentTitle;
        document.querySelector('meta[name="description"]')?.setAttribute('content', translations[language].metaDescription);
        i18nElements.forEach(element => {
            const key         = element.dataset.i18nKey;
            const translation = translations[language][key];
            if (translation !== undefined) {
                element.innerHTML = translation;
            }
        });
        document.querySelectorAll('[data-i18n-aria-label]').forEach(element => {
            const translation = translations[language][element.dataset.i18nAriaLabel];
            if (translation !== undefined) element.setAttribute('aria-label', translation);
        });
    }
    
    function requestWebcamAccess() {
        if (!webcamVideo || !webcamContainer || webcamRequestPending) return;
        webcamContainer.style.removeProperty('display');
        if (webcamStream?.getVideoTracks().some(track => track.readyState === 'live')) {
            if (webcamVideo.srcObject !== webcamStream) webcamVideo.srcObject = webcamStream;
            webcamVideo.play().catch(() => {});
            return;
        }
        webcamStream = null;
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            webcamContainer.style.display = 'none';
            return;
        }
        webcamRequestPending = true;
        navigator.mediaDevices.getUserMedia({ video: true })
            .then(stream => {
                webcamRequestPending = false;
                if (pageIsLeaving) {
                    stream.getTracks().forEach(track => track.stop());
                    return;
                }
                webcamStream = stream;
                webcamVideo.srcObject = stream;
                webcamVideo.play().catch(() => {});
                stream.getVideoTracks().forEach(track => {
                    track.addEventListener('ended', () => {
                        if (webcamStream !== stream) return;
                        webcamStream = null;
                        webcamVideo.srcObject = null;
                        webcamContainer.style.display = 'none';
                    }, { once: true });
                });
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
            const control = img.closest('button') || img;
            control.addEventListener('click', () => {
                cancelPendingImageUpgrade(img);
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

    function setupInfiniteGallery() {
        if (!mainContainer) return;

        // The screen stylesheet is enabled asynchronously; wait before measuring scroll offsets.
        const galleryStylesheet = document.querySelector('link[rel="stylesheet"][href*="stile.css"]');
        if (galleryStylesheet && galleryStylesheet.media !== 'all') {
            galleryStylesheet.addEventListener('load', () => {
                requestAnimationFrame(setupInfiniteGallery);
            }, { once: true });
            return;
        }

        mainContainer.classList.add('infinite-gallery');
        const mobileQuery = window.matchMedia('(max-width: 768px)');
        const bindings = [];
        const scheduledFrames = new Map();
        const lastPositions = new WeakMap();
        const lastDirections = new WeakMap();

        function captureCarouselPositions(items) {
            return items.flatMap(item => {
                const carousel = item.matches('.carousel-container') ? item : item.querySelector('.carousel-container');
                return carousel ? [[carousel, carousel.scrollLeft]] : [];
            });
        }

        function restoreCarouselPositions(positions) {
            positions.forEach(([carousel, scrollLeft]) => {
                carousel.scrollLeft = scrollLeft;
            });
        }

        function ensureScrollCapacity(surface, target, position) {
            const maxPosition = target === window
                ? Math.max(document.documentElement.scrollHeight, document.body.scrollHeight) - window.innerHeight
                : target.scrollHeight - target.clientHeight;
            if (maxPosition >= position) return;
            const currentPadding = parseFloat(getComputedStyle(surface).paddingBottom) || 0;
            surface.style.paddingBottom = `${currentPadding + position - maxPosition + 2}px`;
        }

        const readPosition = target => target === window ? window.scrollY : target.scrollTop;

        function readSurfaceOffset(surface, scrollTarget) {
            if (scrollTarget !== window) return scrollTarget.scrollTop;
            const surfaceDocumentTop = surface.getBoundingClientRect().top + window.scrollY;
            return window.scrollY - surfaceDocumentTop;
        }

        function writePosition(target, position) {
            if (target === window) window.scrollTo(window.scrollX, position);
            else target.scrollTop = position;
            lastPositions.set(target, readPosition(target));
            lastDirections.set(target, 0);
        }

        function seedTopBuffer(surface, scrollTarget) {
            if (readPosition(scrollTarget) > 1) return;
            const items = Array.from(surface.querySelectorAll(':scope > .media-link'));
            if (items.length < 2) return;

            // Provide scrollable content above the initial position without moving the visible first card.
            const first = items[0];
            const last = items[items.length - 1];
            const firstTopBefore = first.getBoundingClientRect().top;
            const trigger = surface.querySelector(':scope > .scroll-trigger');
            const carouselPositions = captureCarouselPositions([last]);
            surface.insertBefore(last, first);
            const shift = first.getBoundingClientRect().top - firstTopBefore;

            if (shift > 1) {
                const positionBeforeShift = readPosition(scrollTarget);
                const desiredPosition = positionBeforeShift + shift;
                ensureScrollCapacity(surface, scrollTarget, desiredPosition);
                writePosition(scrollTarget, desiredPosition);
            } else {
                surface.insertBefore(last, trigger);
            }
            restoreCarouselPositions(carouselPositions);
        }

        function recyclePassedItems(surface, scrollTarget, direction) {
            const isWindow = scrollTarget === window;
            const viewportTop = isWindow ? 0 : surface.getBoundingClientRect().top;
            const items = Array.from(surface.querySelectorAll(':scope > .media-link'));
            if (items.length < 2) return;

            // Replenish the top buffer before native scrolling reaches its boundary.
            if (direction < 0) {
                const offset = readSurfaceOffset(surface, scrollTarget);
                const firstRect = items[0].getBoundingClientRect();
                const firstMargin = parseFloat(getComputedStyle(items[0]).marginBottom) || 0;
                if (offset > firstRect.height + firstMargin + 1) return;

                let addedHeight = 0;
                let count = 0;
                while (count < items.length - 1 && offset + addedHeight <= firstRect.height + firstMargin + 1) {
                    const item = items[items.length - 1 - count];
                    addedHeight += item.getBoundingClientRect().height;
                    count++;
                }
                if (!count) return;

                const firstTopBefore = items[0].getBoundingClientRect().top;
                const movedItems = items.slice(-count);
                const carouselPositions = captureCarouselPositions(movedItems);
                const fragment = document.createDocumentFragment();
                movedItems.forEach(item => fragment.appendChild(item));
                surface.insertBefore(fragment, items[0]);
                restoreCarouselPositions(carouselPositions);
                const shift = items[0].getBoundingClientRect().top - firstTopBefore;
                if (shift > 1) writePosition(scrollTarget, readPosition(scrollTarget) + shift);
                return;
            }

            if (direction <= 0) return;
            let count = 0;
            while (count < items.length - 1 && items[count].getBoundingClientRect().bottom <= viewportTop + 1) count++;
            if (!count) return;

            const firstRect = items[0].getBoundingClientRect();
            const nextRect = items[count].getBoundingClientRect();
            const shift = nextRect.top - firstRect.top;
            if (shift <= 1) return;

            const movedItems = items.slice(0, count);
            const carouselPositions = captureCarouselPositions(movedItems);
            const fragment = document.createDocumentFragment();
            movedItems.forEach(item => fragment.appendChild(item));
            const trigger = surface.querySelector(':scope > .scroll-trigger');
            surface.insertBefore(fragment, trigger);
            restoreCarouselPositions(carouselPositions);
            writePosition(scrollTarget, Math.max(0, readPosition(scrollTarget) - shift));
        }

        function scheduleRecycle(surface, scrollTarget) {
            const position = readPosition(scrollTarget);
            const previous = lastPositions.get(scrollTarget);
            if (previous !== undefined && Math.abs(position - previous) > 0.5) {
                lastDirections.set(scrollTarget, Math.sign(position - previous));
            }
            lastPositions.set(scrollTarget, position);
            if (scheduledFrames.has(scrollTarget)) return;
            const frame = window.requestAnimationFrame(() => {
                scheduledFrames.delete(scrollTarget);
                recyclePassedItems(surface, scrollTarget, lastDirections.get(scrollTarget) || 0);
            });
            scheduledFrames.set(scrollTarget, frame);
        }

        function bindScrollSurfaces() {
            bindings.forEach(({ target, handler }) => {
                target.removeEventListener('scroll', handler);
                target.removeEventListener('scrollend', handler);
            });
            bindings.length = 0;

            const surfaces = mobileQuery.matches
                ? [{ surface: mainContainer.querySelector('.mobile-column'), target: window }]
                : Array.from(mainContainer.querySelectorAll(':scope > .column:not(.mobile-column)'))
                    .map(surface => ({ surface, target: surface }));

            surfaces.forEach(({ surface, target }) => {
                if (!surface) return;
                seedTopBuffer(surface, target);
                lastPositions.set(target, readPosition(target));
                lastDirections.set(target, 0);
                const handler = () => scheduleRecycle(surface, target);
                target.addEventListener('scroll', handler, { passive: true });
                target.addEventListener('scrollend', handler, { passive: true });
                bindings.push({ target, handler });
            });
        }

        // Scroll events can be coalesced during a fast fling. The sentinels provide
        // a second chance to recycle the corresponding column before its end is reached.
        if ('IntersectionObserver' in window) {
            const sentinelObserver = new IntersectionObserver(entries => {
                entries.forEach(entry => {
                    if (!entry.isIntersecting) return;
                    const surface = entry.target.parentElement;
                    scheduleRecycle(surface, mobileQuery.matches ? window : surface);
                });
            }, { rootMargin: '100% 0px' });
            mainContainer.querySelectorAll('.scroll-trigger').forEach(trigger => sentinelObserver.observe(trigger));
        }

        // The footer trigger remains in each column for the existing footer workflow.
        // Recycling media before it reaches the viewport intentionally keeps the footer hidden.
        bindScrollSurfaces();
        mobileQuery.addEventListener('change', bindScrollSurfaces);
    }
    
    function setupPoolAnimation() {
        const container = document.getElementById('pool-animation');
        if (!container) return;
        const video = container.querySelector('.pool-video');
        if (!video) return;

        video.preload = 'auto';

        video.addEventListener('ended', () => {
            setTimeout(() => {
                container.classList.remove('is-playing');
                container.setAttribute('aria-pressed', 'false');
            }, 50);
        });

        container.addEventListener('click', () => {
            if (container.classList.contains('is-playing')) return;
            container.classList.add('is-playing');
            container.setAttribute('aria-pressed', 'true');
            video.currentTime = 0;
            video.muted = false;
            const playPromise = video.play();
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    container.classList.remove('is-playing');
                    container.setAttribute('aria-pressed', 'false');
                    console.warn("Pool video play failed:", error);
                });
            }
        });

        // Pause pool video when the about overlay opens.
        // NOTE: This side-effect lives here because the pool video needs to pause when
        // the overlay opens. It is not called more than once, so duplicate listener
        // accumulation is not a risk in the current architecture. If setupPoolAnimation
        // is ever refactored to be callable multiple times, move this listener to the
        // main DOMContentLoaded block alongside the other aboutTrigger listeners.
        aboutTrigger.addEventListener('click', () => {
            if (video) {
                video.pause();
                container.classList.remove('is-playing');
                container.setAttribute('aria-pressed', 'false');
            }
        });
    }

    function setupVideoLoading() {
        const videos = Array.from(document.querySelectorAll('main video'));
        const waitingToPlay = new WeakSet();
        const playAttempts = new WeakSet();
        const startedVideos = new WeakSet();
        const columnQueues = new Map();
        const activeLoads = new Map();
        const maxLoadsPerColumn = 1;

        document.querySelectorAll('main .column').forEach(column => {
            columnQueues.set(column, Array.from(column.querySelectorAll('video')));
            activeLoads.set(column, 0);
        });

        function startVideo(video, column) {
            if (startedVideos.has(video)) return;
            if (video.dataset.autoplay === 'true') {
                video.muted = true;
                video.defaultMuted = true;
                video.autoplay = true;
                video.playsInline = true;
                video.controls = false;
            }
            video.preload = video.dataset.autoplay === 'true' ? 'auto' : video.preload;
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
            startedVideos.add(video);
            video.dataset.mediaLoaded = 'true';
            if (column) activeLoads.set(column, activeLoads.get(column) + 1);

            if (column) {
                let released = false;
                const releaseSlot = () => {
                    if (released) return;
                    released = true;
                    video.removeEventListener('canplay', releaseSlot);
                    video.removeEventListener('error', releaseSlot);
                    activeLoads.set(column, activeLoads.get(column) - 1);
                    loadNextInColumn(column);
                };
                video.addEventListener('canplay', releaseSlot, { once: true });
                video.addEventListener('error', releaseSlot, { once: true });
            }
            video.load();
        }

        function loadNextInColumn(column) {
            const queue = columnQueues.get(column);
            if (!queue) return;
            while (activeLoads.get(column) < maxLoadsPerColumn && queue.length) {
                const video = queue.shift();
                if (startedVideos.has(video)) continue;
                startVideo(video, column);
            }
        }

        function loadVideo(video) {
            if (startedVideos.has(video)) return;
            const column = video.closest('.column');
            if (!column || !columnQueues.has(column)) {
                startVideo(video, null);
                return;
            }

            const queue = columnQueues.get(column);
            const queuedIndex = queue.indexOf(video);
            if (video.dataset.inView === 'true' && queuedIndex > 0) {
                queue.splice(queuedIndex, 1);
                queue.unshift(video);
            }
            if (video.dataset.inView === 'true') {
                startVideo(video, column);
                return;
            }
            loadNextInColumn(column);
        }

        function playWhenReady(video) {
            if (video.dataset.inView !== 'true') return;
            const play = () => {
                waitingToPlay.delete(video);
                if (video.dataset.inView === 'true' && !document.hidden && !playAttempts.has(video) && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
                    playAttempts.add(video);
                    video.play().catch(error => {
                        playAttempts.delete(video);
                        if (error.name !== 'AbortError') {
                            console.warn('Inline video playback was blocked:', error.name, video.currentSrc || video.src);
                        }
                    });
                }
            };
            if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) play();
            else if (!waitingToPlay.has(video)) {
                waitingToPlay.add(video);
                video.addEventListener('loadeddata', play, { once: true });
            }
        }

        columnQueues.forEach((_, column) => loadNextInColumn(column));

        const playbackObserver = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
            entries.forEach(entry => {
                const video = entry.target;
                video.dataset.inView = String(entry.isIntersecting);
                if (entry.isIntersecting) {
                    loadVideo(video);
                    if (video.dataset.autoplay === 'true') {
                        video.addEventListener('canplay', () => {
                            playAttempts.delete(video);
                            playWhenReady(video);
                        }, { once: true });
                        playWhenReady(video);
                    }
                } else if (video.dataset.autoplay === 'true') {
                    video.pause();
                    playAttempts.delete(video);
                }
            });
        }, { threshold: 0.1 }) : null;

        videos.forEach(video => {
            if (video.dataset.autoplay !== 'true') return;
            if (playbackObserver) playbackObserver.observe(video);
            else {
                video.dataset.inView = 'true';
                playWhenReady(video);
            }
        });
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) return;
            videos.forEach(video => {
                if (video.dataset.autoplay === 'true' && video.dataset.inView === 'true') playWhenReady(video);
            });
        });
        document.addEventListener('pointerdown', () => {
            videos.forEach(video => {
                if (video.dataset.autoplay === 'true' && video.dataset.inView === 'true') playWhenReady(video);
            });
        }, { passive: true });
        return loadVideo;
    }

    function setupVideoToggle() {
        const container = document.getElementById('dolphin-toggle');
        if (!container) return;

        const vNormal = container.querySelector('.video-normal');
        const vPixel  = container.querySelector('.video-pixelated');
        if (!vNormal || !vPixel) return;

        // --- Toggle Logic ---
        container.addEventListener('click', () => {
            const isPixelated = container.classList.toggle('is-pixelated');
            container.setAttribute('aria-pressed', String(isPixelated));
        });

    }
    
    function setupInteractiveBalls() {
        const container = document.querySelector('.interactive-balls-container');
        if (!container) return;
        const video = container.querySelector('.balls-video');
        if (!video) return;

        // Keep the replay timer cancellable when the user turns the animation off.
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
                container.setAttribute('aria-pressed', 'false');
                video.pause();
            } else {
                // Turning ON: cancel any pending replay (shouldn't exist, but be safe)
                // then start from the beginning.
                if (replayTimeout) {
                    clearTimeout(replayTimeout);
                    replayTimeout = null;
                }
                container.classList.add('is-playing');
                container.setAttribute('aria-pressed', 'true');
                video.currentTime = 0;
                video.play().catch(e => {
                    container.classList.remove('is-playing');
                    container.setAttribute('aria-pressed', 'false');
                    console.warn("Balls video play failed", e);
                });
            }
        });
    }

    function setupColorBlend(prepareVideo) {
        const tile = document.getElementById('color-blend');
        if (!tile) return;
        const layers = Array.from(tile.querySelectorAll('video'));
        if (layers.length !== 3) return;
        const [blue, red, green] = layers;
        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const settings = {
            transitionDuration: reducedMotion ? 0 : 420,
            fullColorHold: 260,
            pointerThreshold: 38,
            wheelThreshold: 45,
            touchMoveThreshold: 12,
            tapMaxDuration: 700,
            tiltThreshold: 8,
            rateNudge: 0.5,
            seekAbove: 0.15
        };
        const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
        const tiltNeedsPermission = typeof DeviceOrientationEvent !== 'undefined' &&
            typeof DeviceOrientationEvent.requestPermission === 'function';
        const colorTargets = [
            { name: 'blue', weights: [1, 0, 0] },
            { name: 'red', weights: [0, 1, 0] },
            { name: 'green', weights: [0, 0, 1] }
        ];
        let currentWeights = [1, 0, 0];
        let transitionFrom = [1, 0, 0];
        let transitionTo = [1, 0, 0];
        let targetColor = 'blue';
        let previousColor = null;
        let transitionStartedAt = 0;
        let nextColorChangeAt = -Infinity;
        let tileVisible = false;
        let running = false;
        let started = false;
        let pending = false;
        let lastRetryTime = 0;
        let tiltAnchor = null;
        let tiltEnabled = false;

        const aboutIsOpen = () => aboutOverlay?.classList.contains('is-open') === true;
        function applyColorWeights(weights) {
            const [blueShare, redShare, greenShare] = weights;
            red.style.opacity = (blueShare + redShare > 0.0001
                ? redShare / (blueShare + redShare)
                : 0).toFixed(4);
            green.style.opacity = greenShare.toFixed(4);
        };

        function chooseNextColor() {
            if (aboutIsOpen()) return false;
            const now = performance.now();
            if (now < nextColorChangeAt) return false;
            const choices = colorTargets.filter(color =>
                color.name !== targetColor && color.name !== previousColor);
            const next = choices[Math.floor(Math.random() * choices.length)];
            previousColor = targetColor;
            targetColor = next.name;
            transitionFrom = [...currentWeights];
            transitionTo = [...next.weights];
            transitionStartedAt = now;

            if (!tileVisible || settings.transitionDuration === 0) {
                currentWeights = [...transitionTo];
                applyColorWeights(currentWeights);
            }
            nextColorChangeAt = now + (tileVisible ? settings.transitionDuration : 0) + settings.fullColorHold;
            return true;
        }

        tile.addEventListener('click', chooseNextColor);
        tile.addEventListener('keydown', event => {
            if (event.key !== 'Enter' && event.key !== ' ') return;
            event.preventDefault();
            chooseNextColor();
        });

        let pointerPosition = null;
        let pointerTravel = 0;
        window.addEventListener('pointermove', event => {
            if (event.pointerType === 'touch' || aboutIsOpen()) return;
            if (pointerPosition) {
                pointerTravel += Math.hypot(event.clientX - pointerPosition.x, event.clientY - pointerPosition.y);
                if (pointerTravel >= settings.pointerThreshold && chooseNextColor()) pointerTravel = 0;
            }
            pointerPosition = { x: event.clientX, y: event.clientY };
        }, { passive: true });

        let wheelTravel = 0;
        window.addEventListener('wheel', event => {
            if (aboutIsOpen()) return;
            wheelTravel += Math.abs(event.deltaX) + Math.abs(event.deltaY);
            if (wheelTravel >= settings.wheelThreshold && chooseNextColor()) wheelTravel = 0;
        }, { passive: true });

        let touchGesture = null;
        window.addEventListener('pointerdown', event => {
            if (event.pointerType !== 'touch') return;
            touchGesture = {
                id: event.pointerId,
                x: event.clientX,
                y: event.clientY,
                scrollY: window.scrollY,
                startedAt: performance.now(),
                moved: false,
                startedOnTile: tile.contains(event.target)
            };
        }, { passive: true });
        window.addEventListener('pointermove', event => {
            if (event.pointerType !== 'touch' || touchGesture?.id !== event.pointerId || touchGesture.moved) return;
            touchGesture.moved = Math.hypot(event.clientX - touchGesture.x, event.clientY - touchGesture.y) > settings.touchMoveThreshold;
        }, { passive: true });

        function finishTouch(event, cancelled = false) {
            if (event.pointerType !== 'touch' || touchGesture?.id !== event.pointerId) return;
            const gesture = touchGesture;
            touchGesture = null;
            if (cancelled || gesture.moved || Math.abs(window.scrollY - gesture.scrollY) > 2 ||
                performance.now() - gesture.startedAt > settings.tapMaxDuration) return;
            if (!tiltNeedsPermission || gesture.startedOnTile) chooseNextColor();
        }

        window.addEventListener('pointerup', event => finishTouch(event), { passive: true });
        window.addEventListener('pointercancel', event => finishTouch(event, true), { passive: true });

        const handleTilt = event => {
            if (event.gamma == null || event.beta == null || aboutIsOpen()) return;
            if (!tiltAnchor) {
                tiltAnchor = { gamma: event.gamma, beta: event.beta };
                return;
            }
            const movement = Math.hypot(event.gamma - tiltAnchor.gamma, event.beta - tiltAnchor.beta);
            if (movement >= settings.tiltThreshold && chooseNextColor()) {
                tiltAnchor = { gamma: event.gamma, beta: event.beta };
            }
        };
        const enableTilt = () => {
            if (tiltEnabled) return;
            tiltEnabled = true;
            tiltAnchor = null;
            window.addEventListener('deviceorientation', handleTilt);
        };

        if (typeof DeviceOrientationEvent !== 'undefined' && !tiltNeedsPermission) {
            enableTilt();
        }

        function syncFollowers() {
            const duration = blue.duration;
            if (!Number.isFinite(duration) || duration <= 0) return;
            [red, green].forEach(video => {
                if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;
                let drift = video.currentTime - blue.currentTime;
                if (drift > duration / 2) drift -= duration;
                else if (drift < -duration / 2) drift += duration;
                if (Math.abs(drift) > settings.seekAbove) {
                    video.currentTime = blue.currentTime;
                    video.playbackRate = 1;
                } else {
                    video.playbackRate = clamp(1 - drift * settings.rateNudge, 0.95, 1.05);
                }
            });
        }

        function waitUntilReady(video) {
            if (video.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) return Promise.resolve();
            return new Promise((resolve, reject) => {
                const cleanup = () => {
                    video.removeEventListener('canplay', onReady);
                    video.removeEventListener('error', onError);
                };
                const onReady = () => { cleanup(); resolve(); };
                const onError = () => { cleanup(); reject(video.error || new Error('Blend video failed to load')); };
                video.addEventListener('canplay', onReady, { once: true });
                video.addEventListener('error', onError, { once: true });
            });
        }

        function playAll() {
            if (pending || !running || aboutIsOpen()) return;
            pending = true;
            Promise.all(layers.map(video => video.play()))
                .then(() => Promise.all(layers.map(waitUntilReady)))
                .then(() => {
                    if (!running || aboutIsOpen()) {
                        layers.forEach(video => video.pause());
                        return;
                    }
                    red.currentTime = blue.currentTime;
                    green.currentTime = blue.currentTime;
                    layers.forEach(video => { video.playbackRate = 1; });
                    started = true;
                })
                .catch(() => { started = false; })
                .finally(() => { pending = false; });
        }

        function frame(now) {
            if (!running) return;
            if (currentWeights.some((weight, index) => Math.abs(weight - transitionTo[index]) > 0.0001)) {
                const progress = settings.transitionDuration
                    ? clamp((now - transitionStartedAt) / settings.transitionDuration, 0, 1)
                    : 1;
                const eased = progress * progress * (3 - 2 * progress);
                currentWeights = transitionFrom.map((weight, index) =>
                    weight + (transitionTo[index] - weight) * eased);
                if (progress === 1) currentWeights = [...transitionTo];
                applyColorWeights(currentWeights);
            }

            if (layers.some(video => video.paused)) started = false;
            if (!started && now - lastRetryTime > 500) {
                lastRetryTime = now;
                playAll();
            }
            if (started) syncFollowers();
            requestAnimationFrame(frame);
        }

        function start() {
            if (running || !tileVisible || aboutIsOpen()) return;
            running = true;
            playAll();
            requestAnimationFrame(frame);
        }

        function stop() {
            running = false;
            started = false;
            layers.forEach(video => video.pause());
        }

        function resetToBlue() {
            targetColor = 'blue';
            previousColor = null;
            currentWeights = transitionFrom = transitionTo = [1, 0, 0];
            nextColorChangeAt = performance.now();
            applyColorWeights(currentWeights);
        }

        if ('IntersectionObserver' in window) {
            new IntersectionObserver(entries => {
                const entry = entries.find(item => item.target === tile);
                if (!entry) return;
                tileVisible = entry.isIntersecting;
                if (tileVisible) {
                    layers.forEach(video => {
                        video.dataset.inView = 'true';
                        prepareVideo(video);
                    });
                    start();
                }
                else stop();
            }, { threshold: 0.1 }).observe(tile);
        } else {
            tileVisible = true;
            layers.forEach(video => {
                video.dataset.inView = 'true';
                prepareVideo(video);
            });
            start();
        }

        if (aboutOverlay && 'MutationObserver' in window) {
            new MutationObserver(() => {
                if (aboutIsOpen()) {
                    resetToBlue();
                    stop();
                } else if (tileVisible) {
                    start();
                }
            }).observe(aboutOverlay, { attributes: true, attributeFilter: ['class'] });
        }
    }
    
    const pendingImageUpgrades = new WeakMap();

    function cancelPendingImageUpgrade(img) {
        const request = pendingImageUpgrades.get(img);
        if (!request) return;
        pendingImageUpgrades.delete(img);
        request.resolve(false);
    }

    function swapImageWhenDecoded(img, source) {
        const pending = pendingImageUpgrades.get(img);
        if (pending?.source === source) return pending.promise;
        const request = {};
        request.source = source;
        request.promise = new Promise(resolve => { request.resolve = resolve; });
        const hiresImage = new Image();
        hiresImage.fetchPriority = 'low';
        pendingImageUpgrades.set(img, request);
        const finish = swapped => {
            if (pendingImageUpgrades.get(img) === request) pendingImageUpgrades.delete(img);
            request.resolve(swapped);
        };
        hiresImage.onload = async () => {
            if (hiresImage.naturalWidth === 0) {
                finish(false);
                return;
            }
            if (typeof hiresImage.decode === 'function') {
                try {
                    await hiresImage.decode();
                } catch {
                    finish(false);
                    return;
                }
            }
            if (pendingImageUpgrades.get(img) !== request) return;
            img.src = source;
            img.dataset.isSwapped = 'true';
            finish(true);
        };
        hiresImage.onerror = () => {
            finish(false);
        };
        hiresImage.src = source;
        return request.promise;
    }

    function setupHiresSwapping() {
        if (hiresSwappingStarted) return;
        hiresSwappingStarted = true;
        if (!('IntersectionObserver' in window)) {
            galleryImages.forEach(img => {
                const rect = img.getBoundingClientRect();
                if (img.dataset.hiresSrc && rect.width > 0 && rect.bottom > 0 && rect.top < innerHeight) {
                    swapImageWhenDecoded(img, img.dataset.hiresSrc);
                }
            });
            return;
        }
        const observerCallback = (entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img      = entry.target;
                    const hiresSrc = img.dataset.hiresSrc;
                    if (hiresSrc && !img.dataset.isSwapped) {
                        swapImageWhenDecoded(img, hiresSrc);
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
        swapImageWhenDecoded(overlayImage, overlayImage.dataset.hiresSrc);
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
                swapImageWhenDecoded(img, img.dataset.hiresSrc);
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
            if (Math.abs(walk) > 8) cancelPeekAnimation();
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

        const realItems = [...items];
        const firstClone = items[0].cloneNode(true);
        const lastClone  = items[items.length - 1].cloneNode(true);
        firstClone.classList.add('clone');
        lastClone.classList.add('clone');
        firstClone.inert = true;
        lastClone.inert = true;
        firstClone.setAttribute('aria-hidden', 'true');
        lastClone.setAttribute('aria-hidden', 'true');
        track.appendChild(firstClone);
        track.insertBefore(lastClone, items[0]);
        items = Array.from(track.children);

        const slideStatus = document.createElement('span');
        slideStatus.className = 'visually-hidden';
        slideStatus.setAttribute('aria-live', 'polite');
        slideStatus.setAttribute('aria-atomic', 'true');
        carouselElement.append(slideStatus);
        let slideStatusTimer;

        function nearestItem() {
            const center = carouselElement.scrollLeft + carouselElement.clientWidth / 2;
            return items.reduce((nearest, item) => {
                const distance = Math.abs(item.offsetLeft + item.offsetWidth / 2 - center);
                return !nearest || distance < nearest.distance ? { item, distance } : nearest;
            }, null)?.item;
        }

        function announceCurrentSlide() {
            const item = nearestItem();
            if (!item) return;
            const slideIndex = item === lastClone ? realItems.length
                : item === firstClone ? 1
                : realItems.indexOf(item) + 1;
            const language = getLanguage();
            slideStatus.textContent = translations[language].carouselSlideStatus
                .replace('{index}', String(slideIndex))
                .replace('{total}', String(realItems.length));
        }

        const initializePosition = () => {
            requestAnimationFrame(() => requestAnimationFrame(() => {
                if (!carouselElement.isConnected) return;
                const firstItem = items.find(item => !item.classList.contains('clone'));
                if (!firstItem) return;
                track.style.transition = 'none';
                carouselElement.scrollLeft = firstItem.offsetLeft;
                track.style.transition = '';
                checkAndLoadVisibleItems();
            }));
        };
        const galleryStylesheet = document.querySelector('link[rel="stylesheet"][href*="stile.css"]');
        if (galleryStylesheet && galleryStylesheet.media !== 'all') {
            galleryStylesheet.addEventListener('load', initializePosition, { once: true });
        } else {
            initializePosition();
        }

        let peekTimeout;
        let peekPlayed = carouselElement.dataset.peekPlayed === 'true';
        let peekPointer = null;
        function schedulePeek() {
            if (peekPlayed || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
            peekTimeout = setTimeout(() => {
                peekTimeout = null;
                if (peekPlayed || !carouselElement.isConnected) return;
                peekPlayed = true;
                carouselElement.dataset.peekPlayed = 'true';
                track.classList.add('has-peeked');
            }, 500);
        }

        if ('IntersectionObserver' in window) {
            const peekObserver = new IntersectionObserver((entries, observer) => {
                if (!entries.some(entry => entry.isIntersecting)) return;
                observer.unobserve(carouselElement);
                schedulePeek();
            }, { threshold: 0.35 });
            peekObserver.observe(carouselElement);
        } else {
            const rect = carouselElement.getBoundingClientRect();
            if (rect.top < innerHeight && rect.bottom > 0) schedulePeek();
        }

        function cancelPeekAnimation() {
            if (peekTimeout) clearTimeout(peekTimeout);
            peekTimeout = null;
            peekPlayed = true;
            carouselElement.dataset.peekPlayed = 'true';
            track.classList.remove('has-peeked');
        }
        carouselElement.addEventListener('pointerdown', event => {
            peekPointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
        }, { passive: true });
        carouselElement.addEventListener('pointermove', event => {
            if (!peekPointer || event.pointerId !== peekPointer.id) return;
            const deltaX = Math.abs(event.clientX - peekPointer.x);
            const deltaY = Math.abs(event.clientY - peekPointer.y);
            if (deltaX > 8 && deltaX > deltaY) cancelPeekAnimation();
            if (deltaX > 8 || deltaY > 8) peekPointer = null;
        }, { passive: true });
        carouselElement.addEventListener('pointerup', () => { peekPointer = null; }, { passive: true });
        carouselElement.addEventListener('pointercancel', () => { peekPointer = null; }, { passive: true });
        carouselElement.addEventListener('wheel', event => {
            if (Math.abs(event.deltaX) > 0 && (event.shiftKey || Math.abs(event.deltaX) >= Math.abs(event.deltaY))) {
                cancelPeekAnimation();
            }
        }, { passive: true });
        carouselElement.addEventListener('keydown', event => {
            if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
            event.preventDefault();
            cancelPeekAnimation();
            let target;
            if (event.key === 'Home') target = realItems[0];
            else if (event.key === 'End') target = realItems[realItems.length - 1];
            else {
                const index = items.indexOf(nearestItem());
                target = items[Math.max(0, Math.min(items.length - 1, index + (event.key === 'ArrowRight' ? 1 : -1)))];
            }
            carouselElement.scrollTo({
                left: target.offsetLeft,
                behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
            });
        });
        const clearPeekClass = event => {
            if (event.animationName === 'peek-a-boo') track.classList.remove('has-peeked');
        };
        track.addEventListener('animationend', clearPeekClass, { once: true });
        track.addEventListener('animationcancel', clearPeekClass, { once: true });

        carouselElement.addEventListener('scroll', () => {
            checkAndLoadVisibleItems();
            clearTimeout(slideStatusTimer);
            slideStatusTimer = setTimeout(announceCurrentSlide, 180);
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
            // Keep the original footer observer for a future finite-gallery mode, but
            // never reveal the footer while media recycling keeps the gallery endless.
            if (mainContainer?.classList.contains('infinite-gallery')) {
                footer.classList.remove('visible');
                return;
            }
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
            
            // Allow the header's one-second fade-out to finish before restoring its labels.
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
    let hiresSwappingStarted = false;
    let hasFinishedLoading = false;
    let loadingDeadline = null;
    let startBackgroundImageLoading = () => {};
    
    function finishLoading() {
        if (!hasFinishedLoading && isContentLoaded && isTimerFinished) {
            hasFinishedLoading = true;
            if (loadingDeadline) clearTimeout(loadingDeadline);
            setupHiresSwapping();
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
        }
    }
    
    function markContentLoaded() {
        if (isContentLoaded) return;
        isContentLoaded = true;
        startBackgroundImageLoading();
        finishLoading();
    }

    function trackCriticalContent(prepareVideo) {
        const mediaItems = Array.from(document.querySelectorAll('main img, main video'));
        const isInViewport = media => {
            const rect = media.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < window.innerHeight &&
                rect.right > 0 && rect.left < window.innerWidth;
        };
        const criticalItems = mediaItems.filter(isInViewport);

        const imageSurfaces = Array.from(mainContainer.querySelectorAll('.column'));
        const imageQueues = new Map(imageSurfaces.map(surface => [
            surface,
            Array.from(surface.querySelectorAll('img')).filter(img => !isInViewport(img))
        ]));
        const firstCriticalImages = new Set(imageSurfaces.map(surface =>
            criticalItems.find(media => media.tagName === 'IMG' && media.closest('.column') === surface)
        ).filter(Boolean));
        const loadingImages = new WeakSet();
        let backgroundImagesStarted = false;
        const completeImage = img => new Promise(resolve => {
            const finish = () => {
                img.removeEventListener('load', onLoad);
                img.removeEventListener('error', finish);
                resolve();
            };
            const onLoad = () => {
                if (typeof img.decode === 'function') img.decode().then(finish, finish);
                else finish();
            };
            if (img.complete) {
                if (img.naturalWidth > 0 && typeof img.decode === 'function') img.decode().then(finish, finish);
                else finish();
                return;
            }
            img.addEventListener('load', onLoad, { once: true });
            img.addEventListener('error', finish, { once: true });
        });

        let processImageQueue = () => {};
        const promoteImage = img => {
            for (const [surface, queue] of imageQueues) {
                const index = queue.indexOf(img);
                if (index > 0) {
                    queue.splice(index, 1);
                    queue.unshift(img);
                    if (backgroundImagesStarted) processImageQueue(surface);
                    break;
                }
            }
        };
        if ('IntersectionObserver' in window) {
            const upcomingObserver = new IntersectionObserver(entries => {
                entries.forEach(entry => {
                    if (!entry.isIntersecting) return;
                    promoteImage(entry.target);
                    upcomingObserver.unobserve(entry.target);
                });
            }, { rootMargin: '1000px 0px' });
            imageQueues.forEach(queue => queue.forEach(img => upcomingObserver.observe(img)));
        }

        processImageQueue = surface => {
            const queue = imageQueues.get(surface);
            if (!queue?.length) return;
            const img = queue.shift();
            if (loadingImages.has(img)) {
                processImageQueue(surface);
                return;
            }
            loadingImages.add(img);
            completeImage(img).finally(() => processImageQueue(surface));
            img.loading = 'eager';
        };
        startBackgroundImageLoading = () => {
            backgroundImagesStarted = true;
            imageQueues.forEach((_, surface) => processImageQueue(surface));
        };

        if (criticalItems.length === 0) {
            markContentLoaded();
            return;
        }

        const promises = criticalItems.map(media => {
            return new Promise(resolve => {
                let settled = false;
                const finish = () => {
                    if (settled) return;
                    settled = true;
                    media.removeEventListener('load', onImageLoad);
                    media.removeEventListener('error', onError);
                    media.removeEventListener('canplay', onCanPlay);
                    resolve();
                };
                const onImageLoad = () => {
                    if (typeof media.decode === 'function') media.decode().then(finish, finish);
                    else finish();
                };
                const onCanPlay = () => finish();
                const onError = () => finish();

                if (media.tagName === 'IMG') {
                    media.loading = 'eager';
                    if (firstCriticalImages.has(media)) media.fetchPriority = 'high';
                    media.addEventListener('load', onImageLoad, { once: true });
                    media.addEventListener('error', onError, { once: true });
                    if (media.complete) {
                        if (media.naturalWidth > 0) onImageLoad();
                        else finish();
                    }
                    return;
                }

                media.addEventListener('canplay', onCanPlay, { once: true });
                media.addEventListener('error', onError, { once: true });
                if (media.error || media.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) finish();
                else {
                    prepareVideo?.(media);
                    if (media.error || media.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) finish();
                }
            });
        });

        Promise.all(promises).then(markContentLoaded);
    }
    
    // --- MAIN EVENT LISTENERS ---
    document.addEventListener('DOMContentLoaded', () => {
        if (preloaderContent) preloaderContent.classList.add('ready');
        translatePage();
        setupResponsiveGalleryOrder();
        setupInfiniteGallery();
        setupImageGallery();
        const prepareVideo = setupVideoLoading();
        setupVideoToggle();
        setupPoolAnimation();
        setupInteractiveBalls();
        setupColorBlend(prepareVideo);
        trackCriticalContent(prepareVideo);
        const allCarousels = document.querySelectorAll('.carousel-container');
        allCarousels.forEach(setupInfiniteCarousel);
        setupFooterObserver();
        if (aboutTrigger)    aboutTrigger.addEventListener('click', openOverlay);
        if (aboutCloseButton) aboutCloseButton.addEventListener('click', closeOverlay);
        if (aboutBackground) aboutBackground.addEventListener('click', closeOverlay);
        document.addEventListener('keydown', (event) => {
            if (!aboutOverlay?.classList.contains('is-open')) return;
            if (event.key === 'Escape') {
                event.preventDefault();
                closeOverlay();
                return;
            }
            if (event.key !== 'Tab') return;
            const focusable = [...aboutOverlay.querySelectorAll(
                'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
            )].filter(element => element.getClientRects().length > 0);
            if (focusable.length === 0) {
                event.preventDefault();
                aboutOverlay.focus();
                return;
            }
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (event.shiftKey && (document.activeElement === first || document.activeElement === aboutOverlay)) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === aboutOverlay)) {
                event.preventDefault();
                first.focus();
            }
        });
    });
    
    setTimeout(() => {
        isTimerFinished = true;
        finishLoading();
    }, 4000);

    loadingDeadline = setTimeout(() => {
        if (!isContentLoaded) {
            console.warn('Portfolio loading reached the 10-second limit; showing media ready so far.');
        }
        isContentLoaded = true;
        startBackgroundImageLoading();
        finishLoading();
    }, Math.max(0, 10000 - (performance.now() - loadingStartedAt)));
    
    window.addEventListener('pagehide', () => {
        pageIsLeaving = true;
        stopWebcam();
    });

    window.addEventListener('pageshow', () => {
        pageIsLeaving = false;
        if (aboutOverlay?.classList.contains('is-open')) requestWebcamAccess();
    });

})();

// Created by Luigi Vacchelli on 26/11/25.
