"""Add premium subscription features

Revision ID: add_premium_features
Revises: 
Create Date: 2025-01-08 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import DateTime

# revision identifiers, used by Alembic.
revision = 'add_premium_features'
down_revision = None  # Update this with the latest revision ID
branch_labels = None
depends_on = None


def upgrade():
    """Add premium subscription fields to user_profiles table."""
    # Add new columns for premium features
    op.add_column('user_profiles', sa.Column('premium_start_date', DateTime, nullable=True))
    op.add_column('user_profiles', sa.Column('premium_end_date', DateTime, nullable=True))
    op.add_column('user_profiles', sa.Column('payment_status', sa.String(20), nullable=False, server_default='active'))
    
    # Add usage tracking columns
    op.add_column('user_profiles', sa.Column('monthly_roleplay_limit', sa.Integer, nullable=False, server_default='15'))
    op.add_column('user_profiles', sa.Column('current_month_roleplays', sa.Integer, nullable=False, server_default='0'))
    op.add_column('user_profiles', sa.Column('month_reset_date', DateTime, nullable=True))
    
    # Add premium feature flags
    op.add_column('user_profiles', sa.Column('has_advanced_coaching', sa.Boolean, nullable=False, server_default='false'))
    op.add_column('user_profiles', sa.Column('has_unlimited_roleplays', sa.Boolean, nullable=False, server_default='false'))
    op.add_column('user_profiles', sa.Column('has_detailed_analytics', sa.Boolean, nullable=False, server_default='false'))


def downgrade():
    """Remove premium subscription fields from user_profiles table."""
    # Remove premium feature flags
    op.drop_column('user_profiles', 'has_detailed_analytics')
    op.drop_column('user_profiles', 'has_unlimited_roleplays')
    op.drop_column('user_profiles', 'has_advanced_coaching')
    
    # Remove usage tracking columns
    op.drop_column('user_profiles', 'month_reset_date')
    op.drop_column('user_profiles', 'current_month_roleplays')
    op.drop_column('user_profiles', 'monthly_roleplay_limit')
    
    # Remove premium subscription columns
    op.drop_column('user_profiles', 'payment_status')
    op.drop_column('user_profiles', 'premium_end_date')
    op.drop_column('user_profiles', 'premium_start_date') 