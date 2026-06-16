const topbar = document.querySelector('.topbar');
const skillsOrbit = document.querySelector('.skills-orbit');

let lastScroll = 0;
window.addEventListener('scroll', () => {
  const current = window.scrollY;
  if (!topbar) return;
  if (current > 120 && current > lastScroll) {
    topbar.classList.add('nav-hidden');
  } else {
    topbar.classList.remove('nav-hidden');
  }
  lastScroll = current;
});

if (skillsOrbit) {
  skillsOrbit.addEventListener('click', () => {
    skillsOrbit.classList.toggle('is-stacked');
    const section = skillsOrbit.closest('.section-card');
    if (section) section.classList.toggle('skills-stacked');
  });
}

const sections = document.querySelectorAll('.section-card');
if (sections.length) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-focused');
        } else {
          entry.target.classList.remove('is-focused');
        }
      });
    },
    { threshold: 0.3 }
  );
  sections.forEach((section) => observer.observe(section));
}


const projectCards = document.querySelectorAll('.project-card.is-link');
projectCards.forEach((card) => {
  card.addEventListener('click', (event) => {
    const target = event.target;
    if (target && target.closest('.link-pill')) return;
    const link = card.getAttribute('data-link');
    if (link) window.location.hash = link;
  });
});


// Work experience timeline cursor
const expTimeline = document.querySelector('.exp-timeline');
const expCursor   = document.querySelector('.exp-cursor');
if (expTimeline && expCursor) {
  function updateExpCursor() {
    const rect   = expTimeline.getBoundingClientRect();
    const height = expTimeline.offsetHeight;
    const progress = Math.max(0, Math.min(1,
      (window.innerHeight * 0.5 - rect.top) / height
    ));
    expCursor.style.top = (progress * height) + 'px';
  }
  window.addEventListener('scroll', updateExpCursor, { passive: true });
  updateExpCursor();
}

const buildWord = document.querySelector('.build-word');
if (buildWord) {
  const target = 'Blogs';
  setTimeout(() => {
    buildWord.classList.add('is-typing');
    let current = buildWord.textContent;
    const backspace = setInterval(() => {
      current = current.slice(0, -1);
      buildWord.textContent = current;
      if (current.length === 0) {
        clearInterval(backspace);
        let typed = '';
        const type = setInterval(() => {
          typed += target[typed.length];
          buildWord.textContent = typed;
          if (typed === target) {
            clearInterval(type);
            buildWord.classList.remove('is-typing');
            const title = buildWord.closest('.build-title');
            if (title) title.setAttribute('aria-label', "Srushti's Blogs");
          }
        }, 100);
      }
    }, 80);
  }, 2200);
}
