# Storage Configuration

## Option 1: AWS S3

```typescript
// apps/api/src/config/s3.ts
import { S3Client } from "@aws-sdk/client-s3";

export const s3Client = new S3Client({
  region: process.env.S3_REGION,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY,
    secretAccessKey: process.env.S3_SECRET_KEY,
  },
});

// Env vars required:
// S3_BUCKET, S3_REGION, S3_ACCESS_KEY, S3_SECRET_KEY, S3_CDN_URL
```

## Option 2: Cloudinary

```typescript
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Upload
const result = await cloudinary.uploader.upload(buffer, {
  folder: "avatars",
  transformation: [{ width: 256, height: 256, crop: "cover" }, { fetch_format: "webp" }],
});
// result.secure_url is the CDN URL
```

## Option 3: Local Storage (Dev Only)

```typescript
import multer from "multer";

const localStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, `${req.user.id}-${Date.now()}-${file.originalname}`),
});

// Serve via Express static
app.use("/uploads", express.static("uploads"));
// URL: http://localhost:3000/uploads/abc-123-photo.jpg
```

## CDN Configuration

For production, use a CDN (CloudFront, Cloudinary, or Bunny CDN) in front of S3:

```
S3_BUCKET → CloudFront → CDN URL (S3_CDN_URL env var)
```

The app only stores the CDN URL, never the raw S3 URL.

## Presigned URLs (Alternative)

For direct-to-S3 uploads from mobile (bypassing server):

```typescript
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

router.get("/upload-url", auth, async (req, res) => {
  const key = `avatars/${req.user.id}-${Date.now()}.webp`;
  const url = await getSignedUrl(s3Client, new PutObjectCommand({
    Bucket: process.env.S3_BUCKET,
    Key: key,
  }), { expiresIn: 300 }); // 5 min

  res.json({ data: { uploadUrl: url, key, cdnUrl: `${process.env.S3_CDN_URL}/${key}` } });
});
```

Mobile uploads directly to S3 via `uploadUrl`, then sends `cdnUrl` to the server to save in DB.

## Env Vars Checklist

| Var | S3 | Cloudinary | Local |
|---|---|---|---|
| Storage provider | `S3` | `CLOUDINARY` | `LOCAL` |
| Bucket/Cloud | `S3_BUCKET` | `CLOUDINARY_CLOUD_NAME` | — |
| Credentials | `S3_ACCESS_KEY` + `S3_SECRET_KEY` | `CLOUDINARY_API_KEY` + `CLOUDINARY_API_SECRET` | — |
| Region | `S3_REGION` | — | — |
| CDN URL | `S3_CDN_URL` | auto (cloudinary) | `http://localhost:3000/uploads` |
