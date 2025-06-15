from flask import render_template, flash, redirect, url_for, current_app
from flask_login import login_required, current_user
from . import admin_bp
from app.models import EmailSignup # Assuming EmailSignup is in app.models
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