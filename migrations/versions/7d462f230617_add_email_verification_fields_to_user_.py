"""Add email verification fields to user table

Revision ID: 7d462f230617
Revises: 369b2a5c46ca
Create Date: 2025-06-20 18:26:04.610712

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '7d462f230617'
down_revision = '369b2a5c46ca'
branch_labels = None
depends_on = None


def upgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    with op.batch_alter_table('user', schema=None) as batch_op:
        batch_op.add_column(sa.Column('is_email_verified', sa.Boolean(), nullable=False, server_default='false'))
        batch_op.add_column(sa.Column('email_verification_token', sa.String(length=100), nullable=True))
        batch_op.add_column(sa.Column('email_verification_token_expires', sa.DateTime(), nullable=True))

    with op.batch_alter_table('user_profiles', schema=None) as batch_op:
        batch_op.alter_column('payment_status',
               existing_type=sa.VARCHAR(length=20),
               nullable=True,
               existing_server_default=sa.text("'active'"))
        batch_op.alter_column('monthly_roleplay_limit',
               existing_type=sa.INTEGER(),
               nullable=True,
               existing_server_default=sa.text("'15'"))
        batch_op.alter_column('current_month_roleplays',
               existing_type=sa.INTEGER(),
               nullable=True,
               existing_server_default=sa.text("'0'"))
        batch_op.alter_column('has_advanced_coaching',
               existing_type=sa.BOOLEAN(),
               nullable=True,
               existing_server_default=sa.text("'false'"))
        batch_op.alter_column('has_unlimited_roleplays',
               existing_type=sa.BOOLEAN(),
               nullable=True,
               existing_server_default=sa.text("'false'"))
        batch_op.alter_column('has_detailed_analytics',
               existing_type=sa.BOOLEAN(),
               nullable=True,
               existing_server_default=sa.text("'false'"))
        batch_op.drop_column('emotional_intelligence_score')

    # ### end Alembic commands ###


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    with op.batch_alter_table('user_profiles', schema=None) as batch_op:
        batch_op.add_column(sa.Column('emotional_intelligence_score', sa.FLOAT(), nullable=True))
        batch_op.alter_column('has_detailed_analytics',
               existing_type=sa.BOOLEAN(),
               nullable=False,
               existing_server_default=sa.text("'false'"))
        batch_op.alter_column('has_unlimited_roleplays',
               existing_type=sa.BOOLEAN(),
               nullable=False,
               existing_server_default=sa.text("'false'"))
        batch_op.alter_column('has_advanced_coaching',
               existing_type=sa.BOOLEAN(),
               nullable=False,
               existing_server_default=sa.text("'false'"))
        batch_op.alter_column('current_month_roleplays',
               existing_type=sa.INTEGER(),
               nullable=False,
               existing_server_default=sa.text("'0'"))
        batch_op.alter_column('monthly_roleplay_limit',
               existing_type=sa.INTEGER(),
               nullable=False,
               existing_server_default=sa.text("'15'"))
        batch_op.alter_column('payment_status',
               existing_type=sa.VARCHAR(length=20),
               nullable=False,
               existing_server_default=sa.text("'active'"))

    with op.batch_alter_table('user', schema=None) as batch_op:
        batch_op.drop_column('email_verification_token_expires')
        batch_op.drop_column('email_verification_token')
        batch_op.drop_column('is_email_verified')

    # ### end Alembic commands ###
