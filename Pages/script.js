// Basic functionality for the site
document.addEventListener('DOMContentLoaded', function() {
    // Mobile menu toggle
    const navToggle = document.querySelector('.nav-toggle');
    const navMenu = document.querySelector('.nav-menu');

    if (navToggle && navMenu) {
        navToggle.addEventListener('click', function() {
            navMenu.classList.toggle('active');
        });

        // Close mobile menu when clicking a link
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', function() {
                navMenu.classList.remove('active');
            });
        });
    }

    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // FAQ accordion (homepage)
    document.querySelectorAll('[data-accordion]').forEach(accordion => {
        accordion.querySelectorAll('.faq-q').forEach(btn => {
            btn.addEventListener('click', () => {
                const item = btn.closest('.faq-item');
                const panel = item ? item.querySelector('.faq-a') : null;
                const isOpen = item && item.classList.contains('is-open');

                if (!item || !panel) return;
                if (isOpen) {
                    item.classList.remove('is-open');
                    btn.setAttribute('aria-expanded', 'false');
                    panel.hidden = true;
                } else {
                    item.classList.add('is-open');
                    btn.setAttribute('aria-expanded', 'true');
                    panel.hidden = false;
                }
            });
        });
    });

    // Navbar background on scroll
    window.addEventListener('scroll', function() {
        const navbar = document.querySelector('.navbar');
        if (navbar) {
            if (window.scrollY > 50) {
                navbar.style.backgroundColor = 'rgba(15, 15, 35, 0.98)';
            } else {
                navbar.style.backgroundColor = 'rgba(15, 15, 35, 0.95)';
            }
        }
    });

    // Intersection Observer for animations (only for homepage, not documentation)
    if (!document.querySelector('.doc-content')) {
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -100px 0px'
        };

        const observer = new IntersectionObserver(function(entries) {
            entries.forEach((entry, index) => {
                if (entry.isIntersecting) {
                    entry.target.style.animationDelay = `${index * 0.1}s`;
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }
            });
        }, observerOptions);

        // Observe elements for animation (only homepage elements)
        document.querySelectorAll('.feature-card, .requirements-left, .requirements-right, .uc-card, .compare-table, .compare-note, .visual-card, .who-card, .faq-item, .final-cta-card').forEach(el => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(30px)';
            el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
            observer.observe(el);
        });
    }

    // Typing animation for hero title (only on index page)
    const heroTitle = document.querySelector('.hero-text h1');
    if (heroTitle) {
        const originalText = heroTitle.textContent;
        heroTitle.textContent = '';
        let i = 0;

        function typeWriter() {
            if (i < originalText.length) {
                heroTitle.textContent += originalText.charAt(i);
                i++;
                setTimeout(typeWriter, 50);
            }
        }

        // Start typing animation after a short delay
        setTimeout(typeWriter, 500);
    }

    // Parallax effect for hero background (only on index page)
    window.addEventListener('scroll', function() {
        const scrolled = window.pageYOffset;
        const hero = document.querySelector('.hero');
        if (hero) {
            hero.style.backgroundPosition = 'center ' + (scrolled * 0.5) + 'px';
        }
    });

    // Add hover effects for feature cards
    document.querySelectorAll('.feature-card').forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-10px) scale(1.02)';
        });

        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) scale(1)';
        });
    });

    // Update active nav link on scroll
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-link[href^="#"]');

    function updateActiveLink() {
        const scrollY = window.pageYOffset;

        sections.forEach(section => {
            const sectionHeight = section.offsetHeight;
            const sectionTop = section.offsetTop - 100;
            const sectionId = section.getAttribute('id');

            if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
                navLinks.forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('href') === '#' + sectionId) {
                        link.classList.add('active');
                    }
                });
            }
        });
    }

    window.addEventListener('scroll', updateActiveLink);
    updateActiveLink(); // Call once on load

    // Add click tracking for external links
    document.querySelectorAll('a[target="_blank"]').forEach(link => {
        link.addEventListener('click', function() {
            // Could add analytics tracking here
            console.log('External link clicked:', this.href);
        });
    });

    // Smooth scroll for sidebar TOC links (documentation page)
    function smoothScrollTo(target) {
        const element = document.querySelector(target);
        if (element) {
            const headerOffset = 120;
            const elementPosition = element.offsetTop;
            const offsetPosition = elementPosition - headerOffset;

            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });
        }
    }

    // Make sidebar TOC links use smooth scroll
    document.querySelectorAll('.sidebar-toc a').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const target = this.getAttribute('href');
            smoothScrollTo(target);
        });
    });

    // Update active TOC link on scroll
    function updateActiveTocLink() {
        const sections = document.querySelectorAll('.doc-section');
        const tocLinks = document.querySelectorAll('.sidebar-toc a');

        let currentSection = '';

        sections.forEach(section => {
            const sectionTop = section.offsetTop - 100;
            if (window.pageYOffset >= sectionTop) {
                currentSection = section.getAttribute('id');
            }
        });

        tocLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === '#' + currentSection) {
                link.classList.add('active');
            }
        });
    }

    // Initialize sidebar functionality if it exists
    if (document.querySelector('.sidebar-toc')) {
        window.addEventListener('scroll', updateActiveTocLink);
        updateActiveTocLink(); // Call once on load

        // Sidebar toggle functionality
        const sidebarToggle = document.getElementById('sidebarToggle');
        const sidebar = document.querySelector('.sidebar-toc');
        const body = document.body;

        if (sidebarToggle && sidebar) {
            sidebarToggle.addEventListener('click', function() {
                sidebar.classList.toggle('active');
                this.classList.toggle('active');
                body.classList.toggle('sidebar-open');
            });

            // Close sidebar when clicking outside
            document.addEventListener('click', function(e) {
                if (!sidebar.contains(e.target) && !sidebarToggle.contains(e.target) && sidebar.classList.contains('active')) {
                    sidebar.classList.remove('active');
                    sidebarToggle.classList.remove('active');
                    body.classList.remove('sidebar-open');
                }
            });

            // Close sidebar on mobile when clicking a link
            document.querySelectorAll('.sidebar-toc a').forEach(link => {
                link.addEventListener('click', function() {
                    if (window.innerWidth <= 768) {
                        sidebar.classList.remove('active');
                        sidebarToggle.classList.remove('active');
                        body.classList.remove('sidebar-open');
                    }
                });
            });
        }
    }
});
// Smooth scrolling
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });

        // Update active TOC link on scroll
        const sections = document.querySelectorAll('.doc-section');
        const tocLinks = document.querySelectorAll('.sidebar-toc a');

        function updateActiveTocLink() {
            let currentSection = '';
            sections.forEach(section => {
                const sectionTop = section.offsetTop - 150;
                if (window.pageYOffset >= sectionTop) {
                    currentSection = section.getAttribute('id');
                }
            });

            tocLinks.forEach(link => {
                link.classList.remove('active');
                if (link.getAttribute('href') === '#' + currentSection) {
                    link.classList.add('active');
                }
            });
        }

        window.addEventListener('scroll', updateActiveTocLink);
        updateActiveTocLink();

        // Navbar background on scroll
        window.addEventListener('scroll', function() {
            const navbar = document.querySelector('.navbar');
            if (window.scrollY > 50) {
                navbar.style.backgroundColor = 'rgba(15, 15, 35, 0.98)';
            } else {
                navbar.style.backgroundColor = 'rgba(15, 15, 35, 0.95)';
            }
        });

// Preload images for better performance
function preloadImages() {
    const images = [
        // Add any images you want to preload
    ];

    images.forEach(src => {
        const img = new Image();
        img.src = src;
    });
}

/* =========================================================
   FEATURES DROPDOWN – MOBILE TAP
   (ADD ONLY)
========================================================= */

document.querySelectorAll('.nav-features').forEach(link => {
    link.addEventListener('click', e => {
        const parent = link.closest('.has-dropdown');

        // Mobile only
        if (window.innerWidth <= 768 && parent) {
            const dropdown = parent.querySelector('.dropdown');
            const isOpen = dropdown.classList.contains('open');

            e.preventDefault();

            document.querySelectorAll('.dropdown.open')
                .forEach(d => d.classList.remove('open'));

            if (!isOpen) {
                dropdown.classList.add('open');
            }
        }
    });
});

/* Close dropdown on outside click */
document.addEventListener('click', e => {
    if (!e.target.closest('.has-dropdown')) {
        document.querySelectorAll('.dropdown.open')
            .forEach(d => d.classList.remove('open'));
    }
});


// Call preload function
preloadImages();