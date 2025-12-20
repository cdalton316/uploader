import { S3Client, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { NextResponse } from 'next/server';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
});

const BUCKET_NAME = 'uploader-downloads-briefly2';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const prefix = searchParams.get('prefix') || 'uploads/';
    const maxKeys = parseInt(searchParams.get('maxKeys') || '100');

    const command = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: prefix,
      MaxKeys: maxKeys,
    });

    const response = await s3Client.send(command);

    // Format the response and generate pre-signed URLs for each image
    const images = await Promise.all(
      (response.Contents || []).map(async (object) => {
        // Generate pre-signed URL for viewing (valid for 1 hour)
        const getObjectCommand = new GetObjectCommand({
          Bucket: BUCKET_NAME,
          Key: object.Key,
        });

        const presignedUrl = await getSignedUrl(s3Client, getObjectCommand, {
          expiresIn: 3600,
        });

        return {
          key: object.Key,
          name: object.Key.split('/').pop(),
          size: object.Size,
          lastModified: object.LastModified,
          url: presignedUrl,
        };
      })
    );

    return NextResponse.json({
      images,
      isTruncated: response.IsTruncated || false,
      keyCount: images.length,
    });
  } catch (error) {
    console.error('Error listing images:', error);
    return NextResponse.json(
      { error: 'Failed to list images', details: error.message },
      { status: 500 }
    );
  }
}

