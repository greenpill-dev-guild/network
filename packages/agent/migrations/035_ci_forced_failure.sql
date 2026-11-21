-- Throwaway: proves the Database proofs job turns red on a migration that
-- cannot apply. Reverted in the next commit; never merged.
select * from ci_forced_failure_missing_table;
