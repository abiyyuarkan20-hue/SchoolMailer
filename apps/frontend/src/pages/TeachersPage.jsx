import React, { useEffect, useState, useMemo } from 'react';
import { FiPlus, FiUpload, FiSearch, FiEdit2, FiTrash2, FiDownload, FiAlertTriangle } from 'react-icons/fi';
import { useTeachers } from '../hooks/useTeachers';
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

const teacherSchema = z.object({
  nip: z.string().min(5, 'NIP minimal 5 karakter'),
  nik: z.string().optional().nullable(),
  name: z.string().min(2, 'Nama minimal 2 karakter'),
  position: z.string().min(1, 'Jabatan wajib diisi'),
  pangkat: z.string().optional().nullable(),
  subject: z.string().optional().nullable(),
  gender: z.enum(['MALE', 'FEMALE']),
  phone: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  nuptk: z.string().optional().nullable(),
  status: z.string().optional().nullable(),
  education: z.string().optional().nullable(),
  unitKerja: z.string().optional().nullable(),
  instansi: z.string().optional().nullable(),
  birthPlace: z.string().optional().nullable(),
  birthDate: z.string().optional().nullable(),
  extraData: z.record(z.any()).optional().nullable(),
});

const STATUS_OPTIONS = [
  { value: '', label: 'Pilih Status' },
  { value: 'PNS', label: 'PNS' },
  { value: 'PPPK', label: 'PPPK' },
  { value: 'Honorer', label: 'Honorer' },
];

const TeachersPage = () => {
  const { teachers, meta, isLoading, isImporting, fetchTeachers, createTeacher, updateTeacher, deleteTeacher, importTeachers, deleteAllTeachers } = useTeachers();

  const [search, setSearch] = useState('');
  const [positionFilter, setPositionFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [isDeleteAllDialogOpen, setIsDeleteAllDialogOpen] = useState(false);
  const [deleteAllConfirmText, setDeleteAllConfirmText] = useState('');
  const [editId, setEditId] = useState(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(teacherSchema),
    defaultValues: { gender: 'MALE' },
  });

  useEffect(() => {
    fetchTeachers({ search, position: positionFilter, status: statusFilter, page, limit: 10 });
  }, [fetchTeachers, search, positionFilter, statusFilter, page]);

  const extraKeys = useMemo(() => {
    const keys = new Set();
    teachers.forEach(teacher => {
      if (teacher.extraData) {
        Object.keys(teacher.extraData).forEach(key => keys.add(key));
      }
    });
    return Array.from(keys);
  }, [teachers]);

  const onSubmit = async (data) => {
    let success;
    if (editId) {
      success = await updateTeacher(editId, data);
    } else {
      success = await createTeacher(data);
    }

    if (success) {
      closeFormModal();
      fetchTeachers({ search, position: positionFilter, status: statusFilter, page, limit: 10 });
    }
  };

  const closeFormModal = () => {
    setIsAddModalOpen(false);
    setEditId(null);
    reset({
      nip: '', nik: '', name: '', position: '', pangkat: '', subject: '', gender: 'MALE',
      phone: '', email: '', address: '', nuptk: '', status: '', education: '',
      unitKerja: '', instansi: '', birthPlace: '', birthDate: '', extraData: {},
    });
  };

  const openEditModal = (teacher) => {
    reset({
      nip: teacher.nip,
      nik: teacher.nik || '',
      name: teacher.name,
      position: teacher.position,
      pangkat: teacher.pangkat || '',
      subject: teacher.subject || '',
      gender: teacher.gender || 'MALE',
      phone: teacher.phone || '',
      email: teacher.email || '',
      address: teacher.address || '',
      nuptk: teacher.nuptk || '',
      status: teacher.status || '',
      education: teacher.education || '',
      unitKerja: teacher.unitKerja || '',
      instansi: teacher.instansi || '',
      birthPlace: teacher.birthPlace || '',
      birthDate: teacher.birthDate ? new Date(teacher.birthDate).toISOString().split('T')[0] : '',
      extraData: teacher.extraData || {},
    });
    setEditId(teacher.id);
    setIsAddModalOpen(true);
  };

  const handleDelete = async () => {
    if (deleteId) {
      const success = await deleteTeacher(deleteId);
      if (success) {
        setDeleteId(null);
        fetchTeachers({ search, position: positionFilter, status: statusFilter, page, limit: 10 });
      }
    }
  };

  const handleDeleteAll = async () => {
    if (deleteAllConfirmText !== 'HAPUS SEMUA') return;
    const success = await deleteAllTeachers();
    if (success) {
      setIsDeleteAllDialogOpen(false);
      setDeleteAllConfirmText('');
      setPage(1);
      setSearch('');
      setPositionFilter('');
      setStatusFilter('');
      fetchTeachers({ search: '', position: '', status: '', page: 1, limit: 10 });
    }
  };

  const closeDeleteAllDialog = () => {
    setIsDeleteAllDialogOpen(false);
    setDeleteAllConfirmText('');
  };

  const handleImport = async (file) => {
    const res = await importTeachers(file);
    if (res) {
      setIsImportModalOpen(false);
      fetchTeachers({ search, position: positionFilter, status: statusFilter, page: 1, limit: 10 });
    }
  };

  const downloadTemplate = () => {
    const ws = xlsx.utils.json_to_sheet([
      {
        nip: '196912311994031234',
        nik: '1234567890123456',
        name: 'Drs. H. Ahmad Fauzi, M.Pd.',
        position: 'Kepala Sekolah',
        pangkat: 'Pembina Tk. I, IV/b',
        subject: '',
        gender: 'Laki-laki',
        phone: '081234567890',
        email: 'ahmad.fauzi@sma19medan.sch.id',
        address: 'Jl. Pendidikan No. 123, Medan',
        nuptk: '1234567890123456',
        status: 'PNS',
        education: 'S2 Pendidikan',
        unit_kerja: 'SMA Negeri 19 Medan',
        instansi: 'Dinas Pendidikan Provinsi Sumatera Utara',
        birth_place: 'Medan',
        birth_date: '12 Agustus 1970',
      },
    ]);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'Template Guru');
    xlsx.writeFile(wb, 'Template_Data_Guru.xlsx');
  };

  const columns = useMemo(() => {
    const baseColumns = [
      { header: 'NIP', accessorKey: 'nip' },
      {
        header: 'Nama Guru',
        accessorKey: 'name',
        cell: ({ row }) => <span className="font-medium text-slate-800">{row.original.name}</span>,
      },
      {
        header: 'NIK',
        accessorKey: 'nik',
        cell: ({ row }) => row.original.nik || <span className="text-slate-300">-</span>,
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
        ),
      },
      { header: 'Jabatan', accessorKey: 'position' },
      {
        header: 'Pangkat/Gol',
        accessorKey: 'pangkat',
        cell: ({ row }) => row.original.pangkat || <span className="text-slate-300">-</span>,
      },
      {
        header: 'Mapel',
        accessorKey: 'subject',
        cell: ({ row }) => row.original.subject || <span className="text-slate-300">-</span>,
      },
      {
        header: 'Unit Kerja',
        accessorKey: 'unitKerja',
        cell: ({ row }) => row.original.unitKerja || <span className="text-slate-300">-</span>,
      },
      {
        header: 'Instansi',
        accessorKey: 'instansi',
        cell: ({ row }) => row.original.instansi || <span className="text-slate-300">-</span>,
      },
      {
        header: 'No. HP',
        accessorKey: 'phone',
        cell: ({ row }) => row.original.phone || <span className="text-slate-300">-</span>,
      },
      {
        header: 'NUPTK',
        accessorKey: 'nuptk',
        cell: ({ row }) => row.original.nuptk || <span className="text-slate-300">-</span>,
      },
      {
        header: 'Status',
        accessorKey: 'status',
        cell: ({ row }) => {
          const s = row.original.status;
          if (!s) return <span className="text-slate-300">-</span>;
          const colors = { PNS: 'bg-blue-100 text-blue-700', PPPK: 'bg-green-100 text-green-700', Honorer: 'bg-amber-100 text-amber-700' };
          return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colors[s] || 'bg-slate-100 text-slate-700'}`}>{s}</span>;
        },
      },
    ];

    const dynamicColumns = Array.from(extraKeys).map(key => ({
      header: key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
      id: `custom_${key}`,
      cell: ({ row }) => {
        const val = row.original.extraData ? row.original.extraData[key] : null;
        return val ? <span className="text-slate-600">{val}</span> : <span className="text-slate-300">-</span>;
      },
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
      ),
    };

    return [...baseColumns, ...dynamicColumns, actionColumn];
  }, [teachers]);

  return (
    <div>
      <PageHeader
        title="Data Guru"
        description="Kelola data guru untuk digunakan pada variabel template surat."
        actions={
          <>
            <Button variant="danger" icon={FiTrash2} onClick={() => setIsDeleteAllDialogOpen(true)} disabled={teachers.length === 0}>
              Hapus Semua Data
            </Button>
            <Button variant="secondary" icon={FiUpload} onClick={() => setIsImportModalOpen(true)}>
              Import Excel/CSV
            </Button>
            <Button variant="primary" icon={FiPlus} onClick={() => setIsAddModalOpen(true)}>
              Tambah Guru
            </Button>
          </>
        }
      />

      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="relative w-full max-w-sm">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Cari NIP, nama, atau jabatan..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-primary focus:border-primary text-sm shadow-sm outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="border border-slate-300 rounded-lg px-4 py-2 text-sm focus:ring-primary focus:border-primary bg-white shadow-sm outline-none"
        >
          <option value="">Semua Status</option>
          <option value="PNS">PNS</option>
          <option value="PPPK">PPPK</option>
          <option value="Honorer">Honorer</option>
        </select>
      </div>

      <DataTable
        data={teachers}
        columns={columns}
        isLoading={isLoading}
        pagination={meta}
        onPageChange={(newPage) => setPage(newPage)}
      />

      {/* ── ADD / EDIT MODAL ── */}
      <Modal isOpen={isAddModalOpen} onClose={closeFormModal} title={editId ? 'Edit Data Guru' : 'Tambah Guru Baru'} maxWidth="max-w-3xl">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col max-h-[80vh]">
          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto px-1 space-y-6 pb-4 custom-scrollbar">

            {/* ── Section 1: Informasi Utama ── */}
            <div>
              <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block"></span>
                Informasi Utama
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                <Input label="NIP *" id="nip" {...register('nip')} error={errors.nip?.message} />
                <Input label="NIK" id="nik" {...register('nik')} placeholder="Nomor Induk Kependudukan" />
                <Input label="Nama Lengkap *" id="name" {...register('name')} error={errors.name?.message} />
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Jenis Kelamin *</label>
                  <select
                    {...register('gender')}
                    className={`w-full rounded-lg shadow-sm focus:ring-primary focus:border-primary sm:text-sm border outline-none px-3 py-2 bg-white ${errors.gender ? 'border-danger' : 'border-slate-300'}`}
                  >
                    <option value="MALE">Laki-laki (L)</option>
                    <option value="FEMALE">Perempuan (P)</option>
                  </select>
                  {errors.gender && <p className="mt-1 text-sm text-danger">{errors.gender.message}</p>}
                </div>
                <Input label="Tempat Lahir" id="birthPlace" {...register('birthPlace')} placeholder="Medan" />
                <Input label="Tanggal Lahir" id="birthDate" type="date" {...register('birthDate')} />
              </div>
            </div>

            <hr className="border-slate-200" />

            {/* ── Section 2: Detail Pekerjaan ── */}
            <div>
              <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 inline-block"></span>
                Detail Pekerjaan
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                <Input label="Jabatan *" id="position" {...register('position')} error={errors.position?.message} placeholder="Kepala Sekolah, Guru Mapel, ..." />
                <Input label="Pangkat/Golongan" id="pangkat" {...register('pangkat')} placeholder="Pembina Tk. I, IV/b" />
                <Input label="Mata Pelajaran" id="subject" {...register('subject')} placeholder="Matematika, Bahasa Indonesia, ..." />
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Status Kepegawaian</label>
                  <select
                    {...register('status')}
                    className="w-full rounded-lg shadow-sm focus:ring-primary focus:border-primary sm:text-sm border border-slate-300 px-3 py-2 bg-white outline-none"
                  >
                    {STATUS_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <Input label="NUPTK" id="nuptk" {...register('nuptk')} placeholder="1234567890123456" />
                <Input label="Pendidikan Terakhir" id="education" {...register('education')} placeholder="S1, S2, ..." />
                <Input label="Unit Kerja" id="unitKerja" {...register('unitKerja')} placeholder="SMA Negeri 19 Medan" />
                <Input label="Instansi" id="instansi" {...register('instansi')} placeholder="Dinas Pendidikan Prov. Sumatera Utara" />
              </div>
            </div>

            <hr className="border-slate-200" />

            {/* ── Section 3: Kontak & Alamat ── */}
            <div>
              <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
                Kontak & Alamat
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                <Input label="Email" id="email" type="email" {...register('email')} placeholder="guru@sma19medan.sch.id" />
                <Input label="No. HP" id="phone" {...register('phone')} placeholder="08123456789" />
              </div>
              <div className="mt-3">
                <label className="block text-sm font-medium text-slate-700 mb-1">Alamat</label>
                <textarea
                  {...register('address')}
                  className="w-full rounded-lg shadow-sm focus:ring-primary focus:border-primary sm:text-sm border border-slate-300 px-3 py-2 outline-none"
                  rows={2}
                  placeholder="Jl. Contoh No. 123, Medan"
                />
              </div>
            </div>

            {/* ── Section 4: Data Tambahan (Excel) ── */}
            {extraKeys.length > 0 && (
              <>
                <hr className="border-slate-200" />
                <div>
                  <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block"></span>
                    Data Tambahan (Sesuai Excel)
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                    {extraKeys.map(key => (
                      <Input
                        key={key}
                        label={key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                        id={`extraData.${key}`}
                        {...register(`extraData.${key}`)}
                      />
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Sticky footer */}
          <div className="pt-4 mt-2 flex justify-end gap-3 border-t border-slate-200 bg-white sticky bottom-0">
            <Button variant="ghost" onClick={closeFormModal} disabled={isLoading}>Batal</Button>
            <Button type="submit" variant="primary" isLoading={isLoading}>Simpan</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} title="Import Data Guru">
        <div className="mb-6">
          <p className="text-sm text-slate-600 mb-4">
            Upload file Excel (.xlsx) atau CSV yang berisi data guru. Pastikan format kolom sesuai dengan template.
          </p>
          <Button variant="ghost" size="sm" icon={FiDownload} onClick={downloadTemplate} className="mb-4">
            Download Template Excel
          </Button>
          <Dropzone
            onFileDrop={handleImport}
            accept={{
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
              'text/csv': ['.csv'],
            }}
            isLoading={isImporting}
          />
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Hapus Data Guru"
        message="Apakah Anda yakin ingin menghapus data guru ini?"
        isLoading={isLoading}
      />

      <Modal isOpen={isDeleteAllDialogOpen} onClose={closeDeleteAllDialog} title="Hapus Semua Data Guru">
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
            <FiAlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-red-800">
              <p className="font-semibold mb-1">Peringatan: Aksi ini tidak dapat dibatalkan!</p>
              <p>Anda akan menghapus <strong className="font-bold">{meta?.total || 0} data guru</strong> dari database secara permanen.</p>
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

export default TeachersPage;
