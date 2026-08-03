// ===== Covanreach Media — site interactivity =====

document.getElementById('year').textContent = new Date().getFullYear();

// Sticky header shrink/darken on scroll
const header = document.getElementById('siteHeader');
const onScroll = () => {
  header.classList.toggle('scrolled', window.scrollY > 20);
};
onScroll();
window.addEventListener('scroll', onScroll, { passive: true });

// Mobile nav toggle
const navToggle = document.getElementById('navToggle');
const navMobile = document.getElementById('navMobile');
navToggle.addEventListener('click', () => {
  const isOpen = navMobile.classList.toggle('open');
  navToggle.classList.toggle('open', isOpen);
  navToggle.setAttribute('aria-expanded', String(isOpen));
});
navMobile.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    navMobile.classList.remove('open');
    navToggle.classList.remove('open');
    navToggle.setAttribute('aria-expanded', 'false');
  });
});

// Scroll-reveal animations
const revealEls = document.querySelectorAll('.reveal');
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.15 });
revealEls.forEach(el => revealObserver.observe(el));

// Contact form — AJAX submit to Formspree (only present on the homepage)
const form = document.getElementById('contactForm');
if (form) {
  const status = document.getElementById('formStatus');
  const submitBtn = form.querySelector('.form-submit');
  const submitBtnText = submitBtn.querySelector('.btn-text');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    status.textContent = '';
    status.className = 'form-status';

    submitBtn.disabled = true;
    submitBtnText.textContent = 'Sending...';

    try {
      const response = await fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { 'Accept': 'application/json' }
      });

      if (response.ok) {
        form.reset();
        status.textContent = "Thanks! Your message has been sent — we'll be in touch within one business day.";
        status.classList.add('success');
      } else {
        const data = await response.json().catch(() => null);
        const msg = data && data.errors && data.errors.length
          ? data.errors.map(err => err.message).join(', ')
          : 'Something went wrong sending your message. Please try again or email us directly.';
        status.textContent = msg;
        status.classList.add('error');
      }
    } catch (err) {
      status.textContent = 'Network error — please check your connection and try again.';
      status.classList.add('error');
    } finally {
      submitBtn.disabled = false;
      submitBtnText.textContent = 'Send Message';
    }
  });
}
