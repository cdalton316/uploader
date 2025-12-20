# SQS Queue Setup for S3 Upload Notifications

This guide explains how to set up an SQS queue to receive notifications when files are uploaded to your S3 bucket.

## Step 1: Create an SQS Queue

```bash
aws sqs create-queue --queue-name uploader-notifications --region us-east-1
```

Note the Queue URL from the output. You'll need it for the next steps.

## Step 2: Get the Queue ARN

```bash
aws sqs get-queue-attributes --queue-url <QUEUE_URL> --attribute-names QueueArn --region us-east-1
```

Copy the QueueArn value.

## Step 3: Apply the Queue Policy

Update the `sqs-queue-policy.json` file to replace `"Resource": "*"` with your actual Queue ARN, then apply it:

```bash
aws sqs set-queue-attributes --queue-url <QUEUE_URL> --attributes file://sqs-queue-policy.json --region us-east-1
```

Or manually set the policy attribute:

```bash
aws sqs set-queue-attributes --queue-url <QUEUE_URL> --attributes Policy="$(cat sqs-queue-policy.json)" --region us-east-1
```

## Step 4: Configure S3 Bucket Notification

Configure the S3 bucket to send notifications to the SQS queue:

```bash
aws s3api put-bucket-notification-configuration \
  --bucket uploader-cdalton \
  --notification-configuration '{
    "QueueConfigurations": [
      {
        "QueueArn": "arn:aws:sqs:us-east-1:235378703953:uploader-notifications",
        "Events": ["s3:ObjectCreated:*"],
        "Filter": {
          "Key": {
            "FilterRules": [
              {
                "Name": "prefix",
                "Value": "uploads/"
              }
            ]
          }
        }
      }
    ]
  }'
```

**Note:** Replace `arn:aws:sqs:us-east-1:235378703953:uploader-notifications` with your actual Queue ARN from Step 2.

## What This Does

- When a file is uploaded to the `uploads/` prefix in your S3 bucket, S3 will automatically send a message to your SQS queue
- The message will contain information about the uploaded object (bucket name, key, size, etc.)
- Your application can then poll the SQS queue to process these upload notifications

## Testing

After setup, upload a file through your app and check the SQS queue:

```bash
aws sqs receive-message --queue-url <QUEUE_URL> --region us-east-1
```

