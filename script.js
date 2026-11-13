(() => {
  'use strict';

  const $ = (selector, context = document) => context.querySelector(selector);
  const $$ = (selector, context = document) => [...context.querySelectorAll(selector)];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  // Keep cross-page links to the enquiry and inspiration sections accurately positioned.
  // Wait for the initial page assets so late image/layout shifts do not displace the target.
  window.addEventListener('load', () => {
    const targetHash = decodeURIComponent(window.location.hash || '');
    if (targetHash !== '#enquire' && targetHash !== '#inspiration' && targetHash !== '#enquiry-form-start') return;
    const target = document.getElementById(targetHash.slice(1));
    if (!target) return;
    const align = () => {
      const root = document.documentElement;
      const previous = root.style.scrollBehavior;
      root.style.scrollBehavior = 'auto';
      target.scrollIntoView({ block: 'start', behavior: 'instant' });
      root.style.scrollBehavior = previous;
    };
    requestAnimationFrame(() => requestAnimationFrame(align));
  });
  const header = $('.site-header');
  const menuButton = $('.menu-toggle');
  const mobileNav = $('#mobile-nav');
  let toastTimer;

  function toast(message) {
    const element = $('#toast');
    if (!element) return;
    clearTimeout(toastTimer);
    element.textContent = message;
    element.hidden = false;
    toastTimer = setTimeout(() => { element.hidden = true; }, 4500);
  }

  // The mobile disclosure keeps its hidden and accessibility states in sync.
  function setMenu(open, restoreFocus = false) {
    if (!menuButton || !mobileNav) return;
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    mobileNav.hidden = !open;
    mobileNav.setAttribute('aria-hidden', String(!open));
    document.body.classList.toggle('menu-open', open);
    if (!open && restoreFocus) menuButton.focus();
  }

  if (menuButton && mobileNav) {
    setMenu(false);
    menuButton.addEventListener('click', () => {
      const open = menuButton.getAttribute('aria-expanded') !== 'true';
      setMenu(open);
      if (open) $('a', mobileNav)?.focus();
    });
    $$('a', mobileNav).forEach(link => link.addEventListener('click', () => setMenu(false)));
    document.addEventListener('keydown', event => {
      if (menuButton.getAttribute('aria-expanded') !== 'true') return;
      if (event.key === 'Escape') {
        event.preventDefault();
        setMenu(false, true);
      } else if (event.key === 'Tab') {
        const targets = [menuButton, ...$$('a', mobileNav)];
        const first = targets[0];
        const last = targets[targets.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    });
    document.addEventListener('click', event => {
      if (menuButton.getAttribute('aria-expanded') === 'true' && !header?.contains(event.target)) {
        setMenu(false);
      }
    });
    window.addEventListener('resize', () => {
      if (window.innerWidth > 600) setMenu(false);
    });
  }

  let scrollQueued = false;
  function updateHeader() {
    header?.classList.toggle('scrolled', window.scrollY > 24);
    scrollQueued = false;
  }
  updateHeader();
  window.addEventListener('scroll', () => {
    if (!scrollQueued) {
      scrollQueued = true;
      requestAnimationFrame(updateHeader);
    }
  }, { passive: true });

  // Reveal enhancement never hides content when the observer is unavailable.
  const revealItems = $$('.reveal');
  let revealObserver;
  if ('IntersectionObserver' in window && !reducedMotion.matches) {
    revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.06, rootMargin: '0px 0px 30px 0px' });
    revealItems.forEach(element => revealObserver.observe(element));
  } else {
    revealItems.forEach(element => element.classList.add('is-visible'));
  }
  document.documentElement.classList.add('js');
  const revealAll = () => {
    if (reducedMotion.matches) {
      revealObserver?.disconnect();
      revealItems.forEach(element => element.classList.add('is-visible'));
    }
  };
  if (reducedMotion.addEventListener) reducedMotion.addEventListener('change', revealAll);

  // Gallery filtering and the viewer always use the cards currently displayed.
  const cards = $$('.gallery-item');
  const filterButtons = $$('.filter');
  const filterStatus = $('#filter-status');
  const dialog = $('#lightbox');
  const lightboxImage = $('#lightbox-image');
  const previous = $('.lightbox-prev');
  const next = $('.lightbox-next');
  const closeButton = $('.lightbox-close');
  let gallerySet = [];
  let galleryIndex = 0;
  let galleryOpener;

  function visibleCards() { return cards.filter(card => !card.hidden); }

  filterButtons.forEach(button => {
    button.addEventListener('click', () => {
      const category = button.dataset.filter;
      filterButtons.forEach(other => {
        const selected = other === button;
        other.classList.toggle('active', selected);
        other.setAttribute('aria-pressed', String(selected));
      });
      cards.forEach(card => {
        card.hidden = category !== 'all' && card.dataset.category !== category;
        if (!card.hidden) {
          if (revealObserver && !reducedMotion.matches) revealObserver.observe(card);
          else card.classList.add('is-visible');
        }
      });
      const total = visibleCards().length;
      if (filterStatus) {
        const categoryName = category === 'all' ? 'floral' : category;
        filterStatus.textContent = `Showing ${category === 'all' ? 'all ' : ''}${total} ${categoryName} image${total === 1 ? '' : 's'}.`;
      }
    });
  });

  function renderLightbox() {
    const card = gallerySet[galleryIndex];
    if (!card || !lightboxImage) return;
    lightboxImage.src = card.dataset.image || $('img', card)?.src || '';
    lightboxImage.alt = $('img', card)?.alt || card.dataset.title || 'Floral arrangement by Sophia';
    $('#lightbox-title').textContent = card.dataset.title || 'In bloom';
    $('#lightbox-description').textContent = card.dataset.caption || '';
    $('#lightbox-counter').textContent = `${String(galleryIndex + 1).padStart(2, '0')} / ${String(gallerySet.length).padStart(2, '0')}`;
    previous.disabled = gallerySet.length < 2;
    next.disabled = gallerySet.length < 2;
  }

  function changeImage(direction) {
    if (gallerySet.length < 2) return;
    galleryIndex = (galleryIndex + direction + gallerySet.length) % gallerySet.length;
    renderLightbox();
  }

  function finishLightbox() {
    document.body.classList.remove('lightbox-open');
    dialog?.removeAttribute('data-fallback-open');
    dialog?.removeAttribute('aria-modal');
    if (galleryOpener && !galleryOpener.hidden) galleryOpener.focus({ preventScroll: true });
  }

  function closeLightbox() {
    if (!dialog || (!dialog.open && !dialog.hasAttribute('open'))) return;
    if (typeof dialog.close === 'function') dialog.close();
    else {
      dialog.removeAttribute('open');
      finishLightbox();
    }
  }

  function openLightbox(card) {
    if (!dialog) return;
    gallerySet = visibleCards();
    galleryIndex = gallerySet.indexOf(card);
    if (galleryIndex < 0) return;
    galleryOpener = card;
    renderLightbox();
    if (typeof dialog.showModal === 'function') {
      try { dialog.showModal(); }
      catch {
        dialog.setAttribute('open', '');
        dialog.setAttribute('data-fallback-open', '');
      }
    } else {
      dialog.setAttribute('open', '');
      dialog.setAttribute('data-fallback-open', '');
    }
    dialog.setAttribute('aria-modal', 'true');
    document.body.classList.add('lightbox-open');
    closeButton?.focus({ preventScroll: true });
  }

  cards.forEach(card => card.addEventListener('click', () => openLightbox(card)));
  previous?.addEventListener('click', () => changeImage(-1));
  next?.addEventListener('click', () => changeImage(1));
  closeButton?.addEventListener('click', closeLightbox);
  dialog?.addEventListener('close', finishLightbox);
  dialog?.addEventListener('click', event => {
    if (event.target === dialog) closeLightbox();
  });
  dialog?.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft') { event.preventDefault(); changeImage(-1); }
    if (event.key === 'ArrowRight') { event.preventDefault(); changeImage(1); }
    if (event.key === 'Escape' && dialog.hasAttribute('data-fallback-open')) {
      event.preventDefault();
      closeLightbox();
    }
    if (event.key === 'Tab') {
      const controls = $$('button:not(:disabled), a[href], [tabindex="0"]', dialog)
        .filter(control => control.getClientRects().length);
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault(); last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first?.focus();
      }
    }
  });

  const palettes = {
    romance: {
      name: 'Soft romance',
      image: 'assets/images/editorial-03.jpg',
      alt: 'Pastel garden flowers in a pair of pink vases on an outdoor table',
      description: 'Blush, buttercream, and a little movement. Gentle colour with a garden-grown spirit.',
      colours: ['#e3b6b0', '#eee1bf', '#b7888b', '#9ca28a'],
      colourNames: 'Blush, buttercream, dusty rose and sage'
    },
    party: {
      name: 'Garden party',
      image: 'assets/images/editorial-01.jpg',
      alt: 'A woven basket overflowing with pastel flowers, orange roses and trailing greenery',
      description: 'Peach, pink, and a joyful pop of colour. Abundant flowers with a playful, gathered feeling.',
      colours: ['#edb59e', '#dd8f9b', '#e5a54d', '#8b9a6d'],
      colourNames: 'Peach, rose pink, warm gold and garden green'
    },
    natural: {
      name: 'That’s Amore',
      image: 'assets/images/engagement-02.jpg',
      alt: 'Romantic floral details from the That’s Amore engagement celebration',
      description: 'Deep burgundy, expressive reds and soft ivory with a warm, candlelit romance.',
      colours: ['#621c2c', '#a13c48', '#e9ddcf', '#45232d'],
      colourNames: 'Deep burgundy, rich red, soft ivory and oxblood'
    }
  };
  const paletteTabs = $$('[role="tab"][data-palette]');
  let selectedPalette = 'party';

  function choosePalette(key, focusTab = false) {
    const palette = palettes[key];
    if (!palette) return;
    selectedPalette = key;
    paletteTabs.forEach(tab => {
      const selected = tab.dataset.palette === key;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      if (selected && focusTab) tab.focus();
    });
    const image = $('#palette-image');
    if (image) { image.src = palette.image; image.alt = palette.alt; }
    const panel = $('#palette-panel');
    panel?.setAttribute('aria-labelledby', `tab-${key}`);
    if ($('#palette-name')) $('#palette-name').textContent = palette.name;
    if ($('#palette-description')) $('#palette-description').textContent = palette.description;
    const swatches = $('.swatches');
    if (swatches) {
      swatches.setAttribute('aria-label', palette.colourNames);
      $$('span', swatches).forEach((swatch, index) => swatch.style.setProperty('--swatch', palette.colours[index]));
    }
  }

  paletteTabs.forEach((tab, index) => {
    tab.addEventListener('click', () => choosePalette(tab.dataset.palette));
    tab.addEventListener('keydown', event => {
      let target = index;
      if (event.key === 'ArrowRight') target = (index + 1) % paletteTabs.length;
      else if (event.key === 'ArrowLeft') target = (index - 1 + paletteTabs.length) % paletteTabs.length;
      else if (event.key === 'Home') target = 0;
      else if (event.key === 'End') target = paletteTabs.length - 1;
      else return;
      event.preventDefault();
      choosePalette(paletteTabs[target].dataset.palette, true);
    });
  });

  // Form data remains in these controls and this page's memory only.
  const form = $('#enquiry-form');
  const steps = $$('.form-step');
  const progress = $$('.step-indicator');
  const review = $('#form-review');
  const errorSummary = $('#form-error');
  let currentStep = 1;
  let enquiryEntries = [];
  let isSending = false;

  function showStep(number, focus = true) {
    currentStep = Math.max(1, Math.min(steps.length, number));
    steps.forEach(step => { step.hidden = Number(step.dataset.step) !== currentStep; });
    if (review) review.hidden = true;
    progress.forEach(indicator => {
      const stepNumber = Number(indicator.dataset.step);
      indicator.classList.toggle('current', stepNumber === currentStep);
      indicator.classList.toggle('complete', stepNumber < currentStep);
      if (stepNumber === currentStep) indicator.setAttribute('aria-current', 'step');
      else indicator.removeAttribute('aria-current');
    });
    if (errorSummary) errorSummary.hidden = true;
    if (focus) {
      const legend = $('legend', steps[currentStep - 1]);
      if (legend) { legend.tabIndex = -1; legend.focus(); }
    }
  }

  function clearFieldError(input) {
    const errorId = `${input.id}-error`;
    document.getElementById(errorId)?.remove();
    input.removeAttribute('aria-invalid');
    const describedBy = (input.getAttribute('aria-describedby') || '').split(/\s+/).filter(id => id && id !== errorId);
    if (describedBy.length) input.setAttribute('aria-describedby', describedBy.join(' '));
    else input.removeAttribute('aria-describedby');
  }

  function fieldError(input) {
    const value = input.value.trim();
    if (input.id === 'name' && !value) return 'Please enter your name.';
    if (input.id === 'email') {
      if (!value) return 'Please enter your email address.';
      if (input.validity.typeMismatch || /\s/.test(value)) return 'Please enter a valid email address, such as you@example.com.';
    }
    if (input.id === 'guests' && (input.validity.badInput || (value && (!Number.isInteger(Number(value)) || Number(value) < 1 || Number(value) > 2000)))) {
      return 'Please enter an estimated guest count between 1 and 2,000, or leave it blank.';
    }
    if (input.id === 'event-date' && (input.validity.badInput || (value && !/^\d{4}-\d{2}-\d{2}$/.test(value)))) {
      return 'Please enter a complete event date, or leave it blank if undecided.';
    }
    return '';
  }

  function putFieldError(input, message) {
    clearFieldError(input);
    const error = document.createElement('span');
    error.id = `${input.id}-error`;
    error.className = 'field-error';
    error.textContent = message;
    input.insertAdjacentElement('afterend', error);
    input.setAttribute('aria-invalid', 'true');
    const ids = (input.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
    input.setAttribute('aria-describedby', [...ids, error.id].join(' '));
  }

  function validateStep(number, showErrors = true) {
    const inputs = $$('input, select, textarea', steps[number - 1]);
    const invalid = [];
    inputs.forEach(input => {
      const message = fieldError(input);
      if (message) {
        invalid.push({ input, message });
        if (showErrors) putFieldError(input, message);
      } else if (showErrors) clearFieldError(input);
    });
    return invalid;
  }

  function presentErrors(invalid) {
    if (!invalid.length) return;
    errorSummary.textContent = invalid.length === 1 ? 'Please check the highlighted detail below.' : 'Please check the highlighted details below.';
    errorSummary.hidden = false;
    invalid[0].input.focus();
  }

  if (form) {
    showStep(1, false);
    $$('.next-step', form).forEach(button => button.addEventListener('click', () => {
      const invalid = validateStep(currentStep);
      if (invalid.length) presentErrors(invalid);
      else showStep(currentStep + 1);
    }));
    $$('.form-back', form).forEach(button => button.addEventListener('click', () => showStep(currentStep - 1)));
    $$('.choice-chips button', form).forEach(button => button.addEventListener('click', () => {
      button.setAttribute('aria-pressed', String(button.getAttribute('aria-pressed') !== 'true'));
    }));
    $$('input, select, textarea', form).forEach(input => {
      const onEdit = () => {
        if (input.getAttribute('aria-invalid') === 'true' && !fieldError(input)) clearFieldError(input);
        if (!form.querySelector('[aria-invalid="true"]')) errorSummary.hidden = true;
      };
      input.addEventListener('input', onEdit);
      input.addEventListener('change', onEdit);
    });
  }

  $('.palette-select')?.addEventListener('click', () => {
    const palette = palettes[selectedPalette];
    const mood = $('#mood');
    if (mood) { const colourDirection = { romance: 'Soft pastels', party: 'Bright & colourful', natural: 'Seasonal & organic' }; mood.value = colourDirection[selectedPalette] || 'Still dreaming'; }
    if (review && !review.hidden) showStep(2, false);
    $('#enquire')?.scrollIntoView({ behavior: reducedMotion.matches ? 'auto' : 'smooth', block: 'start' });
    toast(`${palette.name} added to your enquiry. Tell Sophia what you’re imagining.`);
  });

  const value = id => $(`#${id}`)?.value.trim() || '';
  function occasionDate() {
    const raw = value('event-date');
    if (!raw) return 'To be decided';
    const parsed = new Date(`${raw}T12:00:00`);
    return Number.isNaN(parsed.getTime()) ? raw : parsed.toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  function prepareReview() {
    const chosenFlowers = $$('.choice-chips button[aria-pressed="true"]').map(button => button.dataset.need);
    const entries = [
      ['Occasion', value('occasion')],
      ['Event date', occasionDate()],
      ['Venue or location', value('venue') || 'To be decided'],
      ['Guest count', value('guests') || 'To be discussed'],
      ['Flowers', chosenFlowers.join(', ') || 'To be discussed'],
      ['Floral budget', value('budget') || 'To be discussed'],
      ['Colour direction', value('mood')],
      ['Colours and ideas', value('ideas') || 'To be explored together'],
      ['Inspiration link', value('inspiration-link') || 'Not provided'],
      ['Name', value('name')],
      ['Email', value('email')],
      ['Phone', value('phone') || 'Not provided'],
      ['A little more', value('message') || 'Nothing else for now']
    ];
    const summary = $('#enquiry-summary');
    summary.replaceChildren();
    entries.forEach(([label, text]) => {
      const pair = document.createElement('div');
      const term = document.createElement('dt');
      const description = document.createElement('dd');
      term.textContent = label;
      description.textContent = text;
      pair.append(term, description);
      summary.append(pair);
    });
    enquiryEntries = entries;
    $('#copy-status').textContent = '';
    steps.forEach(step => { step.hidden = true; });
    progress.forEach(indicator => {
      indicator.classList.remove('current');
      indicator.classList.add('complete');
      indicator.removeAttribute('aria-current');
    });
    errorSummary.hidden = true;
    review.hidden = false;
    review.focus();
  }

  form?.addEventListener('submit', event => {
    event.preventDefault();
    if (currentStep < 3 && review?.hidden) {
      const invalid = validateStep(currentStep);
      if (invalid.length) presentErrors(invalid);
      else showStep(currentStep + 1);
      return;
    }
    for (let number = 1; number <= steps.length; number++) {
      const invalid = validateStep(number);
      if (invalid.length) {
        showStep(number, false);
        presentErrors(invalid);
        return;
      }
    }
    prepareReview();
  });

  $('#edit-enquiry')?.addEventListener('click', () => showStep(3));
  $('#send-enquiry')?.addEventListener('click', async () => {
    if (isSending || !form || !enquiryEntries.length) return;
    isSending = true;
    const button = $('#send-enquiry');
    const status = $('#copy-status');
    button.disabled = true;
    button.textContent = 'Sending…';
    status.textContent = '';
    try {
      const payload = new FormData();
      enquiryEntries.forEach(([label, detail]) => payload.append(label, detail));
      payload.append('_subject', 'New floral enquiry — ' + value('occasion') + ' — ' + value('name'));
      payload.append('_replyto', value('email'));
      payload.append('email', value('email'));
      payload.append('_gotcha', form.querySelector('[name="_gotcha"]')?.value || '');
      const response = await fetch(form.action, { method: 'POST', body: payload, headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error('Submission failed');
      review.replaceChildren();
      review.classList.add('enquiry-success');
      const heading = document.createElement('h3');
      heading.textContent = 'Your enquiry is on its way';
      const message = document.createElement('p');
      message.className = 'review-intro';
      message.textContent = 'We’re so glad you found your way here. We can’t wait to bring your floral vision to life.';
      review.append(heading, message);
      form.reset();
    } catch (error) {
      status.textContent = 'Your enquiry could not be sent. Please try again, or email bysophiafloraldesign@gmail.com directly.';
      button.disabled = false;
      button.textContent = 'Try sending again ↗';
    } finally {
      isSending = false;
    }
  });

  const copyright = $('#copyright-year');
  if (copyright) copyright.textContent = String(new Date().getFullYear());
})();