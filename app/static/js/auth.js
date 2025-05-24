/**
 * Authentication JavaScript for Sales Training AI
 * Handles login and signup form validation and submission
 */

document.addEventListener('DOMContentLoaded', function() {
    // Form elements
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    
    // Error display elements
    const loginError = document.getElementById('loginError');
    const signupError = document.getElementById('signupError');
    
    // Password strength elements
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const strengthSegments = document.querySelectorAll('.strength-segment');
    const strengthText = document.getElementById('strengthText');
    
    // ===== Password Strength Checker =====
    if (passwordInput) {
        passwordInput.addEventListener('input', function() {
            if (strengthSegments.length > 0 && strengthText) {
                checkPasswordStrength(this.value);
            }
        });
    }
    
    // ===== Login Form Submission =====
    if (loginForm && loginError) {
        loginForm.addEventListener('submit', async function(e) {
            console.log("Login form submission handler triggered!");
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
                
                // Get CSRF token from the hidden input field
                const csrfTokenInput = loginForm.querySelector('input[name="csrf_token"]');
                const csrfToken = csrfTokenInput ? csrfTokenInput.value : null;

                if (!csrfToken) {
                    showError(loginError, 'CSRF token missing. Please refresh the page.');
                    submitButton.disabled = false;
                    submitButton.innerHTML = 'Log In';
                    return;
                }
                
                // Send login request
                const response = await fetch('/auth/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': csrfToken // Correct header name for Flask-WTF
                    },
                    body: JSON.stringify({
                        email: email,
                        password: password,
                        remember: remember
                    })
                });

                // Reset button state FIRST
                submitButton.disabled = false;
                submitButton.innerHTML = 'Log In';
                
                // Check for specific status codes BEFORE trying to parse JSON
                if (response.status === 429) {
                    const retryAfter = response.headers.get('Retry-After');
                    let message = 'Too many login attempts.';
                    if (retryAfter) {
                        message += ` Please try again in ${retryAfter} seconds.`;
                    } else {
                        message += ' Please wait a few minutes and try again.';
                    }
                    showError(loginError, message);
                } else if (response.status === 500) {
                    // Special handling for 500 errors which might return HTML instead of JSON
                    console.log('Server error occurred (500). Trying debug mode...');
                    showError(loginError, 'Login error. Trying alternative method...');
                    
                    // First, try to get more info by accessing the debug page
                    try {
                        console.log('Opening the debug page in a new tab to help with troubleshooting');
                        window.open('/auth/debug', '_blank');
                    } catch (debugError) {
                        console.error('Could not open debug page:', debugError);
                    }
                    
                    // Then try the simplified login as a fallback
                    try {
                        console.log('Attempting fallback login...');
                        
                        // Try a direct redirect to dashboard
                        if (confirm('Login system is experiencing issues. Click OK to try to go to the dashboard directly.')) {
                            window.location.href = '/training/dashboard';
                            return;
                        } else {
                            showError(loginError, 'Login failed. Please try again later or contact support.');
                        }
                    } catch (simpleError) {
                        console.error('Fallback login also failed:', simpleError);
                        showError(loginError, 'Login system is currently unavailable. Please try again later.');
                    }
                } else if (response.ok) {
                    // Successful login (status 200-299)
                    const data = await response.json(); 
                    window.location.href = data.redirect || '/training/dashboard';
                } else {
                    // Handle other errors (e.g., 400, 401)
                    let errorMessage = 'Login failed. Please try again.';
                    try {
                        // Check content type before trying to parse JSON
                        const contentType = response.headers.get('content-type');
                        if (contentType && contentType.includes('application/json')) {
                            // Server sent JSON response
                            const data = await response.json();
                            errorMessage = data.error || errorMessage;
                            
                            // Add a check account status link if it looks like an account lockout
                            if (errorMessage.includes('Too many login attempts') || 
                                errorMessage.includes('locked') || 
                                response.status === 429) {
                                
                                // Append a check account status link to the error message
                                errorMessage += ' <a href="#" id="checkAccountStatus">Check account status</a>';
                                
                                // Show the error with the link
                                showError(loginError, errorMessage);
                                
                                // Add event listener to the link
                                document.getElementById('checkAccountStatus').addEventListener('click', async function(e) {
                                    e.preventDefault();
                                    await checkAccountLockStatus(email, csrfToken, loginError);
                                });
                                
                                return; // Exit early since we're handling this specially
                            }
                        } else {
                            // Not JSON, might be HTML or text
                            console.warn('Non-JSON error response received');
                            errorMessage = `Login failed with status ${response.status}. Please try again.`;
                        }
                    } catch (jsonError) {
                        // If response wasn't JSON (e.g., error sent HTML)
                        console.error('Failed to parse error response as JSON:', jsonError);
                        errorMessage = `Login failed with status ${response.status}. Please try again.`;
                    }
                    showError(loginError, errorMessage);
                }
            } catch (error) {
                console.error('Login network/fetch error:', error);
                const submitButton = loginForm.querySelector('button[type="submit"]');
                if (submitButton) { // Check if button still exists
                    submitButton.disabled = false;
                    submitButton.innerHTML = 'Log In';
                }
                showError(loginError, 'A network error occurred. Please try again.');
            }
        });
    }
    
    // ===== Signup Form Submission =====
    if (signupForm && signupError) {
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
                        password: password,
                        confirm_password: confirmPassword
                    })
                });
                
                const data = await response.json();
                
                // Reset button state
                submitButton.disabled = false;
                submitButton.innerHTML = originalText;
                
                if (response.ok) {
                    // Redirect to dashboard or other specified location (fallback to /training/dashboard)
                    window.location.href = data.redirect || '/training/dashboard';
                } else {
                    // Show error message using the fetched error element
                    showError(signupError, data.error || 'Account creation failed. Please try again.');
                    
                    // If rate limited
                    if (response.status === 429) {
                        submitButton.disabled = true;
                        startLockoutTimer(submitButton, data.retry_after || 60);
                    }
                }
            } catch (err) {
                console.error('Signup error:', err);
                // Show error message using the fetched error element
                showError(signupError, 'A network error occurred. Please try again.');
                
                // Reset button state
                const submitButton = signupForm.querySelector('button[type="submit"]');
                submitButton.disabled = false;
                submitButton.innerHTML = 'Create Account';
            }
        });
    }
    
    // ===== Forgot Password Form Submission =====
    const forgotPasswordForm = document.getElementById('forgotPasswordForm');
    if (forgotPasswordForm) {
        forgotPasswordForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const emailInput = document.getElementById('email');
            const errorElement = document.getElementById('forgotPasswordError');
            const successElement = document.getElementById('forgotPasswordSuccess'); // Assuming you have an element for success messages
            const submitButton = forgotPasswordForm.querySelector('button[type="submit"]');
            const email = emailInput.value.trim();
            
            // Clear previous messages
            showError(errorElement, '', false); 
            if (successElement) successElement.style.display = 'none';

            if (!email || !isValidEmail(email)) {
                showError(errorElement, 'Please enter a valid email address');
                return;
            }
            
            try {
                const originalText = submitButton.innerHTML;
                submitButton.disabled = true;
                submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
                
                const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');
                
                const response = await fetch('/auth/forgot-password', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-Token': csrfToken
                    },
                    body: JSON.stringify({ email: email })
                });
                
                const data = await response.json();
                
                submitButton.disabled = false;
                submitButton.innerHTML = originalText;

                if (response.ok && data.status === 'success') {
                    // Show success message (even if email doesn't exist for security)
                    if (successElement) {
                        successElement.textContent = data.message;
                        successElement.style.display = 'block';
                    } else {
                        // Fallback if no dedicated success element
                        alert(data.message); 
                    }
                    emailInput.value = ''; // Clear the input
                } else {
                    showError(errorElement, data.message || 'An error occurred. Please try again.');
                }
            } catch (err) {
                console.error('Forgot password error:', err);
                showError(errorElement, 'A network error occurred. Please try again.');
                submitButton.disabled = false;
                submitButton.innerHTML = 'Send Reset Email'; // Reset button text
            }
        });
    }
    
    // ===== Reset Password Form Submission (Add if needed) =====
    // const resetPasswordForm = document.getElementById('resetPasswordForm');
    // if (resetPasswordForm) { ... }

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
     * Display error message in the specified element
     * @param {HTMLElement} errorElement - The element to display the error in
     * @param {string} message - The error message
     * @param {boolean} show - Whether to show or hide the error (defaults to true)
     */
    function showError(errorElement, message, show = true) {
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = show ? 'block' : 'none';
            
            if (show && message) {
                 // Highlight animation
                errorElement.classList.add('shake');
                setTimeout(() => {
                    // Check again in case element was removed
                    if (errorElement) { 
                        errorElement.classList.remove('shake');
                    }
                }, 500);
            }
        } else {
            // Fallback if error element doesn't exist
            if (show && message) {
                console.error("Error element not found. Message:", message);
                alert(message); // Simple alert as fallback
            }
        }
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

    /**
     * Check if an account is locked and when it will be unlocked
     * @param {string} email - The email to check
     * @param {string} csrfToken - CSRF token for the request
     * @param {HTMLElement} errorElement - Element to display status messages
     */
    async function checkAccountLockStatus(email, csrfToken, errorElement) {
        try {
            // Show checking message
            showError(errorElement, '<i class="fas fa-spinner fa-spin"></i> Checking account status...', true);
            
            // Send request to check account status
            const response = await fetch('/auth/check-account-status', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrfToken
                },
                body: JSON.stringify({ email: email })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                if (data.status === 'locked') {
                    // Account is locked, show when it will be unlocked
                    showError(errorElement, 
                        `Your account is temporarily locked. You can try again in ${Math.ceil(data.unlock_time)} seconds.`,
                        true
                    );
                    
                    // Optionally start a countdown timer
                    if (data.unlock_time > 0) {
                        startLockoutTimer(
                            document.querySelector('#loginForm button[type="submit"]'), 
                            Math.ceil(data.unlock_time)
                        );
                    }
                } else {
                    // Account is not locked
                    showError(errorElement, 'Your account is not locked. Please try logging in again.', true);
                }
            } else {
                // Error checking account status
                showError(errorElement, data.error || 'Error checking account status. Please try again later.', true);
            }
        } catch (error) {
            console.error('Error checking account status:', error);
            showError(errorElement, 'A network error occurred while checking account status.', true);
        }
    }
});