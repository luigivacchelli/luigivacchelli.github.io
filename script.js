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

    function setupSmoothScroll() {
        if (!mainContainer || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return null;

        const mobileQuery = window.matchMedia('(max-width: 768px)');
        const scrollTargets = new Set();
        const desiredPositions = new WeakMap();
        const expectedPositions = new WeakMap();
        const activeTargets = new Set();
        const frameCallbacks = new Set();
        let animationFrame = 0;
        let previousFrameTime = 0;

        const readPosition = target => target === window ? window.scrollY : target.scrollTop;
        const writePosition = (target, position) => {
            expectedPositions.set(target, position);
            if (target === window) window.scrollTo(window.scrollX, position);
            else target.scrollTop = position;
        };

        function requestFrame() {
            if (!animationFrame) animationFrame = window.requestAnimationFrame(animate);
        }

        function subscribeFrame(callback) {
            frameCallbacks.add(callback);
            return () => frameCallbacks.delete(callback);
        }

        function addDelta(target, delta) {
            desiredPositions.set(target, (desiredPositions.get(target) ?? readPosition(target)) + delta);
            activeTargets.add(target);
            requestFrame();
        }

        function onWheel(event) {
            if (event.ctrlKey || event.metaKey || event.shiftKey || Math.abs(event.deltaX) > Math.abs(event.deltaY) || !event.cancelable) return;
            const source = event.target instanceof Element ? event.target : null;
            if (source?.closest('.about-overlay, [data-native-scroll]')) return;
            if (mobileQuery.matches && source && !mainContainer.contains(source)) return;

            const target = event.currentTarget;
            const multiplier = event.deltaMode === WheelEvent.DOM_DELTA_LINE
                ? 16
                : event.deltaMode === WheelEvent.DOM_DELTA_PAGE ? window.innerHeight : 1;
            const delta = event.deltaY * multiplier;
            if (!delta) return;

            event.preventDefault();
            addDelta(target, delta);
        }

        function onScroll(event) {
            const target = event.currentTarget;
            const actual = readPosition(target);
            const expected = expectedPositions.get(target);
            if (activeTargets.has(target) && expected !== undefined && Math.abs(actual - expected) <= 1.5) return;

            desiredPositions.set(target, actual);
            activeTargets.delete(target);
        }

        function animate(now) {
            animationFrame = 0;
            const elapsed = previousFrameTime ? Math.min(48, now - previousFrameTime) : 16.67;
            const frameScale = elapsed / 16.67;
            previousFrameTime = now;
            const easing = 1 - Math.pow(0.9, frameScale);

            activeTargets.forEach(target => {
                const actual = readPosition(target);
                const desired = desiredPositions.get(target) ?? actual;

                const difference = desired - actual;
                const next = Math.abs(difference) < 0.4 ? desired : actual + difference * easing;
                writePosition(target, next);
                if (Math.abs(difference) < 0.4) activeTargets.delete(target);
            });

            let callbackNeedsFrame = false;
            frameCallbacks.forEach(callback => {
                if (callback(now)) callbackNeedsFrame = true;
            });
            if (activeTargets.size || callbackNeedsFrame) requestFrame();
            else previousFrameTime = 0;
        }

        function bindTargets() {
            scrollTargets.forEach(target => {
                target.removeEventListener('wheel', onWheel);
                target.removeEventListener('scroll', onScroll);
            });
            scrollTargets.clear();
            activeTargets.clear();
            const targets = mobileQuery.matches
                ? [window]
                : Array.from(mainContainer.querySelectorAll(':scope > .column:not(.mobile-column)'));

            targets.forEach(target => {
                scrollTargets.add(target);
                desiredPositions.set(target, readPosition(target));
                expectedPositions.delete(target);
                target.addEventListener('wheel', onWheel, { passive: false });
                target.addEventListener('scroll', onScroll, { passive: true });
            });
        }

        function adjust(target, delta) {
            const actual = readPosition(target);
            if (desiredPositions.has(target)) desiredPositions.set(target, desiredPositions.get(target) + delta);
            else desiredPositions.set(target, actual);
            expectedPositions.set(target, actual);
            if (activeTargets.has(target)) requestFrame();
        }

        mobileQuery.addEventListener('change', bindTargets);
        bindTargets();
        return { adjust, requestFrame, subscribeFrame };
    }

    function setupInfiniteGallery(scrollPhysics) {
        if (!mainContainer) return;

        mainContainer.classList.add('infinite-gallery');
        const mobileQuery = window.matchMedia('(max-width: 768px)');
        const bindings = [];
        const scheduledFrames = new Map();

        function recyclePassedItems(surface, scrollTarget) {
            const isWindow = scrollTarget === window;
            const viewportTop = isWindow ? 0 : surface.getBoundingClientRect().top;
            let rotations = 0;

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

                if (isWindow) {
                    window.scrollTo(window.scrollX, Math.max(0, window.scrollY - shift));
                    scrollPhysics?.adjust(scrollTarget, -shift);
                } else {
                    scrollTarget.scrollTop = Math.max(0, scrollTarget.scrollTop - shift);
                    scrollPhysics?.adjust(scrollTarget, -shift);
                }
                rotations++;
            }
        }

        function scheduleRecycle(surface, scrollTarget) {
            if (scheduledFrames.has(scrollTarget)) return;
            const frame = window.requestAnimationFrame(() => {
                scheduledFrames.delete(scrollTarget);
                recyclePassedItems(surface, scrollTarget);
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

    function setupScrollPixelationLegacy() {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

        const canvas = document.getElementById('scroll-pixelation');
        const media = Array.from(document.querySelectorAll('main .media-link img, main .media-link video'));
        if (!canvas || media.length === 0) return;

        const stage = document.createElement('canvas');
        const stageContext = stage.getContext('2d');
        const gl = canvas.getContext('webgl2', {
            alpha: true,
            antialias: false,
            depth: false,
            stencil: false,
            premultipliedAlpha: true,
            preserveDrawingBuffer: false
        });
        const fallbackContext = gl ? null : canvas.getContext('2d');
        if (!stageContext || (!gl && !fallbackContext)) return;

        const visibleMedia = new Set();
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        let scrollStrength = 0;
        let scrollDirection = 0;
        let animationFrame = 0;
        const lastPositions = new WeakMap();
        let lastFrameTime = 0;
        let pixelatedFrame;
        let previousFrame;
        let outputFrame;
        let currentTexture;
        let blitProgram;
        let feedbackProgram;
        let feedbackUniforms;
        let blitUniform;
        let vertexBuffer;
        let fallbackSample;

        const vertexSource = `#version 300 es
            in vec2 aPosition;
            out vec2 vUv;
            void main() {
                vUv = aPosition * 0.5 + 0.5;
                gl_Position = vec4(aPosition, 0.0, 1.0);
            }`;

        const feedbackSource = `#version 300 es
            precision highp float;
            precision highp sampler2D;
            uniform sampler2D uCurrent;
            uniform sampler2D uPrev;
            uniform float uDecay;
            uniform vec2 uOffset;
            uniform float uVelocity;
            uniform float uFloatX;
            in vec2 vUv;
            out vec4 color;

            float hash(vec2 p) {
                return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
            }

            void main() {
                vec4 current = texture(uCurrent, vUv);
                vec2 blockUv = floor(vUv * 2500.0) / 2500.0;
                float jitter = hash(blockUv) - 0.5;
                vec2 displacement = uOffset * (1.2 + jitter * 1.6);
                float horizontalJitter = hash(blockUv + vec2(3.7, 9.2)) - 0.5;
                displacement.x += horizontalJitter * abs(uOffset.y) * uFloatX;

                vec4 shifted = texture(uCurrent, vUv - displacement);
                vec4 previous = texture(uPrev, vUv);
                float trailAlpha = previous.a * uDecay;
                float blockSeed = hash(blockUv + vec2(7.13, 1.91));
                float updateChance = 0.9 - uVelocity * 1.5;
                float blockUpdates = step(1.0 - updateChance, blockSeed);
                float shiftedAlpha = shifted.a;
                vec3 shiftedColor = shifted.rgb * shiftedAlpha + current.rgb * (1.0 - shiftedAlpha);
                vec3 imageColor = mix(shiftedColor, current.rgb, blockUpdates);
                float imageAlpha = max(current.a, shiftedAlpha * (1.0 - blockUpdates));
                float outputAlpha = max(imageAlpha, trailAlpha);
                color = vec4(
                    mix(previous.rgb, imageColor, imageAlpha / max(outputAlpha, 0.0001)),
                    outputAlpha
                );
            }`;

        const blitSource = `#version 300 es
            precision highp float;
            uniform sampler2D uImage;
            in vec2 vUv;
            out vec4 color;
            void main() {
                color = texture(uImage, vUv);
            }`;

        function compileShader(type, source) {
            const shader = gl.createShader(type);
            gl.shaderSource(shader, source);
            gl.compileShader(shader);
            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                const message = gl.getShaderInfoLog(shader);
                gl.deleteShader(shader);
                throw new Error(message || 'Unable to compile the scroll pixelation shader.');
            }
            return shader;
        }

        function createProgram(fragmentSource) {
            const program = gl.createProgram();
            const vertexShader = compileShader(gl.VERTEX_SHADER, vertexSource);
            const fragmentShader = compileShader(gl.FRAGMENT_SHADER, fragmentSource);
            gl.attachShader(program, vertexShader);
            gl.attachShader(program, fragmentShader);
            gl.bindAttribLocation(program, 0, 'aPosition');
            gl.linkProgram(program);
            gl.deleteShader(vertexShader);
            gl.deleteShader(fragmentShader);
            if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
                const message = gl.getProgramInfoLog(program);
                gl.deleteProgram(program);
                throw new Error(message || 'Unable to link the scroll pixelation shader.');
            }
            return program;
        }

        function setTextureParameters(texture) {
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        }

        function createFrameTarget(width, height) {
            const texture = gl.createTexture();
            setTextureParameters(texture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
            const framebuffer = gl.createFramebuffer();
            gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
            return { texture, framebuffer };
        }

        function clearFrameTarget(target) {
            gl.bindFramebuffer(gl.FRAMEBUFFER, target.framebuffer);
            gl.clearColor(0, 0, 0, 0);
            gl.clear(gl.COLOR_BUFFER_BIT);
        }

        if (gl) {
            try {
                feedbackProgram = createProgram(feedbackSource);
                blitProgram = createProgram(blitSource);
                vertexBuffer = gl.createBuffer();
                gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
                gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
                    -1, -1, 1, -1, -1, 1, 1, 1
                ]), gl.STATIC_DRAW);

                currentTexture = gl.createTexture();
                setTextureParameters(currentTexture);
                gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

                feedbackUniforms = {
                    current: gl.getUniformLocation(feedbackProgram, 'uCurrent'),
                    previous: gl.getUniformLocation(feedbackProgram, 'uPrev'),
                    decay: gl.getUniformLocation(feedbackProgram, 'uDecay'),
                    offset: gl.getUniformLocation(feedbackProgram, 'uOffset'),
                    velocity: gl.getUniformLocation(feedbackProgram, 'uVelocity'),
                    floatX: gl.getUniformLocation(feedbackProgram, 'uFloatX')
                };
                blitUniform = gl.getUniformLocation(blitProgram, 'uImage');
            } catch (error) {
                console.warn('Scroll pixelation is unavailable:', error.message);
                return;
            }
        } else {
            fallbackSample = document.createElement('canvas');
        }

        function resizeCanvas() {
            const width = Math.max(1, Math.round(window.innerWidth * dpr));
            const height = Math.max(1, Math.round(window.innerHeight * dpr));
            canvas.width = width;
            canvas.height = height;
            stage.width = width;
            stage.height = height;
            stageContext.setTransform(dpr, 0, 0, dpr, 0, 0);

            if (gl) {
                if (pixelatedFrame) {
                    gl.deleteFramebuffer(pixelatedFrame.framebuffer);
                    gl.deleteTexture(pixelatedFrame.texture);
                    gl.deleteFramebuffer(previousFrame.framebuffer);
                    gl.deleteTexture(previousFrame.texture);
                }
                pixelatedFrame = createFrameTarget(width, height);
                previousFrame = createFrameTarget(width, height);
                gl.bindTexture(gl.TEXTURE_2D, currentTexture);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
                clearFrameTarget(pixelatedFrame);
                clearFrameTarget(previousFrame);
                gl.bindFramebuffer(gl.FRAMEBUFFER, null);
                gl.viewport(0, 0, width, height);
            }
        }

        function getVisibleRect(element) {
            const rect = element.getBoundingClientRect();
            let left = Math.max(0, rect.left);
            let top = Math.max(0, rect.top);
            let right = Math.min(window.innerWidth, rect.right);
            let bottom = Math.min(window.innerHeight, rect.bottom);

            for (let parent = element.parentElement; parent && parent !== document.body; parent = parent.parentElement) {
                const style = window.getComputedStyle(parent);
                if (style.overflowX !== 'visible') {
                    const parentRect = parent.getBoundingClientRect();
                    left = Math.max(left, parentRect.left);
                    right = Math.min(right, parentRect.right);
                }
                if (style.overflowY !== 'visible') {
                    const parentRect = parent.getBoundingClientRect();
                    top = Math.max(top, parentRect.top);
                    bottom = Math.min(bottom, parentRect.bottom);
                }
            }

            return { rect, left, top, right, bottom };
        }

        function drawMedia(element) {
            const sourceWidth = element.tagName === 'VIDEO' ? element.videoWidth : element.naturalWidth;
            const sourceHeight = element.tagName === 'VIDEO' ? element.videoHeight : element.naturalHeight;
            if (!sourceWidth || !sourceHeight || (element.tagName === 'VIDEO' && element.readyState < 2)) return;

            const { rect, left, top, right, bottom } = getVisibleRect(element);
            if (right <= left || bottom <= top || rect.width <= 0 || rect.height <= 0) return;

            const style = window.getComputedStyle(element);
            const opacity = Number.parseFloat(style.opacity);
            if (style.visibility === 'hidden' || opacity < 0.05) return;

            const targetAspect = rect.width / rect.height;
            let sourceX = 0;
            let sourceY = 0;
            let drawWidth = sourceWidth;
            let drawHeight = sourceHeight;
            if (style.objectFit === 'cover') {
                if (sourceWidth / sourceHeight > targetAspect) {
                    drawWidth = sourceHeight * targetAspect;
                    sourceX = (sourceWidth - drawWidth) / 2;
                } else {
                    drawHeight = sourceWidth / targetAspect;
                    sourceY = (sourceHeight - drawHeight) / 2;
                }
            }

            stageContext.save();
            stageContext.beginPath();
            stageContext.rect(left, top, right - left, bottom - top);
            stageContext.clip();
            stageContext.globalAlpha = opacity;
            stageContext.drawImage(element, sourceX, sourceY, drawWidth, drawHeight, rect.left, rect.top, rect.width, rect.height);
            stageContext.restore();
        }

        function drawStage() {
            stageContext.clearRect(0, 0, window.innerWidth, window.innerHeight);
            media.forEach(element => {
                if (visibleMedia.has(element)) drawMedia(element);
            });
        }

        function drawWebGL() {
            gl.bindTexture(gl.TEXTURE_2D, currentTexture);
            gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, stage);

            gl.bindFramebuffer(gl.FRAMEBUFFER, pixelatedFrame.framebuffer);
            gl.viewport(0, 0, canvas.width, canvas.height);
            gl.disable(gl.BLEND);
            gl.useProgram(feedbackProgram);
            gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
            gl.enableVertexAttribArray(0);
            gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, currentTexture);
            gl.uniform1i(feedbackUniforms.current, 0);
            gl.activeTexture(gl.TEXTURE1);
            gl.bindTexture(gl.TEXTURE_2D, previousFrame.texture);
            gl.uniform1i(feedbackUniforms.previous, 1);
            const mobileFactor = window.matchMedia('(max-width: 768px)').matches ? 1.6 : 1;
            const velocity = Math.min(0.53, scrollStrength * 0.5 * mobileFactor);
            const decayProgress = Math.min(1, scrollStrength / 0.05);
            const easedDecay = decayProgress * decayProgress * (3 - 2 * decayProgress);
            gl.uniform1f(feedbackUniforms.decay, 0.2 + easedDecay * 0.15);
            gl.uniform2f(feedbackUniforms.offset, 0, -scrollDirection * 0.04 * scrollStrength * mobileFactor);
            gl.uniform1f(feedbackUniforms.velocity, velocity);
            gl.uniform1f(feedbackUniforms.floatX, 0.3);
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            gl.viewport(0, 0, canvas.width, canvas.height);
            gl.clearColor(0, 0, 0, 0);
            gl.clear(gl.COLOR_BUFFER_BIT);
            gl.useProgram(blitProgram);
            gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
            gl.enableVertexAttribArray(0);
            gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, pixelatedFrame.texture);
            gl.uniform1i(blitUniform, 0);
            gl.enable(gl.BLEND);
            gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
            gl.disable(gl.BLEND);

            outputFrame = previousFrame;
            previousFrame = pixelatedFrame;
            pixelatedFrame = outputFrame;
        }

        function drawFallback() {
            const pixelSize = Math.max(2, Math.round((2 + scrollStrength * 14) * dpr));
            const sampleWidth = Math.max(1, Math.ceil(stage.width / pixelSize));
            const sampleHeight = Math.max(1, Math.ceil(stage.height / pixelSize));
            if (fallbackSample.width !== sampleWidth || fallbackSample.height !== sampleHeight) {
                fallbackSample.width = sampleWidth;
                fallbackSample.height = sampleHeight;
            }
            const sampleContext = fallbackSample.getContext('2d');
            sampleContext.imageSmoothingEnabled = true;
            sampleContext.drawImage(stage, 0, 0, sampleWidth, sampleHeight);
            fallbackContext.clearRect(0, 0, canvas.width, canvas.height);
            fallbackContext.imageSmoothingEnabled = false;
            fallbackContext.drawImage(fallbackSample, 0, 0, canvas.width, canvas.height);
        }

        function clearOutput() {
            if (gl) {
                gl.bindFramebuffer(gl.FRAMEBUFFER, null);
                gl.clearColor(0, 0, 0, 0);
                gl.clear(gl.COLOR_BUFFER_BIT);
                clearFrameTarget(pixelatedFrame);
                clearFrameTarget(previousFrame);
                gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            } else {
                fallbackContext.clearRect(0, 0, canvas.width, canvas.height);
            }
        }

        function render(now) {
            animationFrame = 0;
            drawStage();
            if (gl) drawWebGL();
            else drawFallback();

            const elapsedFrames = lastFrameTime ? Math.max(0.5, (now - lastFrameTime) / 16.67) : 1;
            lastFrameTime = now;
            scrollStrength *= Math.pow(0.95, elapsedFrames);
            if (scrollStrength > 0.008) {
                animationFrame = window.requestAnimationFrame(render);
            } else {
                scrollStrength = 0;
                scrollDirection = 0;
                lastFrameTime = 0;
                clearOutput();
            }
        }

        function onScroll(event) {
            const target = event.currentTarget;
            const position = target === window ? window.scrollY : target.scrollTop;
            const priorPosition = lastPositions.get(target) ?? position;
            const delta = position - priorPosition;
            if (delta !== 0) {
                scrollDirection = Math.sign(delta);
                scrollStrength = Math.min(1, scrollStrength + Math.min(Math.abs(delta), 150) * 0.001);
            }
            lastPositions.set(target, position);
            if (!animationFrame) animationFrame = window.requestAnimationFrame(render);
        }

        if ('IntersectionObserver' in window) {
            const observer = new IntersectionObserver(entries => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) visibleMedia.add(entry.target);
                    else visibleMedia.delete(entry.target);
                });
            }, { rootMargin: '40px' });
            media.forEach(element => observer.observe(element));
        } else {
            media.forEach(element => visibleMedia.add(element));
        }

        const mobileQuery = window.matchMedia('(max-width: 768px)');
        let scrollTargets = [];
        function bindScrollTargets() {
            scrollTargets.forEach(target => target.removeEventListener('scroll', onScroll));
            scrollTargets = mobileQuery.matches
                ? [window]
                : Array.from(document.querySelectorAll('main > .column'));
            scrollTargets.forEach(target => {
                lastPositions.set(target, target === window ? window.scrollY : target.scrollTop);
                target.addEventListener('scroll', onScroll, { passive: true });
            });
        }

        resizeCanvas();
        window.addEventListener('resize', resizeCanvas, { passive: true });
        mobileQuery.addEventListener('change', bindScrollTargets);
        bindScrollTargets();
    }

    function setupScrollPixelation(scrollPhysics) {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

        const canvas = document.getElementById('scroll-pixelation');
        const media = Array.from(document.querySelectorAll('main .media-link img, main .media-link video'));
        if (!canvas || media.length === 0) return;

        const gl = canvas.getContext('webgl2', {
            alpha: true,
            antialias: false,
            depth: false,
            stencil: false,
            premultipliedAlpha: true,
            preserveDrawingBuffer: false,
            failIfMajorPerformanceCaveat: false
        });
        if (!gl) {
            setupScrollPixelationLegacy();
            return;
        }

        const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
        const textures = new Map();
        const visibleMedia = new Set();
        const renderedMedia = new Set();
        const hiddenMedia = new Map();
        const lastPositions = new WeakMap();
        let sceneTarget;
        let frameTarget;
        let previousTarget;
        let outputTarget;
        let activeTarget = null;
        const maxTextureSize = Math.min(gl.getParameter(gl.MAX_TEXTURE_SIZE), 1536);
        let strength = 0;
        let visualStrength = 0;
        let targetRate = 0;
        let smoothedRate = 0;
        let lastTime = 0;
        let raf = 0;
        let lastInputTime = 0;

        const quad = new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]);
        const tileVertex = `#version 300 es
            in vec2 aCorner;
            uniform vec4 uRect;
            uniform vec2 uResolution;
            out vec2 vUv;
            void main() {
                vec2 point = uRect.xy + aCorner * uRect.zw;
                vec2 clip = point / uResolution * 2.0 - 1.0;
                gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
                vUv = vec2(aCorner.x, 1.0 - aCorner.y);
            }`;
        const tileFragment = `#version 300 es
            precision highp float;
            uniform sampler2D uImage;
            uniform vec4 uCrop;
            uniform float uOpacity;
            in vec2 vUv;
            out vec4 color;
            void main() {
                color = texture(uImage, uCrop.xy + vUv * uCrop.zw) * uOpacity;
            }`;
        const fullscreenVertex = `#version 300 es
            in vec2 aCorner;
            out vec2 vUv;
            void main() {
                vUv = aCorner;
                gl_Position = vec4(aCorner * 2.0 - 1.0, 0.0, 1.0);
            }`;
        const feedbackFragment = `#version 300 es
            precision highp float;
            precision highp sampler2D;
            uniform sampler2D uCurrent;
            uniform sampler2D uPrev;
            uniform float uDecay;
            uniform vec2 uOffset;
            uniform float uVelocity;
            uniform float uHorizontalScale;
            uniform vec4 uClip;
            in vec2 vUv;
            out vec4 color;
            float hash(vec2 p) {
                return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
            }
            void main() {
                if (vUv.x < uClip.x || vUv.y < uClip.y || vUv.x > uClip.z || vUv.y > uClip.w) discard;
                vec4 current = texture(uCurrent, vUv);
                vec2 blockUv = floor(vUv * 2500.0) / 2500.0;
                float jitter = hash(blockUv) - 0.5;
                vec2 displacement = uOffset * (1.2 + jitter * 1.6);
                float horizontalJitter = hash(blockUv + vec2(3.7, 9.2)) - 0.5;
                displacement.x += horizontalJitter * abs(uOffset.y) * uHorizontalScale;
                vec4 shifted = texture(uCurrent, vUv - displacement);
                vec4 previous = texture(uPrev, vUv);
                float trailAlpha = previous.a * uDecay;
                float blockSeed = hash(blockUv + vec2(7.13, 1.91));
                float updateChance = 0.9 - uVelocity * 1.5;
                float blockUpdates = step(1.0 - updateChance, blockSeed);
                float shiftedAlpha = shifted.a;
                vec3 shiftedColor = shifted.rgb * shiftedAlpha + current.rgb * (1.0 - shiftedAlpha);
                vec3 imageColor = mix(shiftedColor, current.rgb, blockUpdates);
                float imageAlpha = max(current.a, shiftedAlpha * (1.0 - blockUpdates));
                float outputAlpha = max(imageAlpha, trailAlpha);
                color = vec4(mix(previous.rgb, imageColor, imageAlpha / max(outputAlpha, 0.0001)), outputAlpha);
            }`;
        const blitFragment = `#version 300 es
            precision highp float;
            uniform sampler2D uImage;
            in vec2 vUv;
            out vec4 color;
            void main() {
                vec4 value = texture(uImage, vUv);
                vec3 low = value.rgb * 12.92;
                vec3 high = 1.055 * pow(value.rgb, vec3(0.41666)) - vec3(0.055);
                color = vec4(mix(high, low, lessThanEqual(value.rgb, vec3(0.0031308))), value.a);
            }`;

        function compile(type, source) {
            const shader = gl.createShader(type);
            gl.shaderSource(shader, source);
            gl.compileShader(shader);
            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                const message = gl.getShaderInfoLog(shader);
                gl.deleteShader(shader);
                throw new Error(message || 'Shader compilation failed.');
            }
            return shader;
        }

        function program(vertexSource, fragmentSource, names) {
            const result = gl.createProgram();
            const vertex = compile(gl.VERTEX_SHADER, vertexSource);
            const fragment = compile(gl.FRAGMENT_SHADER, fragmentSource);
            gl.attachShader(result, vertex);
            gl.attachShader(result, fragment);
            gl.bindAttribLocation(result, 0, 'aCorner');
            gl.linkProgram(result);
            gl.deleteShader(vertex);
            gl.deleteShader(fragment);
            if (!gl.getProgramParameter(result, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(result) || 'Shader link failed.');
            const locations = {};
            names.forEach(name => { locations[name] = gl.getUniformLocation(result, name); });
            return { program: result, locations };
        }

        function target(width, height) {
            const texture = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
            const framebuffer = gl.createFramebuffer();
            gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
            return { texture, framebuffer };
        }

        function clearTarget(value) {
            gl.bindFramebuffer(gl.FRAMEBUFFER, value.framebuffer);
            gl.clearColor(0, 0, 0, 0);
            gl.clear(gl.COLOR_BUFFER_BIT);
        }

        function restoreMedia() {
            hiddenMedia.forEach((style, element) => {
                if (style.visibility) element.style.setProperty('visibility', style.visibility, style.priority);
                else element.style.removeProperty('visibility');
            });
            hiddenMedia.clear();
        }

        function hideRenderedMedia() {
            renderedMedia.forEach(element => {
                if (hiddenMedia.has(element)) return;
                hiddenMedia.set(element, {
                    visibility: element.style.getPropertyValue('visibility'),
                    priority: element.style.getPropertyPriority('visibility')
                });
                element.style.setProperty('visibility', 'hidden');
            });
        }

        let tile, feedback, blit, vertexBuffer;
        try {
            tile = program(tileVertex, tileFragment, ['uRect', 'uResolution', 'uCrop', 'uOpacity', 'uImage']);
            feedback = program(fullscreenVertex, feedbackFragment, ['uCurrent', 'uPrev', 'uDecay', 'uOffset', 'uVelocity', 'uHorizontalScale', 'uClip']);
            blit = program(fullscreenVertex, blitFragment, ['uImage']);
            vertexBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, quad, gl.STATIC_DRAW);
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
            gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
        } catch (error) {
            console.warn('Scroll pixelation is unavailable:', error.message);
            return;
        }

        function resize() {
            restoreMedia();
            canvas.width = Math.max(1, Math.round(window.innerWidth * dpr));
            canvas.height = Math.max(1, Math.round(window.innerHeight * dpr));
            [sceneTarget, frameTarget, previousTarget].forEach(value => {
                if (!value) return;
                gl.deleteFramebuffer(value.framebuffer);
                gl.deleteTexture(value.texture);
            });
            sceneTarget = target(canvas.width, canvas.height);
            frameTarget = target(canvas.width, canvas.height);
            previousTarget = target(canvas.width, canvas.height);
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            gl.viewport(0, 0, canvas.width, canvas.height);
        }

        function upload(element) {
            if (element.tagName === 'IMG' && (!element.complete || !element.naturalWidth)) return;
            if (element.tagName === 'VIDEO' && element.readyState < 2) return;
            const source = element.tagName === 'VIDEO' ? 'video' : element.currentSrc;
            let entry = textures.get(element);
            if (!entry) {
                entry = { texture: gl.createTexture(), width: 0, height: 0, source: '', scaledCanvas: null };
                gl.bindTexture(gl.TEXTURE_2D, entry.texture);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                textures.set(element, entry);
            } else if (element.tagName === 'IMG' && entry.source === source) {
                return entry;
            }
            gl.bindTexture(gl.TEXTURE_2D, entry.texture);
            let uploadSource = element;
            let uploadWidth = element.tagName === 'VIDEO' ? element.videoWidth : element.naturalWidth;
            let uploadHeight = element.tagName === 'VIDEO' ? element.videoHeight : element.naturalHeight;
            if (element.videoWidth > maxTextureSize || element.videoHeight > maxTextureSize ||
                element.naturalWidth > maxTextureSize || element.naturalHeight > maxTextureSize) {
                const scale = maxTextureSize / Math.max(uploadWidth, uploadHeight);
                uploadWidth = Math.max(1, Math.floor(uploadWidth * scale));
                uploadHeight = Math.max(1, Math.floor(uploadHeight * scale));
                if (!entry.scaledCanvas || entry.scaledCanvas.width !== uploadWidth || entry.scaledCanvas.height !== uploadHeight) {
                    entry.scaledCanvas = document.createElement('canvas');
                    entry.scaledCanvas.width = uploadWidth;
                    entry.scaledCanvas.height = uploadHeight;
                }
                entry.scaledCanvas.getContext('2d').drawImage(element, 0, 0, uploadWidth, uploadHeight);
                uploadSource = entry.scaledCanvas;
            }
            try {
                if (entry.width === uploadWidth && entry.height === uploadHeight) {
                    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, uploadSource);
                } else {
                    gl.texImage2D(gl.TEXTURE_2D, 0, gl.SRGB8_ALPHA8, gl.RGBA, gl.UNSIGNED_BYTE, uploadSource);
                    entry.width = uploadWidth;
                    entry.height = uploadHeight;
                }
            } catch (error) {
                if (!entry.warned) {
                    console.warn('Unable to upload gallery media to WebGL:', error.message);
                    entry.warned = true;
                }
                return;
            }
            entry.source = source;
            return entry;
        }

        function getVisibleRect(element) {
            const rect = element.getBoundingClientRect();
            let left = Math.max(0, rect.left), top = Math.max(0, rect.top);
            let right = Math.min(window.innerWidth, rect.right), bottom = Math.min(window.innerHeight, rect.bottom);
            for (let parent = element.parentElement; parent && parent !== document.body; parent = parent.parentElement) {
                const style = getComputedStyle(parent);
                const parentRect = parent.getBoundingClientRect();
                if (style.overflowX !== 'visible') {
                    left = Math.max(left, parentRect.left);
                    right = Math.min(right, parentRect.right);
                }
                if (style.overflowY !== 'visible') {
                    top = Math.max(top, parentRect.top);
                    bottom = Math.min(bottom, parentRect.bottom);
                }
            }
            return { rect, left, top, right, bottom };
        }

        function clipRect() {
            if (activeTarget === window || !activeTarget) return { left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight };
            const rect = activeTarget.getBoundingClientRect();
            return { left: Math.max(0, rect.left), top: Math.max(0, rect.top), right: Math.min(window.innerWidth, rect.right), bottom: Math.min(window.innerHeight, rect.bottom) };
        }

        function drawTile(element) {
            if (!visibleMedia.has(element)) return;
            const { rect, left, top, right, bottom } = getVisibleRect(element);
            if (right <= left || bottom <= top || rect.width <= 0 || rect.height <= 0) return;
            const style = getComputedStyle(element);
            const opacity = Number.parseFloat(style.opacity);
            if (style.visibility === 'hidden' || opacity < 0.05) return;

            const clip = clipRect();
            const clipLeft = Math.max(left, clip.left), clipTop = Math.max(top, clip.top);
            const clipRight = Math.min(right, clip.right), clipBottom = Math.min(bottom, clip.bottom);
            if (clipRight <= clipLeft || clipBottom <= clipTop) return;

            const textureEntry = upload(element);
            const texture = textureEntry?.texture;
            const width = element.tagName === 'VIDEO' ? element.videoWidth : element.naturalWidth;
            const height = element.tagName === 'VIDEO' ? element.videoHeight : element.naturalHeight;
            if (!texture || !width || !height) return;

            const aspect = rect.width / rect.height, sourceAspect = width / height;
            let cropX = 0, cropY = 0, cropW = 1, cropH = 1;
            if (style.objectFit === 'cover') {
                if (sourceAspect > aspect) {
                    cropW = aspect / sourceAspect;
                    cropX = (1 - cropW) / 2;
                } else {
                    cropH = sourceAspect / aspect;
                    cropY = (1 - cropH) / 2;
                }
            }

            gl.bindFramebuffer(gl.FRAMEBUFFER, sceneTarget.framebuffer);
            gl.enable(gl.SCISSOR_TEST);
            const scissorLeft = Math.round(clipLeft * dpr), scissorRight = Math.round(clipRight * dpr);
            const scissorTop = Math.round(clipTop * dpr), scissorBottom = Math.round(clipBottom * dpr);
            gl.scissor(scissorLeft, canvas.height - scissorBottom, scissorRight - scissorLeft, scissorBottom - scissorTop);
            gl.useProgram(tile.program);
            gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
            gl.enableVertexAttribArray(0);
            gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
            gl.uniform4f(tile.locations.uRect, rect.left, rect.top, rect.width, rect.height);
            gl.uniform2f(tile.locations.uResolution, window.innerWidth, window.innerHeight);
            gl.uniform4f(tile.locations.uCrop, cropX, cropY, cropW, cropH);
            gl.uniform1f(tile.locations.uOpacity, opacity);
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.uniform1i(tile.locations.uImage, 0);
            gl.enable(gl.BLEND);
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
            gl.disable(gl.BLEND);
            gl.disable(gl.SCISSOR_TEST);
            renderedMedia.add(element);
        }

        function drawEffect() {
            const clip = clipRect();
            const bottomClip = 1 - clip.bottom / window.innerHeight;
            const topClip = 1 - clip.top / window.innerHeight;
            gl.bindFramebuffer(gl.FRAMEBUFFER, frameTarget.framebuffer);
            gl.viewport(0, 0, canvas.width, canvas.height);
            gl.useProgram(feedback.program);
            gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
            gl.enableVertexAttribArray(0);
            gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, sceneTarget.texture);
            gl.uniform1i(feedback.locations.uCurrent, 0);
            gl.activeTexture(gl.TEXTURE1);
            gl.bindTexture(gl.TEXTURE_2D, previousTarget.texture);
            gl.uniform1i(feedback.locations.uPrev, 1);
            gl.uniform4f(feedback.locations.uClip, clip.left / window.innerWidth, bottomClip, clip.right / window.innerWidth, topClip);
            const mobileFactor = window.matchMedia('(max-width: 768px)').matches ? 1.6 : 1;
            const normalizedVelocity = Math.min(0.53, visualStrength * 0.5 * mobileFactor);
            const horizontalScale = Math.max(0.8, Math.min(5.5, 2.4 * window.innerHeight / window.innerWidth));
            const decayProgress = Math.min(1, visualStrength / 0.05);
            const easedDecay = decayProgress * decayProgress * (3 - 2 * decayProgress);
            gl.uniform1f(feedback.locations.uDecay, 0.2 + easedDecay * 0.15);
            gl.uniform2f(feedback.locations.uOffset, 0, -smoothedRate * 0.04 * mobileFactor);
            gl.uniform1f(feedback.locations.uVelocity, normalizedVelocity);
            gl.uniform1f(feedback.locations.uHorizontalScale, horizontalScale);
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            gl.clearColor(0, 0, 0, 0);
            gl.clear(gl.COLOR_BUFFER_BIT);
            gl.viewport(0, 0, canvas.width, canvas.height);
            const x = Math.max(0, Math.round(clip.left * dpr));
            const y = Math.max(0, Math.round(clip.top * dpr));
            const right = Math.min(canvas.width, Math.round(clip.right * dpr));
            const bottom = Math.min(canvas.height, Math.round(clip.bottom * dpr));
            gl.enable(gl.SCISSOR_TEST);
            gl.scissor(x, canvas.height - bottom, right - x, bottom - y);
            gl.useProgram(blit.program);
            gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
            gl.enableVertexAttribArray(0);
            gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, frameTarget.texture);
            gl.uniform1i(blit.locations.uImage, 0);
            gl.enable(gl.BLEND);
            gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
            gl.disable(gl.BLEND);
            gl.disable(gl.SCISSOR_TEST);

            outputTarget = previousTarget;
            previousTarget = frameTarget;
            frameTarget = outputTarget;
        }

        function clearFeedback() {
            restoreMedia();
            [frameTarget, previousTarget].forEach(clearTarget);
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            gl.clearColor(0, 0, 0, 0);
            gl.clear(gl.COLOR_BUFFER_BIT);
        }

        function requestRender() {
            if (scrollPhysics?.requestFrame) scrollPhysics.requestFrame();
            else if (!raf) raf = requestAnimationFrame(render);
        }

        function render(now) {
            raf = 0;
            const elapsedFrames = lastTime ? Math.max(0.5, (now - lastTime) / 16.67) : 1;
            lastTime = now;
            const smoothing = 1 - Math.pow(0.9, elapsedFrames);
            const rateTarget = now - lastInputTime < 48 ? targetRate : 0;
            smoothedRate += (rateTarget - smoothedRate) * smoothing;
            visualStrength += (strength - visualStrength) * smoothing;
            restoreMedia();
            renderedMedia.clear();
            gl.bindFramebuffer(gl.FRAMEBUFFER, sceneTarget.framebuffer);
            gl.viewport(0, 0, canvas.width, canvas.height);
            gl.clearColor(0, 0, 0, 0);
            gl.clear(gl.COLOR_BUFFER_BIT);
            media.forEach(drawTile);
            gl.bindFramebuffer(gl.FRAMEBUFFER, frameTarget.framebuffer);
            gl.viewport(0, 0, canvas.width, canvas.height);
            drawEffect();
            hideRenderedMedia();
            strength *= Math.pow(0.94, elapsedFrames);
            if (strength > 0.008 || visualStrength > 0.008 || Math.abs(smoothedRate) > 0.001) {
                if (!scrollPhysics?.subscribeFrame) raf = requestAnimationFrame(render);
                return true;
            } else {
                strength = visualStrength = targetRate = smoothedRate = 0;
                lastTime = 0;
                clearFeedback();
                return false;
            }
        }

        if (scrollPhysics?.subscribeFrame) scrollPhysics.subscribeFrame(render);

        function onScroll(event) {
            const target = event.currentTarget;
            const position = target === window ? window.scrollY : target.scrollTop;
            const previousPosition = lastPositions.get(target) ?? position;
            const delta = position - previousPosition;
            const now = performance.now();
            if (delta !== 0) {
                if (activeTarget !== target) {
                    activeTarget = target;
                    clearFeedback();
                    strength = visualStrength = targetRate = smoothedRate = 0;
                    lastTime = 0;
                }
                strength = Math.min(1, strength + Math.min(Math.abs(delta), 150) * 0.001);
                const interval = Math.max(8, now - (lastInputTime || now - 16.67));
                const referenceWorldHeight = 2 * 5 * Math.tan(Math.PI / 8);
                targetRate = Math.max(-1, Math.min(1, delta / interval * 1000 * referenceWorldHeight / window.innerHeight * 0.1));
                lastInputTime = now;
            }
            lastPositions.set(target, position);
            requestRender();
        }

        if ('IntersectionObserver' in window) {
            const observer = new IntersectionObserver(entries => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        visibleMedia.add(entry.target);
                        upload(entry.target);
                    } else {
                        visibleMedia.delete(entry.target);
                        const texture = textures.get(entry.target);
                        if (texture) {
                            gl.deleteTexture(texture.texture);
                            textures.delete(entry.target);
                        }
                    }
                });
            }, { rootMargin: '80px' });
            media.forEach(element => {
                element.addEventListener('load', () => upload(element));
                if (element.tagName === 'VIDEO') element.addEventListener('loadeddata', () => upload(element));
                observer.observe(element);
            });
        } else {
            media.forEach(element => {
                visibleMedia.add(element);
                element.addEventListener('load', () => upload(element));
                upload(element);
            });
        }

        function bindScrollTargets() {
            document.querySelectorAll('main > .column').forEach(target => target.removeEventListener('scroll', onScroll));
            window.removeEventListener('scroll', onScroll);
            const targets = window.matchMedia('(max-width: 768px)').matches
                ? [window]
                : Array.from(document.querySelectorAll('main > .column:not(.mobile-column)'));
            targets.forEach(target => {
                lastPositions.set(target, target === window ? window.scrollY : target.scrollTop);
                target.addEventListener('scroll', onScroll, { passive: true });
            });
            activeTarget = null;
            clearFeedback();
        }

        resize();
        window.addEventListener('resize', resize, { passive: true });
        window.matchMedia('(max-width: 768px)').addEventListener('change', bindScrollTargets);
        bindScrollTargets();
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
        const scrollPhysics = setupSmoothScroll();
        setupInfiniteGallery(scrollPhysics);
        setupImageGallery();
        setupVideoLoading();
        setupScrollPixelation(scrollPhysics);
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
