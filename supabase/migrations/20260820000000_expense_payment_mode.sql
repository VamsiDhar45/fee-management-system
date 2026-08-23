-- Add payment_mode to expenses table
ALTER TABLE expenses ADD COLUMN payment_mode payment_mode DEFAULT 'CASH';
