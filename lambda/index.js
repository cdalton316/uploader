const {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
} = require("@aws-sdk/client-s3");
const Jimp = require("jimp");

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
});
const SOURCE_BUCKET = "uploader-cdalton";
const DEST_BUCKET = "uploader-downloads-briefly2";

exports.handler = async (event) => {
  try {
    console.log("Received event:", JSON.stringify(event, null, 2));

    // Check if event has Records
    if (!event.Records || !Array.isArray(event.Records)) {
      console.log("No records found in event");
      return {
        statusCode: 200,
        body: JSON.stringify({ message: "No records to process" }),
      };
    }

    // Process each SQS record
    for (const record of event.Records) {
      try {
        console.log("Processing SQS record:", JSON.stringify(record, null, 2));

        // Parse the SQS message body (which contains the S3 event)
        let s3Event;
        try {
          s3Event = JSON.parse(record.body);
        } catch (parseError) {
          console.error("Error parsing record body:", parseError);
          console.log("Record body:", record.body);
          continue;
        }

        // Handle S3 event notifications
        if (s3Event.Records && Array.isArray(s3Event.Records)) {
          console.log(`Found ${s3Event.Records.length} S3 records`);
          for (const s3Record of s3Event.Records) {
            await processS3Record(s3Record);
          }
        } else if (s3Event.s3) {
          // If the message body is already the S3 record
          console.log("Processing single S3 record");
          await processS3Record(s3Event);
        } else {
          console.log(
            "Unknown event structure:",
            JSON.stringify(s3Event, null, 2)
          );
        }
      } catch (error) {
        console.error("Error processing record:", error);
        console.error("Error stack:", error.stack);
        // Continue processing other records even if one fails
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Processing completed" }),
    };
  } catch (error) {
    console.error("Fatal error in handler:", error);
    console.error("Error stack:", error.stack);
    throw error;
  }
};

async function processS3Record(s3Record) {
  try {
    if (
      !s3Record ||
      !s3Record.s3 ||
      !s3Record.s3.bucket ||
      !s3Record.s3.object
    ) {
      console.error(
        "Invalid S3 record structure:",
        JSON.stringify(s3Record, null, 2)
      );
      return;
    }

    const bucket = s3Record.s3.bucket.name;
    const key = decodeURIComponent(s3Record.s3.object.key.replace(/\+/g, " "));

    console.log(`Processing file: ${bucket}/${key}`);

    // Skip if not an image file
    if (!isImageFile(key)) {
      console.log(`Skipping non-image file: ${key}`);
      return;
    }

    // Download the image from S3
    console.log(`Downloading ${key} from ${bucket}`);
    const getObjectCommand = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    const response = await s3Client.send(getObjectCommand);
    const imageBuffer = await streamToBuffer(response.Body);
    console.log(`Downloaded ${imageBuffer.length} bytes`);

    // Add watermark to the image
    console.log("Adding watermark...");
    const watermarkedImage = await addWatermark(imageBuffer);
    console.log("Watermark added, size:", watermarkedImage.length);

    // Upload watermarked image to destination bucket
    const destKey = key; // Keep the same key structure
    console.log(`Uploading to ${DEST_BUCKET}/${destKey}`);
    const putObjectCommand = new PutObjectCommand({
      Bucket: DEST_BUCKET,
      Key: destKey,
      Body: watermarkedImage,
      ContentType: response.ContentType || "image/jpeg",
    });

    await s3Client.send(putObjectCommand);
    console.log(`Successfully processed and uploaded: ${destKey}`);
  } catch (error) {
    console.error(`Error processing S3 record:`, error);
    console.error(`Error stack:`, error.stack);
    // Don't throw - let the outer handler decide what to do
    throw error;
  }
}

async function addWatermark(imageBuffer) {
  try {
    console.log("Loading image with Jimp...");
    // Load image with Jimp
    const image = await Jimp.read(imageBuffer);
    const { width, height } = image.bitmap;
    console.log(`Image dimensions: ${width}x${height}`);

    // Watermark settings
    const watermarkText = "briefly.dev";
    const padding = 20;

    // Load font - using a larger font for visibility
    // Jimp has built-in fonts: FONT_SANS_8, FONT_SANS_16, FONT_SANS_32, etc.
    const fontSize = Math.max(32, Math.floor(width / 15)); // Responsive font size
    console.log(`Calculated font size: ${fontSize}`);

    let font;
    // Choose font size based on calculated fontSize
    if (fontSize >= 64) {
      console.log("Loading FONT_SANS_64_WHITE");
      font = await Jimp.loadFont(Jimp.FONT_SANS_64_WHITE);
    } else if (fontSize >= 32) {
      console.log("Loading FONT_SANS_32_WHITE");
      font = await Jimp.loadFont(Jimp.FONT_SANS_32_WHITE);
    } else {
      console.log("Loading FONT_SANS_16_WHITE");
      font = await Jimp.loadFont(Jimp.FONT_SANS_16_WHITE);
    }

    // Calculate text dimensions
    const textWidth = Jimp.measureText(font, watermarkText);
    const textHeight = Jimp.measureTextHeight(font, watermarkText);
    console.log(`Text dimensions: ${textWidth}x${textHeight}`);

    // Create a semi-transparent background for the text (for better visibility)
    const bgWidth = textWidth + padding * 2;
    const bgHeight = textHeight + padding;
    console.log(`Creating background: ${bgWidth}x${bgHeight}`);
    const bg = new Jimp(bgWidth, bgHeight, 0x00000080); // Semi-transparent black

    // Draw text on background
    bg.print(font, padding, padding / 2, watermarkText);

    // Calculate position (bottom right)
    const x = width - bgWidth - padding;
    const y = height - bgHeight - padding;
    console.log(`Watermark position: (${x}, ${y})`);

    // Composite the watermark onto the image
    image.composite(bg, x, y, {
      mode: Jimp.BLEND_SOURCE_OVER,
      opacitySource: 0.8,
      opacityDest: 1,
    });

    // Convert back to buffer (maintain original format)
    const mime = image.getMIME();
    console.log(`Converting to ${mime}`);
    const buffer = await image.getBufferAsync(mime);

    return buffer;
  } catch (error) {
    console.error("Error adding watermark:", error);
    console.error("Error stack:", error.stack);
    throw error;
  }
}

function isImageFile(key) {
  const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp"];
  const lowerKey = key.toLowerCase();
  return imageExtensions.some((ext) => lowerKey.endsWith(ext));
}

async function streamToBuffer(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on("data", (chunk) => chunks.push(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(Buffer.concat(chunks)));
  });
}
