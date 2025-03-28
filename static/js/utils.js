/**
 * Sales Training AI - Utility Functions
 * Shared utility functions for common tasks across the application
 */

// Create Utilities singleton
const Utilities = (function() {
    /**
     * Format a date object into a readable string
     * @param {Date|string} date - Date object or ISO string
     * @param {Object} options - Formatting options
     * @returns {string} - Formatted date string
     */
    function formatDate(date, options = {}) {
        // Default options
        const defaultOptions = {
            format: 'medium', // 'short', 'medium', 'long', 'full', or custom format
            includeTime: false,
            timeFormat: '12h', // '12h' or '24h'
            locales: 'en-US'
        };
        
        // Merge options
        const formattingOptions = { ...defaultOptions, ...options };
        
        // Parse date if it's a string
        const dateObj = typeof date === 'string' ? new Date(date) : date;
        
        // Check if date is valid
        if (!(dateObj instanceof Date) || isNaN(dateObj)) {
            console.error('Invalid date provided to formatDate:', date);
            return 'Invalid date';
        }
        
        // Predefined formats
        if (formattingOptions.format === 'short') {
            // MM/DD/YY or DD/MM/YY depending on locale
            return dateObj.toLocaleDateString(formattingOptions.locales, { 
                year: '2-digit', 
                month: 'numeric', 
                day: 'numeric' 
            });
        } else if (formattingOptions.format === 'medium') {
            // Jan 1, 2025
            return dateObj.toLocaleDateString(formattingOptions.locales, { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric' 
            });
        } else if (formattingOptions.format === 'long') {
            // January 1, 2025
            return dateObj.toLocaleDateString(formattingOptions.locales, { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            });
        } else if (formattingOptions.format === 'full') {
            // Wednesday, January 1, 2025
            return dateObj.toLocaleDateString(formattingOptions.locales, { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            });
        }
        
        // Add time if requested
        if (formattingOptions.includeTime) {
            let timeString;
            
            if (formattingOptions.timeFormat === '12h') {
                timeString = dateObj.toLocaleTimeString(formattingOptions.locales, { 
                    hour: 'numeric', 
                    minute: '2-digit', 
                    hour12: true 
                });
            } else {
                timeString = dateObj.toLocaleTimeString(formattingOptions.locales, { 
                    hour: '2-digit', 
                    minute: '2-digit', 
                    hour12: false 
                });
            }
            
            // Get the date part using the specified format
            const datePart = formatDate(dateObj, { 
                ...formattingOptions, 
                includeTime: false 
            });
            
            return `${datePart} at ${timeString}`;
        }
        
        // Return formatted date
        return dateObj.toLocaleDateString(formattingOptions.locales);
    }
    
    /**
     * Format a time duration into a readable string
     * @param {number} seconds - Duration in seconds
     * @param {Object} options - Formatting options
     * @returns {string} - Formatted duration string
     */
    function formatDuration(seconds, options = {}) {
        // Default options
        const defaultOptions = {
            format: 'short', // 'short', 'medium', 'long'
            maxUnits: 2, // Maximum number of units to display
            showZero: false // Whether to show zero values
        };
        
        // Merge options
        const formattingOptions = { ...defaultOptions, ...options };
        
        // Return early for invalid input
        if (isNaN(seconds) || seconds < 0) {
            console.error('Invalid duration provided to formatDuration:', seconds);
            return 'Invalid duration';
        }
        
        // Calculate units
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        
        // Unit labels
        const unitLabels = {
            short: {
                day: 'd',
                hour: 'h',
                minute: 'm',
                second: 's'
            },
            medium: {
                day: ' day',
                hour: ' hr',
                minute: ' min',
                second: ' sec'
            },
            long: {
                day: ' day',
                hour: ' hour',
                minute: ' minute',
                second: ' second'
            }
        };
        
        // Get correct label set
        const labels = unitLabels[formattingOptions.format];
        
        // Add pluralization for medium and long formats
        const pluralize = (count, label) => {
            if (formattingOptions.format === 'short') {
                return label;
            }
            
            return count === 1 ? label : label + 's';
        };
        
        // Build output array
        const parts = [];
        
        if (days > 0 || (days === 0 && formattingOptions.showZero)) {
            parts.push(`${days}${pluralize(days, labels.day)}`);
        }
        
        if (hours > 0 || (hours === 0 && formattingOptions.showZero)) {
            parts.push(`${hours}${pluralize(hours, labels.hour)}`);
        }
        
        if (minutes > 0 || (minutes === 0 && formattingOptions.showZero)) {
            parts.push(`${minutes}${pluralize(minutes, labels.minute)}`);
        }
        
        if (remainingSeconds > 0 || (remainingSeconds === 0 && formattingOptions.showZero)) {
            parts.push(`${remainingSeconds}${pluralize(remainingSeconds, labels.second)}`);
        }
        
        // If we have no parts, show "0 seconds"
        if (parts.length === 0) {
            parts.push(`0${pluralize(0, labels.second)}`);
        }
        
        // Limit to max units
        return parts.slice(0, formattingOptions.maxUnits).join(' ');
    }
    
    /**
     * Format a number with comma separators and decimal precision
     * @param {number} number - Number to format
     * @param {Object} options - Formatting options
     * @returns {string} - Formatted number string
     */
    function formatNumber(number, options = {}) {
        // Default options
        const defaultOptions = {
            decimals: 0,
            decimalSeparator: '.',
            thousandsSeparator: ',',
            prefix: '',
            suffix: ''
        };
        
        // Merge options
        const formattingOptions = { ...defaultOptions, ...options };
        
        // Return early for invalid input
        if (isNaN(number)) {
            console.error('Invalid number provided to formatNumber:', number);
            return 'Invalid number';
        }
        
        // Format the number
        const formatted = number.toFixed(formattingOptions.decimals)
            .replace('.', formattingOptions.decimalSeparator)
            .replace(/\B(?=(\d{3})+(?!\d))/g, formattingOptions.thousandsSeparator);
        
        // Add prefix and suffix
        return `${formattingOptions.prefix}${formatted}${formattingOptions.suffix}`;
    }
    
    /**
     * Format a percentage value
     * @param {number} value - Value to format (0-1 or 0-100)
     * @param {Object} options - Formatting options
     * @returns {string} - Formatted percentage string
     */
    function formatPercentage(value, options = {}) {
        // Default options
        const defaultOptions = {
            decimals: 1,
            alreadyPercentage: false, // If true, value is already 0-100, otherwise 0-1
            includeSymbol: true
        };
        
        // Merge options
        const formattingOptions = { ...defaultOptions, ...options };
        
        // Return early for invalid input
        if (isNaN(value)) {
            console.error('Invalid value provided to formatPercentage:', value);
            return 'Invalid percentage';
        }
        
        // Convert to percentage if needed
        const percentage = formattingOptions.alreadyPercentage ? value : value * 100;
        
        // Format the number
        const formatted = percentage.toFixed(formattingOptions.decimals);
        
        // Add percentage symbol if requested
        return formattingOptions.includeSymbol ? `${formatted}%` : formatted;
    }
    
    /**
     * Truncate text with ellipsis if it exceeds max length
     * @param {string} text - Text to truncate
     * @param {number} maxLength - Maximum length
     * @param {Object} options - Truncation options
     * @returns {string} - Truncated text
     */
    function truncateText(text, maxLength, options = {}) {
        // Default options
        const defaultOptions = {
            ellipsis: '...',
            breakOnWord: true
        };
        
        // Merge options
        const truncationOptions = { ...defaultOptions, ...options };
        
        // Return original text if it's already short enough
        if (!text || text.length <= maxLength) {
            return text;
        }
        
        // Simple truncation if not breaking on word
        if (!truncationOptions.breakOnWord) {
            return text.slice(0, maxLength) + truncationOptions.ellipsis;
        }
        
        // Truncate at word boundary
        let truncated = text.slice(0, maxLength);
        const lastSpaceIndex = truncated.lastIndexOf(' ');
        
        if (lastSpaceIndex > 0) {
            truncated = truncated.slice(0, lastSpaceIndex);
        }
        
        return truncated + truncationOptions.ellipsis;
    }
    
    /**
     * Generate a random ID
     * @param {Object} options - ID generation options
     * @returns {string} - Random ID
     */
    function generateId(options = {}) {
        // Default options
        const defaultOptions = {
            prefix: '',
            length: 8,
            includeTimestamp: false
        };
        
        // Merge options
        const idOptions = { ...defaultOptions, ...options };
        
        // Generate random part
        const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
        let id = '';
        
        for (let i = 0; i < idOptions.length; i++) {
            const randomIndex = Math.floor(Math.random() * characters.length);
            id += characters.charAt(randomIndex);
        }
        
        // Add timestamp if requested
        if (idOptions.includeTimestamp) {
            id = Date.now().toString(36) + id;
        }
        
        // Add prefix if provided
        return idOptions.prefix + id;
    }
    
    /**
     * Debounce a function to prevent multiple rapid calls
     * @param {Function} func - Function to debounce
     * @param {number} wait - Wait time in milliseconds
     * @param {boolean} immediate - Whether to trigger the function immediately
     * @returns {Function} - Debounced function
     */
    function debounce(func, wait = 300, immediate = false) {
        let timeout;
        
        return function executedFunction(...args) {
            const context = this;
            
            const later = function() {
                timeout = null;
                if (!immediate) func.apply(context, args);
            };
            
            const callNow = immediate && !timeout;
            
            clearTimeout(timeout);
            
            timeout = setTimeout(later, wait);
            
            if (callNow) func.apply(context, args);
        };
    }
    
    /**
     * Throttle a function to limit execution rate
     * @param {Function} func - Function to throttle
     * @param {number} limit - Limit time in milliseconds
     * @returns {Function} - Throttled function
     */
    function throttle(func, limit = 300) {
        let inThrottle;
        let lastFunc;
        let lastRan;
        
        return function() {
            const context = this;
            const args = arguments;
            
            if (!inThrottle) {
                func.apply(context, args);
                lastRan = Date.now();
                inThrottle = true;
            } else {
                clearTimeout(lastFunc);
                
                lastFunc = setTimeout(function() {
                    if ((Date.now() - lastRan) >= limit) {
                        func.apply(context, args);
                        lastRan = Date.now();
                    }
                }, limit - (Date.now() - lastRan));
            }
        };
    }
    
    /**
     * Parse URL parameters into an object
     * @param {string} url - URL to parse (default: current URL)
     * @returns {Object} - Object with URL parameters
     */
    function parseUrlParams(url) {
        // Use current URL if not provided
        const urlString = url || window.location.href;
        const searchParams = new URL(urlString).searchParams;
        const params = {};
        
        for (const [key, value] of searchParams.entries()) {
            params[key] = value;
        }
        
        return params;
    }
    
    /**
     * Build a URL with query parameters
     * @param {string} baseUrl - Base URL
     * @param {Object} params - URL parameters
     * @returns {string} - URL with parameters
     */
    function buildUrl(baseUrl, params = {}) {
        const url = new URL(baseUrl, window.location.origin);
        
        // Add parameters
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                url.searchParams.append(key, value);
            }
        });
        
        return url.toString();
    }
    
    /**
     * Create a cookie
     * @param {string} name - Cookie name
     * @param {string} value - Cookie value
     * @param {Object} options - Cookie options
     */
    function setCookie(name, value, options = {}) {
        // Default options
        const defaultOptions = {
            days: 30,
            path: '/',
            secure: true,
            sameSite: 'Lax'
        };
        
        // Merge options
        const cookieOptions = { ...defaultOptions, ...options };
        
        // Set expiration date
        let expires = '';
        if (cookieOptions.days) {
            const date = new Date();
            date.setTime(date.getTime() + (cookieOptions.days * 24 * 60 * 60 * 1000));
            expires = '; expires=' + date.toUTCString();
        }
        
        // Build cookie
        let cookie = name + '=' + encodeURIComponent(value) + expires + '; path=' + cookieOptions.path;
        
        // Add secure flag if needed
        if (cookieOptions.secure) {
            cookie += '; secure';
        }
        
        // Add SameSite attribute
        cookie += '; samesite=' + cookieOptions.sameSite;
        
        // Set the cookie
        document.cookie = cookie;
    }
    
    /**
     * Get a cookie value
     * @param {string} name - Cookie name
     * @returns {string|null} - Cookie value or null if not found
     */
    function getCookie(name) {
        const nameEQ = name + '=';
        const cookies = document.cookie.split(';');
        
        for (let i = 0; i < cookies.length; i++) {
            let cookie = cookies[i];
            
            while (cookie.charAt(0) === ' ') {
                cookie = cookie.substring(1, cookie.length);
            }
            
            if (cookie.indexOf(nameEQ) === 0) {
                return decodeURIComponent(cookie.substring(nameEQ.length, cookie.length));
            }
        }
        
        return null;
    }
    
    /**
     * Delete a cookie
     * @param {string} name - Cookie name
     * @param {Object} options - Cookie options
     */
    function deleteCookie(name, options = {}) {
        // Default options
        const defaultOptions = {
            path: '/'
        };
        
        // Merge options
        const cookieOptions = { ...defaultOptions, ...options };
        
        // Set expiration to past date
        setCookie(name, '', { ...cookieOptions, days: -1 });
    }
    
    /**
     * Show a toast notification
     * @param {string} message - Message to display
     * @param {Object} options - Notification options
     */
    function showToast(message, options = {}) {
        // Default options
        const defaultOptions = {
            type: 'info', // info, success, warning, error
            duration: 5000,
            position: 'bottom-right', // top-left, top-right, bottom-left, bottom-right, top-center, bottom-center
            action: null, // { text: 'Undo', callback: function() {} }
            onClose: null
        };
        
        // Merge options
        const toastOptions = { ...defaultOptions, ...options };
        
        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast toast-${toastOptions.type} toast-${toastOptions.position}`;
        
        // Determine icon based on type
        let iconClass = 'fa-info-circle';
        
        switch (toastOptions.type) {
            case 'success':
                iconClass = 'fa-check-circle';
                break;
            case 'warning':
                iconClass = 'fa-exclamation-triangle';
                break;
            case 'error':
                iconClass = 'fa-exclamation-circle';
                break;
        }
        
        // Create content
        toast.innerHTML = `
            <div class="toast-content">
                <i class="fas ${iconClass}"></i>
                <span>${message}</span>
            </div>
            ${toastOptions.action ? `
                <button class="toast-action">${toastOptions.action.text}</button>
            ` : ''}
            <button class="toast-close">&times;</button>
        `;
        
        // Add to DOM
        document.body.appendChild(toast);
        
        // Add transition after adding to DOM
        setTimeout(() => {
            toast.classList.add('visible');
        }, 10);
        
        // Set up close button
        const closeButton = toast.querySelector('.toast-close');
        if (closeButton) {
            closeButton.addEventListener('click', () => {
                closeToast(toast, toastOptions.onClose);
            });
        }
        
        // Set up action button
        if (toastOptions.action) {
            const actionButton = toast.querySelector('.toast-action');
            if (actionButton) {
                actionButton.addEventListener('click', () => {
                    if (typeof toastOptions.action.callback === 'function') {
                        toastOptions.action.callback();
                    }
                    closeToast(toast, toastOptions.onClose);
                });
            }
        }
        
        // Auto-close after duration
        if (toastOptions.duration > 0) {
            setTimeout(() => {
                if (document.body.contains(toast)) {
                    closeToast(toast, toastOptions.onClose);
                }
            }, toastOptions.duration);
        }
        
        // Helper function to close toast
        function closeToast(toastElement, callback) {
            toastElement.classList.remove('visible');
            
            setTimeout(() => {
                if (document.body.contains(toastElement)) {
                    document.body.removeChild(toastElement);
                    
                    if (typeof callback === 'function') {
                        callback();
                    }
                }
            }, 300);
        }
        
        // Return toast for potential manipulation
        return toast;
    }
    
    /**
     * Validate form fields
     * @param {Object} fields - Object with field values
     * @param {Object} rules - Validation rules
     * @returns {Object} - Validation result
     */
    function validateForm(fields, rules) {
        const errors = {};
        const validFields = {};
        
        // Process each field
        Object.entries(fields).forEach(([fieldName, value]) => {
            // Skip fields without rules
            if (!rules[fieldName]) {
                validFields[fieldName] = value;
                return;
            }
            
            // Process field rules
            const fieldRules = rules[fieldName];
            
            // Check required rule
            if (fieldRules.required && (!value || (typeof value === 'string' && value.trim() === ''))) {
                errors[fieldName] = fieldRules.message || 'This field is required';
                return;
            }
            
            // Check minLength rule
            if (fieldRules.minLength && typeof value === 'string' && value.length < fieldRules.minLength) {
                errors[fieldName] = fieldRules.message || `Minimum length is ${fieldRules.minLength} characters`;
                return;
            }
            
            // Check maxLength rule
            if (fieldRules.maxLength && typeof value === 'string' && value.length > fieldRules.maxLength) {
                errors[fieldName] = fieldRules.message || `Maximum length is ${fieldRules.maxLength} characters`;
                return;
            }
            
            // Check email pattern
            if (fieldRules.email && typeof value === 'string') {
                const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailPattern.test(value)) {
                    errors[fieldName] = fieldRules.message || 'Enter a valid email address';
                    return;
                }
            }
            
            // Check custom pattern
            if (fieldRules.pattern && typeof value === 'string') {
                const pattern = new RegExp(fieldRules.pattern);
                if (!pattern.test(value)) {
                    errors[fieldName] = fieldRules.message || 'Invalid format';
                    return;
                }
            }
            
            // Check match rule (for password confirmation)
            if (fieldRules.match && fields[fieldRules.match] !== value) {
                errors[fieldName] = fieldRules.message || `Must match ${fieldRules.match}`;
                return;
            }
            
            // Check custom validator
            if (fieldRules.validator && typeof fieldRules.validator === 'function') {
                const isValid = fieldRules.validator(value, fields);
                if (!isValid) {
                    errors[fieldName] = fieldRules.message || 'Invalid value';
                    return;
                }
            }
            
            // If passed all rules, add to valid fields
            validFields[fieldName] = value;
        });
        
        return {
            isValid: Object.keys(errors).length === 0,
            errors,
            validFields
        };
    }
    
    // Public API
    return {
        formatDate,
        formatDuration,
        formatNumber,
        formatPercentage,
        truncateText,
        generateId,
        debounce,
        throttle,
        parseUrlParams,
        buildUrl,
        setCookie,
        getCookie,
        deleteCookie,
        showToast,
        validateForm
    };
})();

// Make utilities available globally
window.Utilities = Utilities;