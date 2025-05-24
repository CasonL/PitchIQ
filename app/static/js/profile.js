/**
 * Sales Training AI - User Profile Management
 * Handles profile updates, settings management, and personalization
 */

document.addEventListener('DOMContentLoaded', function() {
    // Elements
    const profileForm = document.getElementById('profileForm');
    const profilePictureUpload = document.getElementById('profilePictureUpload');
    const profilePreview = document.getElementById('profilePreview');
    const updatePasswordForm = document.getElementById('updatePasswordForm');
    const notificationSettings = document.querySelectorAll('.notification-setting');
    const deleteAccountBtn = document.getElementById('deleteAccountBtn');
    const settingsTabs = document.querySelectorAll('.settings-tab');
    const settingsPanels = document.querySelectorAll('.settings-panel');
    
    // Initialize profile page
    initProfilePage();
    
    // ===== Profile Picture Upload =====
    if (profilePictureUpload && profilePreview) {
        profilePictureUpload.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (!file) return;
            
            // Validate file
            if (!file.type.match('image.*')) {
                showNotification('Please select an image file (JPEG, PNG)', 'error');
                return;
            }
            
            // Size validation (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                showNotification('Image file size should be less than 5MB', 'error');
                return;
            }
            
            // Preview image
            const reader = new FileReader();
            reader.onload = function(e) {
                profilePreview.src = e.target.result;
                profilePreview.classList.add('preview-changed');
            };
            reader.readAsDataURL(file);
        });
    }
    
    // ===== Profile Form Submission =====
    if (profileForm) {
        profileForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Show loading state
            const submitBtn = profileForm.querySelector('button[type="submit"]');
            const originalBtnText = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
            
            try {
                // Create FormData object to handle file upload
                const formData = new FormData(profileForm);
                
                // Add CSRF token
                const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');
                
                // Send update request
                const response = await fetch('/profile/update', {
                    method: 'POST',
                    headers: {
                        'X-CSRF-Token': csrfToken
                    },
                    body: formData
                });
                
                const data = await response.json();
                
                // Reset button state
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnText;
                
                if (response.ok) {
                    showNotification('Profile updated successfully', 'success');
                    
                    // Update profile display if needed
                    if (data.user && data.user.name) {
                        const userNameElements = document.querySelectorAll('.user-name');
                        userNameElements.forEach(el => {
                            el.textContent = data.user.name;
                        });
                    }
                    
                    // Update avatar initial if it exists
                    if (data.user && data.user.name && document.querySelector('.avatar')) {
                        const initials = data.user.name.split(' ')
                            .map(name => name.charAt(0))
                            .join('')
                            .toUpperCase();
                        
                        const avatarElements = document.querySelectorAll('.avatar');
                        avatarElements.forEach(el => {
                            if (!el.querySelector('img')) {
                                el.textContent = initials;
                            }
                        });
                    }
                    
                    // Reset the preview changed state
                    if (profilePreview) {
                        profilePreview.classList.remove('preview-changed');
                    }
                } else {
                    showNotification(data.error || 'Failed to update profile', 'error');
                }
            } catch (error) {
                console.error('Profile update error:', error);
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnText;
                showNotification('An error occurred. Please try again.', 'error');
            }
        });
    }
    
    // ===== Password Update Form =====
    if (updatePasswordForm) {
        updatePasswordForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Get password fields
            const currentPassword = document.getElementById('currentPassword').value;
            const newPassword = document.getElementById('newPassword').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            
            // Validate passwords
            if (!currentPassword || !newPassword || !confirmPassword) {
                showNotification('Please fill all password fields', 'error');
                return;
            }
            
            if (newPassword !== confirmPassword) {
                showNotification('New passwords do not match', 'error');
                return;
            }
            
            if (newPassword.length < 8) {
                showNotification('Password must be at least 8 characters long', 'error');
                return;
            }
            
            // Show loading state
            const submitBtn = updatePasswordForm.querySelector('button[type="submit"]');
            const originalBtnText = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';
            
            try {
                // Get CSRF token
                const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');
                
                // Send update request
                const response = await fetch('/profile/update-password', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-Token': csrfToken
                    },
                    body: JSON.stringify({
                        current_password: currentPassword,
                        new_password: newPassword
                    })
                });
                
                const data = await response.json();
                
                // Reset button state
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnText;
                
                if (response.ok) {
                    showNotification('Password updated successfully', 'success');
                    updatePasswordForm.reset();
                } else {
                    showNotification(data.error || 'Failed to update password', 'error');
                }
            } catch (error) {
                console.error('Password update error:', error);
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnText;
                showNotification('An error occurred. Please try again.', 'error');
            }
        });
    }
    
    // ===== Notification Settings =====
    if (notificationSettings.length > 0) {
        notificationSettings.forEach(setting => {
            setting.addEventListener('change', async function() {
                const settingKey = this.getAttribute('data-setting');
                const settingValue = this.checked;
                
                try {
                    // Get CSRF token
                    const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');
                    
                    // Send update request
                    const response = await fetch('/profile/update-settings', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-CSRF-Token': csrfToken
                        },
                        body: JSON.stringify({
                            setting: settingKey,
                            value: settingValue
                        })
                    });
                    
                    const data = await response.json();
                    
                    if (response.ok) {
                        showNotification('Settings updated', 'success');
                    } else {
                        // Reset toggle to previous state
                        this.checked = !settingValue;
                        showNotification(data.error || 'Failed to update settings', 'error');
                    }
                } catch (error) {
                    console.error('Settings update error:', error);
                    // Reset toggle to previous state
                    this.checked = !settingValue;
                    showNotification('An error occurred. Please try again.', 'error');
                }
            });
        });
    }
    
    // ===== Delete Account =====
    if (deleteAccountBtn) {
        deleteAccountBtn.addEventListener('click', function() {
            // Show confirmation modal
            const modal = document.createElement('div');
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-background"></div>
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Delete Account</h3>
                        <button class="modal-close">&times;</button>
                    </div>
                    <div class="modal-body">
                        <p>Are you sure you want to delete your account? This action cannot be undone.</p>
                        <p class="text-error">All your data, conversations, and progress will be permanently lost.</p>
                        
                        <div class="confirmation-input">
                            <label for="confirmationText">Type "DELETE" to confirm:</label>
                            <input type="text" id="confirmationText" placeholder="DELETE">
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-outline modal-cancel">Cancel</button>
                        <button class="btn btn-error" id="confirmDeleteBtn" disabled>Delete Account</button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            document.body.classList.add('modal-open');
            
            // Add event listeners
            const confirmationInput = document.getElementById('confirmationText');
            const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
            const modalCloseBtn = modal.querySelector('.modal-close');
            const modalCancelBtn = modal.querySelector('.modal-cancel');
            const modalBackground = modal.querySelector('.modal-background');
            
            // Enable/disable delete button based on confirmation text
            if (confirmationInput && confirmDeleteBtn) {
                confirmationInput.addEventListener('input', function() {
                    confirmDeleteBtn.disabled = this.value !== 'DELETE';
                });
            }
            
            // Close modal functions
            const closeModal = () => {
                modal.classList.add('fade-out');
                document.body.classList.remove('modal-open');
                setTimeout(() => {
                    document.body.removeChild(modal);
                }, 300);
            };
            
            if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeModal);
            if (modalCancelBtn) modalCancelBtn.addEventListener('click', closeModal);
            if (modalBackground) modalBackground.addEventListener('click', closeModal);
            
            // Handle delete confirmation
            if (confirmDeleteBtn) {
                confirmDeleteBtn.addEventListener('click', async function() {
                    this.disabled = true;
                    this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
                    
                    try {
                        // Get CSRF token
                        const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');
                        
                        // Send delete request
                        const response = await fetch('/profile/delete-account', {
                            method: 'POST',
                            headers: {
                                'X-CSRF-Token': csrfToken
                            }
                        });
                        
                        if (response.ok) {
                            // Show success message and redirect to homepage
                            closeModal();
                            showNotification('Account deleted successfully', 'success');
                            setTimeout(() => {
                                window.location.href = '/';
                            }, 1500);
                        } else {
                            const data = await response.json();
                            this.disabled = false;
                            this.innerHTML = 'Delete Account';
                            showNotification(data.error || 'Failed to delete account', 'error');
                        }
                    } catch (error) {
                        console.error('Account deletion error:', error);
                        this.disabled = false;
                        this.innerHTML = 'Delete Account';
                        showNotification('An error occurred. Please try again.', 'error');
                    }
                });
            }
            
            // Focus on confirmation input
            if (confirmationInput) {
                setTimeout(() => {
                    confirmationInput.focus();
                }, 300);
            }
            
            // Add animation
            setTimeout(() => {
                modal.classList.add('active');
            }, 10);
        });
    }
    
    // ===== Settings Tabs =====
    if (settingsTabs.length > 0 && settingsPanels.length > 0) {
        settingsTabs.forEach(tab => {
            tab.addEventListener('click', function() {
                const target = this.getAttribute('data-target');
                
                // Update active tab
                settingsTabs.forEach(t => t.classList.remove('active'));
                this.classList.add('active');
                
                // Show target panel
                settingsPanels.forEach(panel => {
                    panel.classList.remove('active');
                    if (panel.id === target) {
                        panel.classList.add('active');
                    }
                });
                
                // Update URL hash
                history.replaceState(null, null, `#${target}`);
            });
        });
        
        // Check for hash in URL
        const hash = window.location.hash.substring(1);
        if (hash) {
            const targetTab = document.querySelector(`.settings-tab[data-target="${hash}"]`);
            if (targetTab) {
                targetTab.click();
            }
        }
    }
    
    /**
     * Initialize profile page elements and state
     */
    function initProfilePage() {
        // Show appropriate settings panel based on URL hash
        const hash = window.location.hash.substring(1);
        if (hash && settingsTabs.length > 0) {
            const targetTab = document.querySelector(`.settings-tab[data-target="${hash}"]`);
            if (targetTab) {
                targetTab.click();
            } else {
                // Default to first tab
                settingsTabs[0].click();
            }
        } else if (settingsTabs.length > 0) {
            // Default to first tab
            settingsTabs[0].click();
        }
        
        // Initialize any tooltips
        const tooltips = document.querySelectorAll('[data-tooltip]');
        tooltips.forEach(tooltip => {
            tooltip.addEventListener('mouseenter', function() {
                const text = this.getAttribute('data-tooltip');
                const tooltipElement = document.createElement('div');
                tooltipElement.className = 'tooltip';
                tooltipElement.textContent = text;
                
                document.body.appendChild(tooltipElement);
                
                const rect = this.getBoundingClientRect();
                tooltipElement.style.top = `${rect.top - tooltipElement.offsetHeight - 10}px`;
                tooltipElement.style.left = `${rect.left + (rect.width / 2) - (tooltipElement.offsetWidth / 2)}px`;
                
                setTimeout(() => {
                    tooltipElement.classList.add('visible');
                }, 10);
                
                this.addEventListener('mouseleave', function onMouseLeave() {
                    tooltipElement.classList.remove('visible');
                    setTimeout(() => {
                        if (tooltipElement.parentNode) {
                            document.body.removeChild(tooltipElement);
                        }
                    }, 300);
                    this.removeEventListener('mouseleave', onMouseLeave);
                });
            });
        });
    }
    
    /**
     * Display notification message
     * @param {string} message - Message to display
     * @param {string} type - Message type (success, error, info)
     */
    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
                <span>${message}</span>
            </div>
            <button class="notification-close">&times;</button>
        `;
        
        document.body.appendChild(notification);
        
        // Position notification
        notification.style.bottom = '20px';
        notification.style.right = '20px';
        
        // Add animation
        setTimeout(() => {
            notification.classList.add('visible');
        }, 10);
        
        // Add event listener to close button
        const closeBtn = notification.querySelector('.notification-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                removeNotification(notification);
            });
        }
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            removeNotification(notification);
        }, 5000);
    }
    
    /**
     * Remove notification with animation
     * @param {HTMLElement} notification - Notification element to remove
     */
    function removeNotification(notification) {
        notification.classList.remove('visible');
        setTimeout(() => {
            if (notification.parentNode) {
                document.body.removeChild(notification);
            }
        }, 300);
    }
});