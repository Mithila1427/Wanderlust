
$(document).ready(function () {

  /* 
     AUTH STATE  (localStorage-backed session for demo)
     */
  const AUTH_KEY = 'wanderlust_user';

  function getUser() {
    try { return JSON.parse(localStorage.getItem(AUTH_KEY)); } catch { return null; }
  }
  function setUser(user) {
    localStorage.setItem(AUTH_KEY, JSON.stringify(user));
  }
  function clearUser() {
    localStorage.removeItem(AUTH_KEY);
  }
  function isLoggedIn() {
    return !!getUser();
  }

  // Render nav user area
  function renderNavUser() {
    const user = getUser();
    if (user) {
      const initial = user.name.charAt(0).toUpperCase();
      const firstName = user.name.split(' ')[0];
      $('#navUserArea').html(`
        <div class="nav-user-info">
          <button class="nav-avatar-btn" id="navAvatarBtn" aria-label="User menu">
            <div class="nav-avatar">${initial}</div>
            <i class="fas fa-chevron-down nav-chevron" id="navChevron"></i>
          </button>
          <div class="nav-dropdown" id="navDropdown">
            <div class="nav-dropdown-header">
              <div class="nav-avatar nav-avatar-lg">${initial}</div>
              <div>
                <div class="nav-dropdown-name">${user.name}</div>
                <div class="nav-dropdown-email">${user.email || ''}</div>
              </div>
            </div>
            <div class="nav-dropdown-divider"></div>
            <button class="nav-dropdown-item" id="logoutBtn">
              <i class="fas fa-sign-out-alt"></i> Logout
            </button>
          </div>
        </div>
      `);

      // Toggle dropdown
      $('#navAvatarBtn').on('click', function (e) {
        e.stopPropagation();
        const $dd = $('#navDropdown');
        const isOpen = $dd.hasClass('open');
        $dd.toggleClass('open');
        $('#navChevron').css('transform', isOpen ? '' : 'rotate(180deg)');
      });

      // Close on outside click
      $(document).on('click.navdropdown', function () {
        $('#navDropdown').removeClass('open');
        $('#navChevron').css('transform', '');
      });
      $('#navDropdown').on('click', function (e) { e.stopPropagation(); });

      $('#logoutBtn').on('click', function () {
        $.post('auth.php', { action: 'logout' }).always(function () {
          clearUser();
          $(document).off('click.navdropdown');
          renderNavUser();
          showToast('Logged out. See you next time! ✈️');
        });
      });
    } else {
      $(document).off('click.navdropdown');
      $('#navUserArea').html(`<button class="btn-login" id="loginNavBtn"><i class="fas fa-user"></i> Login</button>`);
      $('#loginNavBtn').on('click', function () { openAuthModal('login'); });
    }
  }

  renderNavUser();

  /* ---- Mark already-saved destinations on page load ---- */
  if (isLoggedIn() && $('.dest-card').length) {
    $.get('saved_destinations.php', { action: 'load' })
      .done(function (res) {
        if (res && res.success && res.destinations) {
          res.destinations.forEach(function (d) {
            $('.dest-card[data-city="' + d.city + '"][data-country="' + d.country + '"] .dest-save-btn')
              .addClass('saved')
              .html('<i class="fas fa-heart"></i>');
          });
        }
      });
  }

  /* ---- Open/Close Auth Modal ---- */
  function openAuthModal(tab) {
    $('#authModal').addClass('open');
    switchAuthTab(tab || 'login');
    setTimeout(() => {
      if (tab === 'signup') $('#signupName').focus();
      else $('#loginEmail').focus();
    }, 200);
  }
  function closeAuthModal() {
    $('#authModal').removeClass('open');
    // reset errors
    $('#loginError, #signupError, #signupSuccess').addClass('hidden').text('');
  }

  $('#closeAuthModal').on('click', closeAuthModal);
  $('#authModal').on('click', function (e) {
    if ($(e.target).is('#authModal')) closeAuthModal();
  });

  // Tab switching
  function switchAuthTab(tab) {
    $('.auth-tab').removeClass('active');
    $(`.auth-tab[data-tab="${tab}"]`).addClass('active');
    if (tab === 'login') {
      $('#loginForm').removeClass('hidden');
      $('#signupForm').addClass('hidden');
    } else {
      $('#signupForm').removeClass('hidden');
      $('#loginForm').addClass('hidden');
    }
  }
  $('.auth-tab').on('click', function () { switchAuthTab($(this).data('tab')); });
  $(document).on('click', '.switch-to-signup', function (e) { e.preventDefault(); switchAuthTab('signup'); });
  $(document).on('click', '.switch-to-login',  function (e) { e.preventDefault(); switchAuthTab('login'); });

  /* ---- Login Submit ---- */
  $('#loginSubmitBtn').on('click', function () {
    const email = $('#loginEmail').val().trim();
    const password = $('#loginPassword').val();

    if (!email || !password) {
      showAuthError('loginError', 'Please enter email and password.');
      return;
    }

    setLoading('#loginSubmitBtn', true);

    // Try PHP backend first; fallback to demo credentials
    $.post('auth.php', { action: 'login', email, password })
      .done(function (res) {
        setLoading('#loginSubmitBtn', false);
        if (res.success) {
          setUser({ name: res.name || email.split('@')[0], email });
          closeAuthModal();
          renderNavUser();
          showToast('Welcome back, ' + (res.name || email.split('@')[0]) + '! 🌍');
          handlePostLogin();
        } else {
          // Fallback demo login
          if (email === 'demo@wanderlust.com' && password === 'password') {
            demoLogin(email);
          } else {
            showAuthError('loginError', res.message || 'Invalid credentials.');
          }
        }
      })
      .fail(function () {
        setLoading('#loginSubmitBtn', false);
        // Offline / no PHP – demo mode
        if (email === 'demo@wanderlust.com' && password === 'password') {
          demoLogin(email);
        } else {
          // Allow any email/password for demo (no backend)
          demoLogin(email, true);
        }
      });
  });

  function demoLogin(email, anyUser) {
    const name = anyUser ? email.split('@')[0] : 'Demo User';
    setUser({ name, email });
    closeAuthModal();
    renderNavUser();
    showToast('Welcome, ' + name + '! 🌍');
    handlePostLogin();
  }

  /* ---- Signup Submit ---- */
  $('#signupSubmitBtn').on('click', function () {
    const name     = $('#signupName').val().trim();
    const email    = $('#signupEmail').val().trim();
    const password = $('#signupPassword').val();

    if (!name || !email || !password) {
      showAuthError('signupError', 'All fields are required.');
      return;
    }
    if (password.length < 6) {
      showAuthError('signupError', 'Password must be at least 6 characters.');
      return;
    }

    setLoading('#signupSubmitBtn', true);

    $.post('auth.php', { action: 'signup', name, email, password })
      .done(function (res) {
        setLoading('#signupSubmitBtn', false);
        if (res.success) {
          setUser({ name, email });
          $('#signupSuccess').removeClass('hidden').text('Account created! Welcome, ' + name + ' 🎉');
          setTimeout(() => {
            closeAuthModal();
            renderNavUser();
            showToast('Account created! Happy travels, ' + name + ' ✈️');
            handlePostLogin();
          }, 1200);
        } else {
          showAuthError('signupError', res.message || 'Signup failed.');
        }
      })
      .fail(function () {
        setLoading('#signupSubmitBtn', false);
        // Demo mode – accept signup without backend
        setUser({ name, email });
        $('#signupSuccess').removeClass('hidden').text('Account created! Welcome, ' + name + ' 🎉');
        setTimeout(() => {
          closeAuthModal();
          renderNavUser();
          showToast('Account created! Happy travels, ' + name + ' ✈️');
          handlePostLogin();
        }, 1200);
      });
  });

  // Enter key support
  $('#loginEmail, #loginPassword').on('keypress', function (e) {
    if (e.which === 13) $('#loginSubmitBtn').click();
  });
  $('#signupName, #signupEmail, #signupPassword').on('keypress', function (e) {
    if (e.which === 13) $('#signupSubmitBtn').click();
  });

  /* ---- Auth Gate Modal ---- */
  let pendingAction = null;

  function showAuthGate(title, msg) {
    $('#authGateTitle').text(title || 'Login Required');
    $('#authGateMsg').text(msg || 'Please login or sign up to use this feature.');
    $('#authGateModal').addClass('open');
  }

  $('#closeAuthGateModal').on('click', function () {
    $('#authGateModal').removeClass('open');
    pendingAction = null;
  });
  $('#authGateModal').on('click', function (e) {
    if ($(e.target).is('#authGateModal')) { $('#authGateModal').removeClass('open'); pendingAction = null; }
  });

  $('#authGateLoginBtn').on('click', function () {
    $('#authGateModal').removeClass('open');
    openAuthModal('login');
  });
  $('#authGateSignupBtn').on('click', function () {
    $('#authGateModal').removeClass('open');
    openAuthModal('signup');
  });

  /* After login, execute pending action */
  function handlePostLogin() {
    if (pendingAction === 'weather') {
      fetchWeatherAndCountry();
      pendingAction = null;
    } else if (pendingAction === 'planner') {
      window.location.href = 'planner.html';
      pendingAction = null;
    } else if (pendingAction === 'scroll-planner') {
      $('html, body').animate({ scrollTop: $('#planner').offset().top - 80 }, 600);
      pendingAction = null;
    }
  }

  /* ---- Auth-guarded buttons ---- */
  // Hero "Start Planning" button
  $('#heroPlanBtn').on('click', function (e) {
    e.preventDefault();
    if (!isLoggedIn()) {
      pendingAction = 'scroll-planner';
      showAuthGate('Login to Start Planning', 'Create a free account to build your dream trip itinerary!');
    } else {
      $('html, body').animate({ scrollTop: $('#planner').offset().top - 80 }, 600);
    }
  });

  // CTA "Open Itinerary Builder" button
  $('#ctaBuildBtn').on('click', function (e) {
    e.preventDefault();
    if (!isLoggedIn()) {
      pendingAction = 'planner';
      showAuthGate('Login to Build Itinerary', 'Login or sign up to access the full itinerary builder.');
    } else {
      window.location.href = 'planner.html';
    }
  });

  // Nav "Build Itinerary" link
  $('#buildItineraryLink').on('click', function (e) {
    e.preventDefault();
    if (!isLoggedIn()) {
      pendingAction = 'planner';
      showAuthGate('Login Required', 'Please login to access the itinerary builder.');
    } else {
      window.location.href = 'planner.html';
    }
  });

  /* ---- Helpers ---- */
  function showAuthError(id, msg) {
    $('#' + id).removeClass('hidden').text(msg);
  }
  function setLoading(selector, loading) {
    const $btn = $(selector);
    if (loading) {
      $btn.find('.btn-text').addClass('hidden');
      $btn.find('.btn-loader').removeClass('hidden');
      $btn.prop('disabled', true);
    } else {
      $btn.find('.btn-loader').addClass('hidden');
      $btn.find('.btn-text').removeClass('hidden');
      $btn.prop('disabled', false);
    }
  }
  function showToast(msg) {
    const $t = $(`<div class="global-toast">${msg}</div>`);
    $('body').append($t);
    setTimeout(() => $t.addClass('show'), 50);
    setTimeout(() => { $t.removeClass('show'); setTimeout(() => $t.remove(), 400); }, 3200);
  }

  /* 
     1. NAVBAR – scroll effect
      */
  $(window).on('scroll', function () {
    if ($(this).scrollTop() > 60) {
      $('#navbar').addClass('scrolled');
    } else {
      $('#navbar').removeClass('scrolled');
    }
  });

  /* 
     2. HAMBURGER MENU (mobile)
    */
  $('#hamburger').on('click', function () {
    $('.nav-links').slideToggle(300);
  });

  /*
     3. SCROLL REVEAL – fade-in on scroll
    */
  function checkReveal() {
    $('.reveal').each(function () {
      const top = $(this).offset().top;
      const windowBottom = $(window).scrollTop() + $(window).height();
      if (top < windowBottom - 60) {
        $(this).addClass('visible');
      }
    });
  }
  $(window).on('scroll', checkReveal);
  checkReveal();

  /* 
     4. BUTTON RIPPLE EFFECT
      */
  $(document).on('click', '.btn-primary', function (e) {
    const btn = $(this);
    const offset = btn.offset();
    const x = e.pageX - offset.left;
    const y = e.pageY - offset.top;
    const size = Math.max(btn.outerWidth(), btn.outerHeight());

    const $ripple = $('<span class="ripple"></span>').css({
      left: x - size / 2,
      top: y - size / 2,
      width: size,
      height: size,
    });

    btn.append($ripple);
    setTimeout(() => $ripple.remove(), 600);
  });

  /* 
     5. TRAVELER PICKER (index.html – planner form)
     */
  let travelers = 2;
  $('#increaseTravelers').on('click', function () {
    travelers = Math.min(travelers + 1, 20);
    $('#travelerCount').text(travelers).addClass('bounce-num');
    setTimeout(() => $('#travelerCount').removeClass('bounce-num'), 300);
  });
  $('#decreaseTravelers').on('click', function () {
    travelers = Math.max(travelers - 1, 1);
    $('#travelerCount').text(travelers);
  });

  /* 
     6. PLANNER FORM VALIDATION
      */
  $('#plannerForm').on('submit', function (e) {
    e.preventDefault();

    if (!isLoggedIn()) {
      pendingAction = 'scroll-planner';
      showAuthGate('Login to Plan Your Trip', 'Create a free account to save and manage your travel plans!');
      return;
    }

    let valid = true;

    const dest = $('#destination').val().trim();
    if (!dest) {
      $('#destErr').addClass('show');
      $('#destination').addClass('error');
      valid = false;
    } else {
      $('#destErr').removeClass('show');
      $('#destination').removeClass('error');
    }

    const startDate = $('#startDate').val();
    const endDate   = $('#endDate').val();
    if (!startDate || !endDate || new Date(startDate) >= new Date(endDate)) {
      $('#dateErr').addClass('show');
      valid = false;
    } else {
      $('#dateErr').removeClass('show');
    }

    const budget = parseFloat($('#budget').val());
    if (!budget || budget < 100) {
      $('#budgetErr').addClass('show');
      $('#budget').addClass('error');
      valid = false;
    } else {
      $('#budgetErr').removeClass('show');
      $('#budget').removeClass('error');
    }

    if (!valid) return;

    const $btn = $('#planBtn');
    $btn.find('.btn-text').addClass('hidden');
    $btn.find('.btn-loader').removeClass('hidden');
    $btn.prop('disabled', true);

    const tripData = { dest, startDate, endDate, budget, travelers };
    localStorage.setItem('wanderlust_trip', JSON.stringify(tripData));

    setTimeout(function () {
      $btn.find('.btn-loader').addClass('hidden');
      $btn.find('.btn-text').removeClass('hidden');
      $btn.prop('disabled', false);
      $('#formSuccess').removeClass('hidden').hide().fadeIn(400);
      setTimeout(() => {
        window.location.href = 'planner.html';
      }, 1800);
    }, 1400);
  });

  /* 
     7. DESTINATION CARD – weather quick-link + save to wishlist
    */
  $('.dest-card').on('click', function (e) {
    // Don't trigger if clicking the save button
    if ($(e.target).closest('.dest-save-btn').length) return;
    const city = $(this).data('city');
    if (city && $('#weatherCity').length) {
      $('#weatherCity').val(city);
      $('html, body').animate({ scrollTop: $('#weather').offset().top - 80 }, 500);
    }
  });

  // Save Destination (heart) button
  $(document).on('click', '.dest-save-btn', function (e) {
    e.stopPropagation();
    if (!isLoggedIn()) {
      showAuthGate('Login to Save Destinations', 'Create a free account to save your dream destinations to your wishlist!');
      return;
    }
    const $btn     = $(this);
    const $card    = $btn.closest('.dest-card');
    const city     = $card.data('city');
    const country  = $card.data('country');
    const imageUrl = $card.find('img').attr('src') || '';

    if ($btn.hasClass('saved')) {
      showToast(`${city} is already in your wishlist! ❤️`);
      return;
    }

    $btn.addClass('loading').prop('disabled', true);

    $.post('saved_destinations.php', {
      action:    'save',
      city,
      country,
      image_url: imageUrl,
      notes:     '',
    })
      .done(function (res) {
        $btn.removeClass('loading').prop('disabled', false);
        if (res && res.success) {
          $btn.addClass('saved').html('<i class="fas fa-heart"></i>');
          showToast(`❤️ ${city} saved to your wishlist!`);
        } else {
          showToast('⚠️ ' + (res && res.message ? res.message : 'Could not save destination.'));
        }
      })
      .fail(function () {
        $btn.removeClass('loading').prop('disabled', false);
        showToast('⚠️ No server connection — destination not saved to DB.');
      });
  });

  /* 
     8. WEATHER + COUNTRY API
      */
  $('#fetchWeatherBtn').on('click', function () {
    if (!isLoggedIn()) {
      pendingAction = 'weather';
      showAuthGate('Login to Check Weather', 'Login to check live weather conditions and get AI-powered place recommendations for any city!');
      return;
    }
    fetchWeatherAndCountry();
  });

  $('#weatherCity').on('keypress', function (e) {
    if (e.which === 13) {
      if (!isLoggedIn()) {
        pendingAction = 'weather';
        showAuthGate('Login to Check Weather', 'Login to check live weather & get AI-powered place recommendations!');
        return;
      }
      fetchWeatherAndCountry();
    }
  });

  function fetchWeatherAndCountry() {
    const city = $('#weatherCity').val().trim();
    if (!city) return;

    $('#weatherResult').addClass('hidden');
    $('#weatherError').addClass('hidden');
    $('#smartRecommendations').addClass('hidden');
    $('#weatherSpinner').removeClass('hidden');

    $.ajax({
      url: `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`,
      type: 'GET',
      success: function (geoData) {
        if (!geoData.results || geoData.results.length === 0) {
          showWeatherError('City not found. Try another name.');
          return;
        }
        const loc = geoData.results[0];
        const lat = loc.latitude;
        const lon = loc.longitude;
        const countryCode = loc.country_code;
        const cityName = loc.name + ', ' + loc.country;

        $.ajax({
          url: `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m,weather_code&wind_speed_unit=kmh`,
          type: 'GET',
          success: function (wData) {
            const cur = wData.current;
            const temp  = Math.round(cur.temperature_2m);
            const feels = Math.round(cur.apparent_temperature);
            const hum   = cur.relative_humidity_2m;
            const wind  = Math.round(cur.wind_speed_10m);
            const code  = cur.weather_code;

            const { desc, icon } = weatherCodeToInfo(code);

            $('#wCityName').text(cityName);
            $('#wDesc').text(desc);
            $('#wTemp').text(temp + '°C');
            $('#wHumidity').text(hum + '%');
            $('#wWind').text(wind + ' km/h');
            $('#wFeelsLike').text(feels + '°C');
            $('#wIcon').attr('src', icon).attr('alt', desc);

            $.ajax({
              url: `https://restcountries.com/v3.1/alpha/${countryCode}`,
              type: 'GET',
              success: function (cData) {
                const c = cData[0];
                const langs = Object.values(c.languages || {}).slice(0, 2).join(', ') || '—';
                const currencies = Object.values(c.currencies || {}).map(x => `${x.name} (${x.symbol})`).slice(0, 1).join('') || '—';
                const tz = (c.timezones || ['—'])[0];
                const pop = (c.population || 0).toLocaleString();

                $('#cFlag').attr('src', c.flags.svg).attr('alt', c.name.common);
                $('#cName').text(c.name.common);
                $('#cRegion').text(c.region + ' · ' + (c.subregion || ''));
                $('#cPop').text(pop);
                $('#cLang').text(langs);
                $('#cCurrency').text(currencies);
                $('#cTimezone').text(tz);

                $('#weatherSpinner').addClass('hidden');
                $('#weatherResult').removeClass('hidden').hide().fadeIn(500);

                // Trigger smart AI recommendations
                fetchSmartRecommendations(loc.name, c.name.common, temp, desc, hum, wind);
              },
              error: function () {
                $('#cFlag').attr('src', '');
                $('#cName').text(loc.country || '—');
                $('#cRegion').text('');
                $('#cPop, #cLang, #cCurrency, #cTimezone').text('N/A');
                $('#weatherSpinner').addClass('hidden');
                $('#weatherResult').removeClass('hidden').hide().fadeIn(500);
                fetchSmartRecommendations(loc.name, loc.country, temp, desc, hum, wind);
              }
            });
          },
          error: function () {
            showWeatherError('Weather data unavailable. Please try again.');
          }
        });
      },
      error: function () {
        showWeatherError('City not found. Please check the spelling.');
      }
    });
  }

  /* 
     SMART AI RECOMMENDATIONS  –  Powered by Groq (FREE)
     
    */
  const GROQ_API_KEY = 'YOUR_GROQ_API_KEY_HERE'; // Get your free key at console.groq.com

  async function fetchSmartRecommendations(city, country, temp, weatherDesc, humidity, wind) {
    $('#smartRecommendations').removeClass('hidden');
    $('#smartRecsGrid').addClass('hidden');
    $('#smartRecsTip').addClass('hidden');
    $('#smartRecsSpinner').removeClass('hidden');
    $('#smartRecsSubtitle').text(`Tailored suggestions for ${city} right now`);

    // Show setup guide if key not yet added
    if (!GROQ_API_KEY || GROQ_API_KEY === 'YOUR_GROQ_API_KEY_HERE') {
      $('#smartRecsSpinner').addClass('hidden');
      $('#smartRecsGrid').html(`
        <div class="rec-fallback">
          <i class="fas fa-key" style="font-size:2rem;color:var(--teal);display:block;margin-bottom:0.8rem"></i>
          <strong style="font-size:1rem;color:var(--blue)">Add your FREE Groq API key to enable AI suggestions</strong><br><br>
          1. Visit <a href="https://console.groq.com" target="_blank" style="color:var(--teal);font-weight:600">console.groq.com</a> and sign up free<br>
          2. Go to <strong>API Keys</strong> &rarr; <strong>Create API Key</strong><br>
          3. Open <code>script.js</code> and replace <code>YOUR_GROQ_API_KEY_HERE</code> with your key
        </div>`).removeClass('hidden');
      return;
    }

    const prompt = `You are a travel expert. The current weather in ${city}, ${country} is:
- Temperature: ${temp}°C
- Condition: ${weatherDesc}
- Humidity: ${humidity}%
- Wind: ${wind} km/h

Suggest exactly 6 specific, real places or activities in ${city} perfectly suited to these weather conditions.
For each provide:
1. name: real specific place name
2. type: exactly one of (Outdoor, Indoor, Cultural, Food, Adventure, Relaxation)
3. why: one sentence why it suits TODAY's weather
4. emoji: one relevant emoji
5. tip: one ultra-short practical tip (e.g. "Book ahead", "Best before 10am", "Free on Sundays")
6. imgKeyword: 3-5 words for a photo of this place (e.g. "eiffel tower paris sunset")

Respond ONLY as a valid JSON array, absolutely no markdown or extra text:
[{"name":"...","type":"...","why":"...","emoji":"...","tip":"...","imgKeyword":"..."}]`;

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          temperature: 0.7,
          max_tokens: 1400,
          messages: [
            {
              role: 'system',
              content: 'You are a travel expert. Respond ONLY with a valid JSON array. No markdown, no explanation, no code fences.'
            },
            { role: 'user', content: prompt }
          ]
        })
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson?.error?.message || `Groq API error ${response.status}`);
      }

      const data  = await response.json();
      const raw   = data.choices?.[0]?.message?.content || '[]';
      const clean = raw.replace(/```json|```/g, '').trim();
      const recs  = JSON.parse(clean);

      $('#smartRecsSpinner').addClass('hidden');

      const typeColors = {
        'Outdoor':    '#10b981',
        'Indoor':     '#6366f1',
        'Cultural':   '#f59e0b',
        'Food':       '#ef4444',
        'Adventure':  '#0B3D91',
        'Relaxation': '#14B8A6'
      };

      let html = '';
      // Build placeholder cards first, then load images asynchronously via Wikipedia API
      recs.forEach((rec, i) => {
        const color   = typeColors[rec.type] || '#6b7280';
        const tipHtml = rec.tip
          ? `<div class="rec-tip"><i class="fas fa-bolt"></i> ${rec.tip}</div>` : '';

        html += `
          <div class="rec-card" id="rec-card-${i}" style="animation-delay:${i * 70}ms">
            <div class="rec-img-wrap">
              <img class="rec-img" id="rec-img-${i}" src="" alt="${rec.name}"
                   style="background:#e8f0fe;"
                   onerror="this.onerror=null;this.src='https://picsum.photos/seed/${Date.now() + i}/400/220'"/>
              <span class="rec-type-badge" style="background:${color}">${rec.type}</span>
            </div>
            <div class="rec-body">
              <div class="rec-name-row">
                <span class="rec-emoji-sm">${rec.emoji}</span>
                <div class="rec-name">${rec.name}</div>
              </div>
              <div class="rec-why">${rec.why}</div>
              ${tipHtml}
              <button class="btn-add-itinerary"
                data-name="${rec.name}"
                data-category="${(rec.type || '').toLowerCase()}"
                data-notes="${rec.why}">
                <i class="fas fa-plus-circle"></i> Add to Itinerary
              </button>
            </div>
          </div>`;
      });

      $('#smartRecsGrid').html(html).removeClass('hidden').hide().fadeIn(450);

      // Load relevant images for each rec card using Wikipedia API (free, no key, relevant)
      recs.forEach((rec, i) => {
        const searchTerm = (rec.imgKeyword || rec.name + ' ' + city)
          .replace(/[^a-zA-Z0-9 ]/g, ' ').trim();
        // Wikipedia page images API – returns the actual main image of the place article
        const wikiUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(searchTerm.replace(/ /g,'_'))}`;
        fetch(wikiUrl)
          .then(r => r.ok ? r.json() : Promise.reject())
          .then(data => {
            const imgSrc = data.thumbnail?.source || data.originalimage?.source;
            if (imgSrc) {
              const $img = $(`#rec-img-${i}`);
              // Upgrade to larger size if wikipedia thumbnail
              const bigSrc = imgSrc.replace(/\/\d+px-/, '/400px-');
              $img.attr('src', bigSrc);
            } else {
              throw new Error('no image');
            }
          })
          .catch(() => {
            // fallback: loremflickr with the place keyword (truly relevant, free, no key)
            const kw = encodeURIComponent(searchTerm.split(' ').slice(0,3).join(','));
            $(`#rec-img-${i}`).attr('src', `https://loremflickr.com/400/220/${kw}?lock=${i + Date.now()}`);
          });
      });

      // "Add to Itinerary" click handler — opens New Itinerary Setup Modal
      $(document).off('click.quickadd').on('click.quickadd', '.btn-add-itinerary', function () {
        const name     = $(this).data('name');
        const category = $(this).data('category');
        const notes    = $(this).data('notes');
        const city     = $('#wCityName').text().split(',')[0].trim() || '';

        // Store the pending activity
        window._pendingActivity = { name, category, notes, time: '10:00' };

        // Pre-fill destination with current weather city
        $('#niDest').val(city);
        $('#niActivityName').text('"' + name + '"');

        // Set default dates (today + 7 days)
        const today = new Date();
        const end   = new Date(); end.setDate(today.getDate() + 7);
        $('#niStartDate').val(today.toISOString().split('T')[0]);
        $('#niEndDate').val(end.toISOString().split('T')[0]);

        $('#newItineraryModal').addClass('open');
      });

      // New Itinerary Modal handlers (attached once globally below)
      let niTravelers = 2;
      $(document).off('click.niInc').on('click.niInc', '#niIncTravelers', function () {
        niTravelers = Math.min(niTravelers + 1, 20);
        $('#niTravelers').text(niTravelers);
      });
      $(document).off('click.niDec').on('click.niDec', '#niDecTravelers', function () {
        niTravelers = Math.max(niTravelers - 1, 1);
        $('#niTravelers').text(niTravelers);
      });
      $(document).off('click.niClose').on('click.niClose', '#closeNewItineraryModal, #cancelNewItinerary', function () {
        $('#newItineraryModal').removeClass('open');
        window._pendingActivity = null;
      });
      $(document).off('click.niOverlay').on('click.niOverlay', '#newItineraryModal', function (e) {
        if ($(e.target).is('#newItineraryModal')) {
          $('#newItineraryModal').removeClass('open');
          window._pendingActivity = null;
        }
      });
      $(document).off('click.niConfirm').on('click.niConfirm', '#confirmNewItinerary', function () {
        const dest      = $('#niDest').val().trim();
        const startDate = $('#niStartDate').val();
        const endDate   = $('#niEndDate').val();
        const tripType  = $('input[name="niTripType"]:checked').val() || 'Couple';

        if (!dest) { $('#niDest').css('border-color','#ef4444'); return; }
        $('#niDest').css('border-color','');

        // Save trip info
        const tripData = { dest, startDate, endDate, travelers: niTravelers, tripType };
        localStorage.setItem('wanderlust_trip', JSON.stringify(tripData));

        // Save pending activity as quick-add, clear old itinerary
        if (window._pendingActivity) {
          localStorage.setItem('wanderlust_quick_add', JSON.stringify([window._pendingActivity]));
          localStorage.removeItem('wanderlust_itinerary');
        }

        $('#newItineraryModal').removeClass('open');
        window.location.href = 'planner.html';
      });

      // Contextual weather tip
      let tip = '';
      const wd = weatherDesc.toLowerCase();
      if      (temp >= 30)                                      tip = '🌡️ Very hot! Hydrate often and rest in shade during midday.';
      else if (temp >= 24)                                      tip = '☀️ Warm and pleasant — great day for outdoor exploring!';
      else if (temp <= 5)                                       tip = '🧥 Very cold — layer up and prioritise heated indoor spots.';
      else if (temp <= 12)                                      tip = '🧤 Chilly today — bring a jacket for outdoor sightseeing.';
      else if (wd.includes('rain') || wd.includes('drizzle'))  tip = '☔ Rain expected — carry an umbrella and mix in indoor gems.';
      else if (wd.includes('snow'))                             tip = '❄️ Snowy day — perfect for cosy cafés and warm museums.';
      else if (wd.includes('thunder'))                          tip = '⛈️ Storms likely — stick to covered and indoor venues.';
      else if (wd.includes('clear') || wd.includes('sunny'))   tip = '☀️ Beautiful clear skies — ideal for walking tours!';
      else                                                      tip = '🌤️ Decent conditions — most activities are a go today.';

      $('#smartRecsTip')
        .html(`<i class="fas fa-lightbulb"></i> <strong>Travel Tip:</strong> ${tip}`)
        .removeClass('hidden').hide().fadeIn(400);

    } catch (err) {
      $('#smartRecsSpinner').addClass('hidden');
      $('#smartRecsGrid').html(`
        <div class="rec-fallback">
          <i class="fas fa-exclamation-circle" style="font-size:1.8rem;color:#ef4444;display:block;margin-bottom:0.6rem"></i>
          <strong>Could not load recommendations</strong><br>
          <span style="font-size:0.82rem;color:var(--text-muted)">${err.message || 'Check your Groq API key in script.js and try again.'}</span>
        </div>`).removeClass('hidden');
      console.warn('Groq AI error:', err);
    }
  }

  function showWeatherError(msg) {
    $('#weatherSpinner').addClass('hidden');
    $('#weatherErrorMsg').text(msg);
    $('#weatherError').removeClass('hidden').hide().fadeIn(300);
  }

  function weatherCodeToInfo(code) {
    const map = {
      0:  { desc: 'Clear Sky',        icon: 'https://openweathermap.org/img/wn/01d@2x.png' },
      1:  { desc: 'Mainly Clear',     icon: 'https://openweathermap.org/img/wn/02d@2x.png' },
      2:  { desc: 'Partly Cloudy',    icon: 'https://openweathermap.org/img/wn/03d@2x.png' },
      3:  { desc: 'Overcast',         icon: 'https://openweathermap.org/img/wn/04d@2x.png' },
      45: { desc: 'Foggy',            icon: 'https://openweathermap.org/img/wn/50d@2x.png' },
      48: { desc: 'Freezing Fog',     icon: 'https://openweathermap.org/img/wn/50d@2x.png' },
      51: { desc: 'Light Drizzle',    icon: 'https://openweathermap.org/img/wn/09d@2x.png' },
      53: { desc: 'Moderate Drizzle', icon: 'https://openweathermap.org/img/wn/09d@2x.png' },
      55: { desc: 'Dense Drizzle',    icon: 'https://openweathermap.org/img/wn/09d@2x.png' },
      61: { desc: 'Slight Rain',      icon: 'https://openweathermap.org/img/wn/10d@2x.png' },
      63: { desc: 'Moderate Rain',    icon: 'https://openweathermap.org/img/wn/10d@2x.png' },
      65: { desc: 'Heavy Rain',       icon: 'https://openweathermap.org/img/wn/10d@2x.png' },
      71: { desc: 'Slight Snow',      icon: 'https://openweathermap.org/img/wn/13d@2x.png' },
      80: { desc: 'Rain Showers',     icon: 'https://openweathermap.org/img/wn/09d@2x.png' },
      95: { desc: 'Thunderstorm',     icon: 'https://openweathermap.org/img/wn/11d@2x.png' },
    };
    return map[code] || { desc: 'Variable', icon: 'https://openweathermap.org/img/wn/03d@2x.png' };
  }

  /* 
     9. ITINERARY BUILDER (planner.html)
    */
  if ($('#daysContainer').length) {
    // Auth check for planner page
    if (!isLoggedIn()) {
      window.location.href = 'index.html';
      return;
    }
    initItineraryBuilder();
  }

  function initItineraryBuilder() {
    let dayCount = 0;
    let totalActivities = 0;
    let currentDayTarget = null;

    /* ---- Itinerary Picker Modal on page load ---- */
    const quickAdd    = JSON.parse(localStorage.getItem('wanderlust_quick_add') || '[]');
    const hasQuickAdd = quickAdd.length > 0;

    // If arriving from "Add to Itinerary" flow (quick-add present), skip picker
    if (!hasQuickAdd) {
      // Try to load itineraries from DB first, fallback to localStorage
      $.get('itinerary.php', { action: 'load' })
        .done(function (res) {
          if (res && res.success && res.itineraries && res.itineraries.length) {
            const dbList = res.itineraries.map(function (row) {
              var parsed = {};
              try { parsed = JSON.parse(row.data || '{}'); } catch(e) {}
              return {
                id:       row.id,
                tripInfo: parsed.tripInfo || { dest: row.title, startDate: row.start_date, endDate: row.end_date },
                days:     parsed.days     || [],
                savedAt:  row.updated_at,
                fromDB:   true,
              };
            });
            // Merge: DB entries override localStorage entries with same destination
            var localList = getSavedItineraries().filter(function (loc) {
              return !dbList.some(function (db) {
                return db.tripInfo.dest === (loc.tripInfo && loc.tripInfo.dest);
              });
            });
            showItineraryPicker(dbList.concat(localList));
          } else {
            showItineraryPicker(getSavedItineraries());
          }
        })
        .fail(function () {
          showItineraryPicker(getSavedItineraries());
        });
    } else {
      loadTripSummary();
      startBuilderWithData();
    }

    function showItineraryPicker(itineraries) {
      if (itineraries.length > 0) {
        $('#previousItinerariesSection').show();
        let html = '';
        itineraries.forEach((it, i) => {
          const days  = it.days ? it.days.length : 0;
          const acts  = it.days ? it.days.reduce((a, d) => a + (d.activities ? d.activities.length : 0), 0) : 0;
          const date  = it.tripInfo && it.tripInfo.startDate ? it.tripInfo.startDate : '';
          const dest  = it.tripInfo && it.tripInfo.dest ? it.tripInfo.dest : 'Trip ' + (i + 1);
          const dbId  = it.id || '';
          const dbBadge = it.fromDB ? '<span style="font-size:0.7rem;color:#10b981;margin-left:4px;"><i class="fas fa-cloud"></i> synced</span>' : '';
          html += `
            <div class="picker-prev-item" data-index="${i}">
              <div class="ppi-icon"><i class="fas fa-map"></i></div>
              <div class="ppi-info">
                <strong>${dest}</strong>${dbBadge}
                <small>${days} day${days !== 1 ? 's' : ''} · ${acts} activit${acts !== 1 ? 'ies' : 'y'}${date ? ' · From ' + date : ''}</small>
              </div>
              <div class="ppi-actions">
                <button class="btn-primary ppi-load-btn" style="font-size:0.78rem;padding:0.35rem 0.8rem;" data-index="${i}">
                  <i class="fas fa-folder-open"></i> Open
                </button>
                <button class="ppi-delete-btn" data-index="${i}" data-dbid="${dbId}" title="Delete"><i class="fas fa-trash"></i></button>
              </div>
            </div>`;
        });
        $('#previousItinerariesList').html(html);
      } else {
        $('#pickerNoSaved').show();
      }
      $('#itineraryPickerModal').addClass('open');
    }

    /* ---- Picker: Start New ---- */
    $('#pickerStartNew').on('click', function () {
      localStorage.removeItem('wanderlust_itinerary');
      localStorage.removeItem('wanderlust_trip');
      $('#itineraryPickerModal').removeClass('open');
      loadTripSummary();
      addDay();
      updateStats();
    });

    /* ---- Picker: Close (keep existing) ---- */
    $('#closePickerModal').on('click', function () {
      $('#itineraryPickerModal').removeClass('open');
      loadTripSummary();
      startBuilderWithData();
    });

    /* ---- Picker: Load a saved itinerary ---- */
    $(document).on('click', '.ppi-load-btn', function () {
      const idx = parseInt($(this).data('index'));
      const itineraries = getSavedItineraries();
      const it = itineraries[idx];
      if (!it) return;
      // Restore trip info
      if (it.tripInfo) localStorage.setItem('wanderlust_trip', JSON.stringify(it.tripInfo));
      // Restore days
      if (it.days) localStorage.setItem('wanderlust_itinerary', JSON.stringify(it.days));
      $('#itineraryPickerModal').removeClass('open');
      // Reset builder state
      dayCount = 0; totalActivities = 0;
      $('#daysContainer').empty();
      loadTripSummary();
      startBuilderWithData();
    });

    /* ---- Picker: Delete a saved itinerary ---- */
    $(document).on('click', '.ppi-delete-btn', function (e) {
      e.stopPropagation();
      const idx   = parseInt($(this).data('index'));
      const dbId  = $(this).data('dbid');  // present if loaded from DB
      const $item = $(this).closest('.picker-prev-item');

      // Delete from DB if it came from the server
      if (dbId) {
        $.post('itinerary.php', { action: 'delete', id: dbId });
      }

      // Delete from localStorage list
      const itineraries = getSavedItineraries();
      // Find by dest name matching the item title
      const itemDest = $item.find('strong').text().trim();
      const localIdx = itineraries.findIndex(it => (it.tripInfo && it.tripInfo.dest) === itemDest);
      if (localIdx >= 0) {
        itineraries.splice(localIdx, 1);
        localStorage.setItem('wanderlust_all_itineraries', JSON.stringify(itineraries));
      }

      $item.fadeOut(250, function () {
        $(this).remove();
        if (!$('.picker-prev-item').length) {
          $('#previousItinerariesSection').hide();
          $('#pickerNoSaved').show();
        }
      });
    });

    /* ---- Helper: get all saved itineraries ---- */
    function getSavedItineraries() {
      try { return JSON.parse(localStorage.getItem('wanderlust_all_itineraries') || '[]'); }
      catch { return []; }
    }

    /* ---- Load trip summary into sidebar ---- */
    function loadTripSummary() {
      const savedTrip = JSON.parse(localStorage.getItem('wanderlust_trip') || '{}');
      if (savedTrip.dest)       { $('#summaryDest').val(savedTrip.dest); $('#itineraryTitle').text('My Trip to ' + savedTrip.dest); }
      if (savedTrip.startDate)  $('#summaryStart').val(savedTrip.startDate);
      if (savedTrip.endDate)    $('#summaryEnd').val(savedTrip.endDate);
      if (savedTrip.travelers)  { $('#sbTravelers').text(savedTrip.travelers); }
    }

    /* ---- Start builder: load saved days + quick-add items ---- */
    function startBuilderWithData() {
      const saved    = JSON.parse(localStorage.getItem('wanderlust_itinerary') || '[]');
      const quickAdd = JSON.parse(localStorage.getItem('wanderlust_quick_add') || '[]');

      if (saved.length) {
        saved.forEach(day => addDay(day.label, day.activities || []));
      } else {
        addDay();
      }

      // Inject quick-add activities into Day 1
      if (quickAdd.length) {
        quickAdd.forEach(act => addActivityToDay(1, act));
        totalActivities += quickAdd.length;
        localStorage.removeItem('wanderlust_quick_add');
        showToast('✅ Activity added to Day 1 of your itinerary!');
      }

      updateStats();
    }

    $('#addDayBtn').on('click', function () {
      addDay();
    });

    function addDay(label, activities) {
      dayCount++;
      const dayLabel = label || `Day ${dayCount}`;
      const $day = $(`
        <div class="day-block" id="day-${dayCount}" data-day="${dayCount}">
          <div class="day-header">
            <div class="day-label">
              <i class="fas fa-sun"></i>
              <span>${dayLabel}</span>
            </div>
            <div class="day-actions">
              <button class="day-action-btn add-activity-btn" data-day="${dayCount}">
                <i class="fas fa-plus"></i> Add Activity
              </button>
              <button class="day-action-btn danger remove-day-btn" data-day="${dayCount}">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </div>
          <div class="activities-list" id="activities-${dayCount}">
            <div class="no-activities">No activities yet. Click "Add Activity" to begin!</div>
          </div>
        </div>
      `);

      $('#daysContainer').append($day);
      $day.hide().slideDown(350);

      if (activities && activities.length) {
        activities.forEach(act => {
          addActivityToDay(dayCount, act);
        });
      }
      updateStats();
    }

    $(document).on('click', '.remove-day-btn', function () {
      const dayId = $(this).data('day');
      const $block = $(`#day-${dayId}`);
      const actCount = $block.find('.activity-item').length;
      totalActivities -= actCount;
      $block.slideUp(300, function () { $(this).remove(); updateStats(); });
    });

    $(document).on('click', '.add-activity-btn', function () {
      currentDayTarget = $(this).data('day');
      $('#actName, #actNotes, #actCost').val('');
      $('#actTime').val('09:00');
      $('#actCategory').val('sightseeing');
      openModal();
    });

    function openModal() {
      $('#activityModal').addClass('open');
      setTimeout(() => $('#actName').focus(), 200);
    }
    function closeModal() {
      $('#activityModal').removeClass('open');
      currentDayTarget = null;
    }

    $('#closeModal, #cancelModal').on('click', closeModal);
    $('#activityModal').on('click', function (e) {
      if ($(e.target).is('#activityModal')) closeModal();
    });

    $('#confirmAddActivity').on('click', function () {
      const name = $('#actName').val().trim();
      if (!name) {
        $('#actName').css('border-color', '#ef4444');
        $('#actName').on('input', function () { $(this).css('border-color', ''); });
        return;
      }
      const act = {
        name,
        time:     $('#actTime').val(),
        category: $('#actCategory').val(),
        notes:    $('#actNotes').val().trim(),
        cost:     parseFloat($('#actCost').val()) || 0,
      };
      addActivityToDay(currentDayTarget, act);
      totalActivities++;
      updateStats();
      closeModal();
    });

    function addActivityToDay(dayId, act) {
      const $list = $(`#activities-${dayId}`);
      $list.find('.no-activities').remove();

      const icons = {
        sightseeing: '🏛', food: '🍽', adventure: '🧗',
        shopping: '🛍', transport: '🚌', hotel: '🏨',
        culture: '🎭', other: '📌',
      };
      const icon = icons[act.category] || '📌';
      const timeStr = act.time ? `<span><i class="fas fa-clock"></i> ${act.time}</span>` : '';
      const costStr = act.cost ? `<span class="act-cost"><i class="fas fa-dollar-sign"></i> $${act.cost}</span>` : '';
      const notesStr = act.notes ? `<div class="act-notes">${act.notes}</div>` : '';

      const $item = $(`
        <div class="activity-item">
          <div class="act-icon">${icon}</div>
          <div class="act-body">
            <div class="act-name">${act.name}</div>
            <div class="act-meta">${timeStr} ${costStr}</div>
            ${notesStr}
          </div>
          <button class="act-delete"><i class="fas fa-times"></i></button>
        </div>
      `);

      $list.append($item);
      $item.hide().fadeIn(350);
    }

    $(document).on('click', '.act-delete', function () {
      const $item = $(this).closest('.activity-item');
      $item.fadeOut(250, function () {
        $(this).remove();
        totalActivities = Math.max(0, totalActivities - 1);
        const $list = $item.closest('.activities-list');
        if (!$list.find('.activity-item').length) {
          $list.append('<div class="no-activities">No activities yet. Click "Add Activity" to begin!</div>');
        }
        updateStats();
      });
    });

    let sbTravelers = parseInt($('#sbTravelers').text()) || 2;
    $('#incSb').on('click', function () {
      sbTravelers = Math.min(sbTravelers + 1, 20);
      $('#sbTravelers').text(sbTravelers);
    });
    $('#decSb').on('click', function () {
      sbTravelers = Math.max(sbTravelers - 1, 1);
      $('#sbTravelers').text(sbTravelers);
    });

    function updateStats() {
      const days = $('#daysContainer .day-block').length;
      const acts = $('#daysContainer .activity-item').length;
      $('#totalDays').text(days + (days === 1 ? ' day' : ' days'));
      $('#totalActivities').text(acts + (acts === 1 ? ' activity' : ' activities'));

      if (days === 0) {
        $('#emptyState').show();
      } else {
        $('#emptyState').hide();
      }

      const dest = $('#summaryDest').val().trim();
      if (dest) {
        $('#itineraryTitle').text('My Trip to ' + dest);
      }
    }

    $('#summaryDest').on('input', updateStats);

    $('#saveItineraryBtn').on('click', function () {
      const itinerary = [];
      $('#daysContainer .day-block').each(function () {
        const dayLabel = $(this).find('.day-label span').text();
        const activities = [];
        $(this).find('.activity-item').each(function () {
          const name     = $(this).find('.act-name').text();
          const time     = $(this).find('.act-meta .fa-clock').parent().text().trim();
          const cost     = $(this).find('.act-cost').text().replace('$','').trim();
          const notes    = $(this).find('.act-notes').text().trim();
          const category = $(this).find('.act-icon').text().trim();
          activities.push({ name, time, cost, notes, category });
        });
        itinerary.push({ label: dayLabel, activities });
      });

      const tripInfo = {
        dest:      $('#summaryDest').val(),
        startDate: $('#summaryStart').val(),
        endDate:   $('#summaryEnd').val(),
        travelers: parseInt($('#sbTravelers').text()) || 2,
      };

      // Always save to localStorage as backup
      localStorage.setItem('wanderlust_itinerary', JSON.stringify(itinerary));
      localStorage.setItem('wanderlust_trip', JSON.stringify(tripInfo));

      // Also save to localStorage all-itineraries list (upsert by dest)
      const allItineraries = (() => { try { return JSON.parse(localStorage.getItem('wanderlust_all_itineraries') || '[]'); } catch { return []; } })();
      const dest = tripInfo.dest || 'My Trip';
      const existIdx = allItineraries.findIndex(it => (it.tripInfo && it.tripInfo.dest) === dest);
      const entry = { tripInfo, days: itinerary, savedAt: new Date().toISOString() };
      if (existIdx >= 0) allItineraries[existIdx] = entry;
      else allItineraries.unshift(entry);
      localStorage.setItem('wanderlust_all_itineraries', JSON.stringify(allItineraries.slice(0, 20)));

      const $btn = $('#saveItineraryBtn');

      // --- DATABASE SAVE via itinerary.php ---
      const dbPayload = {
        action:     'save',
        title:      dest,
        data:       JSON.stringify({ tripInfo, days: itinerary }),
        start_date: tripInfo.startDate || '',
        end_date:   tripInfo.endDate   || '',
      };

      $.post('itinerary.php', dbPayload)
        .done(function (res) {
          if (res && res.success) {
            $btn.html('<i class="fas fa-check"></i> Saved!').css('background', 'linear-gradient(135deg,#059669,#10b981)');
            showToast('✅ Itinerary saved to your account!');
          } else {
            // DB failed but localStorage succeeded — still show success
            $btn.html('<i class="fas fa-check"></i> Saved locally!').css('background', 'linear-gradient(135deg,#d97706,#f59e0b)');
            showToast('⚠️ Saved locally. DB: ' + (res && res.message ? res.message : 'Not logged in?'));
          }
        })
        .fail(function () {
          // No PHP backend — localStorage only
          $btn.html('<i class="fas fa-check"></i> Saved locally!').css('background', 'linear-gradient(135deg,#d97706,#f59e0b)');
          showToast('⚠️ Saved to browser (no server connection).');
        })
        .always(function () {
          setTimeout(() => {
            $btn.html('<i class="fas fa-save"></i> Save Itinerary').css('background', '');
          }, 2500);
        });

      $('#saveSuccess').removeClass('hidden').hide().slideDown(300);
      setTimeout(() => $('#saveSuccess').slideUp(300), 3000);
    });

    $('#clearAllBtn').on('click', function () {
      if (!confirm('Clear all days and activities?')) return;
      $('#daysContainer .day-block').each(function () {
        $(this).slideUp(200, function () { $(this).remove(); updateStats(); });
      });
      dayCount = 0;
      totalActivities = 0;
      localStorage.removeItem('wanderlust_itinerary');
      updateStats();
    });

  }

  /* 
     10. SMOOTH SCROLL for in-page anchors
      */
  $(document).on('click', 'a[href^="#"]', function (e) {
    const target = $($(this).attr('href'));
    if (target.length) {
      e.preventDefault();
      $('html, body').animate({ scrollTop: target.offset().top - 70 }, 600);
    }
  });

  /*
     11. INPUT FOCUS MICRO-INTERACTION
     */
  $(document).on('focus', 'input, select, textarea', function () {
    $(this).closest('.form-group').addClass('focused');
  }).on('blur', 'input, select, textarea', function () {
    $(this).closest('.form-group').removeClass('focused');
  });

}); // end $(document).ready