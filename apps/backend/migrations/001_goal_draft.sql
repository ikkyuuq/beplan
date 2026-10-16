-- Drafts: goals the user is still planning. A draft is fully editable and has
-- no scheduled days; starting it creates the real goal (assigned_goal, tasks,
-- scheduled days) with the normal create logic and removes the draft.
-- The editor's content is kept as JSON so date/monthly task dates (which
-- otherwise live only in scheduled-day rows) survive while drafting.
CREATE TABLE IF NOT EXISTS public.goal_draft (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES public."user" (id) ON DELETE CASCADE,
    payload JSONB NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS goal_draft_user_id_idx ON public.goal_draft (user_id);
