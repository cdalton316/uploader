# Lambda Watermark Function

This Lambda function processes images uploaded to S3, adds a watermark, and uploads them to a destination bucket.

## Setup Instructions

### 1. Install Dependencies

Navigate to the lambda folder and install dependencies:

```bash
cd lambda
npm install
```

### 2. Create Deployment Package

**On Windows (PowerShell):**

```powershell
# Navigate to lambda folder
cd lambda

# Create a zip file excluding node_modules/.cache and other unnecessary files
Compress-Archive -Path index.js,package.json,package-lock.json,node_modules -DestinationPath ../watermark-lambda.zip -Force
```

**On Linux/Mac:**

```bash
cd lambda
zip -r ../watermark-lambda.zip . -x "*.git*" -x "node_modules/.cache/*"
```

### 3. Upload to Lambda

1. Go to AWS Lambda Console
2. Select your `watermark` function
3. Click "Upload from" → ".zip file"
4. Upload the `watermark-lambda.zip` file
5. Set the handler to: `index.handler`
6. Set timeout to: 65 seconds (or higher)
7. Set memory to: 512 MB (or higher for large images)

### 4. Environment Variables (Optional)

If your buckets are in a different region, set:
- `AWS_REGION`: Your AWS region (default: us-east-1)

### 5. IAM Permissions

Ensure your Lambda execution role has these permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject"
      ],
      "Resource": "arn:aws:s3:::uploader-cdalton/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject"
      ],
      "Resource": "arn:aws:s3:::uploader-downloads-briefly/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "sqs:ReceiveMessage",
        "sqs:DeleteMessage",
        "sqs:GetQueueAttributes"
      ],
      "Resource": "arn:aws:sqs:us-east-1:235378703953:image-uploads"
    }
  ]
}
```

## How It Works

1. SQS message is received when a file is uploaded to `uploader-cdalton/uploads/`
2. Lambda downloads the image from S3
3. Adds "briefly.dev" watermark in bottom right corner
4. Uploads watermarked image to `uploader-downloads-briefly` bucket
5. Maintains the same folder structure (key) as the source

## Supported Image Formats

- JPEG/JPG
- PNG
- GIF
- WebP
- BMP
- TIFF

## Notes

- Non-image files are skipped
- Watermark text size is responsive based on image dimensions
- Watermark is semi-transparent white text with a dark stroke for visibility

