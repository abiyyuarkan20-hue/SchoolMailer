# Custom Data API Documentation

## Overview

The Custom Data API allows administrators to manage student-specific custom data that can be used in letter templates. This feature enables bulk import/export of custom fields and automatic variable mapping during letter generation.

## Base URL

All endpoints are prefixed with: `/api`

Authentication is required for all endpoints using Bearer token.

## Endpoints

### Custom Data Management

#### 1. Update Custom Data
Update or add custom data fields for a specific student.

**Endpoint:** `PATCH /students/:id/custom-data`

**Authentication:** Required

**Request Body:**
```json
{
  "tempat_lahir": "Jakarta",
  "tanggal_lahir": "2005-03-15",
  "asal_sekolah": "SMP N 1 Jakarta",
  "nama_wali": "Jane Doe"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Data custom berhasil diperbarui",
  "data": {
    "id": "cuid123",
    "nisn": "1234567890",
    "name": "John Doe",
    "extraData": {
      "tempat_lahir": "Jakarta",
      "tanggal_lahir": "2005-03-15",
      "asal_sekolah": "SMP N 1 Jakarta",
      "nama_wali": "Jane Doe"
    },
    "updatedAt": "2025-01-15T10:30:00Z"
  }
}
```

**Validation Rules:**
- Keys must be alphanumeric + underscore only (1-50 characters)
- Reserved field names cannot be used (id, nisn, name, grade, etc.)
- String values: max 500 characters
- Number values: range -1e10 to 1e10
- Supported types: string, number, boolean

---

#### 2. Get Custom Data
Retrieve custom data for a specific student.

**Endpoint:** `GET /students/:id/custom-data`

**Authentication:** Required

**Response (200):**
```json
{
  "success": true,
  "message": "Data custom berhasil diambil",
  "data": {
    "tempat_lahir": "Jakarta",
    "tanggal_lahir": "2005-03-15",
    "asal_sekolah": "SMP N 1 Jakarta"
  }
}
```

---

#### 3. Delete Custom Data Keys
Remove specific keys from a student's custom data.

**Endpoint:** `DELETE /students/:id/custom-data`

**Authentication:** Required

**Request Body:**
```json
{
  "keys": ["tempat_lahir", "asal_sekolah"]
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Data custom berhasil dihapus",
  "data": {
    "extraData": {
      "tanggal_lahir": "2005-03-15"
    }
  }
}
```

---

### Bulk Import/Export

#### 4. Bulk Import Custom Data
Import custom data for multiple students from CSV/Excel file.

**Endpoint:** `POST /students/custom-data/import`

**Authentication:** Required

**Content-Type:** `multipart/form-data`

**Form Data:**
- `file`: CSV or XLSX file

**File Format Requirements:**
- Must include `NISN` column
- Supported formats: .csv, .xlsx
- Max file size: 10MB
- Max rows: 5000

**Column Mapping:**
Standard fields (mapped to Student model):
- `nisn`, `NISN` → Student.nisn
- `name`, `nama` → Student.name
- `grade`, `kelas` → Student.grade
- `gender`, `jenis_kelamin`, `jk` → Student.gender
- `parentName`, `nama_orang_tua` → Student.parentName
- `parentPhone`, `no_hp_ortu` → Student.parentPhone
- `address`, `alamat` → Student.address
- `email` → Student.email

All other columns are treated as custom data.

**Column Name Normalization:**
- Converted to lowercase
- Spaces and special characters replaced with underscores
- Example: "Tempat Lahir" → "tempat_lahir"

**Response (200):**
```json
{
  "success": true,
  "message": "Import selesai: 245 berhasil, 5 gagal",
  "data": {
    "importedCount": 245,
    "totalRows": 250,
    "skippedCount": 5,
    "errors": [
      {
        "row": 12,
        "nisn": "9876543210",
        "message": "NISN tidak ditemukan di database"
      },
      {
        "row": 45,
        "nisn": "",
        "message": "NISN wajib diisi dan tidak boleh kosong"
      }
    ],
    "warnings": [
      {
        "message": "Kolom 'Tempat Lahir' dan 'tempat_lahir' dinormalisasi menjadi 'tempat_lahir' yang sama"
      }
    ]
  }
}
```

**Example CSV:**
```csv
NISN,name,grade,tempat_lahir,tanggal_lahir,asal_sekolah
1234567890,John Doe,X-A,Jakarta,2005-03-15,SMP N 1 Jakarta
9876543210,Jane Smith,X-B,Bandung,2005-07-20,SMP N 2 Bandung
```

---

#### 5. Export Student Data
Export student data with custom fields to CSV/Excel.

**Endpoint:** `GET /students/custom-data/export`

**Authentication:** Required

**Query Parameters:**
- `format`: File format (`csv` or `xlsx`, default: `xlsx`)
- `grade`: Filter by grade (optional)
- `className`: Filter by class name (optional)
- `search`: Search by name or NISN (optional)

**Example:**
```
GET /students/custom-data/export?format=xlsx&grade=X&className=X-A
```

**Response (200):**
- Content-Type: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` (for xlsx)
- Content-Type: `text/csv` (for csv)
- Content-Disposition: `attachment; filename="students_export_2025-01-15.xlsx"`

**Export Columns:**
- Standard columns: NISN, Name, Grade, Class, Gender, Parent Name, Parent Phone, Address, Email
- Dynamic columns: All unique custom data keys across selected students
- Empty cells for missing custom data

**Encoding:** UTF-8 with BOM for Excel compatibility

---

### Custom Variables Settings

#### 6. Get Global Custom Variables
Retrieve the list of globally defined custom variables.

**Endpoint:** `GET /settings/custom-variables`

**Authentication:** Required

**Response (200):**
```json
{
  "success": true,
  "message": "Custom variables berhasil diambil",
  "data": {
    "customVariables": [
      "tempat_lahir",
      "tanggal_lahir",
      "asal_sekolah",
      "nama_wali",
      "pekerjaan_ortu"
    ]
  }
}
```

---

#### 7. Update Global Custom Variables
Update the list of globally defined custom variables.

**Endpoint:** `PUT /settings/custom-variables`

**Authentication:** Required

**Request Body:**
```json
{
  "customVariables": [
    "tempat_lahir",
    "tanggal_lahir",
    "asal_sekolah",
    "nama_wali",
    "pekerjaan_ortu",
    "alamat_wali"
  ]
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Daftar variabel custom berhasil diperbarui",
  "data": {
    "customVariables": [
      "tempat_lahir",
      "tanggal_lahir",
      "asal_sekolah",
      "nama_wali",
      "pekerjaan_ortu",
      "alamat_wali"
    ]
  }
}
```

**Validation:**
- Must be an array of strings
- Each item must be a string

---

### Preview Feature

#### 8. Generate Letter Preview
Generate HTML preview of a letter for a specific student.

**Endpoint:** `POST /generator/preview`

**Authentication:** Required

**Request Body:**
```json
{
  "templateId": "template_cuid",
  "studentId": "student_cuid",
  "customData": {
    "additional_field": "value"
  }
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Preview berhasil dibuat",
  "data": {
    "html": "<!DOCTYPE html>...",
    "variables": [
      {
        "variable": "nama_siswa",
        "available": true,
        "value": "John Doe"
      },
      {
        "variable": "tempat_lahir",
        "available": true,
        "value": "Jakarta"
      },
      {
        "variable": "hobi",
        "available": false,
        "value": null
      }
    ],
    "missingVariables": ["hobi"],
    "studentName": "John Doe",
    "studentNisn": "1234567890"
  }
}
```

---

## Variable Mapping in Templates

### Standard Variables
These variables are automatically available for all students:

- `{{nisn}}` - Student NISN
- `{{nama_siswa}}` - Student name
- `{{kelas}}` - Student class
- `{{jenis_kelamin}}` - Student gender (Laki-laki/Perempuan)
- `{{nama_orang_tua}}` - Parent name
- `{{no_hp_ortu}}` - Parent phone number
- `{{alamat}}` - Student address
- `{{email}}` - Student email
- `{{tanggal_surat}}` - Current date (formatted)

### Custom Variables
Any key stored in `extraData` can be used as a template variable:

- `{{tempat_lahir}}` - Birth place
- `{{tanggal_lahir}}` - Birth date
- `{{asal_sekolah}}` - Previous school
- Any other custom field

### Variable Priority
When multiple sources have the same key:
1. **Standard fields** (highest priority) - from Student model
2. **Custom fields** - from Student.extraData
3. **Global data** - from form input

### Case Insensitivity
Variable names are case-insensitive:
- `{{Tempat_Lahir}}` matches `tempat_lahir` in extraData
- `{{TANGGAL-LAHIR}}` matches `tanggal_lahir` in extraData

### Missing Variables
Variables without data are replaced with empty string.

---

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "message": "Validasi custom data gagal",
  "details": [
    "Key 'nama siswa' tidak valid. Gunakan hanya huruf, angka, dan underscore (1-50 karakter)",
    "Key 'id' adalah field reserved dan tidak boleh digunakan"
  ]
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "Siswa tidak ditemukan"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Gagal menyimpan custom data",
  "details": "Database connection error"
}
```

---

## Best Practices

### 1. Custom Data Keys
- Use lowercase with underscores: `tempat_lahir` ✓
- Avoid spaces or special characters: `Tempat Lahir` ✗
- Keep keys descriptive but concise
- Define global custom variables for consistency

### 2. Bulk Import
- Validate file format before upload
- Keep files under 5000 rows for best performance
- Review import errors and fix data before re-importing
- Use export-edit-import workflow for bulk updates

### 3. Template Variables
- Always use lowercase variable names in templates
- Use preview feature to verify data mapping
- Define default values for optional variables
- Document required custom fields for each template

### 4. Data Management
- Regularly export data as backup
- Clean up unused custom data keys
- Maintain global custom variables list
- Use consistent naming across all students

---

## Changelog

### Version 1.0.0 (2025-01-15)
- Initial release
- Custom data CRUD operations
- Bulk import/export functionality
- Variable mapping in generator
- Preview feature
- Global custom variables management
