import pytest
from app import create_app, db

@pytest.fixture(scope='module')
def app():
    """Create and configure a new app instance for each test module."""
    # Create a test app instance
    app = create_app('testing')

    # Establish an application context
    with app.app_context():
        # Create the database and the database table(s)
        db.create_all()
        yield app
        # Drop all tables after the test is complete
        db.drop_all()

@pytest.fixture(scope='module')
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