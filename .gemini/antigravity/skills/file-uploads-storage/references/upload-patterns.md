# Upload Patterns

## Pattern 1: Single Avatar Upload

```typescript
import multer from "multer";
import sharp from "sharp";
import { s3Client } from "../config/s3";

const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files allowed"));
  },
});

router.post("/avatar", auth, avatarUpload.single("avatar"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: { code: "NO_FILE", message: "No file uploaded" } });

  // Resize + strip EXIF + convert to WebP
  const processed = await sharp(req.file.buffer)
    .resize(256, 256, { fit: "cover" })
    .webp({ quality: 80 })
    .toBuffer();

  const key = `avatars/${req.user.id}-${Date.now()}.webp`;
  await s3Client.putObject({ Bucket: process.env.S3_BUCKET, Key: key, Body: processed });

  const url = `${process.env.S3_CDN_URL}/${key}`;
  res.json({ data: { url, width: 256, height: 256 } });
});
```

## Pattern 2: Multi-Gallery Upload (Barber)

```typescript
const galleryUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 8 }, // 10MB each, max 8
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error(`Type ${file.mimetype} not allowed`));
  },
});

router.post("/gallery", auth, barberOnly, galleryUpload.array("gallery", 8), async (req, res) => {
  const files = req.files as Express.Multer.File[];
  if (!files || files.length === 0) {
    return res.status(400).json({ error: { code: "NO_FILES", message: "No files uploaded" } });
  }

  const galleryItems = await Promise.all(
    files.map(async (file, index) => {
      // Process each image
      const [full, thumb] = await Promise.all([
        sharp(file.buffer).resize(1920, 1080, { fit: "inside" }).webp({ quality: 85 }).toBuffer(),
        sharp(file.buffer).resize(400, 300, { fit: "cover" }).webp({ quality: 70 }).toBuffer(),
      ]);

      const fullKey = `gallery/${req.user.id}-${Date.now()}-${index}.webp`;
      const thumbKey = `gallery/thumbs/${req.user.id}-${Date.now()}-${index}.webp`;

      await Promise.all([
        s3Client.putObject({ Bucket: process.env.S3_BUCKET, Key: fullKey, Body: full }),
        s3Client.putObject({ Bucket: process.env.S3_BUCKET, Key: thumbKey, Body: thumb }),
      ]);

      // Save to DB
      return prisma.barberGallery.create({
        data: {
          barberId: req.user.barberProfile.id,
          imageUrl: `${process.env.S3_CDN_URL}/${fullKey}`,
          thumbnailUrl: `${process.env.S3_CDN_URL}/${thumbKey}`,
          caption: req.body.captions?.[index] || null,
        },
      });
    })
  );

  res.json({ data: galleryItems.map(g => ({
    id: g.id,
    imageUrl: g.imageUrl,
    thumbnailUrl: g.thumbnailUrl,
    caption: g.caption,
  })) });
});
```

## Pattern 3: Service Image Upload

Similar to avatar but with larger dimensions (800x600) and no square crop.

## Response Envelope

All upload responses must use this shape:

```typescript
interface UploadResponse {
  data: {
    id?: string;          // DB id if persisted
    url: string;          // full-size URL
    thumbnailUrl?: string; // thumbnail URL (for gallery)
    width: number;
    height: number;
    caption?: string;
  };
}
```

This prevents the `[object Object]` bug — the frontend knows the exact shape and accesses `item.imageUrl`, not `item` directly.
