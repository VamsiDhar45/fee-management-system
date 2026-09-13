-- Add voucher_number and payment_proof_url to expenses table
ALTER TABLE expenses ADD COLUMN voucher_number VARCHAR(50);
ALTER TABLE expenses ADD COLUMN payment_proof_url TEXT;
