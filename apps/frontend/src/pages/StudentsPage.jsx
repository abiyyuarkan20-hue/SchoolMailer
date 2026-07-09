import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { FiPlus, FiUpload, FiSearch, FiEdit2, FiTrash2, FiDownload, FiAlertTriangle } from 'react-icons/fi';
import { useStudents } from '../hooks/useStudents';
import { studentService } from '../services/studentService';
import PageHeader from '../components/common/PageHeader';
import Button from '../components/common/Button';
import ConfirmDialog from '../components/common/ConfirmDialog';
import Modal from '../components/common/Modal';
import Dropzone from '../components/common/Dropzone';
import DataTable from '../components/common/DataTable';
import Input from '../components/common/Input';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import * as xlsx from 'xlsx';

const studentSchema = z.object({
  nisn: z.string().min(5, 'NISN minimal 5 karakter'),
  name: z.string().min(2, 'Nama minimal 2 karakter'),
  grade: z.string().min(1, 'Kelas wajib diisi'),
  gender: z.enum(['MALE', 'FEMALE']),
  parentName: z.string().optional().nullable(),
  parentPhone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  email: z.string().email('Email tidak valid').optional().nullable().or(z.literal('')),
  extraData: z.record(z.any()).optional().nullable(),
});

const StudentsPage = () => {
  const { students, meta, isLoading, isImporting, fetchStudents, createStudent, updateStudent, deleteStudent, importStudents, deleteAllStudents } = useStudents();
  
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [page, setPage] = useState(1);
  const [classList, setClassList] = useState([]);
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [isDeleteAllDialogOpen, setIsDeleteAllDialogOpen] = useState(false);
  const [deleteAllConfirmText, setDeleteAllConfirmText] = useState('');
  const [editId, setEditId] = useState(null);
  const [rankingList, setRankingList] = useState([]);

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      gender: 'MALE'
    }
  });

  const fetchClasses = useCallback(async () => {
    try {
      const classes = await studentService.getClasses();
      setClassList(classes);
    } catch {}
  }, []);

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  useEffect(() => {
    fetchStudents({ search, className: classFilter, page, limit: 10 });
  }, [fetchStudents, search, classFilter, page]);

  const extraKeys = useMemo(() => {
    const keys = new Set();
    students.forEach(student => {
      if (student.extraData) {
        Object.keys(student.extraData).forEach(key => {
          if (key !== 'ranking') keys.add(key);
        });
      }
    });
    return Array.from(keys);
  }, [students]);

  const addRankingRow = () => {
    setRankingList([...rankingList, { kelas_program: '', semester: '', peringkat_siswa: '', tahun_pelajaran: '' }]);
  };
  
  const updateRankingRow = (index, field, value) => {
    const newList = [...rankingList];
    newList[index][field] = value;
    setRankingList(newList);
  };
  
  const removeRankingRow = (index) => {
    const newList = [...rankingList];
    newList.splice(index, 1);
    setRankingList(newList);
  };

  const onSubmit = async (data) => {
    // Attach ranking list to extraData
    if (!data.extraData) data.extraData = {};
    if (rankingList.length > 0) {
      data.extraData.ranking = rankingList;
    } else if (data.extraData.ranking) {
      delete data.extraData.ranking;
    }

    let success;
    if (editId) {
      success = await updateStudent(editId, data);
    } else {
      success = await createStudent(data);
    }
    
    if (success) {
      closeFormModal();
      fetchClasses();
      fetchStudents({ search, className: classFilter, page, limit: 10 });
    }
  };

  const closeFormModal = () => {
    setIsAddModalOpen(false);
    setEditId(null);
    setRankingList([]);
    reset({ nisn: '', name: '', grade: '', gender: 'MALE', parentName: '', parentPhone: '', address: '', email: '', extraData: {} });
  };

  const openEditModal = (student) => {
    reset({
      nisn: student.nisn,
      name: student.name,
      grade: student.className || student.grade,
      gender: student.gender || 'MALE',
      parentName: student.parentName || '',
      parentPhone: student.parentPhone || '',
      address: student.address || '',
      email: student.email || '',
      extraData: student.extraData || {},
    });
    setRankingList(Array.isArray(student.extraData?.ranking) ? student.extraData.ranking : []);
    setEditId(student.id);
    setIsAddModalOpen(true);
  };

  const handleDelete = async () => {
    if (deleteId) {
      const success = await deleteStudent(deleteId);
      if (success) {
        setDeleteId(null);
        fetchStudents({ search, className: classFilter, page, limit: 10 });
      }
    }
  };

  const handleDeleteAll = async () => {
    if (deleteAllConfirmText !== 'HAPUS SEMUA') return;
    const success = await deleteAllStudents();
    if (success) {
      setIsDeleteAllDialogOpen(false);
      setDeleteAllConfirmText('');
      setPage(1);
      setSearch('');
      setClassFilter('');
      setClassList([]);
      fetchStudents({ search: '', className: '', page: 1, limit: 10 });
    }
  };

  const closeDeleteAllDialog = () => {
    setIsDeleteAllDialogOpen(false);
    setDeleteAllConfirmText('');
  };

  const handleImport = async (file) => {
    const res = await importStudents(file);
    if (res) {
      setIsImportModalOpen(false);
      fetchClasses();
      fetchStudents({ search, className: classFilter, page: 1, limit: 10 });
    }
  };

  const downloadTemplate = () => {
    const ws = xlsx.utils.json_to_sheet([
      { nisn: '12345678', name: 'John Doe', grade: 'X-IPA-1', gender: 'Laki-laki', parentName: 'Jane Doe', parentPhone: '08123456789', address: 'Jl. Merdeka No.1', tempat_lahir: 'Medan', tanggal_lahir: '12 Agustus 2005' }
    ]);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'Template Siswa');
    xlsx.writeFile(wb, 'Template_Data_Siswa.xlsx');
  };

  const columns = useMemo(() => {
    const baseColumns = [
      { header: 'NISN', accessorKey: 'nisn' },
      { 
        header: 'Nama Siswa', 
        accessorKey: 'name',
        cell: ({ row }) => <span className="font-medium text-slate-800">{row.original.name}</span>
      },
      {
        header: 'L/P',
        accessorKey: 'gender',
        cell: ({ row }) => (
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
            row.original.gender === 'MALE' ? 'bg-blue-50 text-blue-700' : 'bg-pink-50 text-pink-700'
          }`}>
            {row.original.gender === 'MALE' ? 'L' : 'P'}
          </span>
        )
      },
      { 
        header: 'Kelas', 
        accessorKey: 'grade',
        cell: ({ row }) => (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800">
            {row.original.className || row.original.grade}
          </span>
        )
      },
      { header: 'Nama Ortu', accessorKey: 'parentName', cell: ({ row }) => row.original.parentName || '-' },
      { header: 'No. HP Ortu', accessorKey: 'parentPhone', cell: ({ row }) => row.original.parentPhone || '-' }
    ];

    const extraKeys = new Set();
    students.forEach(student => {
      if (student.extraData) {
        Object.keys(student.extraData).forEach(key => {
          if (key !== 'ranking') extraKeys.add(key);
        });
      }
    });

    const dynamicColumns = Array.from(extraKeys).map(key => ({
      header: key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
      id: `custom_${key}`,
      cell: ({ row }) => {
        const val = row.original.extraData ? row.original.extraData[key] : null;
        return val ? <span className="text-slate-600">{val}</span> : <span className="text-slate-300">-</span>;
      }
    }));

    const actionColumn = {
      header: 'Aksi',
      id: 'actions',
      cell: ({ row }) => (
        <div className="flex gap-2">
          <button onClick={() => openEditModal(row.original)} className="p-1 text-slate-400 hover:text-primary transition-colors">
            <FiEdit2 className="w-4 h-4" />
          </button>
          <button onClick={() => setDeleteId(row.original.id)} className="p-1 text-slate-400 hover:text-danger transition-colors">
            <FiTrash2 className="w-4 h-4" />
          </button>
        </div>
      )
    };

    return [...baseColumns, ...dynamicColumns, actionColumn];
  }, [students]);

  return (
    <div>
      <PageHeader
        title="Data Siswa"
        description="Kelola data siswa untuk digenerate pada surat massal."
        actions={
          <>
            <Button 
              variant="danger" 
              icon={FiTrash2} 
              onClick={() => setIsDeleteAllDialogOpen(true)}
              disabled={students.length === 0}
            >
              Hapus Semua Data
            </Button>
            <Button variant="secondary" icon={FiUpload} onClick={() => setIsImportModalOpen(true)}>
              Import Excel/CSV
            </Button>
            <Button variant="primary" icon={FiPlus} onClick={() => setIsAddModalOpen(true)}>
              Tambah Siswa
            </Button>
          </>
        }
      />

      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="relative w-full max-w-sm">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Cari nama atau NISN..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-primary focus:border-primary text-sm shadow-sm outline-none"
          />
        </div>
        <select
          value={classFilter}
          onChange={(e) => { setClassFilter(e.target.value); setPage(1); }}
          className="border border-slate-300 rounded-lg px-4 py-2 text-sm focus:ring-primary focus:border-primary bg-white shadow-sm outline-none"
        >
          <option value="">Semua Kelas</option>
          {classList.map(cls => (
            <option key={cls} value={cls}>{cls}</option>
          ))}
        </select>
      </div>

      <DataTable 
        data={students}
        columns={columns}
        isLoading={isLoading}
        pagination={meta}
        onPageChange={(newPage) => setPage(newPage)}
      />

      <Modal isOpen={isAddModalOpen} onClose={closeFormModal} title={editId ? 'Edit Data Siswa' : 'Tambah Siswa Baru'} maxWidth="max-w-3xl">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col max-h-[80vh]">
          {/* Scrollable content area */}
          <div className="flex-1 overflow-y-auto pr-2 pb-4 space-y-6 custom-scrollbar">
            
            {/* Informasi Utama */}
            <section>
              <h4 className="text-sm font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
                Informasi Utama
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="NISN *" id="nisn" {...register('nisn')} error={errors.nisn?.message} placeholder="Masukkan NISN" />
                <Input label="Nama Lengkap *" id="name" {...register('name')} error={errors.name?.message} placeholder="Masukkan nama lengkap siswa" />
                <Input label="Kelas *" id="grade" {...register('grade')} error={errors.grade?.message} placeholder="cth: X-IPA-1" />
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Jenis Kelamin *</label>
                  <select
                    {...register('gender')}
                    className={`w-full rounded-lg shadow-sm focus:ring-primary focus:border-primary sm:text-sm border outline-none px-3 py-2 bg-white transition-colors ${errors.gender ? 'border-danger focus:ring-danger' : 'border-slate-300'}`}
                  >
                    <option value="MALE">Laki-laki (L)</option>
                    <option value="FEMALE">Perempuan (P)</option>
                  </select>
                  {errors.gender && <p className="mt-1 text-xs text-danger">{errors.gender.message}</p>}
                </div>
              </div>
            </section>

            {/* Kontak & Alamat */}
            <section>
              <h4 className="text-sm font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
                Kontak & Alamat
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Nama Orang Tua" id="parentName" {...register('parentName')} error={errors.parentName?.message} placeholder="Nama wali/orang tua" />
                <Input label="No. HP Orang Tua" id="parentPhone" {...register('parentPhone')} error={errors.parentPhone?.message} placeholder="08xxxxxxxxxx" />
                <Input label="Email" id="email" type="email" {...register('email')} placeholder="siswa@contoh.com" />
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Alamat Lengkap</label>
                  <textarea
                    {...register('address')}
                    className="w-full rounded-lg shadow-sm focus:ring-primary focus:border-primary sm:text-sm border border-slate-300 px-3 py-2 outline-none transition-colors"
                    rows={2}
                    placeholder="Masukkan alamat lengkap"
                  />
                </div>
              </div>
            </section>

            {/* Data Prestasi / Ranking */}
            <section>
              <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100">
                <h4 className="text-sm font-bold text-slate-800">Data Prestasi / Ranking</h4>
                <Button type="button" variant="secondary" size="sm" icon={FiPlus} onClick={addRankingRow} className="shadow-sm">
                  Tambah Baris
                </Button>
              </div>
              
              {rankingList.length > 0 ? (
                <div className="overflow-x-auto rounded-lg border border-slate-200 shadow-sm">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600">Kelas/Program</th>
                        <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600">Semester</th>
                        <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600">Peringkat/Siswa</th>
                        <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600">Thn Pelajaran</th>
                        <th className="px-3 py-2.5 w-12 text-center text-xs font-semibold text-slate-600">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-100">
                      {rankingList.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-2">
                            <input type="text" className="w-full border border-slate-300 rounded-md px-2.5 py-1.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-shadow" value={row.kelas_program} onChange={(e) => updateRankingRow(idx, 'kelas_program', e.target.value)} placeholder="X-1 IPA" />
                          </td>
                          <td className="p-2">
                            <input type="text" className="w-full border border-slate-300 rounded-md px-2.5 py-1.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-shadow" value={row.semester} onChange={(e) => updateRankingRow(idx, 'semester', e.target.value)} placeholder="1" />
                          </td>
                          <td className="p-2">
                            <input type="text" className="w-full border border-slate-300 rounded-md px-2.5 py-1.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-shadow" value={row.peringkat_siswa} onChange={(e) => updateRankingRow(idx, 'peringkat_siswa', e.target.value)} placeholder="1 / 36" />
                          </td>
                          <td className="p-2">
                            <input type="text" className="w-full border border-slate-300 rounded-md px-2.5 py-1.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-shadow" value={row.tahun_pelajaran} onChange={(e) => updateRankingRow(idx, 'tahun_pelajaran', e.target.value)} placeholder="2023/2024" />
                          </td>
                          <td className="p-2 text-center align-middle">
                            <button type="button" onClick={() => removeRankingRow(idx)} className="p-1.5 text-slate-400 hover:text-danger hover:bg-red-50 rounded-md transition-colors" title="Hapus Baris">
                              <FiTrash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="bg-slate-50 border border-dashed border-slate-300 rounded-lg p-6 text-center">
                  <p className="text-sm text-slate-500 mb-2">Belum ada data prestasi/ranking siswa ini.</p>
                  <Button type="button" variant="ghost" size="sm" icon={FiPlus} onClick={addRankingRow}>
                    Tambah Baris Pertama
                  </Button>
                </div>
              )}
            </section>

            {/* Data Tambahan (Sesuai Excel) */}
            {extraKeys.length > 0 && (
              <section>
                <h4 className="text-sm font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100">
                  Data Tambahan (Sesuai Excel)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-100">
                  {extraKeys.map(key => (
                    <Input 
                      key={key}
                      label={key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')} 
                      id={`extraData.${key}`} 
                      {...register(`extraData.${key}`)} 
                    />
                  ))}
                </div>
              </section>
            )}

          </div>

          {/* Modal Footer / Actions */}
          <div className="pt-4 mt-2 flex justify-end gap-3 border-t border-slate-100 bg-white">
            <Button variant="ghost" type="button" onClick={closeFormModal} disabled={isLoading}>Batal</Button>
            <Button type="submit" variant="primary" isLoading={isLoading}>
              {editId ? 'Simpan Perubahan' : 'Simpan Siswa'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} title="Import Data Massal">
        <div className="mb-6">
          <p className="text-sm text-slate-600 mb-4">
            Upload file Excel (.xlsx) atau CSV yang berisi data siswa. Pastikan format kolom sesuai dengan template.
          </p>
          <Button variant="ghost" size="sm" icon={FiDownload} onClick={downloadTemplate} className="mb-4">
            Download Template Excel
          </Button>
          <Dropzone 
            onFileDrop={handleImport}
            accept={{
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
              'text/csv': ['.csv']
            }}
            isLoading={isImporting}
          />
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Hapus Data Siswa"
        message="Apakah Anda yakin ingin menghapus data siswa ini?"
        isLoading={isLoading}
      />

      <Modal isOpen={isDeleteAllDialogOpen} onClose={closeDeleteAllDialog} title="Hapus Semua Data Siswa">
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
            <FiAlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-red-800">
              <p className="font-semibold mb-1">Peringatan: Aksi ini tidak dapat dibatalkan!</p>
              <p>Anda akan menghapus <strong className="font-bold">{meta?.total || 0} data siswa</strong> dari database secara permanen.</p>
            </div>
          </div>
          <div>
            <p className="text-sm text-slate-600 mb-2">
              Ketik <strong className="font-semibold text-slate-900">"HAPUS SEMUA"</strong> untuk mengonfirmasi penghapusan:
            </p>
            <input
              type="text"
              value={deleteAllConfirmText}
              onChange={(e) => setDeleteAllConfirmText(e.target.value)}
              placeholder="Ketik: HAPUS SEMUA"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-red-500 focus:border-red-500 text-sm outline-none"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
            <Button variant="ghost" onClick={closeDeleteAllDialog} disabled={isLoading}>Batal</Button>
            <Button
              variant="danger"
              onClick={handleDeleteAll}
              isLoading={isLoading}
              disabled={deleteAllConfirmText !== 'HAPUS SEMUA'}
            >
              Hapus Semua Data
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default StudentsPage;
