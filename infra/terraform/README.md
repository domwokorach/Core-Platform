# AWS Terraform starter

This folder provisions **only** two encrypted, scan-on-push ECR repositories and an application CloudWatch log group. It deliberately does not pretend to deploy a production banking workload.

Run `terraform init`, `terraform plan`, and `terraform apply` with your own AWS credentials **only after** deciding on account and region boundaries. A real deployment also needs a private network topology, ALB/WAF, ECS or EKS workload definitions, private RDS PostgreSQL with PITR and HA, a managed OIDC provider, TLS, secrets management, KMS, IAM least privilege, monitoring/alerting, an outbound access strategy, immutable log retention, recovery procedures, compliance controls, and Terraform remote state with locking.

Do not deploy the included development passwords, demo user, or seed migration to AWS.
