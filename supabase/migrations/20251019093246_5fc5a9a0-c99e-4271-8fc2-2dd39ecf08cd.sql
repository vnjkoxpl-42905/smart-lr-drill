-- Make class_id nullable since we're using user_id for authentication
ALTER TABLE public.flagged_questions 
ALTER COLUMN class_id DROP NOT NULL;

-- Set a default empty string for class_id for backward compatibility
ALTER TABLE public.flagged_questions 
ALTER COLUMN class_id SET DEFAULT '';