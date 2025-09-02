# Certificate Generation App

A Next.js application for generating certificates with student data overlay on PDF templates.

## Features

- **Student Management**: Bulk upload students via Excel files
- **Template Management**: Upload and manage PDF certificate templates
- **Certificate Generation**: Generate certificates with student data overlay
- **Certificate Regeneration**: Generate new versions of existing certificates
- **Batch Operations**: Generate and download multiple certificates
- **QR Code Integration**: Add QR codes to certificates for verification

## Performance Optimizations for Vercel

### API Optimizations

#### 1. **Bulk Upload API** (`/api/students/bulk-upload`)
- **Batch Processing**: Processes students in batches of 100 to avoid timeouts
- **Error Handling**: Continues processing even if some batches fail
- **Progress Tracking**: Shows detailed progress for large uploads

#### 2. **Certificate Generation API** (`/api/certificates/generate`)
- **Template Caching**: Caches PDF templates for 5 minutes to avoid repeated downloads
- **QR Code Caching**: Caches generated QR codes to avoid regeneration
- **Batch Database Operations**: Pre-generates certificate numbers and uses upsert for database operations
- **Parallel Processing**: Optimized PDF generation with reduced template loading

#### 3. **Batch Download API** (`/api/certificates/download-batch`)
- **Parallel Processing**: Downloads certificates in parallel batches of 10
- **Compression**: Uses DEFLATE compression for smaller ZIP files
- **Error Resilience**: Continues processing even if some certificates fail

### Vercel Configuration

The `vercel.json` file configures:
- **Function Timeouts**: Extended to 60 seconds for heavy operations
- **Cache Headers**: Prevents caching of API responses
- **Memory Optimization**: Optimized for Vercel's serverless environment

### Performance Monitoring

- **Real-time Metrics**: Performance monitor shows API response times
- **Success Rate Tracking**: Monitors API call success rates
- **Visual Feedback**: Progress indicators for long-running operations

### Database Optimizations

- **Batch Operations**: Uses batch inserts/updates instead of individual operations
- **Efficient Queries**: Minimizes database round trips
- **Connection Pooling**: Optimized Supabase client usage

### Storage Optimizations

- **Template Caching**: Reduces Supabase Storage API calls
- **Efficient File Handling**: Optimized PDF processing and storage
- **Parallel Uploads**: Batch uploads to Supabase Storage

## Development

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev

# Build for production
pnpm build
```

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Database Schema

### Students Table
- `candidate_name`: Student's full name
- `job_role`: Course/job role
- `enrollment_number`: Unique enrollment identifier
- `date_of_issuance`: Certificate issuance date
- Additional fields for training center, district, state, etc.

### Templates Table
- `title`: Template name
- `file_path`: Path to PDF template in storage
- `is_active`: Whether template is currently active

### Certificates Table
- `student_id`: Reference to student
- `template_id`: Reference to template
- `file_path`: Path to generated certificate
- `certificate_number`: Unique certificate identifier
- `certificate_version`: Version number for regeneration tracking
- `qr_code_data`: QR code content for verification
- `issued_at`: Timestamp when certificate was generated
- `is_revoked`: Whether certificate has been revoked

## API Endpoints

- `POST /api/students/bulk-upload`: Upload students from Excel
- `POST /api/certificates/generate`: Generate certificates (supports regeneration)
- `POST /api/certificates/download-batch`: Download multiple certificates
- `GET /api/certificates/latest/[studentId]`: Get latest certificate for a student
- `GET/POST /api/templates`: Manage certificate templates

## Performance Tips

1. **Large Uploads**: Use batch processing for files with >100 students
2. **Certificate Generation**: Generate certificates in smaller batches for better performance
3. **Certificate Regeneration**: Each regeneration creates a new version with a unique certificate number, allowing multiple certificates per student
4. **Template Management**: Keep template files optimized (<5MB recommended)
5. **Monitoring**: Use the performance monitor to track API response times

## Deployment

The app is optimized for Vercel deployment with:
- Extended function timeouts
- Optimized memory usage
- Efficient cold start handling
- Proper error handling for serverless environment
