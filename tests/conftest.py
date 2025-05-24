import pytest
from app import create_app # Updated import

@pytest.fixture(scope='session')
def app():
    """Session-wide test Flask application."""
    # Create app instance with test config
    test_config = {
        "TESTING": True,
        # Use in-memory SQLite for tests to avoid interfering with dev db
        "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:", 
        "WTF_CSRF_ENABLED": False, # Disable CSRF forms for easier testing
        "LOGIN_DISABLED": True, # Optionally disable login requirement for some tests
        # Add other test-specific configs here
    }
    flask_app = create_app(test_config)

    # Establish an application context before running tests that need it
    with flask_app.app_context():
        # Optional: Create all database tables for in-memory db
        # from app.extensions import db
        # db.create_all() 
        
        yield flask_app # Provide the app instance to tests
        
        # Optional: Clean up database tables after tests
        # db.drop_all()

    # Clean up / reset resources here if necessary

@pytest.fixture()
def client(app):
    """A test client for the app."""
    return app.test_client()

@pytest.fixture()
def runner(app):
    """A test runner for the app's Click commands."""
    return app.test_cli_runner()

@pytest.fixture(autouse=True) # Automatically use this fixture for all tests
def app_context(app):
    """Creates and pushes an application context for the tests."""
    with app.app_context():
        yield 