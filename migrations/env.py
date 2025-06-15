import logging
from logging.config import fileConfig
import os  # <-- Import os
import sys # <-- Import sys

# --- Ensure instance folder exists FIRST ---
# This is critical for migrations to find the database file.
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
instance_path = os.path.join(project_root, 'instance')
try:
    os.makedirs(instance_path, exist_ok=True)
except OSError as e:
    # Use sys.stderr for logging before logger is configured
    sys.stderr.write(f"CRITICAL: Could not create instance path '{instance_path}'. Error: {e}\n")
    raise

# from flask import current_app # No longer needed
from app import create_app # Import the app factory

from alembic import context

# Create a new Flask app instance for the migration
app = create_app('development') # Or the appropriate config

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)
logger = logging.getLogger('alembic.env')


def get_engine():
    with app.app_context():
        try:
            # this works with Flask-SQLAlchemy<3 and Alchemical
            return app.extensions['migrate'].db.get_engine()
        except (TypeError, KeyError):
            # this works with Flask-SQLAlchemy>=3
            return app.extensions['migrate'].db.engine


def get_engine_url():
    try:
        return get_engine().url.render_as_string(hide_password=False).replace(
            '%', '%%')
    except AttributeError:
        return str(get_engine().url).replace('%', '%%')


# add your model's MetaData object here
# for 'autogenerate' support
# from myapp import mymodel
# target_metadata = mymodel.Base.metadata
config.set_main_option('sqlalchemy.url', get_engine_url())
with app.app_context():
    target_db = app.extensions['migrate'].db

# other values from the config, defined by the needs of env.py,
# can be acquired:
# my_important_option = config.get_main_option("my_important_option")
# ... etc.


def get_metadata():
    if hasattr(target_db, 'metadatas'):
        return target_db.metadatas[None]
    return target_db.metadata


def run_migrations_offline():
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.

    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url, target_metadata=get_metadata(), literal_binds=True
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online():
    """Run migrations in 'online' mode.

    In this scenario we need to create an Engine
    and associate a connection with the context.

    """

    # this callback is used to prevent an auto-migration from being generated
    # when there are no changes to the schema
    # reference: http://alembic.zzzcomputing.com/en/latest/cookbook.html
    def process_revision_directives(context, revision, directives):
        if getattr(config.cmd_opts, 'autogenerate', False):
            script = directives[0]
            if script.upgrade_ops.is_empty():
                directives[:] = []
                logger.info('No changes in schema detected.')

    connectable = get_engine()

    with connectable.connect() as connection:
        with app.app_context():
            context.configure(
                connection=connection,
                target_metadata=get_metadata(),
                process_revision_directives=process_revision_directives,
                **app.extensions['migrate'].configure_args
            )

            with context.begin_transaction():
                context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
