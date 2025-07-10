// Navbar mobile toggle
const navbarToggle = document.getElementById('navbar-toggle');
const navbarMenu = document.querySelector('.navbar-menu');
navbarToggle.addEventListener('click', () => {
  navbarMenu.classList.toggle('active');
});

// Close navbar menu on link click (mobile)
document.querySelectorAll('.navbar-menu a').forEach(link => {
  link.addEventListener('click', () => {
    navbarMenu.classList.remove('active');
  });
});

// Animated avatars pop-in (already handled by CSS animation-delay)
// Optionally, you can trigger them on scroll for extra effect
function isInViewport(el) {
  const rect = el.getBoundingClientRect();
  return (
    rect.top < window.innerHeight &&
    rect.bottom > 0
  );
}

// Scroll-triggered animations for offer cards and community avatars
function animateOnScroll() {
  document.querySelectorAll('.offer-card').forEach(card => {
    if (isInViewport(card)) {
      card.classList.add('animated');
    }
  });
  document.querySelectorAll('.avatar').forEach(avatar => {
    if (isInViewport(avatar)) {
      avatar.classList.add('animated');
    }
  });
}
window.addEventListener('scroll', animateOnScroll);
window.addEventListener('DOMContentLoaded', animateOnScroll);

// Micro-interactions for buttons
const waveButtons = document.querySelectorAll('.wave-effect');
waveButtons.forEach(btn => {
  btn.addEventListener('mouseenter', function(e) {
    btn.classList.add('wave');
    setTimeout(() => btn.classList.remove('wave'), 600);
  });
});

const pulseButtons = document.querySelectorAll('.pulse-glow');
pulseButtons.forEach(btn => {
  btn.addEventListener('mouseenter', function(e) {
    btn.classList.add('pulse');
    setTimeout(() => btn.classList.remove('pulse'), 600);
  });
});

// Robust auto-scroll for offer cards with dynamic width measurement
function setupOfferCardsScroll() {
  const offerCards = document.querySelector('.offer-cards');
  if (!offerCards) return;
  // Only duplicate if not already duplicated
  if (offerCards.children.length <= 8) {
    offerCards.innerHTML += offerCards.innerHTML;
  }
  // Remove animation class to reset
  offerCards.classList.remove('scrolling');
  // Wait for rendering
  setTimeout(() => {
    let totalWidth = 0;
    for (let i = 0; i < offerCards.children.length / 2; i++) {
      totalWidth += offerCards.children[i].offsetWidth + 32; // 32px gap (2rem)
    }
    // If width is 0, try again (DOM not ready)
    if (totalWidth === 0) {
      setTimeout(setupOfferCardsScroll, 100);
      return;
    }
    offerCards.style.setProperty('--offer-scroll-width', totalWidth + 'px');
    // Set duration based on width (e.g., 60px/sec)
    const duration = totalWidth / 60;
    offerCards.style.setProperty('--offer-scroll-duration', duration + 's');
    // Force reflow and add animation class
    void offerCards.offsetWidth;
    offerCards.classList.add('scrolling');
  }, 100);
}
window.addEventListener('DOMContentLoaded', setupOfferCardsScroll);
window.addEventListener('resize', setupOfferCardsScroll);

// Typewriter effect for offer message with glowing keywords
const offerText = `Discover <span class='glow'>free notes</span>, <span class='glow'>daily challenges</span>, <span class='glow'>PDF resources</span>, <span class='glow'>AI-based learning</span>, <span class='glow'>video resources</span>, <span class='glow'>roadmaps</span>, and more — all designed to help you <span class='glow'>learn smarter</span> and <span class='glow'>grow faster</span>`;
window.addEventListener('DOMContentLoaded', () => {
  document.getElementById('offer-typewriter').innerHTML = offerText;
});

// Smooth scroll for Sign In button in footer
const footerSignInBtn = document.getElementById('footer-signin-btn');
if (footerSignInBtn) {
  footerSignInBtn.addEventListener('click', function(e) {
    e.preventDefault();
    const authSection = document.getElementById('auth-section');
    if (authSection) {
      authSection.scrollIntoView({ behavior: 'smooth' });
    }
  });
}

// Add this to main.js to enable smooth scroll to the chat support section when Contact is clicked

document.addEventListener('DOMContentLoaded', function() {
  // Assign id="contact" to the chat support section if not already present
  var faqSection = document.querySelector('.faq-assistant-section');
  if (faqSection && !faqSection.id) {
    faqSection.id = 'contact';
  }

  // Optional: Smooth scroll for all anchor links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      var targetId = this.getAttribute('href').slice(1);
      var target = document.getElementById(targetId);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
}); 