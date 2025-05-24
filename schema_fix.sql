-- Fix missing columns in training_session table
ALTER TABLE training_session ADD COLUMN created_at DATETIME;
ALTER TABLE training_session ADD COLUMN updated_at DATETIME; 