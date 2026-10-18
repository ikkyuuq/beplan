-- Template 99 "Way to be software engineer" had its due date a year before
-- its start date (2024-04-13 < 2025-03-13), so the app showed -333 days.
-- Make it a 120-day template (duration = due - start + 1). The guard keeps
-- this a no-op if the row was already fixed by hand.
UPDATE public.template
SET due_date = start_date + 119,
    updated_at = NOW()
WHERE id = 99
  AND due_date < start_date;
