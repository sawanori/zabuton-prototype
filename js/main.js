/**
 * main.js — 株式会社Zabuton サイトプロトタイプ
 * Vanilla JS, no dependencies.
 * Features:
 *   - Nav hamburger / drawer toggle (aria-expanded)
 *   - Service dropdown (keyboard + mouse)
 *   - FAQ accordion (aria-expanded, grid-template-rows animation)
 *   - prefers-reduced-motion respected via CSS
 *   - Escape key closes open menus/drawers
 */

(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // UTILITY
  // ---------------------------------------------------------------------------

  /**
   * Query single element
   * @param {string} selector
   * @param {Element} [context=document]
   */
  function qs(selector, context) {
    return (context || document).querySelector(selector);
  }

  /**
   * Query all elements as Array
   * @param {string} selector
   * @param {Element} [context=document]
   */
  function qsa(selector, context) {
    return Array.from((context || document).querySelectorAll(selector));
  }

  // ---------------------------------------------------------------------------
  // NAV: Hamburger / Drawer (SP)
  // ---------------------------------------------------------------------------

  const navToggle = qs('.nav-toggle');
  const navDrawer = qs('.nav-drawer');
  const navOverlay = qs('.nav-overlay');

  function openDrawer() {
    if (!navDrawer || !navToggle) return;
    navToggle.setAttribute('aria-expanded', 'true');
    navDrawer.classList.add('is-open');
    navDrawer.setAttribute('aria-hidden', 'false');
    if (navOverlay) navOverlay.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    // Move focus to first focusable item in drawer
    const firstFocusable = navDrawer.querySelector('a, button');
    if (firstFocusable) firstFocusable.focus();
  }

  function closeDrawer() {
    if (!navDrawer || !navToggle) return;
    navToggle.setAttribute('aria-expanded', 'false');
    navDrawer.classList.remove('is-open');
    navDrawer.setAttribute('aria-hidden', 'true');
    if (navOverlay) navOverlay.classList.remove('is-open');
    document.body.style.overflow = '';
    navToggle.focus();
  }

  if (navToggle) {
    navToggle.addEventListener('click', function () {
      const isOpen = navToggle.getAttribute('aria-expanded') === 'true';
      if (isOpen) {
        closeDrawer();
      } else {
        openDrawer();
      }
    });
  }

  if (navOverlay) {
    navOverlay.addEventListener('click', closeDrawer);
  }

  // ---------------------------------------------------------------------------
  // NAV: Dropdown (PC)
  // ---------------------------------------------------------------------------

  const dropdownTriggers = qsa('.global-nav__link[aria-haspopup="true"]');

  function closeAllDropdowns(except) {
    dropdownTriggers.forEach(function (trigger) {
      if (trigger === except) return;
      trigger.setAttribute('aria-expanded', 'false');
      const dropdown = qs('#' + trigger.getAttribute('aria-controls'));
      if (dropdown) dropdown.classList.remove('is-open');
    });
  }

  dropdownTriggers.forEach(function (trigger) {
    const dropdownId = trigger.getAttribute('aria-controls');
    const dropdown = qs('#' + dropdownId);
    if (!dropdown) return;

    // Click toggle
    trigger.addEventListener('click', function (e) {
      e.stopPropagation();
      const isOpen = trigger.getAttribute('aria-expanded') === 'true';
      closeAllDropdowns(trigger);
      if (isOpen) {
        trigger.setAttribute('aria-expanded', 'false');
        dropdown.classList.remove('is-open');
      } else {
        trigger.setAttribute('aria-expanded', 'true');
        dropdown.classList.add('is-open');
        // Focus first item
        const firstLink = dropdown.querySelector('a');
        if (firstLink) firstLink.focus();
      }
    });

    // Mouse hover (PC UX improvement)
    const navItem = trigger.closest('.global-nav__item');
    if (navItem) {
      navItem.addEventListener('mouseenter', function () {
        closeAllDropdowns(trigger);
        trigger.setAttribute('aria-expanded', 'true');
        dropdown.classList.add('is-open');
      });
      navItem.addEventListener('mouseleave', function () {
        trigger.setAttribute('aria-expanded', 'false');
        dropdown.classList.remove('is-open');
      });
    }

    // Keyboard: Tab out of dropdown closes it
    dropdown.addEventListener('keydown', function (e) {
      const focusableItems = qsa('a, button', dropdown);
      const lastItem = focusableItems[focusableItems.length - 1];
      if (e.key === 'Tab' && !e.shiftKey && document.activeElement === lastItem) {
        trigger.setAttribute('aria-expanded', 'false');
        dropdown.classList.remove('is-open');
      }
    });
  });

  // Close dropdowns on outside click
  document.addEventListener('click', function () {
    closeAllDropdowns(null);
  });

  // ---------------------------------------------------------------------------
  // NAV: Drawer sub-accordion (services toggle in SP drawer)
  // ---------------------------------------------------------------------------

  const drawerServiceToggle = qs('.nav-drawer__link[aria-haspopup="true"]');
  const drawerServiceSub = drawerServiceToggle
    ? qs('#' + drawerServiceToggle.getAttribute('aria-controls'))
    : null;

  if (drawerServiceToggle && drawerServiceSub) {
    drawerServiceToggle.addEventListener('click', function (e) {
      e.preventDefault();
      const isOpen = drawerServiceToggle.getAttribute('aria-expanded') === 'true';
      drawerServiceToggle.setAttribute('aria-expanded', String(!isOpen));
      drawerServiceSub.hidden = isOpen;
    });
  }

  // ---------------------------------------------------------------------------
  // ESCAPE KEY — close anything open
  // ---------------------------------------------------------------------------

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    // Close drawer
    if (navDrawer && navDrawer.classList.contains('is-open')) {
      closeDrawer();
    }
    // Close all dropdowns
    closeAllDropdowns(null);
  });

  // ---------------------------------------------------------------------------
  // FAQ ACCORDION
  // Uses CSS grid-template-rows trick for smooth animation
  // ---------------------------------------------------------------------------

  const faqItems = qsa('.faq-item');

  faqItems.forEach(function (item) {
    const btn = qs('.faq-item__question', item);
    const answer = qs('.faq-item__answer', item);

    if (!btn || !answer) return;

    btn.addEventListener('click', function () {
      const isOpen = btn.getAttribute('aria-expanded') === 'true';

      // Close all others (single-open accordion)
      faqItems.forEach(function (otherItem) {
        const otherBtn = qs('.faq-item__question', otherItem);
        const otherAnswer = qs('.faq-item__answer', otherItem);
        if (otherBtn && otherAnswer && otherBtn !== btn) {
          otherBtn.setAttribute('aria-expanded', 'false');
          otherAnswer.classList.remove('is-open');
        }
      });

      // Toggle current
      btn.setAttribute('aria-expanded', String(!isOpen));
      if (isOpen) {
        answer.classList.remove('is-open');
      } else {
        answer.classList.add('is-open');
      }
    });
  });

  // ---------------------------------------------------------------------------
  // SP STICKY CTA — T18
  // Reveal .lp-sticky-cta (.is-visible) after the hero scrolls out of view;
  // hide again when near the CTA band / footer to avoid duplicate CTAs.
  // Respects prefers-reduced-motion: CSS guards transition, JS only toggles class.
  //
  // Performance: offsets are cached once in measure(); the scroll/rAF hot path
  // reads ONLY window.scrollY — zero getBoundingClientRect calls on scroll.
  // ---------------------------------------------------------------------------

  var stickyCta = qs('.lp-sticky-cta');

  if (stickyCta) {
    // Reserve padding-bottom so fixed bar never covers last content row (O1)
    document.body.classList.add('has-sticky-cta');

    var heroSection = qs('.lp-hero, .page-hero');
    var ctaBand = qs('.cta-band');
    var siteFooter = qs('.site-footer');

    // Cached page-absolute offsets (set by measure, never touched on scroll)
    var cachedHeroBottom = 0;
    var cachedHideThreshold = Infinity;

    /** Read layout ONCE and store page-absolute Y values. */
    function measure() {
      var scrollY = window.scrollY;
      var viewH = window.innerHeight;

      cachedHeroBottom = 0;
      if (heroSection) {
        var heroRect = heroSection.getBoundingClientRect();
        cachedHeroBottom = scrollY + heroRect.bottom;
      }

      cachedHideThreshold = Infinity;
      if (ctaBand) {
        var ctaRect = ctaBand.getBoundingClientRect();
        cachedHideThreshold = Math.min(
          cachedHideThreshold,
          scrollY + ctaRect.top - viewH * 0.5
        );
      }
      if (siteFooter) {
        var footerRect = siteFooter.getBoundingClientRect();
        cachedHideThreshold = Math.min(
          cachedHideThreshold,
          scrollY + footerRect.top - viewH * 0.3
        );
      }

      // After re-measuring, immediately re-evaluate visibility
      applyStickyCta(window.scrollY);
    }

    /**
     * Pure comparison against cached values — no layout reads.
     * @param {number} scrollY
     */
    function applyStickyCta(scrollY) {
      var pastHero = scrollY > cachedHeroBottom;
      var nearFooterOrCta = scrollY >= cachedHideThreshold;
      var shouldShow = pastHero && !nearFooterOrCta;
      var isVisible = stickyCta.classList.contains('is-visible');
      if (shouldShow && !isVisible) {
        stickyCta.classList.add('is-visible');
      } else if (!shouldShow && isVisible) {
        stickyCta.classList.remove('is-visible');
      }
    }

    // rAF ticking guard — avoids multiple rAF callbacks per frame
    var stickyCtaTicking = false;

    window.addEventListener('scroll', function () {
      if (stickyCtaTicking) return;
      stickyCtaTicking = true;
      requestAnimationFrame(function () {
        applyStickyCta(window.scrollY);
        stickyCtaTicking = false;
      });
    }, { passive: true });

    // Measure on init, after images load, and on viewport change
    measure();
    window.addEventListener('load', measure);

    var resizeTimer;
    function onResize() {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(measure, 150);
    }
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
  }

  // ---------------------------------------------------------------------------
  // HEADER: Add shadow class on scroll
  // ---------------------------------------------------------------------------

  const siteHeader = qs('.site-header');

  if (siteHeader) {
    let headerTicking = false;

    window.addEventListener('scroll', function () {
      if (headerTicking) return;
      headerTicking = true;
      requestAnimationFrame(function () {
        if (window.scrollY > 10) {
          siteHeader.classList.add('is-scrolled');
        } else {
          siteHeader.classList.remove('is-scrolled');
        }
        headerTicking = false;
      });
    }, { passive: true });
  }

  // ---------------------------------------------------------------------------
  // SMOOTH SCROLL for anchor links
  // Respects prefers-reduced-motion (CSS handles scroll-behavior: auto)
  // ---------------------------------------------------------------------------

  qsa('a[href^="#"]').forEach(function (link) {
    link.addEventListener('click', function (e) {
      const target = qs(link.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // Move focus to target for accessibility
      target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
    });
  });

})();
