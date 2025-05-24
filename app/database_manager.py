import logging
import os
from flask import Flask, current_app
from sqlalchemy.exc import SQLAlchemyError
from flask_migrate import upgrade as flask_migrate_upgrade

# Import the database and migration instances from extensions
from app.extensions import db, migrate

logger = logging.getLogger(__name__)

class DatabaseManager:
    """
    Unified Database Manager for initializing, migrating, and managing database operations.
    Provides a centralized interface for database-related tasks.
    """
    def __init__(self, app=None):
        self.db = db
        self.migrate = migrate
        self.initialized = False
        
        if app is not None:
            self.init_app(app)
    
    def init_app(self, app):
        """Initialize the database with the Flask app"""
        logger.info("Initializing Database Manager")
        
        try:
            # Initialize the database extension
            self.db.init_app(app)
            
            # Initialize Flask-Migrate
            self.migrate.init_app(app, self.db)
            
            # Register the manager on the app
            app.db_manager = self
            
            # Register health check route
            self._register_health_check(app)
            
            self.initialized = True
            logger.info("Database Manager initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize Database Manager: {str(e)}")
            self.initialized = False
    
    def _register_health_check(self, app):
        """Register database health check endpoint"""
        @app.route('/system/health/database', methods=['GET'])
        def db_health():
            """Check database connection health"""
            try:
                # Execute a simple query to check connection
                self.db.session.execute("SELECT 1")
                return {"status": "healthy", "message": "Database connection successful"}
            except SQLAlchemyError as e:
                logger.error(f"Database health check failed: {str(e)}")
                return {"status": "unhealthy", "message": f"Database connection failed: {str(e)}"}
    
    def create_all(self):
        """Create all database tables"""
        if not self.initialized:
            logger.error("Cannot create tables: Database Manager not initialized")
            return False
        
        try:
            self.db.create_all()
            logger.info("Created all database tables")
            return True
        except SQLAlchemyError as e:
            logger.error(f"Failed to create database tables: {str(e)}")
            return False
    
    def drop_all(self):
        """Drop all database tables (use with caution!)"""
        if not self.initialized:
            logger.error("Cannot drop tables: Database Manager not initialized")
            return False
        
        try:
            self.db.drop_all()
            logger.info("Dropped all database tables")
            return True
        except SQLAlchemyError as e:
            logger.error(f"Failed to drop database tables: {str(e)}")
            return False
    
    def run_migrations(self, directory=None):
        """Run database migrations"""
        if not self.initialized:
            logger.error("Cannot run migrations: Database Manager not initialized")
            return False
        
        try:
            directory = directory or current_app.config.get('MIGRATION_DIR', 'migrations')
            flask_migrate_upgrade(directory=directory)
            logger.info("Database migrations applied successfully")
            return True
        except Exception as e:
            logger.error(f"Failed to run database migrations: {str(e)}")
            return False
    
    def check_tables_exist(self, table_names):
        """Check if specified tables exist in the database"""
        if not self.initialized:
            logger.error("Cannot check tables: Database Manager not initialized")
            return False
        
        try:
            inspector = self.db.inspect(self.db.engine)
            existing_tables = inspector.get_table_names()
            
            for table in table_names:
                if table not in existing_tables:
                    logger.warning(f"Table '{table}' not found in database")
                    return False
            
            return True
        except SQLAlchemyError as e:
            logger.error(f"Failed to check tables existence: {str(e)}")
            return False

# Global instance for app-wide access
db_manager = DatabaseManager() 