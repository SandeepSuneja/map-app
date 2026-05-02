# AWS deployment (GitHub Actions)

The workflow [`.github/workflows/deploy-aws.yml`](../.github/workflows/deploy-aws.yml) builds the Angular app and uploads the contents of `dist/map-app/browser` to an **S3 bucket**. Optionally it invalidates a **CloudFront** distribution so users get new `index.html` immediately.

Authentication uses an **IAM user access key** stored in GitHub Actions secrets.

## What you need on AWS

1. **S3 bucket** configured for static website hosting (or fronted only by CloudFront; both are common).
2. **IAM user** (for CI only) with an **access key** and a policy that allows uploading to that bucket and (if used) invalidating CloudFront.

Prefer a dedicated user with minimal permissions, not your personal admin user. Rotate keys if they are exposed.

## GitHub configuration

### Secrets (Settings → Secrets and variables → Actions)

| Name | Description |
|------|-------------|
| `AWS_ACCESS_KEY_ID` | Access key ID for the deploy IAM user. |
| `AWS_SECRET_ACCESS_KEY` | Secret access key for the same user. |
| `AWS_REGION` | Region of the bucket and CloudFront (e.g. `us-east-1`). |
| `S3_BUCKET_NAME` | Target bucket name (no `s3://` prefix). |

### Variables (optional)

| Name | Description |
|------|-------------|
| `CLOUDFRONT_DISTRIBUTION_ID` | If set, the workflow runs a cache invalidation for `/*` after upload. Use a **variable**, not a secret. |

## IAM policy (example)

Attach a policy like this to the **IAM user** (replace bucket name and, if needed, the CloudFront distribution ARN).

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DeployToBucket",
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:GetObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::YOUR_BUCKET_NAME",
        "arn:aws:s3:::YOUR_BUCKET_NAME/*"
      ]
    },
    {
      "Sid": "InvalidateCloudFront",
      "Effect": "Allow",
      "Action": "cloudfront:CreateInvalidation",
      "Resource": "arn:aws:cloudfront::ACCOUNT_ID:distribution/DISTRIBUTION_ID"
    }
  ]
}
```

Omit the `InvalidateCloudFront` statement if you do not set `CLOUDFRONT_DISTRIBUTION_ID`.

Create an **access key** for this user (IAM → Users → Security credentials → Create access key). Use case: “Application running outside AWS” or “CLI” depending on console wording. Store the ID and secret in the GitHub secrets above.

## Alternative: OIDC (no long-lived keys)

To avoid access keys, you can use **GitHub OIDC** and an IAM **role** instead. Replace the **Configure AWS credentials** step in `deploy-aws.yml` with:

```yaml
permissions:
  id-token: write
  contents: read

# ...

- name: Configure AWS credentials
  uses: aws-actions/configure-aws-credentials@v4
  with:
    role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
    aws-region: ${{ secrets.AWS_REGION }}
```

Configure the role trust policy for `token.actions.githubusercontent.com` and repository/subject conditions as in the [AWS documentation for GitHub OIDC](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services).

## SPA routing

This app is served from `/` with `base href="/"`. If you add deep links or move the app under a subpath, set `base-href` in the Angular build and configure S3/CloudFront (for example CloudFront custom error responses to `index.html` for 403/404) so client routes load correctly.

## Local check

```bash
npm ci
npm test
npm run build
ls dist/map-app/browser
```
