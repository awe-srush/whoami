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
