from flask import render_template, flash, redirect, url_for, current_app, request
from flask_login import login_required, current_user
from . import admin_bp
from app.models import EmailSignup, User, UserProfile # Assuming EmailSignup is in app.models
from app import db # Assuming db is initialized in app/__init__.py

# Helper function to check for admin status
def is_admin():
    # Ensure ADMIN_EMAIL is configured and current_user is authenticated
    admin_email = current_app.config.get('ADMIN_EMAIL')
    if not admin_email:
        current_app.logger.warning("ADMIN_EMAIL not set in configuration.")
        return False
    return current_user.is_authenticated and current_user.email == admin_email

@admin_bp.route('/email-signups') # Changed URL slightly for clarity
@login_required
def view_email_signups():
    if not is_admin():
        flash('You do not have permission to access this page.', 'danger')
        # Redirect to a general page, or the main dashboard if you have one
        # For now, redirecting to where 'main.index' might be, adjust as needed.
        # If 'main.index' doesn't exist, this will error. Consider 'auth.login' or a known public route.
        # It might be better to redirect to a more generic page or handle more gracefully.
        # For now, assuming a 'main.index' or similar route exists.
        # You might need to change 'main.index' to a valid route in your application, e.g., 'chat.chat_page'.
        # Let's use a placeholder or a common route like 'auth.login' if main.index is not guaranteed.
        # Checking common blueprint names: 'main_bp', 'main_routes', 'dashboard_bp'
        # For now, let's try redirecting to a hypothetical 'main.index'. User can adjust this.
        # Or, if there's a 'dashboard' blueprint.
        # The user has 'app.main' and 'app.dashboard' blueprints. Let's assume 'main.index' is a safe bet for now.
        # If current_user is not None and hasattr(current_user, 'get_dashboard_url'):
        #    return redirect(current_user.get_dashboard_url())
        # else:
        # For now, if 'main.index' isn't right, user may need to adjust.
        # A safer bet is to redirect to where they came from or a generic accessible page.
        # Considering the user has `app.pages` and `app.frontend` with a React app,
        # a simple redirect to '/' which serves the React app might be best if no other Flask 'index' is obvious.
        # However, `main.index` is a common pattern.
        try:
            return redirect(url_for('main.index'))
        except Exception:
            # Fallback if 'main.index' doesn't exist or causes an error during url_for
            current_app.logger.warning("Failed to redirect to 'main.index', falling back to '/' for unauthorized admin access.")
            return redirect('/')


    current_app.logger.info(f"Admin user {current_user.email} accessing email signups.")
    try:
        signups = EmailSignup.query.order_by(EmailSignup.created_at.desc()).all()
        current_app.logger.info(f"Fetched {len(signups)} email signups.")
    except Exception as e:
        current_app.logger.error(f"Error fetching email signups: {e}", exc_info=True)
        flash('Error fetching email signups.', 'danger')
        signups = []
        
    return render_template('admin/email_signups.html', title='Email Signups', signups=signups)

@admin_bp.route('/legendary-personas')
@login_required
def legendary_personas():
    """Admin page to manage legendary persona access for users."""
    if not is_admin():
        flash('You do not have permission to access this page.', 'danger')
        try:
            return redirect(url_for('main.index'))
        except Exception:
            return redirect('/')
    
    try:
        # Get all users with their profiles
        users = db.session.query(User, UserProfile)\
            .outerjoin(UserProfile, User.id == UserProfile.user_id)\
            .order_by(User.created_at.desc()).all()
        
        current_app.logger.info(f"Admin user {current_user.email} accessing legendary personas management.")
    except Exception as e:
        current_app.logger.error(f"Error fetching users for legendary personas: {e}", exc_info=True)
        flash('Error fetching user data.', 'danger')
        users = []
    
    return render_template('admin/legendary_personas.html', title='Legendary Personas Access', users=users)

@admin_bp.route('/toggle-legendary-access/<int:user_id>', methods=['POST'])
@login_required
def toggle_legendary_access(user_id):
    """Toggle legendary persona access for a specific user."""
    if not is_admin():
        flash('You do not have permission to perform this action.', 'danger')
        return redirect(url_for('admin.legendary_personas'))
    
    try:
        user = User.query.get_or_404(user_id)
        
        # Get or create user profile
        profile = UserProfile.query.filter_by(user_id=user_id).first()
        if not profile:
            profile = UserProfile(user_id=user_id)
            db.session.add(profile)
        
        # Toggle legendary persona access
        profile.has_legendary_personas = not (profile.has_legendary_personas or False)
        db.session.commit()
        
        status = "enabled" if profile.has_legendary_personas else "disabled"
        flash(f'Legendary persona access {status} for {user.email}', 'success')
        current_app.logger.info(f"Admin {current_user.email} {status} legendary personas for user {user.email}")
        
    except Exception as e:
        current_app.logger.error(f"Error toggling legendary access for user {user_id}: {e}", exc_info=True)
        flash('Error updating user access.', 'danger')
        db.session.rollback()
    
    return redirect(url_for('admin.legendary_personas')) 