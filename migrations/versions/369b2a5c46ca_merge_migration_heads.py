"""Merge migration heads

Revision ID: 369b2a5c46ca
Revises: add_premium_features, b0515505326c
Create Date: 2025-06-20 18:25:40.337247

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '369b2a5c46ca'
down_revision = ('add_premium_features', 'b0515505326c')
branch_labels = None
depends_on = None


def upgrade():
    pass


def downgrade():
    pass
