-- Check and fix template file paths for certificates bucket structure
-- This script ensures all templates have the correct file_path format

-- First, let's see what templates we have and their file paths
SELECT 
  id,
  title,
  file_path,
  file_name,
  created_at
FROM templates 
ORDER BY created_at DESC;

-- Fix templates that don't have the 'templates/' prefix
-- Add 'templates/' prefix to file_path since files should be in templates/ folder within certificates bucket
UPDATE templates 
SET file_path = CONCAT('templates/', file_path)
WHERE file_path NOT LIKE 'templates/%' AND file_path NOT LIKE 'generated/%';

-- Fix templates that have double 'templates/' prefix
-- Remove duplicate 'templates/' prefix
UPDATE templates 
SET file_path = REPLACE(file_path, 'templates/templates/', 'templates/')
WHERE file_path LIKE 'templates/templates/%';

-- Verify the fix
SELECT 
  id,
  title,
  file_path,
  file_name,
  created_at
FROM templates 
ORDER BY created_at DESC;
