# Implementation Plan: Student Custom Data Sync

## Overview

This implementation plan extends the existing student management system to support custom data storage, bulk import/export, and automatic variable mapping during letter generation. The implementation will integrate with the existing Express/Node.js backend, Prisma ORM, and generator service without disrupting current functionality.

**Technology Stack**: JavaScript (Node.js), Express.js, Prisma, PostgreSQL
**Integration Points**: Students module, Generator module, Settings module

## Tasks

- [x] 1. Set up Custom Data Manager service
  - Create `apps/backend/src/modules/students/customData.service.js`
  - Implement `updateCustomData()` method to merge key-value pairs into Student.extraData JSON field
  - Implement `getCustomData()` method to retrieve extraData for a student
  - Implement `deleteCustomDataKeys()` method to remove specific keys from extraData
  - Implement `validateCustomData()` method to validate key format (alphanumeric + underscore only)
  - Use Prisma JSON field operations for atomic updates
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 2. Add Custom Data API endpoints to Students module
  - [x] 2.1 Create custom data routes and controller
    - Add routes in `apps/backend/src/modules/students/students.routes.js` for custom data endpoints
    - Create `customDataController` methods in `apps/backend/src/modules/students/students.controller.js`
    - Implement PATCH `/api/students/:id/custom-data` endpoint for updating custom data
    - Implement GET `/api/students/:id/custom-data` endpoint for retrieving custom data
    - Implement DELETE `/api/students/:id/custom-data` endpoint for deleting specific keys
    - Add authentication middleware to protect all custom data endpoints
    - _Requirements: 3.1, 3.4, 3.6_

  - [ ]* 2.2 Write unit tests for custom data controller
    - Test successful update of custom data
    - Test retrieval of custom data
    - Test deletion of specific keys
    - Test validation errors for invalid keys
    - Test authentication requirements
    - _Requirements: 3.1, 3.4, 3.6_

- [x] 3. Implement Bulk Import Service
  - [x] 3.1 Create bulk import service module
    - Create `apps/backend/src/modules/students/bulkImport.service.js`
    - Implement CSV and XLSX file parsing using existing csv-parser and xlsx libraries
    - Implement `importCustomData()` method that processes uploaded files
    - Implement `normalizeColumnName()` method to convert column names to lowercase with underscores
    - Implement `extractCustomData()` method to separate standard fields from custom fields
    - Define standard field mappings (nisn, name, grade, className, gender, parentName, parentPhone, address, email)
    - All non-standard columns treated as custom data and stored in extraData
    - _Requirements: 2.1, 2.2, 2.4, 5.4, 5.5_

  - [x] 3.2 Implement import validation and error handling
    - Validate NISN column exists in file
    - Validate each row has non-empty NISN value
    - Match NISN to existing students, log errors for missing students
    - Validate column names (alphanumeric + underscore only after normalization)
    - Detect duplicate column names after normalization and add warnings
    - Handle files up to 5000 rows with 60-second timeout
    - Return ImportResult with importedCount, totalRows, skippedCount, errors array, warnings array
    - _Requirements: 2.3, 2.5, 2.7, 5.1, 5.2, 5.3, 5.6_

  - [x] 3.3 Add bulk import API endpoint
    - Create POST `/api/students/custom-data/import` endpoint in students.routes.js
    - Add multer middleware for file upload handling
    - Create controller method that calls bulkImport.service
    - Return detailed ImportResult with success/error counts
    - Add authentication middleware
    - _Requirements: 2.1, 2.5_

  - [ ]* 3.4 Write unit tests for bulk import service
    - Test CSV file parsing and import
    - Test XLSX file parsing and import
    - Test column name normalization
    - Test standard field vs custom field separation
    - Test NISN validation and error logging
    - Test handling of missing students
    - Test duplicate column name detection
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 5.4, 5.5_

- [x] 4. Checkpoint - Test custom data storage and import
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement Export Service
  - [x] 5.1 Create export service module
    - Create `apps/backend/src/modules/students/export.service.js`
    - Implement `exportStudentData()` method supporting CSV and XLSX formats
    - Implement `collectCustomKeys()` method to gather all unique extraData keys across students
    - Build export with standard columns (NISN, Name, Grade, Class, Gender, Parent Name, Parent Phone, Address, Email) + dynamic custom columns
    - Handle missing custom data values as empty cells
    - Use UTF-8 encoding with BOM for Excel compatibility
    - Handle up to 5000 students with 30-second timeout
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [x] 5.2 Add export API endpoint
    - Create GET `/api/students/custom-data/export` endpoint in students.routes.js
    - Support query parameters: format (csv/xlsx), grade, className for filtering
    - Return file with appropriate Content-Type and Content-Disposition headers
    - Generate filename with timestamp: `students_export_YYYY-MM-DD.{format}`
    - Add authentication middleware
    - _Requirements: 6.1, 6.6_

  - [ ]* 5.3 Write unit tests for export service
    - Test CSV export generation
    - Test XLSX export generation
    - Test collection of unique custom keys
    - Test handling of missing custom data
    - Test filtering by grade and className
    - Test UTF-8 encoding
    - _Requirements: 6.2, 6.3, 6.4, 6.5_

- [x] 6. Extend Variable Mapper in Generator Service
  - [x] 6.1 Implement Variable Mapper integration
    - Modify `apps/backend/src/modules/generator/generator.service.js`
    - Update `processGeneration()` to merge Student.extraData into templateData object
    - Ensure extraData is spread after standard fields: `{ ...standardFields, ...(student.extraData || {}), ...customData }`
    - Implement case-insensitive variable matching by normalizing both template variables and extraData keys
    - Handle missing variables by replacing with empty string (current behavior)
    - Preserve data type formatting (dates, numbers, booleans)
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [ ]* 6.2 Write unit tests for variable mapping
    - Test merging of standard fields and custom data
    - Test case-insensitive variable matching
    - Test handling of missing variables (empty string replacement)
    - Test preservation of data types
    - Test priority: standard fields > custom fields > global fields
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.6_

- [x] 7. Implement Custom Variables Settings Management
  - [x] 7.1 Add custom variables to Settings service
    - Modify `apps/backend/src/modules/settings/settings.service.js`
    - Implement `getCustomVariables()` method to retrieve customVariables array from Setting model
    - Implement `updateCustomVariables()` method to update customVariables array
    - customVariables field already exists in Setting model schema
    - _Requirements: 9.1, 9.2, 9.3_

  - [x] 7.2 Add custom variables API endpoints
    - Create GET `/api/settings/custom-variables` endpoint in settings.routes.js
    - Create PUT `/api/settings/custom-variables` endpoint for updating the list
    - Add request validation for array of strings
    - Add authentication middleware (admin only if applicable)
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

  - [ ]* 7.3 Write unit tests for custom variables management
    - Test retrieval of custom variables list
    - Test updating custom variables list
    - Test validation of input format
    - _Requirements: 9.1, 9.2, 9.3_

- [x] 8. Checkpoint - Test variable mapping and settings
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Implement Preview Feature
  - [x] 9.1 Add preview endpoint to Generator module
    - Create POST `/api/generator/preview` endpoint in generator.routes.js
    - Accept templateId and studentId in request body
    - Generate HTML preview without creating PDF
    - Return rendered HTML with variables populated
    - Identify and highlight missing variables in response metadata
    - Return list of required variables with availability status per student
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [ ]* 9.2 Write unit tests for preview functionality
    - Test preview generation with complete data
    - Test preview with missing variables
    - Test variable availability status calculation
    - Test switching between different students
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 10. Implement Logging and Audit Trail
  - [x] 10.1 Add logging for custom data operations
    - Update Custom Data Manager to log updatedAt timestamp on every update (already exists in Student model)
    - Add structured logging using existing Winston logger for custom data updates
    - Log user ID if available from authentication context
    - Log bulk import operations with success/failure counts
    - Store import logs with status (success, partial_success, failed) and error details
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

  - [ ]* 10.2 Write unit tests for audit logging
    - Test updatedAt timestamp updates
    - Test logging of user information
    - Test bulk import log creation
    - Test log status values
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [x] 11. Implement Missing Data Handling in Generator
  - [x] 11.1 Add default value handling
    - Modify generator.service.js to track missing variables during generation
    - Log list of students and missing variables in generation log
    - Implement warning system for critical missing variables before generation starts
    - Add configuration support for default values per variable in template or global settings
    - Continue generation even if some variables are missing (current behavior: empty string)
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

  - [ ]* 11.2 Write unit tests for missing data handling
    - Test generation with missing custom data
    - Test logging of missing variables
    - Test default value replacement
    - Test warning generation for critical variables
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 12. Final integration and validation
  - [x] 12.1 End-to-end integration testing
    - Test complete flow: import custom data → preview → generate letters
    - Test export → modify → re-import workflow
    - Test custom variables management → template creation → generation
    - Verify backward compatibility with existing student and generator functionality
    - Test error handling across all endpoints
    - _Requirements: All requirements_

  - [x] 12.2 Update API documentation
    - Document all new endpoints with request/response examples
    - Update existing documentation for generator service changes
    - Add examples of custom data usage in templates
    - Document standard field mappings for import/export

- [x] 13. Final checkpoint - Complete system validation
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- The `extraData` field already exists in Student model - no database migration required
- The `customVariables` field already exists in Setting model - no migration required
- Integration with existing modules minimizes code changes
- All custom data operations preserve existing student data
- Variable mapping is backward compatible with current generator behavior
- Case-insensitive matching improves user experience
- Export/import cycle allows offline data management
- Preview feature reduces errors before bulk generation

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1", "7.1"] },
    { "id": 1, "tasks": ["2.1", "3.1", "5.1", "7.2"] },
    { "id": 2, "tasks": ["2.2", "3.2", "6.1", "7.3"] },
    { "id": 3, "tasks": ["3.3", "5.2", "6.2"] },
    { "id": 4, "tasks": ["3.4", "5.3", "9.1"] },
    { "id": 5, "tasks": ["9.2", "10.1"] },
    { "id": 6, "tasks": ["10.2", "11.1"] },
    { "id": 7, "tasks": ["11.2", "12.1"] },
    { "id": 8, "tasks": ["12.2"] }
  ]
}
```
