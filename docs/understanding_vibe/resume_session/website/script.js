// ==========================================
// Vibe Session System - Simplified JavaScript
// ==========================================

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    initNavigation();
    initScrollEffects();
});

// Initialize navigation highlighting based on scroll position
function initNavigation() {
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-links a');
    
    function updateActiveNavLink() {
        let currentSection = '';
        
        sections.forEach(function(section) {
            const sectionTop = section.offsetTop - 100;
            const sectionHeight = section.offsetHeight;
            
            if (window.pageYOffset >= sectionTop && window.pageYOffset < sectionTop + sectionHeight) {
                currentSection = section.getAttribute('id');
            }
        });
        
        navLinks.forEach(function(link) {
            link.classList.remove('active');
            if (link.getAttribute('href') === '#' + currentSection) {
                link.classList.add('active');
            }
        });
    }
    
    // Update on load
    updateActiveNavLink();
    
    // Update on scroll
    window.addEventListener('scroll', function() {
        updateActiveNavLink();
    });
    
    // Smooth scroll for navigation links
    document.querySelectorAll('a[href^="#"]').forEach(function(anchor) {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);
            
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

// Initialize scroll effects
function initScrollEffects() {
    // Elements to animate on scroll
    const animateOnScroll = document.querySelectorAll('.module-card, .feature-item, .principle-card, .stat-big, .command-card');
    
    // Initialize elements as invisible
    animateOnScroll.forEach(function(element) {
        element.style.opacity = '0';
        element.style.transform = 'translateY(20px)';
        element.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    });
    
    // Check if elements are in view
    function checkIfInView() {
        const triggerBottom = window.pageYOffset + window.innerHeight * 0.85;
        
        animateOnScroll.forEach(function(element) {
            const elementTop = element.offsetTop;
            
            if (elementTop < triggerBottom) {
                element.style.opacity = '1';
                element.style.transform = 'translateY(0)';
            }
        });
    }
    
    // Check on load
    checkIfInView();
    
    // Check on scroll
    window.addEventListener('scroll', function() {
        checkIfInView();
    });
}

// Console welcome message
console.log('%c🎉 Bienvenue sur le système de sessions Mistral Vibe', 'color: #5865F2; font-size: 16px; font-weight: bold;');
console.log('%cCe site présente l\'architecture et les fonctionnalités du système de sessions.', 'color: #7F8C8D; font-size: 12px;');
