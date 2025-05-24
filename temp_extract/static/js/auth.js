/**
 * Authentication JavaScript for Sales Training AI
 * Handles login and signup form validation and submission
 */

document.addEventListener('DOMContentLoaded', function() {
    // Form elements
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const passwordToggles = document.querySelectorAll('.password-toggle');
    
    // Error display elements
    const loginError = document.getElementById('loginError');
    const signupError = document.getElementById('signupError');
    
    // Password strength elements
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const strengthSegments = document.querySelectorAll('.strength-segment');
    const strengthText = document.getElementById('strengthText');
    
    // ===== Toggle Password Visibility =====
    if (passwordToggles.length > 0) {
        passwordToggles.forEach(toggle => {
            toggle.addEventListener('click', function(e) {
                e.preventDefault(); // Prevent form submission
                const passwordField = this.closest('.input-icon-wrapper').querySelector('input');
                
                // Toggle between password and text type
                const type = passwordField.getAttribute('type') === 'password' ? 'text' : 'password';
                passwordField.setAttribute('type', type);
                
                // Toggle icon
                const icon = this.querySelector('i');
                icon.classList.toggle('fa-eye');
                icon.classList.toggle('fa-eye-slash');
            });
        });
    }
    // ===== Password Strength Checker =====
    if (passwordInput && strengthSegments.length > 0 && strengthText) {
        passwordInput.addEventListener('input', function() {
            checkPasswordStrength(this.value);
        });
    }
    
    // ===== Login Form Submission =====
// In your auth.js
// In auth.js - update the login form submission handler
if (loginForm) {
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Get form data
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const remember = document.querySelector('input[name="remember"]')?.checked || false;
        
        // Basic validation
        if (!email || !password) {
            showError(loginError, 'Please enter both email and password');
            return;
        }
        
        try {
            // Show loading state
            const submitButton = loginForm.querySelector('button[type="submit"]');
            submitButton.disabled = true;
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
            
            // Get CSRF token
            const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');
            
            // Send login request
            const response = await fetch('/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': csrfToken
                },
                body: JSON.stringify({
                    email: email,
                    password: password,
                    remember: remember
                })
            });
            
            const data = await response.json();
            
            // Reset button state
            submitButton.disabled = false;
            submitButton.innerHTML = 'Log In';
            
            if (response.ok) {
                // Redirect to specified location
                window.location.href = data.redirect || '/chat/dashboard';
            } else {
                // Show error message
                showError(loginError, data.error || 'Login failed. Please try again.');
            }
        } catch (error) {
            console.error('Login error:', error);
            const submitButton = loginForm.querySelector('button[type="submit"]');
            submitButton.disabled = false;
            submitButton.innerHTML = 'Log In';
            showError(loginError, 'A network error occurred. Please try again.');
        }
    });
}
    
    // ===== Signup Form Submission =====
    if (signupForm) {
        signupForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Get form data
            const name = document.getElementById('name').value.trim();
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            const agreeCheckbox = document.querySelector('input[name="agree"]');
            
            // Basic validation
            if (!name || !email || !password || !confirmPassword) {
                showError(signupError, 'Please fill out all fields');
                return;
            }
            
            if (!isValidEmail(email)) {
                showError(signupError, 'Please enter a valid email address');
                return;
            }
            
            if (password !== confirmPassword) {
                showError(signupError, 'Passwords do not match');
                return;
            }
            
            if (password.length < 8) {
                showError(signupError, 'Password must be at least 8 characters long');
                return;
            }
            
            if (agreeCheckbox && !agreeCheckbox.checked) {
                showError(signupError, 'You must agree to the Terms of Service and Privacy Policy');
                return;
            }
            
            try {
                // Show loading state
                const submitButton = signupForm.querySelector('button[type="submit"]');
                const originalText = submitButton.innerHTML;
                submitButton.disabled = true;
                submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating account...';
                
                // Get CSRF token
                const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');
                
                // Send registration request
                const response = await fetch('/auth/register', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-Token': csrfToken
                    },
                    body: JSON.stringify({
                        name: name,
                        email: email,
                        password: password
                    })
                });
                
                const data = await response.json();
                
                // Reset button state
                submitButton.disabled = false;
                submitButton.innerHTML = originalText;
                
                if (response.ok) {
                    // Redirect to dashboard or other specified location
                    window.location.href = data.redirect || '/chat/dashboard';
                } else {
                    // Show error message
                    showError(signupError, data.error || 'Account creation failed. Please try again.');
                    
                    // If rate limited
                    if (response.status === 429) {
                        submitButton.disabled = true;
                        startLockoutTimer(submitButton, data.retry_after || 60);
                    }
                }
            } catch (err) {
                console.error('Signup error:', err);
                showError(signupError, 'A network error occurred. Please try again.');
                
                // Reset button state
                const submitButton = signupForm.querySelector('button[type="submit"]');
                submitButton.disabled = false;
                submitButton.innerHTML = 'Create Account';
            }
        });
    }
    
    // ===== Helper Functions =====
    
    /**
     * Check password strength and update UI
     * @param {string} password - Password to check
     */
    function checkPasswordStrength(password) {
        let strength = 0;
        
        // Length check
        if (password.length >= 8) strength += 1;
        if (password.length >= 12) strength += 1;
        
        // Complexity checks
        if (/[A-Z]/.test(password)) strength += 1;
        if (/[a-z]/.test(password)) strength += 1;
        if (/[0-9]/.test(password)) strength += 1;
        if (/[^A-Za-z0-9]/.test(password)) strength += 1;
        
        // Update UI based on strength (0-6 scale)
        let strengthLevel = 'Weak';
        let strengthClass = 'weak';
        
        if (strength >= 5) {
            strengthLevel = 'Strong';
            strengthClass = 'strong';
        } else if (strength >= 3) {
            strengthLevel = 'Medium';
            strengthClass = 'medium';
        }
        
        // Update text
        if (strengthText) {
            strengthText.textContent = strengthLevel;
        }
        
        // Update meter segments
        if (strengthSegments.length > 0) {
            strengthSegments.forEach((segment, index) => {
                segment.className = 'strength-segment';
                
                if (index === 0 && strength >= 1) {
                    segment.classList.add(strength >= 3 ? strengthClass : 'weak');
                } else if (index === 1 && strength >= 3) {
                    segment.classList.add(strength >= 5 ? strengthClass : 'medium');
                } else if (index === 2 && strength >= 5) {
                    segment.classList.add('strong');
                }
            });
        }
    }
    
    /**
     * Show error message with animation
     * @param {HTMLElement} errorElement - Error display element
     * @param {string} message - Error message to display
     */
    function showError(errorElement, message) {
        if (!errorElement) return;
        
        errorElement.textContent = message;
        errorElement.style.display = 'block';
        
        // Highlight animation
        errorElement.classList.add('shake');
        setTimeout(() => {
            errorElement.classList.remove('shake');
        }, 500);
        
        // Scroll to error
        errorElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    
    /**
     * Start lockout timer for login attempts
     * @param {HTMLElement} button - Button to disable
     * @param {number} seconds - Lockout duration in seconds
     */
    function startLockoutTimer(button, seconds) {
        let timeLeft = seconds;
        
        // Update button text
        const originalText = button.textContent;
        button.innerHTML = `Try again in ${timeLeft}s`;
        
        const timer = setInterval(() => {
            timeLeft--;
            
            if (timeLeft <= 0) {
                clearInterval(timer);
                button.disabled = false;
                button.innerHTML = originalText;
                return;
            }
            
            button.innerHTML = `Try again in ${timeLeft}s`;
        }, 1000);
    }
    
    /**
     * Validate email format
     * @param {string} email - Email to validate
     * @returns {boolean} Whether email is valid
     */
    function isValidEmail(email) {
        const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return re.test(String(email).toLowerCase());
    }
});