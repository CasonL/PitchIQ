/**
 * PitchIQ UX Enhancements
 * Modern UX interactions, accessibility improvements, and voice functionality
 */

// Main initialization function
document.addEventListener('DOMContentLoaded', function() {
  // Initialize all UX components
  initEnhancedSidebar();
  initMobileNavigation();
  initToastSystem();
  initAccessibilityFeatures();
  
  // Add skip to content link for keyboard accessibility - REMOVED
  // addSkipToContentLink();

  // Floating Action Button for Roleplay
  const roleplayFab = document.getElementById('roleplayFab');
  if (!roleplayFab) return;

  const roleplayFabBtn = document.getElementById('roleplayFabBtn');
  const roleplayFabText = document.getElementById('roleplayFabText');
  const roleplayFabIcon = document.getElementById('roleplayFabIcon');
  
  // Check if there's an active roleplay session
  function checkActiveRoleplay() {
    console.log("checkActiveRoleplay function called");
    
    // Don't show the button on the roleplay page itself
    if (window.location.pathname === '/training/roleplay') {
      roleplayFab.style.display = 'none';
      console.log("On roleplay page, hiding button");
      return;
    } else {
      roleplayFab.style.display = 'block';
      console.log("Not on roleplay page, showing button");
    }
    
    // Set default action as fallback
    roleplayFabText.textContent = 'New Roleplay';
    roleplayFabIcon.className = 'fas fa-play';
    console.log("Default button set to: New Roleplay");
    roleplayFabBtn.onclick = function() {
      // Direct to React chat app instead of Flask voice-chat
      window.location.href = 'http://localhost:8080/chat';
    };
    
    // If we're on a session summary page, check if it's an inactive session
    if (window.location.pathname.includes('/roleplay/') && window.location.pathname.includes('/summary')) {
      console.log("On summary page, keeping New Roleplay button");
      // We're on a summary page, check if this is determined inactive
      // The button is already set to "New Roleplay" by default above
      return;
    }
    
    // Check if we've marked a conversation as inactive in the session summary page
    if (sessionStorage.getItem('viewing_inactive_conversation') === 'true') {
      console.log('Found inactive conversation flag in sessionStorage, keeping New Roleplay button');
      
      // Clear this flag only if we're navigating away from the summary page
      if (!window.location.pathname.includes('/summary')) {
        console.log('Not on summary page, clearing inactive flag');
        sessionStorage.removeItem('viewing_inactive_conversation');
      }
      
      // Keep the default "New Roleplay" text and action
      return;
    }
    
    // Call API to check for active sessions
    console.log("Calling API to check for active sessions");
    fetch('/training/api/sessions')
      .then(response => {
        if (!response.ok) {
          console.log("API response not OK:", response.status, response.statusText);
          throw new Error('API response was not ok');
        }
        return response.json();
      })
      .then(data => {
        console.log('Sessions API response:', data);
        
        if (data.status === 'success' && Array.isArray(data.sessions)) {
          // Find active sessions
          const activeSession = data.sessions.find(session => session.status === 'active');
          
          if (activeSession) {
            console.log("Found active session:", activeSession.id);
            // Change button to "Resume" if there's an active session
            roleplayFabText.textContent = 'Resume';
            roleplayFabIcon.className = 'fas fa-arrow-right';
            
            // Update button link to the voice chat page
            roleplayFabBtn.onclick = function() {
              window.location.href = `http://localhost:8080/chat`;
            };
          } else {
            console.log("No active sessions found");
          }
        }
      })
      .catch(error => {
        console.error('Error checking active roleplay sessions:', error);
        // Button already set to default behavior
      });
  }
  
  // Initial check
  checkActiveRoleplay();
  
  // Recheck when tab becomes visible again
  document.addEventListener('visibilitychange', function() {
    if (!document.hidden) {
      checkActiveRoleplay();
    }
  });
});

/**
 * Enhanced Sidebar Navigation
 * Improves sidebar behavior with proper touch targets and mobile overlay
 */
function initEnhancedSidebar() {
  const sidebarToggle = document.querySelector('.sidebar-toggle');
  const sidebar = document.querySelector('.sidebar-enhanced');
  const overlay = document.querySelector('.sidebar-overlay');
  const mainContent = document.querySelector('.main-content-with-sidebar');
  
  if (!sidebar) return;
  
  // Create overlay if it doesn't exist
  if (!overlay) {
    const newOverlay = document.createElement('div');
    newOverlay.className = 'sidebar-overlay';
    document.body.appendChild(newOverlay);
  }
  
  // Toggle sidebar on menu button click
  if (sidebarToggle) {
    sidebarToggle.addEventListener('click', function(e) {
      e.preventDefault();
      sidebar.classList.toggle('expanded');
      document.querySelector('.sidebar-overlay').classList.toggle('active');
    });
  }
  
  // Close sidebar when clicking overlay
  document.addEventListener('click', function(e) {
    const overlay = document.querySelector('.sidebar-overlay');
    if (overlay && overlay.contains(e.target)) {
      sidebar.classList.remove('expanded');
      overlay.classList.remove('active');
    }
  });
  
  // Close sidebar on ESC key
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && sidebar.classList.contains('expanded')) {
      sidebar.classList.remove('expanded');
      document.querySelector('.sidebar-overlay').classList.remove('active');
    }
  });
}

/**
 * Mobile Navigation
 * Adds a mobile-optimized bottom navigation for small screens
 */
function initMobileNavigation() {
  // Don't add mobile nav if it already exists
  if (document.querySelector('.mobile-nav')) return;
  
  // Only create mobile nav on small screens
  if (window.innerWidth > 768) return;
  
  const mobileNav = document.createElement('nav');
  mobileNav.className = 'mobile-nav';
  
  // Define navigation items
  const navItems = [
    { icon: 'home', label: 'Home', url: '/training/dashboard', active: window.location.pathname === '/training/dashboard' },
    { icon: 'comments', label: 'Chat', url: 'http://localhost:8080/chat', active: window.location.pathname.startsWith('/chat') },
    { icon: 'user', label: 'Profile', url: '/training/profile', active: window.location.pathname === '/training/profile' },
    { icon: 'cog', label: 'Settings', url: '/auth/settings', active: window.location.pathname === '/auth/settings' }
  ];
  
  // Create navigation items
  navItems.forEach(item => {
    const navItem = document.createElement('a');
    navItem.className = `mobile-nav-item ${item.active ? 'active' : ''}`;
    navItem.href = item.url;
    navItem.innerHTML = `
      <i class="fas fa-${item.icon}"></i>
      <span>${item.label}</span>
    `;
    mobileNav.appendChild(navItem);
  });
  
  // Add to the DOM
  document.body.appendChild(mobileNav);
}

/**
 * Toast Notification System
 * Provides feedback to users through non-disruptive notifications
 */
function initToastSystem() {
  // Create toast container if it doesn't exist
  if (!document.querySelector('.toast-container')) {
    const toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container';
    document.body.appendChild(toastContainer);
  }
}

/**
 * Show a toast notification
 * @param {string} message - Message to display in the toast
 * @param {string} type - Type of toast (success, error, info, warning)
 * @param {number} duration - Duration in ms before auto-closing (default: 3000)
 */
function showToast(message, type = 'info', duration = 3000) {
  const container = document.querySelector('.toast-container');
  if (!container) return null;
  
  // Create toast element
  const toast = document.createElement('div');
  toast.className = `toast-notification ${type}`;
  
  // Set icon based on type
  let icon = 'info-circle';
  if (type === 'success') icon = 'check-circle';
  if (type === 'error') icon = 'exclamation-circle';
  if (type === 'warning') icon = 'exclamation-triangle';
  
  toast.innerHTML = `
    <i class="fas fa-${icon}"></i>
    <span class="toast-message">${message}</span>
    <button class="toast-close" aria-label="Close notification">
      <i class="fas fa-times"></i>
    </button>
  `;
  
  // Add to container
  container.appendChild(toast);
  
  // Add close functionality
  toast.querySelector('.toast-close').addEventListener('click', () => {
    closeToast(toast);
  });
  
  // Auto-remove after duration
  if (duration > 0) {
    setTimeout(() => {
      closeToast(toast);
    }, duration);
  }
  
  return toast;
}

/**
 * Close and remove a toast notification
 * @param {HTMLElement} toast - The toast element to remove
 */
function closeToast(toast) {
  if (!toast) return;
  
  // Add closing animation
  toast.style.opacity = '0';
  toast.style.transform = 'translateX(100%)';
  
  // Remove after animation completes
  setTimeout(() => {
    if (toast.parentNode) {
      toast.parentNode.removeChild(toast);
    }
  }, 300);
}

/**
 * Accessibility Enhancements
 */
function initAccessibilityFeatures() {
  // Add focus visible polyfill for browsers that don't support :focus-visible
  if (!('focusVisible' in document)) {
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Tab') {
        document.body.classList.add('keyboard-navigation');
      }
    });
    
    document.addEventListener('mousedown', function() {
      document.body.classList.remove('keyboard-navigation');
    });
  }
  
  // Ensure all interactive elements have accessible labels
  document.querySelectorAll('button, a').forEach(element => {
    if (!element.getAttribute('aria-label') && !element.textContent.trim()) {
      const icon = element.querySelector('i.fas, i.far, i.fab');
      if (icon) {
        const iconClass = Array.from(icon.classList)
          .find(cls => cls.startsWith('fa-'))
          ?.replace('fa-', '');
          
        if (iconClass) {
          element.setAttribute('aria-label', iconClass.replace('-', ' '));
        }
      }
    }
  });
}

/**
 * Create enhanced loading indicators
 * @param {string} type - Type of skeleton (text, card, avatar, etc)
 * @param {number} count - Number of skeleton items to create
 * @returns {HTMLElement} - Container with skeleton loading items
 */
function createSkeletonLoading(type, count = 1) {
  const container = document.createElement('div');
  container.className = 'skeleton-loading-container';
  
  // Create the specified number of skeletons
  for (let i = 0; i < count; i++) {
    const skeleton = document.createElement('div');
    skeleton.className = 'skeleton-loading';
    
    switch (type) {
      case 'card':
        skeleton.innerHTML = `
          <div class="skeleton-header"></div>
          <div class="skeleton-body">
            <div class="skeleton-line" style="width: 90%"></div>
            <div class="skeleton-line" style="width: 60%"></div>
            <div class="skeleton-line" style="width: 75%"></div>
          </div>
          <div class="skeleton-footer"></div>
        `;
        break;
        
      case 'list':
        skeleton.innerHTML = `
          <div class="skeleton-list-item">
            <div class="skeleton-avatar"></div>
            <div class="skeleton-content">
              <div class="skeleton-line" style="width: 70%"></div>
              <div class="skeleton-line" style="width: 90%"></div>
            </div>
          </div>
        `.repeat(3);
        break;
        
      case 'text':
        skeleton.innerHTML = `
          <div class="skeleton-line" style="width: 100%"></div>
          <div class="skeleton-line" style="width: 90%"></div>
          <div class="skeleton-line" style="width: 80%"></div>
          <div class="skeleton-line" style="width: 85%"></div>
        `;
        break;
        
      case 'image':
        skeleton.innerHTML = `
          <div class="skeleton-image"></div>
        `;
        break;
        
      case 'chat':
        skeleton.innerHTML = `
          <div class="skeleton-message">
            <div class="skeleton-line" style="width: 80%"></div>
            <div class="skeleton-line" style="width: 60%"></div>
            <div class="skeleton-line" style="width: 70%"></div>
          </div>
        `;
        break;
        
      default:
        skeleton.innerHTML = `
          <div class="skeleton-line" style="width: 100%"></div>
          <div class="skeleton-line" style="width: 60%"></div>
        `;
    }
    
    container.appendChild(skeleton);
  }
  
  return container;
}

// Expose functions globally
window.showToast = showToast;
window.createSkeletonLoading = createSkeletonLoading; 