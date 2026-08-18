---
name: file-uploads-storage
description: Patterns for file uploads (barber gallery, user avatars, service images) with Multer + S3/Cloudinary storage. Covers upload validation (type, size, magic bytes), image optimization (resize, WebP), and response envelope conventions. Use when implementing upload endpoints or debugging broken gallery images or [object Object] errors.
license: MIT
compatibility: "Compatible with Claude Code, OpenCode, Cursor, Copilot, Codex. Requires Node 20+."
metadata:
  trigger: ["file upload", "multer", "image upload", "gallery", "avatar", "s3 storage", "cloudinary", "file validation", "upload endpoint", "webp"]
  scope: [global, project]
  version: "1.0.0"
allowed-tools: Bash(node:*) Read
---

# 📁 File Uploads & Storage

Patterns for uploading files (barber gallery, avatars, service images) with validation, storage, and optimization. Prevents the gallery bug (#6) where image objects were treated as strings.

## 📋 When to Use

- Use when implementing an upload endpoint (avatar, gallery, service image)
- Use when debugging broken gallery images or `[object Object]` in image src
- Use when configuring S3, Cloudinary, or local storage
- Do NOT use for file downloads (use `api-design` for streaming responses)

## 🚦 Hard Rules

- **Always** validate file type by magic bytes, not just extension
- **Always** set `limits.fileSize` in Multer config
- **Always** strip EXIF metadata from images (privacy + size)
- **Never** trust the `Content-Type` header alone (can be spoofed)
- **Always** return upload response as `{ data: { url, thumbnailUrl, width, height } }` envelope

## 🛠️ Workflow

1. Read upload patterns: [upload-patterns.md](references/upload-patterns.md)
2. Read storage config: [storage-config.md](references/storage-config.md)
3. Read validation rules: [validation-rules.md](references/validation-rules.md)
4. Run the checker to verify upload endpoints have validation:
   ```bash
   node ./.opencode/skills/file-uploads-storage/scripts/check-uploads.mjs
   ```

## 📚 References

- [Upload Patterns](references/upload-patterns.md) — single avatar, multi-gallery, service-image
- [Storage Config](references/storage-config.md) — S3, Cloudinary, local
- [Validation Rules](references/validation-rules.md) — type, size, dimensions, sanitization
- [`prisma-frontend-types`](../prisma-frontend-types/SKILL.md) — gallery type mapping
- [`api-response-normalizer`](../api-response-normalizer/SKILL.md) — response envelope
