# File Validation Rules

## 1. Type Validation

### By Extension (weak — easily spoofed)

```typescript
const allowedExtensions = [".jpg", ".jpeg", ".png", ".webp"];
```

### By Mimetype (medium — can be spoofed)

```typescript
const allowedMimetypes = ["image/jpeg", "image/png", "image/webp"];
fileFilter: (req, file, cb) => {
  if (allowedMimetypes.includes(file.mimetype)) cb(null, true);
  else cb(new Error(`Type ${file.mimetype} not allowed`));
}
```

### By Magic Bytes (strong — reads actual file header)

```typescript
import { fileTypeFromBuffer } from "file-type";

async function validateFileType(buffer: Buffer, allowedTypes: string[]) {
  const type = await fileTypeFromBuffer(buffer);
  if (!type || !allowedTypes.includes(type.mime)) {
    throw new Error(`File type not allowed. Detected: ${type?.mime ?? "unknown"}`);
  }
  return type;
}

// In the handler:
await validateFileType(req.file.buffer, ["image/jpeg", "image/png", "image/webp"]);
```

**Always use magic bytes** for security. A `.jpg` file could actually be a `.exe`.

## 2. Size Limits

| Upload Type | Max Size | Reason |
|---|---|---|
| Avatar | 5 MB | Small image, resized to 256x256 |
| Gallery photo | 10 MB | Higher quality, resized to 1920x1080 |
| Service image | 5 MB | Medium quality, resized to 800x600 |
| Document (if needed) | 2 MB | PDF only |

```typescript
limits: {
  fileSize: 5 * 1024 * 1024, // 5MB in bytes
  files: 8,                   // max 8 files per multi-upload
}
```

## 3. Image Dimensions

Validate dimensions after processing with sharp:

```typescript
const metadata = await sharp(buffer).metadata();
if (metadata.width < 200 || metadata.height < 200) {
  throw new Error("Image too small. Minimum 200x200.");
}
if (metadata.width > 10000 || metadata.height > 10000) {
  throw new Error("Image too large. Maximum 10000x10000.");
}
```

## 4. EXIF Stripping

EXIF metadata can contain GPS coordinates, camera info, and user data. Always strip:

```typescript
const cleaned = await sharp(buffer)
  .rotate() // auto-rotate based on EXIF
  .resize(256, 256)
  .webp()   // WebP doesn't carry EXIF by default
  .toBuffer();
```

Converting to WebP automatically strips EXIF. If keeping JPEG/PNG, use `.removeAlpha()` and re-encode.

## 5. Filename Sanitization

Never trust the original filename. Generate your own:

```typescript
// BAD: uses user-provided filename
filename: req.file.originalname // could contain path traversal: ../../etc/passwd

// GOOD: generate safe filename
const key = `avatars/${req.user.id}-${Date.now()}.webp`;
```

## 6. Rate Limiting Uploads

```typescript
const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10, // 10 uploads per minute
  message: { error: "Too many uploads, slow down" },
});

router.post("/avatar", uploadLimiter, avatarUpload.single("avatar"), handler);
```
