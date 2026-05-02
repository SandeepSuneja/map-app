# AWS deployment (GitHub Actions)

The workflow [`.github/workflows/deploy-aws.yml`](../.github/workflows/deploy-aws.yml) builds the Angular app and uploads the contents of `dist/map-app/browser` to an **S3 bucket**. Optionally it invalidates a **CloudFront** distribution so users get new `index.html` immediately.

## What you need on AWS

1. **S3 bucket** configured for static website hosting (or fronted only by CloudFront; both are common).
2. **IAM role** for GitHub Actions using **OIDC** (no long‑lived access keys in the repo).

## GitHub configuration

### Secrets (Settings → Secrets and variables → Actions)

| Name | Description |
|------|-------------|
| `AWS_ROLE_ARN` | IAM role ARN trusted by GitHub OIDC (see below). |
| `AWS_REGION` | Region of the bucket and CloudFront (e.g. `us-east-1`). |
| `S3_BUCKET_NAME` | Target bucket name (no `s3://` prefix). |

### Variables (optional)

| Name | Description |
|------|-------------|
| `CLOUDFRONT_DISTRIBUTION_ID` | If set, the workflow runs a cache invalidation for `/*` after upload. Use a **variable**, not a secret. |

## IAM OIDC trust policy (example)

Replace `OWNER`, `REPO`, and `ROLE_NAME` with your GitHub org/user, repository name, and IAM role name.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:OWNER/REPO:ref:refs/heads/main"
        }
      }
    }
  ]
}
```

Add the GitHub OIDC provider to the account if it is not already present (IAM → Identity providers → OpenID Connect → `https://token.actions.githubusercontent.com`).

## IAM permissions on the role (example)

Attach a policy that allows syncing the bucket and (if using CloudFront) creating invalidations:

- `s3:PutObject`, `s3:DeleteObject`, `s3:ListBucket` on `arn:aws:s3:::YOUR_BUCKET` and `arn:aws:s3:::YOUR_BUCKET/*`
- `cloudfront:CreateInvalidation` on the distribution ARN (only if you set `CLOUDFRONT_DISTRIBUTION_ID`)

## Alternative: access key secrets

If you cannot use OIDC, replace the **Configure AWS credentials** step in `deploy-aws.yml` with:

```yaml
- name: Configure AWS credentials
  uses: aws-actions/configure-aws-credentials@v4
  with:
    aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
    aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
    aws-region: ${{ secrets.AWS_REGION }}
```

and remove `permissions: id-token: write` if nothing else needs it.

## SPA routing

This app is served from `/` with `base href="/"`. If you add deep links or move the app under a subpath, set `base-href` in the Angular build and configure S3/CloudFront (for example CloudFront custom error responses to `index.html` for 403/404) so client routes load correctly.

## Local check

```bash
npm ci
npm test
npm run build
ls dist/map-app/browser
```
