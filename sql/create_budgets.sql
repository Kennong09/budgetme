-- Create all 63 budgets for pczceducation@gmail.com (March-November 2025)
-- Run this via Supabase SQL Editor

INSERT INTO public.budgets (user_id, budget_name, amount, spent, currency, category_id, period, start_date, end_date, alert_threshold, status) VALUES
-- March 2025 (7 budgets)
('ff512b39-c50d-4682-b362-905a9864bd43', 'Housing - Mar 2025', 20000, 0, 'PHP', '4a7b868d-55b0-4c68-9b15-f5e8b90b050b', 'month', '2025-03-01', '2025-03-31', 0.90, 'active'),
('ff512b39-c50d-4682-b362-905a9864bd43', 'Groceries - Mar 2025', 18000, 0, 'PHP', 'b43425c2-62d6-4104-95b0-f8c9f3e81095', 'month', '2025-03-01', '2025-03-31', 0.85, 'active'),
('ff512b39-c50d-4682-b362-905a9864bd43', 'Transportation - Mar 2025', 8000, 0, 'PHP', 'd4d42c7d-a038-4f19-a669-4ce707101c0e', 'month', '2025-03-01', '2025-03-31', 0.80, 'active'),
('ff512b39-c50d-4682-b362-905a9864bd43', 'Food & Dining - Mar 2025', 10000, 0, 'PHP', 'dc65145c-c871-4331-a953-fe0600c24ce0', 'month', '2025-03-01', '2025-03-31', 0.80, 'active'),
('ff512b39-c50d-4682-b362-905a9864bd43', 'Utilities - Mar 2025', 6000, 0, 'PHP', 'aca34dd2-1a02-471b-8ba7-b407901b4d80', 'month', '2025-03-01', '2025-03-31', 0.85, 'active'),
('ff512b39-c50d-4682-b362-905a9864bd43', 'Entertainment - Mar 2025', 5000, 0, 'PHP', '0b307d6f-f6f6-4605-b580-43197e2df5f8', 'month', '2025-03-01', '2025-03-31', 0.75, 'active'),
('ff512b39-c50d-4682-b362-905a9864bd43', 'Shopping - Mar 2025', 8000, 0, 'PHP', 'dc9e51c2-b634-4032-b1c8-630849260647', 'month', '2025-03-01', '2025-03-31', 0.80, 'active'),

-- April 2025 (7 budgets)
('ff512b39-c50d-4682-b362-905a9864bd43', 'Housing - Apr 2025', 20000, 0, 'PHP', '4a7b868d-55b0-4c68-9b15-f5e8b90b050b', 'month', '2025-04-01', '2025-04-30', 0.90, 'active'),
('ff512b39-c50d-4682-b362-905a9864bd43', 'Groceries - Apr 2025', 18000, 0, 'PHP', 'b43425c2-62d6-4104-95b0-f8c9f3e81095', 'month', '2025-04-01', '2025-04-30', 0.85, 'active'),
('ff512b39-c50d-4682-b362-905a9864bd43', 'Transportation - Apr 2025', 8000, 0, 'PHP', 'd4d42c7d-a038-4f19-a669-4ce707101c0e', 'month', '2025-04-01', '2025-04-30', 0.80, 'active'),
('ff512b39-c50d-4682-b362-905a9864bd43', 'Food & Dining - Apr 2025', 10000, 0, 'PHP', 'dc65145c-c871-4331-a953-fe0600c24ce0', 'month', '2025-04-01', '2025-04-30', 0.80, 'active'),
('ff512b39-c50d-4682-b362-905a9864bd43', 'Utilities - Apr 2025', 6000, 0, 'PHP', 'aca34dd2-1a02-471b-8ba7-b407901b4d80', 'month', '2025-04-01', '2025-04-30', 0.85, 'active'),
('ff512b39-c50d-4682-b362-905a9864bd43', 'Entertainment - Apr 2025', 5000, 0, 'PHP', '0b307d6f-f6f6-4605-b580-43197e2df5f8', 'month', '2025-04-01', '2025-04-30', 0.75, 'active'),
('ff512b39-c50d-4682-b362-905a9864bd43', 'Shopping - Apr 2025', 8000, 0, 'PHP', 'dc9e51c2-b634-4032-b1c8-630849260647', 'month', '2025-04-01', '2025-04-30', 0.80, 'active'),

-- May 2025 (7 budgets)
('ff512b39-c50d-4682-b362-905a9864bd43', 'Housing - May 2025', 20000, 0, 'PHP', '4a7b868d-55b0-4c68-9b15-f5e8b90b050b', 'month', '2025-05-01', '2025-05-31', 0.90, 'active'),
('ff512b39-c50d-4682-b362-905a9864bd43', 'Groceries - May 2025', 18000, 0, 'PHP', 'b43425c2-62d6-4104-95b0-f8c9f3e81095', 'month', '2025-05-01', '2025-05-31', 0.85, 'active'),
('ff512b39-c50d-4682-b362-905a9864bd43', 'Transportation - May 2025', 8000, 0, 'PHP', 'd4d42c7d-a038-4f19-a669-4ce707101c0e', 'month', '2025-05-01', '2025-05-31', 0.80, 'active'),
('ff512b39-c50d-4682-b362-905a9864bd43', 'Food & Dining - May 2025', 10000, 0, 'PHP', 'dc65145c-c871-4331-a953-fe0600c24ce0', 'month', '2025-05-01', '2025-05-31', 0.80, 'active'),
('ff512b39-c50d-4682-b362-905a9864bd43', 'Utilities - May 2025', 6000, 0, 'PHP', 'aca34dd2-1a02-471b-8ba7-b407901b4d80', 'month', '2025-05-01', '2025-05-31', 0.85, 'active'),
('ff512b39-c50d-4682-b362-905a9864bd43', 'Entertainment - May 2025', 5000, 0, 'PHP', '0b307d6f-f6f6-4605-b580-43197e2df5f8', 'month', '2025-05-01', '2025-05-31', 0.75, 'active'),
('ff512b39-c50d-4682-b362-905a9864bd43', 'Shopping - May 2025', 8000, 0, 'PHP', 'dc9e51c2-b634-4032-b1c8-630849260647', 'month', '2025-05-01', '2025-05-31', 0.80, 'active'),

-- June 2025 (7 budgets)
('ff512b39-c50d-4682-b362-905a9864bd43', 'Housing - Jun 2025', 20000, 0, 'PHP', '4a7b868d-55b0-4c68-9b15-f5e8b90b050b', 'month', '2025-06-01', '2025-06-30', 0.90, 'active'),
('ff512b39-c50d-4682-b362-905a9864bd43', 'Groceries - Jun 2025', 18000, 0, 'PHP', 'b43425c2-62d6-4104-95b0-f8c9f3e81095', 'month', '2025-06-01', '2025-06-30', 0.85, 'active'),
('ff512b39-c50d-4682-b362-905a9864bd43', 'Transportation - Jun 2025', 8000, 0, 'PHP', 'd4d42c7d-a038-4f19-a669-4ce707101c0e', 'month', '2025-06-01', '2025-06-30', 0.80, 'active'),
('ff512b39-c50d-4682-b362-905a9864bd43', 'Food & Dining - Jun 2025', 10000, 0, 'PHP', 'dc65145c-c871-4331-a953-fe0600c24ce0', 'month', '2025-06-01', '2025-06-30', 0.80, 'active'),
('ff512b39-c50d-4682-b362-905a9864bd43', 'Utilities - Jun 2025', 6000, 0, 'PHP', 'aca34dd2-1a02-471b-8ba7-b407901b4d80', 'month', '2025-06-01', '2025-06-30', 0.85, 'active'),
('ff512b39-c50d-4682-b362-905a9864bd43', 'Entertainment - Jun 2025', 5000, 0, 'PHP', '0b307d6f-f6f6-4605-b580-43197e2df5f8', 'month', '2025-06-01', '2025-06-30', 0.75, 'active'),
('ff512b39-c50d-4682-b362-905a9864bd43', 'Shopping - Jun 2025', 8000, 0, 'PHP', 'dc9e51c2-b634-4032-b1c8-630849260647', 'month', '2025-06-01', '2025-06-30', 0.80, 'active'),

-- July 2025 (7 budgets)
('ff512b39-c50d-4682-b362-905a9864bd43', 'Housing - Jul 2025', 20000, 0, 'PHP', '4a7b868d-55b0-4c68-9b15-f5e8b90b050b', 'month', '2025-07-01', '2025-07-31', 0.90, 'active'),
('ff512b39-c50d-4682-b362-905a9864bd43', 'Groceries - Jul 2025', 18000, 0, 'PHP', 'b43425c2-62d6-4104-95b0-f8c9f3e81095', 'month', '2025-07-01', '2025-07-31', 0.85, 'active'),
('ff512b39-c50d-4682-b362-905a9864bd43', 'Transportation - Jul 2025', 8000, 0, 'PHP', 'd4d42c7d-a038-4f19-a669-4ce707101c0e', 'month', '2025-07-01', '2025-07-31', 0.80, 'active'),
('ff512b39-c50d-4682-b362-905a9864bd43', 'Food & Dining - Jul 2025', 10000, 0, 'PHP', 'dc65145c-c871-4331-a953-fe0600c24ce0', 'month', '2025-07-01', '2025-07-31', 0.80, 'active'),
('ff512b39-c50d-4682-b362-905a9864bd43', 'Utilities - Jul 2025', 6000, 0, 'PHP', 'aca34dd2-1a02-471b-8ba7-b407901b4d80', 'month', '2025-07-01', '2025-07-31', 0.85, 'active'),
('ff512b39-c50d-4682-b362-905a9864bd43', 'Entertainment - Jul 2025', 5000, 0, 'PHP', '0b307d6f-f6f6-4605-b580-43197e2df5f8', 'month', '2025-07-01', '2025-07-31', 0.75, 'active'),
('ff512b39-c50d-4682-b362-905a9864bd43', 'Shopping - Jul 2025', 8000, 0, 'PHP', 'dc9e51c2-b634-4032-b1c8-630849260647', 'month', '2025-07-01', '2025-07-31', 0.80, 'active'),

-- August 2025 (7 budgets)
('ff512b39-c50d-4682-b362-905a9864bd43', 'Housing - Aug 2025', 20000, 0, 'PHP', '4a7b868d-55b0-4c68-9b15-f5e8b90b050b', 'month', '2025-08-01', '2025-08-31', 0.90, 'active'),
('ff512b39-c50d-4682-b362-905a9864bd43', 'Groceries - Aug 2025', 18000, 0, 'PHP', 'b43425c2-62d6-4104-95b0-f8c9f3e81095', 'month', '2025-08-01', '2025-08-31', 0.85, 'active'),
('ff512b39-c50d-4682-b362-905a9864bd43', 'Transportation - Aug 2025', 8000, 0, 'PHP', 'd4d42c7d-a038-4f19-a669-4ce707101c0e', 'month', '2025-08-01', '2025-08-31', 0.80, 'active'),
('ff512b39-c50d-4682-b362-905a9864bd43', 'Food & Dining - Aug 2025', 10000, 0, 'PHP', 'dc65145c-c871-4331-a953-fe0600c24ce0', 'month', '2025-08-01', '2025-08-31', 0.80, 'active'),
('ff512b39-c50d-4682-b362-905a9864bd43', 'Utilities - Aug 2025', 6000, 0, 'PHP', 'aca34dd2-1a02-471b-8ba7-b407901b4d80', 'month', '2025-08-01', '2025-08-31', 0.85, 'active'),
('ff512b39-c50d-4682-b362-905a9864bd43', 'Entertainment - Aug 2025', 5000, 0, 'PHP', '0b307d6f-f6f6-4605-b580-43197e2df5f8', 'month', '2025-08-01', '2025-08-31', 0.75, 'active'),
('ff512b39-c50d-4682-b362-905a9864bd43', 'Shopping - Aug 2025', 8000, 0, 'PHP', 'dc9e51c2-b634-4032-b1c8-630849260647', 'month', '2025-08-01', '2025-08-31', 0.80, 'active'),

-- September 2025 (7 budgets)
('ff512b39-c50d-4682-b362-905a9864bd43', 'Housing - Sep 2025', 20000, 0, 'PHP', '4a7b868d-55b0-4c68-9b15-f5e8b90b050b', 'month', '2025-09-01', '2025-09-30', 0.90, 'active'),
('ff512b39-c50d-4682-b362-905a9864bd43', 'Groceries - Sep 2025', 18000, 0, 'PHP', 'b43425c2-62d6-4104-95b0-f8c9f3e81095', 'month', '2025-09-01', '2025-09-30', 0.85, 'active'),
('ff512b39-c50d-4682-b362-905a9864bd43', 'Transportation - Sep 2025', 8000, 0, 'PHP', 'd4d42c7d-a038-4f19-a669-4ce707101c0e', 'month', '2025-09-01', '2025-09-30', 0.80, 'active'),
('ff512b39-c50d-4682-b362-905a9864bd43', 'Food & Dining - Sep 2025', 10000, 0, 'PHP', 'dc65145c-c871-4331-a953-fe0600c24ce0', 'month', '2025-09-01', '2025-09-30', 0.80, 'active'),
('ff512b39-c50d-4682-b362-905a9864bd43', 'Utilities - Sep 2025', 6000, 0, 'PHP', 'aca34dd2-1a02-471b-8ba7-b407901b4d80', 'month', '2025-09-01', '2025-09-30', 0.85, 'active'),
('ff512b39-c50d-4682-b362-905a9864bd43', 'Entertainment - Sep 2025', 5000, 0, 'PHP', '0b307d6f-f6f6-4605-b580-43197e2df5f8', 'month', '2025-09-01', '2025-09-30', 0.75, 'active'),
('ff512b39-c50d-4682-b362-905a9864bd43', 'Shopping - Sep 2025', 8000, 0, 'PHP', 'dc9e51c2-b634-4032-b1c8-630849260647', 'month', '2025-09-01', '2025-09-30', 0.80, 'active'),

-- October 2025 (7 budgets)
('ff512b39-c50d-4682-b362-905a9864bd43', 'Housing - Oct 2025', 20000, 0, 'PHP', '4a7b868d-55b0-4c68-9b15-f5e8b90b050b', 'month', '2025-10-01', '2025-10-31', 0.90, 'active'),
('ff512b39-c50d-4682-b362-905a9864bd43', 'Groceries - Oct 2025', 18000, 0, 'PHP', 'b43425c2-62d6-4104-95b0-f8c9f3e81095', 'month', '2025-10-01', '2025-10-31', 0.85, 'active'),
('ff512b39-c50d-4682-b362-905a9864bd43', 'Transportation - Oct 2025', 8000, 0, 'PHP', 'd4d42c7d-a038-4f19-a669-4ce707101c0e', 'month', '2025-10-01', '2025-10-31', 0.80, 'active'),
('ff512b39-c50d-4682-b362-905a9864bd43', 'Food & Dining - Oct 2025', 10000, 0, 'PHP', 'dc65145c-c871-4331-a953-fe0600c24ce0', 'month', '2025-10-01', '2025-10-31', 0.80, 'active'),
('ff512b39-c50d-4682-b362-905a9864bd43', 'Utilities - Oct 2025', 6000, 0, 'PHP', 'aca34dd2-1a02-471b-8ba7-b407901b4d80', 'month', '2025-10-01', '2025-10-31', 0.85, 'active'),
('ff512b39-c50d-4682-b362-905a9864bd43', 'Entertainment - Oct 2025', 5000, 0, 'PHP', '0b307d6f-f6f6-4605-b580-43197e2df5f8', 'month', '2025-10-01', '2025-10-31', 0.75, 'active'),
('ff512b39-c50d-4682-b362-905a9864bd43', 'Shopping - Oct 2025', 8000, 0, 'PHP', 'dc9e51c2-b634-4032-b1c8-630849260647', 'month', '2025-10-01', '2025-10-31', 0.80, 'active'),

-- November 2025 (7 budgets)
('ff512b39-c50d-4682-b362-905a9864bd43', 'Housing - Nov 2025', 20000, 0, 'PHP', '4a7b868d-55b0-4c68-9b15-f5e8b90b050b', 'month', '2025-11-01', '2025-11-30', 0.90, 'active'),
('ff512b39-c50d-4682-b362-905a9864bd43', 'Groceries - Nov 2025', 18000, 0, 'PHP', 'b43425c2-62d6-4104-95b0-f8c9f3e81095', 'month', '2025-11-01', '2025-11-30', 0.85, 'active'),
('ff512b39-c50d-4682-b362-905a9864bd43', 'Transportation - Nov 2025', 8000, 0, 'PHP', 'd4d42c7d-a038-4f19-a669-4ce707101c0e', 'month', '2025-11-01', '2025-11-30', 0.80, 'active'),
('ff512b39-c50d-4682-b362-905a9864bd43', 'Food & Dining - Nov 2025', 10000, 0, 'PHP', 'dc65145c-c871-4331-a953-fe0600c24ce0', 'month', '2025-11-01', '2025-11-30', 0.80, 'active'),
('ff512b39-c50d-4682-b362-905a9864bd43', 'Utilities - Nov 2025', 6000, 0, 'PHP', 'aca34dd2-1a02-471b-8ba7-b407901b4d80', 'month', '2025-11-01', '2025-11-30', 0.85, 'active'),
('ff512b39-c50d-4682-b362-905a9864bd43', 'Entertainment - Nov 2025', 5000, 0, 'PHP', '0b307d6f-f6f6-4605-b580-43197e2df5f8', 'month', '2025-11-01', '2025-11-30', 0.75, 'active'),
('ff512b39-c50d-4682-b362-905a9864bd43', 'Shopping - Nov 2025', 8000, 0, 'PHP', 'dc9e51c2-b634-4032-b1c8-630849260647', 'month', '2025-11-01', '2025-11-30', 0.80, 'active');

-- Verify creation
SELECT COUNT(*) as total_budgets, 
       COUNT(DISTINCT category_id) as unique_categories,
       MIN(start_date) as first_month,
       MAX(end_date) as last_month
FROM public.budgets 
WHERE user_id = 'ff512b39-c50d-4682-b362-905a9864bd43';
