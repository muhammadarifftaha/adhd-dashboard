import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
  type GetObjectCommandOutput,
} from "@aws-sdk/client-s3";

// Fail fast on misconfiguration (same philosophy as auth.ts / db.ts): a missing
// endpoint or credential should surface loudly at startup, not as a confusing
// runtime upload error.
const S3_ENDPOINT = process.env.S3_ENDPOINT;
if (!S3_ENDPOINT) {
  throw new Error("S3_ENDPOINT is required but was not set.");
}
const S3_ACCESS_KEY_ID = process.env.S3_ACCESS_KEY_ID;
if (!S3_ACCESS_KEY_ID) {
  throw new Error("S3_ACCESS_KEY_ID is required but was not set.");
}
const S3_SECRET_ACCESS_KEY = process.env.S3_SECRET_ACCESS_KEY;
if (!S3_SECRET_ACCESS_KEY) {
  throw new Error("S3_SECRET_ACCESS_KEY is required but was not set.");
}
const S3_BUCKET = process.env.S3_BUCKET;
if (!S3_BUCKET) {
  throw new Error("S3_BUCKET is required but was not set.");
}

// `forcePathStyle` is REQUIRED for MinIO: it addresses buckets as
// `endpoint/bucket/key` rather than the virtual-host style `bucket.endpoint`
// that AWS uses (MinIO has no per-bucket DNS).
const s3 = new S3Client({
  endpoint: S3_ENDPOINT,
  region: process.env.S3_REGION ?? "us-east-1",
  forcePathStyle: true,
  credentials: {
    accessKeyId: S3_ACCESS_KEY_ID,
    secretAccessKey: S3_SECRET_ACCESS_KEY,
  },
});

// Create the bucket on first use so a fresh MinIO volume works with no manual
// setup. Cached after the first success so it costs one HeadBucket per process.
let bucketReady = false;
async function ensureBucket(): Promise<void> {
  if (bucketReady) return;
  try {
    await s3.send(new HeadBucketCommand({ Bucket: S3_BUCKET }));
  } catch {
    // Missing (or not yet visible) — create it. A racing create is harmless;
    // BucketAlreadyOwnedByYou is not an error we need to surface.
    try {
      await s3.send(new CreateBucketCommand({ Bucket: S3_BUCKET }));
    } catch (error) {
      const name = (error as { name?: string })?.name;
      if (name !== "BucketAlreadyOwnedByYou" && name !== "BucketAlreadyExists") {
        throw error;
      }
    }
  }
  bucketReady = true;
}

/** Store an object and return its key. */
export async function putObject(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string,
): Promise<string> {
  await ensureBucket();
  await s3.send(
    new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
  return key;
}

/** Fetch an object (caller reads `.Body` / `.ContentType`). Throws if absent. */
export async function getObject(key: string): Promise<GetObjectCommandOutput> {
  return s3.send(new GetObjectCommand({ Bucket: S3_BUCKET, Key: key }));
}

/** Best-effort delete; safe to call for a key that may not exist. */
export async function deleteObject(key: string): Promise<void> {
  await s3.send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: key }));
}
