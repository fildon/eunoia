-- One-time cleanup: rewrite the old fixed-tag ids to human-readable labels
-- now that tags are stored and displayed as free text with no id/label mapping.
-- Run this once in the Supabase SQL editor (Project > SQL Editor > New query).

update public.mood_entries set tags = array_replace(tags, 'good_sleep', 'Good Sleep');
update public.mood_entries set tags = array_replace(tags, 'bad_sleep', 'Bad Sleep');
update public.mood_entries set tags = array_replace(tags, 'exercise', 'Exercise');
update public.mood_entries set tags = array_replace(tags, 'work_stress', 'Stress');
update public.mood_entries set tags = array_replace(tags, 'social', 'Friends');
update public.mood_entries set tags = array_replace(tags, 'sick', 'Sick');
