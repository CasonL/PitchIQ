/**
 * Landing Page JavaScript for Sales Training AI
 * Handles landing page animations and interactions
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize testimonial carousel
    initTestimonialCarousel();
    
    // Setup smooth scrolling for anchor links
    initSmoothScrolling();
    
    // Add animations to elements when they become visible
    initScrollAnimations();
});

/**
 * Initialize testimonial carousel with auto-rotation
 */
function initTestimonialCarousel() {
    const testimonials = document.querySelectorAll('.testimonial');
    const dots = document.querySelectorAll('.dot');
    const prevButton = document.querySelector('.testimonial-prev');
    const nextButton = document.querySelector('.testimonial-next');
    
    if (testimonials.length === 0) return;
    
    let currentIndex = 0;
    let carouselInterval = null;
    
    // Show the specified testimonial
    function showTestimonial(index) {
        // Hide all testimonials
        testimonials.forEach(testimonial => {
            testimonial.classList.remove('active');
        });
        
        // Show selected testimonial
        testimonials[index].classList.add('active');
        
        // Update dots
        dots.forEach(dot => {
            dot.classList.remove('active');
        });
        dots[index].classList.add('active');
        
        // Update current index
        currentIndex = index;
    }
    
    // Previous button click
    if (prevButton) {
        prevButton.addEventListener('click', () => {
            let newIndex = currentIndex - 1;
            if (newIndex < 0) newIndex = testimonials.length - 1;
            showTestimonial(newIndex);
        });
    }
    
    // Next button click
    if (nextButton) {
        nextButton.addEventListener('click', () => {
            let newIndex = currentIndex + 1;
            if (newIndex >= testimonials.length) newIndex = 0;
            showTestimonial(newIndex);
        });
    }
    
    // Dot navigation
    dots.forEach((dot, index) => {
        dot.addEventListener('click', () => {
            showTestimonial(index);
        });
    });
    
    // Auto-advance carousel
    startCarouselTimer();
    
    // Pause carousel on hover
    const testimonialCarousel = document.querySelector('.testimonial-carousel');
    if (testimonialCarousel) {
        testimonialCarousel.addEventListener('mouseenter', () => {
            clearInterval(carouselInterval);
        });
        
        testimonialCarousel.addEventListener('mouseleave', () => {
            startCarouselTimer();
        });
    }
    
    /**
     * Start the carousel auto-rotation timer
     */
    function startCarouselTimer() {
        // Clear any existing interval
        if (carouselInterval) {
            clearInterval(carouselInterval);
        }
        
        // Set a new interval
        carouselInterval = setInterval(() => {
            let newIndex = currentIndex + 1;
            if (newIndex >= testimonials.length) newIndex = 0;
            showTestimonial(newIndex);
        }, 8000);
    }
}

/**
 * Initialize smooth scrolling for anchor links
 */
function initSmoothScrolling() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            
            if (targetElement) {
                // Calculate header height for offset
                const headerHeight = document.querySelector('.site-header')?.offsetHeight || 0;
                
                window.scrollTo({
                    top: targetElement.offsetTop - headerHeight - 20,
                    behavior: 'smooth'
                });
            }
        });
    });
}

/**
 * Initialize animations triggered by scrolling
 */
function initScrollAnimations() {
    // Elements to animate on scroll
    const animateElements = document.querySelectorAll('.feature-card, .step, .hero-content, .hero-image');
    
    if (animateElements.length === 0) return;
    
    // Check if an element is in viewport
    function isInViewport(element) {
        const rect = element.getBoundingClientRect();
        return (
            rect.top <= (window.innerHeight || document.documentElement.clientHeight) * 0.85 &&
            rect.bottom >= 0
        );
    }
    
    // Add animation class when element is in viewport
    function checkVisibility() {
        animateElements.forEach(element => {
            if (isInViewport(element) && !element.classList.contains('animate-in')) {
                element.classList.add('animate-in');
            }
        });
    }
    
    // Run on scroll
    window.addEventListener('scroll', checkVisibility);
    
    // Run on page load
    checkVisibility();
}