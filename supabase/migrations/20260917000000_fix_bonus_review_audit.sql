begin;

alter table public.bonus_results drop constraint if exists bonus_review_audit;
alter table public.bonus_results add constraint bonus_review_audit check (
  (review_resolved_at is null and review_resolved_by is null)
  or (review_resolved_at is not null and review_resolved_by is not null and length(trim(review_reason)) > 0)
);

commit;
