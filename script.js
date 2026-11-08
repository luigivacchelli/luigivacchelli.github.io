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
    let pageIsLeaving = false;
    const loadingStartedAt = performance.now();
    
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
            // Keep the granted stream ready so the feed is present on the next open.
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
            img.addEventListener('click', () => {
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

        const readPosition = target => target === window ? window.scrollY : target.scrollTop;

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
            surface.insertBefore(last, first);
            const shift = first.getBoundingClientRect().top - firstTopBefore;

            if (shift > 1) {
                const positionBeforeShift = readPosition(scrollTarget);
                writePosition(scrollTarget, positionBeforeShift + shift);
                const remainingOffset = first.getBoundingClientRect().top - firstTopBefore;
                if (Math.abs(remainingOffset) > 1) {
                    writePosition(scrollTarget, readPosition(scrollTarget) + remainingOffset);
                }
            } else {
                surface.insertBefore(last, trigger);
            }
        }

        function recyclePassedItems(surface, scrollTarget, direction) {
            const isWindow = scrollTarget === window;
            const viewportTop = isWindow ? 0 : surface.getBoundingClientRect().top;
            const position = readPosition(scrollTarget);
            let rotations = 0;

            // When native scrolling reaches its top boundary, prepend the last item
            // and compensate the offset so upward scrolling can continue seamlessly.
            if (direction < 0 && position <= 1) {
                const items = Array.from(surface.querySelectorAll(':scope > .media-link'));
                if (items.length > 1) {
                    const first = items[0];
                    const last = items[items.length - 1];
                    const firstTopBefore = first.getBoundingClientRect().top;
                    const trigger = surface.querySelector(':scope > .scroll-trigger');
                    surface.insertBefore(last, first);
                    const shift = first.getBoundingClientRect().top - firstTopBefore;

                    if (shift > 1) {
                        writePosition(scrollTarget, position + shift);
                        return;
                    }
                    surface.insertBefore(last, trigger);
                }
            }

            if (direction <= 0) return;

            while (rotations < 24) {
                const items = Array.from(surface.querySelectorAll(':scope > .media-link'));
                if (items.length < 2) return;

                const first = items[0];
                const next = items[1];
                const firstRect = first.getBoundingClientRect();
                if (firstRect.bottom > viewportTop + 1) return;

                const nextRect = next.getBoundingClientRect();
                const shift = nextRect.top - firstRect.top;
                if (shift <= 1) return;

                const trigger = surface.querySelector(':scope > .scroll-trigger');
                surface.insertBefore(first, trigger);

                writePosition(scrollTarget, Math.max(0, readPosition(scrollTarget) - shift));
                rotations++;
            }
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
        const startedVideos = new WeakSet();
        const columnQueues = new Map();
        const activeLoads = new Map();
        const maxLoadsPerColumn = 2;

        document.querySelectorAll('main .column').forEach(column => {
            columnQueues.set(column, Array.from(column.querySelectorAll('video')));
            activeLoads.set(column, 0);
        });

        function startVideo(video, column) {
            if (startedVideos.has(video)) return;
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
            video.preload = 'auto';
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
            loadNextInColumn(column);
        }

        function playWhenReady(video) {
            if (video.dataset.inView !== 'true') return;
            const play = () => {
                waitingToPlay.delete(video);
                if (video.dataset.inView === 'true') {
                    video.play().catch(error => {
                        if (error.name !== 'AbortError') {
                            console.warn('Inline video playback was blocked:', error.name, video.currentSrc || video.src);
                        }
                    });
                }
            };
            if (video.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) play();
            else if (!waitingToPlay.has(video)) {
                waitingToPlay.add(video);
                video.addEventListener('canplay', play, { once: true });
            }
        }

        columnQueues.forEach((_, column) => loadNextInColumn(column));

        const playbackObserver = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
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
        }, { threshold: 0.1 }) : null;

        videos.forEach(video => {
            if (video.dataset.autoplay !== 'true') return;
            if (playbackObserver) playbackObserver.observe(video);
            else {
                video.dataset.inView = 'true';
                playWhenReady(video);
            }
        });
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
        if (!('IntersectionObserver' in window)) return;
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
        let peekPlayed = carouselElement.dataset.peekPlayed === 'true';
        const peekObserver = new IntersectionObserver((entries, obs) => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                obs.unobserve(carouselElement);
                if (peekPlayed || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
                peekTimeout = setTimeout(() => {
                    peekTimeout = null;
                    if (peekPlayed || !carouselElement.isConnected) return;
                    peekPlayed = true;
                    carouselElement.dataset.peekPlayed = 'true';
                    track.classList.add('has-peeked');
                }, 500);
            });
        }, { threshold: 0.75 });
        peekObserver.observe(carouselElement);

        function cancelPeekAnimation() {
            if (peekTimeout) clearTimeout(peekTimeout);
            peekTimeout = null;
            peekPlayed = true;
            carouselElement.dataset.peekPlayed = 'true';
            track.classList.remove('has-peeked');
            carouselElement.removeEventListener('pointerdown', cancelPeekAnimation);
            carouselElement.removeEventListener('wheel', cancelPeekAnimation);
            carouselElement.removeEventListener('keydown', cancelPeekAnimation);
        }
        carouselElement.addEventListener('pointerdown', cancelPeekAnimation, { once: true, passive: true });
        carouselElement.addEventListener('wheel', cancelPeekAnimation, { once: true, passive: true });
        carouselElement.addEventListener('keydown', cancelPeekAnimation, { once: true });
        const clearPeekClass = event => {
            if (event.animationName === 'peek-a-boo') track.classList.remove('has-peeked');
        };
        track.addEventListener('animationend', clearPeekClass, { once: true });
        track.addEventListener('animationcancel', clearPeekClass, { once: true });

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
    let isInitialHiresReady = false;
    let initialHiresStarted = false;
    let hasFinishedLoading = false;
    let loadingDeadline = null;

    function startInitialHiresLoading() {
        if (initialHiresStarted) return;
        initialHiresStarted = true;
        setupHiresSwapping();

        const initialImages = Array.from(galleryImages).filter(img => {
            if (!img.dataset.hiresSrc || img.dataset.isSwapped === 'true') return false;
            const rect = img.getBoundingClientRect();
            return rect.bottom > 0 && rect.top < window.innerHeight &&
                rect.right > 0 && rect.left < window.innerWidth;
        });

        Promise.all(initialImages.map(img => swapImageWhenDecoded(img, img.dataset.hiresSrc)))
            .then(() => {
                isInitialHiresReady = true;
                finishLoading();
            });
    }
    
    function finishLoading() {
        if (!hasFinishedLoading && isContentLoaded && isTimerFinished && isInitialHiresReady) {
            hasFinishedLoading = true;
            if (loadingDeadline) clearTimeout(loadingDeadline);
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
        finishLoading();
    }

    function trackCriticalContent(prepareVideo) {
        const mediaItems = Array.from(document.querySelectorAll('main img, main video'));
        if (mediaItems.length === 0) {
            markContentLoaded();
            return;
        }

        const promises = mediaItems.map(media => {
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
        trackCriticalContent(prepareVideo);
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
        startInitialHiresLoading();
        finishLoading();
    }, 4000);

    loadingDeadline = setTimeout(() => {
        if (!isContentLoaded || !isInitialHiresReady) {
            console.warn('Portfolio loading reached the 10-second limit; showing media ready so far.');
        }
        isContentLoaded = true;
        isInitialHiresReady = true;
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
