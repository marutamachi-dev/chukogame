select cron.alter_job(job_id := jobid, active := false)
from cron.job
where jobname like 'chukogame-rakuten-chunk-%';
