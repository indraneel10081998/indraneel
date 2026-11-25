(() => {
  'use strict';

  /* ========================================================================
     1. STICKY HEADER SCROLL STATE
     ======================================================================== */
  const siteHeader = document.getElementById('site-header');
  const heroSection = document.getElementById('home');

  if (siteHeader && heroSection) {
    const headerObserver = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        siteHeader.classList.toggle('is-scrolled', !entry.isIntersecting);
      },
      { rootMargin: '-80px 0px 0px 0px', threshold: 0 }
    );
    headerObserver.observe(heroSection);
  }

  /* ========================================================================
     1B. SMOOTH IN-PAGE ANCHOR SCROLLING (avoids CSS scroll-behavior fighting ScrollTrigger)
     ======================================================================== */
  const prefersNoReducedMotion = window.matchMedia('(prefers-reduced-motion: no-preference)').matches;

  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', (e) => {
      const id = anchor.getAttribute('href');
      if (!id || id === '#') return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      const top = Math.max(0, target.getBoundingClientRect().top + window.scrollY - 85);
      window.scrollTo({
        top,
        behavior: prefersNoReducedMotion ? 'smooth' : 'auto'
      });
      if (history.replaceState) {
        history.replaceState(null, '', id);
      }
    });
  });

  /* ========================================================================
     2. FULL-SCREEN NAVIGATION DIALOG (native <dialog> + showModal)
     ======================================================================== */
  const navDialog = document.getElementById('nav-dialog');
  const navOpenBtn = document.getElementById('nav-open');
  const navCloseBtn = document.getElementById('nav-close');

  if (navDialog && navOpenBtn && navCloseBtn) {
    const openMenu = () => {
      navDialog.showModal();
      navOpenBtn.setAttribute('aria-expanded', 'true');
    };

    const closeMenu = () => {
      navDialog.close();
      navOpenBtn.setAttribute('aria-expanded', 'false');
    };

    navOpenBtn.addEventListener('click', openMenu);
    navCloseBtn.addEventListener('click', closeMenu);

    navDialog.querySelectorAll('.nav-close-link').forEach((link) => {
      link.addEventListener('click', () => {
        closeMenu();
      });
    });

    navDialog.addEventListener('close', () => {
      navOpenBtn.setAttribute('aria-expanded', 'false');
    });
  }

  /* ========================================================================
     3. PRODUCT DETAILS MODAL (<dialog>)
     ======================================================================== */
  const PROJECTS = {
    tnm: {
      title: 'Tuitions Near Me (TNM) - Private Tutor Marketplace',
      category: '/ Next.js App Router · Live',
      image: 'assets/art-tnm.jpg',
      imageAvif: 'assets/art-tnm.avif',
      alt: 'Tuitions Near Me - Live Private Home and Online Tutor Marketplace in Next.js',
      url: 'https://tuitionsnearme.in/home',
      tags: ['Next.js (App Router)', 'React', 'TypeScript', 'Tailwind CSS', 'PWA', 'JSON-LD SEO']
    }
  };

  const projectModal = document.getElementById('project-modal');
  const modalBody = projectModal?.querySelector('.project-modal__body');
  const modalCloseBtn = document.getElementById('modal-close');
  const modalTitle = document.getElementById('modal-project-title');
  const modalCat = document.getElementById('modal-project-cat');
  const modalAvif = document.getElementById('modal-project-avif');
  const modalImg = document.getElementById('modal-project-img');
  const modalAttribution = document.getElementById('modal-project-attribution');
  const modalNote = document.getElementById('modal-project-note');
  const modalTags = document.getElementById('modal-project-tags');
  const modalLink = document.getElementById('modal-project-link');

  if (projectModal && modalCloseBtn) {
    document.querySelectorAll('[data-project]').forEach((card) => {
      card.addEventListener('click', () => {
        const key = card.getAttribute('data-project');
        const data = PROJECTS[key];
        if (!data) return;

        modalTitle.textContent = data.title;
        modalCat.textContent = data.category;
        if (modalAvif && data.imageAvif) modalAvif.srcset = data.imageAvif;
        modalImg.src = data.image;
        modalImg.alt = data.alt;
        modalLink.href = data.url;

        if (modalAttribution && modalNote && data.delivery) {
          const nodes = [document.createTextNode(data.delivery.prefix)];
          if (data.delivery.linkLabel && data.delivery.href) {
            const link = document.createElement('a');
            link.href = data.delivery.href;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            link.textContent = `${data.delivery.linkLabel} ↗`;
            nodes.push(link);
            if (data.delivery.suffix) {
              nodes.push(document.createTextNode(data.delivery.suffix));
            }
          }
          modalNote.replaceChildren(...nodes);
          modalAttribution.hidden = false;
        } else if (modalAttribution && modalNote) {
          modalNote.replaceChildren();
          modalAttribution.hidden = true;
        }

        modalTags.replaceChildren(
          ...data.tags.map((tag) => {
            const span = document.createElement('span');
            span.className = 'tag-chip';
            span.textContent = tag;
            return span;
          })
        );

        projectModal.showModal();
        if (modalBody) modalBody.scrollTop = 0;
      });
    });

    modalCloseBtn.addEventListener('click', () => projectModal.close());

    if (!('closedBy' in HTMLDialogElement.prototype)) {
      const outside = (e) => {
        const r = projectModal.getBoundingClientRect();
        return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
      };
      let pressedOutside = false;
      projectModal.addEventListener('pointerdown', (e) => {
        pressedOutside = outside(e);
      });
      projectModal.addEventListener('pointerup', (e) => {
        if (pressedOutside && outside(e)) projectModal.close();
      });
    }
  }

  /* ========================================================================
     4. RESPONSIVE GSAP & SCROLLTRIGGER CHOREOGRAPHY
        Uses gsap.matchMedia() across desktop & mobile while strictly
        honoring prefers-reduced-motion. Falls back to IntersectionObserver
        only if GSAP is unavailable.
     ======================================================================== */
  if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger);
    ScrollTrigger.config({ ignoreMobileResize: true });

    // Cache target counter values once so viewport resizes never reset counters to 0+
    const metricCounters = [...document.querySelectorAll('.metric-card__num')].map((el) => {
      const match = el.textContent.trim().match(/^(\d+)(.*)$/);
      return match
        ? { el, target: parseInt(match[1], 10), suffix: match[2] || '' }
        : null;
    }).filter(Boolean);

    /**
     * Registers a directional reversible ScrollTrigger:
     * - Scrolling DOWN in (onEnter): plays forward entry from bottom.
     * - Reverse scrolling UP out bottom (onLeaveBack): visibly plays reverse exit downward.
     * - Scrolling DOWN out top (onLeave): plays upward exit near top edge.
     * - Reverse scrolling UP in top (onEnterBack): plays reverse downward entry from top.
     */
    const createReversibleTrigger = ({
      triggerEl,
      start = 'top 86%',
      end = 'bottom 8%',
      visibleFraction = 0.86,
      snapShown,
      snapBelow,
      snapAbove,
      playFromBottom,
      reverseToBottom,
      reverseToTop,
      playFromTop
    }) => {
      if (!triggerEl) return;

      const getPosition = () => {
        const r = triggerEl.getBoundingClientRect();
        if (r.top > window.innerHeight * visibleFraction) return 'below';
        if (r.bottom < window.innerHeight * 0.08) return 'above';
        return 'shown';
      };

      let zone = getPosition();
      if (zone === 'shown') {
        snapShown();
      } else if (zone === 'above') {
        snapAbove();
      } else {
        snapBelow();
      }

      ScrollTrigger.create({
        trigger: triggerEl,
        start,
        end,
        onEnter: () => {
          if (zone === 'shown') return;
          if (zone === 'above') snapBelow();
          zone = 'shown';
          playFromBottom();
        },
        onLeaveBack: () => {
          if (zone === 'below') return;
          zone = 'below';
          reverseToBottom();
        },
        onLeave: () => {
          if (zone === 'above') return;
          zone = 'above';
          reverseToTop();
        },
        onEnterBack: () => {
          if (zone === 'shown') return;
          if (zone === 'below') snapAbove();
          zone = 'shown';
          playFromTop();
        },
        onRefresh: () => {
          const current = getPosition();
          if (current === 'shown' && zone !== 'shown') {
            zone = 'shown';
            snapShown();
          }
        }
      });
    };

    /**
     * Reveals an element or stagger list on forward scroll and plays its
     * directional reverse animation when reverse-scrolling in either direction.
     */
    const revealOnEnter = (targets, { trigger, x = 0, y = 28, scale = 1, duration = 0.68, stagger = 0, start = 'top 86%', end = 'bottom 8%', visibleFraction = 0.86, initialOpacity = 0 } = {}) => {
      const els = gsap.utils.toArray(targets);
      const triggerEl = typeof trigger === 'string' ? document.querySelector(trigger) : (trigger || els[0]);
      if (!els.length || !triggerEl) return;

      const reverseStagger = stagger ? { each: stagger, from: 'end' } : 0;

      createReversibleTrigger({
        triggerEl,
        start,
        end,
        visibleFraction,
        snapShown: () => {
          gsap.killTweensOf(els);
          gsap.set(els, { opacity: 1, x: 0, y: 0, scale: 1, clearProps: 'transform' });
        },
        snapBelow: () => {
          gsap.killTweensOf(els);
          gsap.set(els, { opacity: initialOpacity, x, y, scale });
        },
        snapAbove: () => {
          gsap.killTweensOf(els);
          gsap.set(els, { opacity: initialOpacity, x: -x, y: -y, scale });
        },
        playFromBottom: () => {
          gsap.killTweensOf(els);
          gsap.to(els, {
            opacity: 1,
            x: 0,
            y: 0,
            scale: 1,
            duration,
            stagger,
            ease: 'power3.out',
            clearProps: 'transform'
          });
        },
        reverseToBottom: () => {
          gsap.killTweensOf(els);
          gsap.to(els, {
            opacity: initialOpacity,
            x,
            y,
            scale,
            duration: Math.max(0.32, duration * 0.6),
            stagger: reverseStagger,
            ease: 'power2.in'
          });
        },
        reverseToTop: () => {
          gsap.killTweensOf(els);
          gsap.to(els, {
            opacity: initialOpacity,
            x: -x,
            y: -y,
            scale,
            duration: Math.max(0.32, duration * 0.58),
            stagger,
            ease: 'power2.in'
          });
        },
        playFromTop: () => {
          gsap.killTweensOf(els);
          gsap.to(els, {
            opacity: 1,
            x: 0,
            y: 0,
            scale: 1,
            duration,
            stagger: reverseStagger,
            ease: 'power3.out',
            clearProps: 'transform'
          });
        }
      });
    };

    /**
     * Splits a display heading at <br> boundaries into .word-line blocks and
     * wraps each word token into .word-mask > .word-inner without extra line breaks.
     */
    const splitHeadingIntoWords = (headingEl) => {
      if (!headingEl) return [];
      if (headingEl.dataset.wordSplit === '1') {
        return gsap.utils.toArray(headingEl.querySelectorAll('.word-inner'));
      }

      const lines = [[]];
      Array.from(headingEl.childNodes).forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'BR') {
          lines.push([]);
        } else {
          lines[lines.length - 1].push(node);
        }
      });

      const accessibleText = lines
        .map((nodes) => nodes.map((n) => n.textContent || '').join('').replace(/\s+/g, ' ').trim())
        .filter(Boolean)
        .join(' ');
      if (accessibleText && !headingEl.hasAttribute('aria-label')) {
        headingEl.setAttribute('aria-label', accessibleText);
      }

      const frag = document.createDocumentFragment();
      const wordInners = [];

      const appendTokens = (container, text, isMuted) => {
        text.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) {
            if (container.childNodes.length > 0 && container.lastChild.nodeType === Node.TEXT_NODE) {
              return;
            }
            container.appendChild(document.createTextNode(' '));
            return;
          }
          const mask = document.createElement('span');
          mask.className = isMuted ? 'word-mask muted' : 'word-mask';
          mask.setAttribute('aria-hidden', 'true');

          const inner = document.createElement('span');
          inner.className = 'word-inner';
          inner.textContent = part;

          mask.appendChild(inner);
          container.appendChild(mask);
          wordInners.push(inner);
        });
      };

      lines.forEach((nodes) => {
        const lineSpan = document.createElement('span');
        lineSpan.className = 'word-line';

        nodes.forEach((node) => {
          if (node.nodeType === Node.TEXT_NODE) {
            appendTokens(lineSpan, node.textContent, false);
          } else if (node.nodeType === Node.ELEMENT_NODE) {
            appendTokens(lineSpan, node.textContent, node.classList.contains('muted'));
          }
        });

        while (lineSpan.lastChild?.nodeType === Node.TEXT_NODE && /^\s+$/.test(lineSpan.lastChild.textContent)) {
          lineSpan.removeChild(lineSpan.lastChild);
        }
        while (lineSpan.firstChild?.nodeType === Node.TEXT_NODE && /^\s+$/.test(lineSpan.firstChild.textContent)) {
          lineSpan.removeChild(lineSpan.firstChild);
        }

        if (lineSpan.childNodes.length) {
          frag.appendChild(lineSpan);
        }
      });

      headingEl.replaceChildren(frag);
      headingEl.classList.add('word-reveal-heading');
      headingEl.dataset.wordSplit = '1';
      return wordInners;
    };

    let heroPlayed = false;
    const mm = gsap.matchMedia();

    mm.add(
      {
        isDesktop: '(min-width: 900px) and (prefers-reduced-motion: no-preference)',
        isMobile: '(max-width: 899px) and (prefers-reduced-motion: no-preference)'
      },
      (context) => {
        const { isDesktop } = context.conditions;

        // A. Hero entrance timeline (plays once on initial load, keeps LCP elements visible at frame 0)
        if (!heroPlayed && window.scrollY < 160) {
          heroPlayed = true;
          const heroTl = gsap.timeline({ defaults: { ease: 'power3.out' } });
          heroTl
            .from('.hero__watermark', {
              scale: 1.04,
              duration: 0.85,
              clearProps: 'transform'
            })
            .from(
              '.hero__portrait',
              {
                y: isDesktop ? 24 : 14,
                duration: 0.78,
                clearProps: 'transform'
              },
              0.04
            )
            .from(
              '.hero__tagline, .hero__year, .hero__role, .lets-talk-card',
              {
                y: 16,
                duration: 0.62,
                stagger: 0.07,
                clearProps: 'transform'
              },
              0.08
            );
        }

        // B. Desktop hero & section depth parallax scrub
        if (isDesktop) {
          gsap.to('.hero__watermark', {
            y: -55,
            ease: 'none',
            scrollTrigger: {
              trigger: '#home',
              start: 'top top',
              end: 'bottom top',
              scrub: 0.8
            }
          });

          gsap.to('.hero__portrait-wrap', {
            y: 42,
            ease: 'none',
            scrollTrigger: {
              trigger: '#home',
              start: 'top top',
              end: 'bottom top',
              scrub: 0.8
            }
          });

          gsap.to('.about-card-secondary', {
            y: -36,
            ease: 'none',
            scrollTrigger: {
              trigger: '.about-grid',
              start: 'top bottom',
              end: 'bottom top',
              scrub: 0.9
            }
          });

          gsap.utils.toArray('.project-card:not(.product-card)').forEach((card) => {
            const thumb = card.querySelector('.project-card__thumb');
            if (!thumb) return;
            gsap.fromTo(
              thumb,
              { yPercent: -1.5, scale: 1.03 },
              {
                yPercent: 1.5,
                scale: 1.03,
                ease: 'none',
                scrollTrigger: {
                  trigger: card,
                  start: 'top bottom',
                  end: 'bottom top',
                  scrub: 0.8
                }
              }
            );
          });
        }

        // C. Section headers (fade + lift) & C2. All section headings baseline word-reveal
        gsap.utils.toArray('.about-top, .services-header, .products-header, #process .container > .reveal-on-scroll, #career .container > .reveal-on-scroll, .faq-sticky').forEach((headerEl) => {
          revealOnEnter(headerEl, { y: isDesktop ? 34 : 22, duration: 0.75 });
        });

        // C2. Word-reveal on all section display headings (reversible on reverse scroll)
        gsap.utils.toArray('#about-heading, #services-heading, #products-heading, #process-heading, #career-heading, #faq-heading, #contact-heading').forEach((headingEl) => {
          const wordInners = splitHeadingIntoWords(headingEl);
          if (!wordInners.length) return;

          const triggerEl = headingEl.closest('.cta-banner') || headingEl;
          createReversibleTrigger({
            triggerEl,
            start: 'top 86%',
            end: 'bottom 8%',
            snapShown: () => {
              gsap.killTweensOf(wordInners);
              gsap.set(wordInners, { y: 0, clearProps: 'transform' });
            },
            snapBelow: () => {
              gsap.killTweensOf(wordInners);
              gsap.set(wordInners, { y: '112%' });
            },
            snapAbove: () => {
              gsap.killTweensOf(wordInners);
              gsap.set(wordInners, { y: '-112%' });
            },
            playFromBottom: () => {
              gsap.killTweensOf(wordInners);
              gsap.to(wordInners, {
                y: 0,
                duration: 0.72,
                delay: 0.08,
                stagger: 0.05,
                ease: 'power3.out',
                clearProps: 'transform'
              });
            },
            reverseToBottom: () => {
              gsap.killTweensOf(wordInners);
              gsap.to(wordInners, {
                y: '112%',
                duration: 0.42,
                stagger: { each: 0.035, from: 'end' },
                ease: 'power2.in'
              });
            },
            reverseToTop: () => {
              gsap.killTweensOf(wordInners);
              gsap.to(wordInners, {
                y: '-112%',
                duration: 0.42,
                stagger: 0.035,
                ease: 'power2.in'
              });
            },
            playFromTop: () => {
              gsap.killTweensOf(wordInners);
              gsap.to(wordInners, {
                y: 0,
                duration: 0.72,
                stagger: { each: 0.05, from: 'end' },
                ease: 'power3.out',
                clearProps: 'transform'
              });
            }
          });
        });

        // D. About studio imagery, bio & metric cards
        revealOnEnter('.about-card-main, .about-card-secondary', {
          trigger: '.about-visuals',
          y: isDesktop ? 36 : 22,
          stagger: 0.14,
          duration: 0.78
        });

        revealOnEnter('.about-bio', { trigger: '.about-copy', y: 24, duration: 0.72 });

        revealOnEnter('.metric-card', {
          trigger: '.metrics-stack',
          x: isDesktop ? 30 : 0,
          y: isDesktop ? 0 : 22,
          stagger: 0.12,
          duration: 0.65
        });

        // E. Animated metric counters (5+, 55+, 6+) - reverses cleanly on reverse scroll
        const metricsStack = document.querySelector('.metrics-stack');
        if (metricsStack && metricCounters.length) {
          const counterObjs = metricCounters.map(() => ({ val: 0 }));

          const animateCountersTo = (toZero, duration = 0.95) => {
            metricCounters.forEach(({ el, target, suffix }, idx) => {
              const c = counterObjs[idx];
              gsap.killTweensOf(c);
              const goal = toZero ? 0 : target;
              gsap.to(c, {
                val: goal,
                duration,
                ease: toZero ? 'power2.in' : 'power2.out',
                snap: { val: 1 },
                onUpdate: () => {
                  el.textContent = `${Math.round(c.val)}${suffix}`;
                }
              });
            });
          };

          const snapCounters = (toZero) => {
            counterObjs.forEach((c, idx) => {
              gsap.killTweensOf(c);
              c.val = toZero ? 0 : metricCounters[idx].target;
              metricCounters[idx].el.textContent = `${c.val}${metricCounters[idx].suffix}`;
            });
          };

          createReversibleTrigger({
            triggerEl: metricsStack,
            start: 'top 86%',
            end: 'bottom 8%',
            snapShown: () => snapCounters(false),
            snapBelow: () => snapCounters(true),
            snapAbove: () => snapCounters(true),
            playFromBottom: () => animateCountersTo(false, 1.0),
            reverseToBottom: () => animateCountersTo(true, 0.45),
            reverseToTop: () => animateCountersTo(true, 0.45),
            playFromTop: () => animateCountersTo(false, 1.0)
          });
        }

        // F. Services rows & media reveal
        gsap.utils.toArray('.service-row').forEach((row) => {
          revealOnEnter(row, { y: 28, duration: 0.68 });
          const chips = row.querySelectorAll('.tag-chip');
          if (chips.length) {
            revealOnEnter(chips, { trigger: row, y: 10, duration: 0.4, stagger: 0.03 });
          }
          const media = row.querySelector('.service-row__media img');
          if (media) {
            revealOnEnter(media, { trigger: row, y: 14, initialOpacity: 0.75, duration: 0.75 });
          }
        });

        // G. My Product showcase & CTA
        if (isDesktop) {
          const cards = gsap.utils.toArray('.project-card');
          cards.forEach((card) => {
            revealOnEnter(card, { y: 38, duration: 0.74, stagger: 0, start: 'top 88%' });
          });
        } else {
          gsap.utils.toArray('.project-card').forEach((card) => {
            revealOnEnter(card, { y: 26, duration: 0.68 });
          });
        }

        revealOnEnter('.products-actions', { y: 22, duration: 0.65 });

        // H. Engineering Process cards & Grouped Company Experience Ledger
        revealOnEnter('.process-card', {
          trigger: '.process-grid',
          y: 36,
          stagger: isDesktop ? 0.11 : 0.08,
          duration: 0.72
        });

        const codeberryTrack = document.getElementById('codeberry-track');
        const codeberryProgress = document.getElementById('codeberry-progress');
        if (codeberryTrack && codeberryProgress) {
          gsap.fromTo(
            codeberryProgress,
            { scaleY: 0 },
            {
              scaleY: 1,
              ease: 'none',
              scrollTrigger: {
                trigger: codeberryTrack,
                start: 'top 74%',
                end: 'bottom 78%',
                scrub: 0.45
              }
            }
          );
        }

        gsap.utils.toArray('.career-company-col').forEach((col) => {
          revealOnEnter(col, { y: 24, duration: 0.68 });
        });

        gsap.utils.toArray('.career-role-item').forEach((roleItem) => {
          revealOnEnter(roleItem, { y: 22, duration: 0.62 });
          ScrollTrigger.create({
            trigger: roleItem,
            start: 'top 76%',
            end: 'bottom 8%',
            onEnter: () => roleItem.classList.add('is-active'),
            onEnterBack: () => roleItem.classList.add('is-active'),
            onLeave: () => roleItem.classList.remove('is-active'),
            onLeaveBack: () => roleItem.classList.remove('is-active'),
            onRefresh: () => {
              const r = roleItem.getBoundingClientRect();
              const active = r.top <= window.innerHeight * 0.76 && r.bottom >= window.innerHeight * 0.08;
              roleItem.classList.toggle('is-active', active);
            }
          });
        });

        // I. FAQ accordions, CTA banner & footer wordmark
        gsap.utils.toArray('.faq-item').forEach((item) => {
          revealOnEnter(item, { y: 20, duration: 0.55 });
        });

        revealOnEnter('.cta-banner__copy, .cta-banner__actions', { trigger: '.cta-banner', y: 30, stagger: 0.12, duration: 0.78 });
        revealOnEnter('.footer-signature', { y: 40, start: 'top 96%', visibleFraction: 0.96, duration: 0.85 });

        // Guarantee full target numbers and heading words restore cleanly on matchMedia revert
        return () => {
          metricCounters.forEach(({ el, target, suffix }) => {
            el.textContent = `${target}${suffix}`;
          });
          document.querySelectorAll('.word-inner').forEach((el) => {
            el.style.transform = '';
          });
        };
      }
    );

    // Refresh ScrollTrigger positions once layout, fonts, lazy images, or FAQs settle
    let refreshRaf = 0;
    const scheduleScrollRefresh = () => {
      if (refreshRaf) return;
      refreshRaf = requestAnimationFrame(() => {
        refreshRaf = 0;
        ScrollTrigger.refresh();
      });
    };

    window.addEventListener('load', scheduleScrollRefresh);
    document.addEventListener('load', (e) => {
      if (e.target && e.target.tagName === 'IMG') scheduleScrollRefresh();
    }, true);
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(scheduleScrollRefresh);
    }
    if ('ResizeObserver' in window) {
      let lastMainHeight = 0;
      const mainEl = document.querySelector('main');
      if (mainEl) {
        new ResizeObserver((entries) => {
          const h = Math.round(entries[0].contentRect.height);
          if (h && h !== lastMainHeight) {
            lastMainHeight = h;
            scheduleScrollRefresh();
          }
        }).observe(mainEl);
      }
    }
    document.querySelectorAll('.faq-item').forEach((item) => {
      item.addEventListener('toggle', scheduleScrollRefresh);
    });
  } else if (prefersNoReducedMotion) {
    const revealEls = document.querySelectorAll('.reveal-on-scroll');
    revealEls.forEach((el) => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(24px)';
      el.style.transition = 'opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1), transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)';
    });

    const revealObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
          } else {
            entry.target.style.opacity = '0';
            entry.target.style.transform = 'translateY(24px)';
          }
        }
      },
      { threshold: 0.1 }
    );

    revealEls.forEach((el) => revealObserver.observe(el));
  }

  /* ========================================================================
     5. TECH LOGO MARQUEE PAUSE / PLAY CONTROL (WCAG 2.2.2)
     ======================================================================== */
  const techMarquee = document.getElementById('tech-marquee');
  const marqueeToggle = document.getElementById('marquee-toggle');

  if (techMarquee && marqueeToggle) {
    const pauseIcon = marqueeToggle.querySelector('.icon-pause');
    const playIcon = marqueeToggle.querySelector('.icon-play');

    marqueeToggle.addEventListener('click', () => {
      const isPaused = techMarquee.classList.toggle('is-paused');
      marqueeToggle.classList.toggle('is-paused', isPaused);
      if (pauseIcon) pauseIcon.toggleAttribute('hidden', isPaused);
      if (playIcon) playIcon.toggleAttribute('hidden', !isPaused);
      marqueeToggle.setAttribute(
        'aria-label',
        isPaused ? 'Play scrolling tech logos' : 'Pause scrolling tech logos'
      );
    });
  }
})();
