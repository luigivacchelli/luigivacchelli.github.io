 (() => {
     // --- CONFIGURATION ---
     const targetDate = '2025-11-30T23:59:59';

     // === NEW: DICTIONARY FOR TRANSLATIONS ===
     const translations = {
         'en': {
             days: "Days",
             hours: "Hours",
             minutes: "Minutes",
             seconds: "Seconds"
         },
         'it': {
             days: "Giorni",
             hours: "Ore",
             minutes: "Minuti",
             seconds: "Secondi"
         }
     };
     
     // --- CACHE DOM ELEMENTS ---
     const daysEl = document.getElementById('days');
     const hoursEl = document.getElementById('hours');
     const minutesEl = document.getElementById('minutes');
     const secondsEl = document.getElementById('seconds');
     const countdownContainer = document.getElementById('countdown-container');
     const i18nElements = document.querySelectorAll('[data-i18n-key]'); // Cache the translatable elements

     
     // === NEW: FUNCTION TO SWAP THE VIDEO ===
         function swapToHiresVideo() {
             // 1. Find the video element on the page
             const videoPlayer = document.querySelector('.countdown-background-video');
             if (!videoPlayer) return;

             // 2. Get the path to the high-resolution video from the data attribute
             const hiresSrc = videoPlayer.dataset.hiresSrc;
             if (!hiresSrc) return;

             // 3. Create a virtual video element in memory to preload the hires source
             const virtualVideo = document.createElement('video');

             // 4. Listen for the 'canplaythrough' event. This is the key.
             // It means the video has buffered enough to play to the end without stopping.
             virtualVideo.addEventListener('canplaythrough', () => {
                 // 5. Once it's ready, swap the source of the *visible* video player
                 videoPlayer.src = hiresSrc;
             }, { once: true }); // { once: true } automatically removes the listener after it runs

             // 6. Start loading the hires video in the background
             virtualVideo.src = hiresSrc;
         }
     
     // === NEW: TRANSLATION FUNCTION ===
     function translatePage() {
         // Detect browser language ('en', 'it', etc.)
         const userLang = navigator.language.substring(0, 2);
         // Default to English if the language is not Italian
         const language = userLang === 'it' ? 'it' : 'en';

         // Loop through all elements that have the 'data-i18n-key'
         i18nElements.forEach(element => {
             const key = element.dataset.i18nKey;
             const translation = translations[language][key];
             if (translation !== undefined) {
                 element.innerHTML = translation;
             }
         });
     }


     // --- THE COUNTDOWN LOGIC (Unchanged) ---
     function startCountdown() {
         const targetTime = new Date(targetDate).getTime();

         if (targetTime < new Date().getTime()) {
             if(countdownContainer) countdownContainer.style.display = 'none';
             return;
         }
         
         if(countdownContainer) countdownContainer.style.display = 'flex';

         // --- Create a new function for the update logic ---
         function updateTimer() {
             const now = new Date().getTime();
             const distance = targetTime - now;

             if (distance < 0) {
                 // This part is for the interval, to stop it
                 clearInterval(interval);
                 if(countdownContainer) countdownContainer.style.display = 'none';
                 return;
             }

             const days = Math.floor(distance / (1000 * 60 * 60 * 24));
             const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
             const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
             const seconds = Math.floor((distance % (1000 * 60)) / 1000);

             if (daysEl) daysEl.innerHTML = String(days).padStart(2, '0');
             if (hoursEl) hoursEl.innerHTML = String(hours).padStart(2, '0');
             if (minutesEl) minutesEl.innerHTML = String(minutes).padStart(2, '0');
             if (secondsEl) secondsEl.innerHTML = String(seconds).padStart(2, '0');
         }

         // --- The Fix ---
         // 1. Run the update function ONCE, IMMEDIATELY.
         updateTimer();

         // 2. Then, set the interval to run it every second thereafter.
         const interval = setInterval(updateTimer, 1000);
     }

     // --- START THE SCRIPT ---
     document.addEventListener('DOMContentLoaded', () => {
         // First, translate the page
         translatePage();
         // Then, start the countdown
         startCountdown();
         //Start hires swap
         swapToHiresVideo();
     });

 })();
