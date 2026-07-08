/**
 * Unit Tests for Custom Data Manager Service
 * 
 * These tests verify the core functionality of the customData service
 * including validation, CRUD operations, and error handling.
 */

const { 
  validateCustomData,
  updateCustomData,
  getCustomData,
  deleteCustomDataKeys
} = require('./customData.service');

const prisma = require('../../config/database');

describe('Custom Data Manager Service', () => {
  describe('validateCustomData', () => {
    it('should accept valid custom data with alphanumeric keys and underscores', () => {
      const data = {
        tempat_lahir: 'Jakarta',
        tanggal_lahir: '2005-03-15',
        asal_sekolah: 'SMP N 1',
        tinggi_badan: 165,
        nilai_matematika: 85
      };

      const result = validateCustomData(data);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject keys with special characters', () => {
      const data = {
        'tempat-lahir': 'Jakarta',
        'tanggal lahir': '2005-03-15',
        'asal@sekolah': 'SMP N 1'
      };

      const result = validateCustomData(data);
      
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('tidak valid');
    });

    it('should reject non-object input', () => {
      const result1 = validateCustomData([]);
      const result2 = validateCustomData('string');
      const result3 = validateCustomData(null);

      expect(result1.valid).toBe(false);
      expect(result2.valid).toBe(false);
      expect(result3.valid).toBe(false);
    });

    it('should accept empty object', () => {
      const result = validateCustomData({});
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should support various data types as values', () => {
      const data = {
        string_field: 'text',
        number_field: 123,
        boolean_field: true,
        date_field: '2005-03-15'
      };

      const result = validateCustomData(data);
      
      expect(result.valid).toBe(true);
    });
  });

  describe('updateCustomData', () => {
    let testStudentId;

    beforeEach(async () => {
      // Create a test student
      const student = await prisma.student.create({
        data: {
          nisn: '9999999999',
          name: 'Test Student',
          grade: 'X',
          className: 'X-A',
          gender: 'MALE',
          parentName: 'Test Parent',
          extraData: {
            existing_field: 'existing value'
          }
        }
      });
      testStudentId = student.id;
    });

    afterEach(async () => {
      // Clean up test data
      await prisma.student.deleteMany({
        where: { nisn: '9999999999' }
      });
    });

    it('should merge new custom data with existing extraData', async () => {
      const newData = {
        tempat_lahir: 'Jakarta',
        tanggal_lahir: '2005-03-15'
      };

      const result = await updateCustomData(testStudentId, newData);

      expect(result.extraData).toMatchObject({
        existing_field: 'existing value',
        tempat_lahir: 'Jakarta',
        tanggal_lahir: '2005-03-15'
      });
    });

    it('should overwrite existing keys with new values', async () => {
      const newData = {
        existing_field: 'updated value',
        new_field: 'new value'
      };

      const result = await updateCustomData(testStudentId, newData);

      expect(result.extraData.existing_field).toBe('updated value');
      expect(result.extraData.new_field).toBe('new value');
    });

    it('should initialize extraData when student has no custom data', async () => {
      // Create student without extraData
      const student = await prisma.student.create({
        data: {
          nisn: '8888888888',
          name: 'Test Student 2',
          grade: 'XI',
          className: 'XI-B',
          gender: 'FEMALE',
          parentName: 'Test Parent 2'
        }
      });

      const newData = {
        tempat_lahir: 'Bandung'
      };

      const result = await updateCustomData(student.id, newData);

      expect(result.extraData).toMatchObject({
        tempat_lahir: 'Bandung'
      });

      // Cleanup
      await prisma.student.delete({ where: { id: student.id } });
    });

    it('should throw error for invalid data', async () => {
      const invalidData = {
        'invalid-key': 'value'
      };

      await expect(updateCustomData(testStudentId, invalidData))
        .rejects.toThrow('Validasi data custom gagal');
    });

    it('should throw error for non-existent student', async () => {
      const data = {
        tempat_lahir: 'Jakarta'
      };

      await expect(updateCustomData('non-existent-id', data))
        .rejects.toThrow('Siswa tidak ditemukan');
    });
  });

  describe('getCustomData', () => {
    let testStudentId;

    beforeEach(async () => {
      const student = await prisma.student.create({
        data: {
          nisn: '7777777777',
          name: 'Test Student 3',
          grade: 'XII',
          className: 'XII-A',
          gender: 'MALE',
          parentName: 'Test Parent 3',
          extraData: {
            tempat_lahir: 'Surabaya',
            tanggal_lahir: '2004-05-20'
          }
        }
      });
      testStudentId = student.id;
    });

    afterEach(async () => {
      await prisma.student.deleteMany({
        where: { nisn: '7777777777' }
      });
    });

    it('should return custom data for student', async () => {
      const result = await getCustomData(testStudentId);

      expect(result).toMatchObject({
        tempat_lahir: 'Surabaya',
        tanggal_lahir: '2004-05-20'
      });
    });

    it('should return empty object when student has no custom data', async () => {
      const student = await prisma.student.create({
        data: {
          nisn: '6666666666',
          name: 'Test Student 4',
          grade: 'X',
          className: 'X-C',
          gender: 'FEMALE',
          parentName: 'Test Parent 4'
        }
      });

      const result = await getCustomData(student.id);

      expect(result).toEqual({});

      // Cleanup
      await prisma.student.delete({ where: { id: student.id } });
    });

    it('should throw error for non-existent student', async () => {
      await expect(getCustomData('non-existent-id'))
        .rejects.toThrow('Siswa tidak ditemukan');
    });
  });

  describe('deleteCustomDataKeys', () => {
    let testStudentId;

    beforeEach(async () => {
      const student = await prisma.student.create({
        data: {
          nisn: '5555555555',
          name: 'Test Student 5',
          grade: 'XI',
          className: 'XI-A',
          gender: 'MALE',
          parentName: 'Test Parent 5',
          extraData: {
            tempat_lahir: 'Medan',
            tanggal_lahir: '2005-08-10',
            asal_sekolah: 'SMP N 2',
            hobi: 'Basket'
          }
        }
      });
      testStudentId = student.id;
    });

    afterEach(async () => {
      await prisma.student.deleteMany({
        where: { nisn: '5555555555' }
      });
    });

    it('should remove specified keys from extraData', async () => {
      const keysToDelete = ['tempat_lahir', 'hobi'];

      const result = await deleteCustomDataKeys(testStudentId, keysToDelete);

      expect(result.extraData).toMatchObject({
        tanggal_lahir: '2005-08-10',
        asal_sekolah: 'SMP N 2'
      });
      expect(result.extraData.tempat_lahir).toBeUndefined();
      expect(result.extraData.hobi).toBeUndefined();
    });

    it('should handle deletion of non-existent keys gracefully', async () => {
      const keysToDelete = ['non_existent_key'];

      const result = await deleteCustomDataKeys(testStudentId, keysToDelete);

      expect(result.extraData).toMatchObject({
        tempat_lahir: 'Medan',
        tanggal_lahir: '2005-08-10',
        asal_sekolah: 'SMP N 2',
        hobi: 'Basket'
      });
    });

    it('should throw error for invalid keys parameter', async () => {
      await expect(deleteCustomDataKeys(testStudentId, []))
        .rejects.toThrow('Parameter keys harus berupa array yang tidak kosong');

      await expect(deleteCustomDataKeys(testStudentId, 'not-an-array'))
        .rejects.toThrow('Parameter keys harus berupa array yang tidak kosong');
    });

    it('should throw error for non-existent student', async () => {
      await expect(deleteCustomDataKeys('non-existent-id', ['key1']))
        .rejects.toThrow('Siswa tidak ditemukan');
    });
  });
});
