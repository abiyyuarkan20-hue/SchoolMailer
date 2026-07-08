import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiFileText, FiUsers, FiSettings, FiCheckCircle, FiChevronRight, FiChevronLeft, FiPlay, FiList, FiSearch, FiPlus, FiTrash2, FiTable } from 'react-icons/fi';
import PageHeader from '../components/common/PageHeader';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import { useTemplates } from '../hooks/useTemplates';
import { useStudents } from '../hooks/useStudents';
import { useGenerator } from '../hooks/useGenerator';
import api from '../services/api';

const steps = [
  { id: 1, title: 'Pilih Template', icon: FiFileText },
  { id: 2, title: 'Pilih Siswa', icon: FiUsers },
  { id: 3, title: 'Mode Output', icon: FiSettings },
  { id: 4, title: 'Konfirmasi', icon: FiCheckCircle },
];

const GeneratePage = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [outputType, setOutputType] = useState('PDF_SINGLE');
  const [filterGrade, setFilterGrade] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [customData, setCustomData] = useState({});
  const [templateHtml, setTemplateHtml] = useState('');

  const { templates, fetchTemplates } = useTemplates();
  const { students, fetchStudents } = useStudents();
  const { generateDocs, isLoading } = useGenerator();

  useEffect(() => {
    if (!selectedTemplateId) { setTemplateHtml(''); return; }
    const found = templates.find(t => t.id === selectedTemplateId);
    if (found?.htmlContent) {
      setTemplateHtml(found.htmlContent);
    } else {
      api.get(`/templates/${selectedTemplateId}`).then(res => {
        setTemplateHtml(res.data.data?.htmlContent || '');
      }).catch(() => {});
    }
  }, [selectedTemplateId, templates]);

  const eachTargets = useMemo(() => {
    const regex = /\{\{#each\s+([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g;
    const matches = [...templateHtml.matchAll(regex)];
    return [...new Set(matches.map(m => m[1]))];
  }, [templateHtml]);

  useEffect(() => {
    fetchTemplates();
    fetchStudents({ limit: 1000 });
  }, [fetchTemplates, fetchStudents]);

  const filteredStudents = useMemo(() => {
    let result = students;
    if (filterGrade) {
      result = result.filter(s => s.className === filterGrade || s.grade === filterGrade);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(s =>
        s.name.toLowerCase().includes(q) ||
        s.nisn.toLowerCase().includes(q) ||
        (s.className || '').toLowerCase().includes(q)
      );
    }
    return result;
  }, [students, filterGrade, searchQuery]);

  const selectedTemplate = templates.find(t => t.id === selectedTemplateId);
  const standardVars = [
    'nama_siswa', 'kelas', 'nisn', 'jenis_kelamin', 'nama_orang_tua', 'no_hp_ortu', 'alamat', 'tanggal_surat',
    'nama_guru', 'nip', 'jabatan', 'pangkat', 'mapel', 'nuptk', 'status_pegawai', 'pendidikan', 'tempat_lahir', 'tanggal_lahir',
  ];
  const templateCustomVars = selectedTemplate?.variables 
    ? selectedTemplate.variables.filter(v => !standardVars.includes(v)) 
    : [];
  const arrayCustomVars = useMemo(() =>
    templateCustomVars.filter(v => eachTargets.includes(v)),
    [templateCustomVars, eachTargets]
  );
  const plainCustomVars = useMemo(() =>
    templateCustomVars.filter(v => !eachTargets.includes(v)),
    [templateCustomVars, eachTargets]
  );
  const hasCustomVars = plainCustomVars.length > 0 || arrayCustomVars.length > 0;

  // Detect which custom vars exist in student extraData across all students
  const availableExtraKeys = useMemo(() => {
    const keys = new Set();
    students.forEach(student => {
      if (student.extraData) {
        Object.keys(student.extraData).forEach(key => keys.add(key));
      }
    });
    return keys;
  }, [students]);

  // Split plain vars into required (not in DB) and optional (in DB)
  const requiredCustomVars = useMemo(() => 
    plainCustomVars.filter(v => !availableExtraKeys.has(v)),
    [plainCustomVars, availableExtraKeys]
  );
  const optionalCustomVars = useMemo(() => 
    plainCustomVars.filter(v => availableExtraKeys.has(v)),
    [plainCustomVars, availableExtraKeys]
  );

  const TABLE_COLUMNS = {
    ranking: [
      { key: 'kelas_program', label: 'Kelas/Program' },
      { key: 'semester', label: 'Semester' },
      { key: 'peringkat_siswa', label: 'Peringkat/Siswa' },
      { key: 'tahun_pelajaran', label: 'Tahun Pelajaran' },
    ],
  };

  const getDefaultRows = (varName) => Array.from({ length: 5 }, () => {
    const cols = TABLE_COLUMNS[varName] || [];
    const row = {};
    cols.forEach(c => { row[c.key] = ''; });
    return row;
  });

  const updateArrayVar = (varName, rowIndex, fieldKey, value) => {
    setCustomData(prev => {
      const current = Array.isArray(prev[varName]) ? [...prev[varName]] : getDefaultRows(varName);
      current[rowIndex] = { ...current[rowIndex], [fieldKey]: value };
      return { ...prev, [varName]: current };
    });
  };

  const addArrayRow = (varName) => {
    setCustomData(prev => {
      const cols = TABLE_COLUMNS[varName] || [];
      const emptyRow = {};
      cols.forEach(c => { emptyRow[c.key] = ''; });
      return { ...prev, [varName]: [...(Array.isArray(prev[varName]) ? prev[varName] : []), emptyRow] };
    });
  };

  const removeArrayRow = (varName, rowIndex) => {
    setCustomData(prev => {
      const current = Array.isArray(prev[varName]) ? [...prev[varName]] : [];
      current.splice(rowIndex, 1);
      return { ...prev, [varName]: current };
    });
  };

  const STEPS = {
    TEMPLATE: 1,
    CUSTOM_VARS: hasCustomVars ? 2 : -1,
    STUDENTS: hasCustomVars ? 3 : 2,
    OUTPUT: hasCustomVars ? 4 : 3,
    CONFIRM: hasCustomVars ? 5 : 4,
  };
  const MAX_STEP = hasCustomVars ? 5 : 4;

  const stepsList = [
    { id: STEPS.TEMPLATE, title: 'Pilih Template', icon: FiFileText },
    ...(hasCustomVars ? [{ id: STEPS.CUSTOM_VARS, title: 'Isi Variabel', icon: FiList }] : []),
    { id: STEPS.STUDENTS, title: 'Pilih Siswa', icon: FiUsers },
    { id: STEPS.OUTPUT, title: 'Mode Output', icon: FiSettings },
    { id: STEPS.CONFIRM, title: 'Konfirmasi', icon: FiCheckCircle },
  ];

  const handleNext = () => setCurrentStep(prev => Math.min(prev + 1, MAX_STEP));
  const handlePrev = () => setCurrentStep(prev => Math.max(prev - 1, 1));

  const toggleStudentSelection = (id) => {
    setSelectedStudentIds(prev => 
      prev.includes(id) ? prev.filter(sId => sId !== id) : [...prev, id]
    );
  };

  const selectAllFiltered = () => {
    const ids = filteredStudents.map(s => s.id);
    setSelectedStudentIds(ids);
  };

  const deselectAll = () => setSelectedStudentIds([]);

  const handleSubmit = async () => {
    const success = await generateDocs({
      templateId: selectedTemplateId,
      studentIds: selectedStudentIds,
      outputType,
      filterClass: filterGrade || null,
      customData
    });

    if (success) {
      navigate('/history');
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader
        title="Kirim Surat Massal"
        description="Generate dokumen PDF dari template untuk banyak siswa sekaligus."
      />

      <div className="mb-8">
        <div className="flex items-center justify-between relative">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-200 rounded-full z-0"></div>
          <div 
            className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-primary rounded-full z-0 transition-all duration-300"
            style={{ width: `${((currentStep - 1) / (MAX_STEP - 1)) * 100}%` }}
          ></div>
          
          {stepsList.map((step) => (
            <div key={step.id} className="relative z-10 flex flex-col items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center border-4 border-surface transition-colors ${
                currentStep >= step.id ? 'bg-primary text-white' : 'bg-slate-200 text-slate-400'
              }`}>
                <step.icon className="w-5 h-5" />
              </div>
              <span className={`text-xs font-medium mt-2 absolute -bottom-6 w-max ${
                currentStep >= step.id ? 'text-primary' : 'text-slate-400'
              }`}>
                {step.title}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 min-h-[400px] flex flex-col mt-12">
        
        {currentStep === STEPS.TEMPLATE && (
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Pilih Template Surat</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {templates.map(template => (
                <div 
                  key={template.id}
                  onClick={() => setSelectedTemplateId(template.id)}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    selectedTemplateId === template.id 
                    ? 'border-primary bg-blue-50/50' 
                    : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="font-medium text-slate-800 mb-1">{template.title}</div>
                  <div className="text-xs text-slate-500 mb-2">{template.letterType}</div>
                  <div className="text-sm text-slate-600 line-clamp-2">{template.description}</div>
                </div>
              ))}
              {templates.length === 0 && (
                <div className="col-span-full p-8 text-center text-slate-500 border border-dashed border-slate-300 rounded-xl">
                  Belum ada template. Silakan buat di menu Templates terlebih dahulu.
                </div>
              )}
            </div>
          </div>
        )}

        {currentStep === STEPS.CUSTOM_VARS && (
          <div className="flex-1 flex flex-col">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Isi Variabel Custom</h3>

            <div className="space-y-5 max-w-2xl">
              {requiredCustomVars.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-red-700 mb-3 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-red-500"></span>
                    Variabel Teks — Wajib Diisi ({requiredCustomVars.length})
                  </h4>
                  <p className="text-xs text-slate-500 mb-4">Variabel ini tidak ditemukan di data siswa dan harus diisi manual (berlaku seragam untuk semua surat).</p>
                  <div className="space-y-3">
                    {requiredCustomVars.map(variable => (
                      <div key={variable}>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Nilai untuk {'{{'}{variable}{'}}'} <span className="text-xs text-red-500 font-semibold">* Wajib</span>
                        </label>
                        <input
                          type="text"
                          value={customData[variable] || ''}
                          onChange={(e) => setCustomData(prev => ({ ...prev, [variable]: e.target.value }))}
                          placeholder={`Masukkan ${variable.replace(/_/g, ' ')}...`}
                          className={`w-full rounded-lg shadow-sm sm:text-sm border px-3 py-2 outline-none transition-colors ${
                            !customData[variable] 
                              ? 'border-red-300 focus:ring-red-500 focus:border-red-500 bg-red-50/30' 
                              : 'border-emerald-300 focus:ring-emerald-500 focus:border-emerald-500'
                          }`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {optionalCustomVars.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-emerald-700 mb-3 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    Opsional — Tersedia di Data Siswa ({optionalCustomVars.length})
                  </h4>
                  <p className="text-xs text-slate-500 mb-4">Kosongkan untuk mengambil nilai spesifik tiap siswa, atau isi untuk menimpa semua.</p>
                  <div className="space-y-3">
                    {optionalCustomVars.map(variable => (
                      <div key={variable}>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Nilai untuk {'{{'}{variable}{'}}'} <span className="text-xs text-emerald-500 font-normal">(Opsional)</span>
                        </label>
                        <input
                          type="text"
                          value={customData[variable] || ''}
                          onChange={(e) => setCustomData(prev => ({ ...prev, [variable]: e.target.value }))}
                          placeholder={`Kosongkan untuk ambil dari data siswa...`}
                          className="w-full rounded-lg shadow-sm focus:ring-primary focus:border-primary sm:text-sm border border-slate-300 px-3 py-2 outline-none"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {arrayCustomVars.length > 0 && arrayCustomVars.map(varName => {
                const columns = TABLE_COLUMNS[varName] || [];
                const rows = Array.isArray(customData[varName]) ? customData[varName] : getDefaultRows(varName);
                return (
                  <div key={varName} className="border-t border-slate-200 pt-5">
                    <h4 className="text-sm font-semibold text-indigo-700 mb-2 flex items-center gap-1.5">
                      <FiTable className="w-4 h-4" />
                      Data Tabel — {`{{#each ${varName}}}`}
                    </h4>
                    <p className="text-xs text-slate-500 mb-4">
                      Setiap baris menjadi satu iterasi. Tambah/hapus baris sesuai kebutuhan.
                    </p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm border-collapse">
                        <thead>
                          <tr className="bg-indigo-50">
                            <th className="px-2 py-2 border border-indigo-200 text-left text-xs font-semibold text-indigo-700 w-8">#</th>
                            {columns.map(col => (
                              <th key={col.key} className="px-2 py-2 border border-indigo-200 text-left text-xs font-semibold text-indigo-700">
                                {col.label}
                              </th>
                            ))}
                            <th className="px-2 py-2 border border-indigo-200 text-center text-xs font-semibold text-indigo-700 w-10">Hapus</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((row, rowIdx) => (
                            <tr key={rowIdx} className={rowIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                              <td className="px-2 py-1.5 border border-slate-200 text-xs text-slate-400 text-center">{rowIdx + 1}</td>
                              {columns.map(col => (
                                <td key={col.key} className="px-2 py-1.5 border border-slate-200">
                                  <input
                                    type="text"
                                    value={row[col.key] || ''}
                                    onChange={e => updateArrayVar(varName, rowIdx, col.key, e.target.value)}
                                    placeholder={`[${col.label}]`}
                                    className="w-full border border-slate-300 rounded px-2 py-1 text-xs outline-none focus:border-indigo-400"
                                  />
                                </td>
                              ))}
                              <td className="px-2 py-1.5 border border-slate-200 text-center">
                                <button
                                  type="button"
                                  onClick={() => removeArrayRow(varName, rowIdx)}
                                  className="p-1 text-slate-400 hover:text-red-600 transition-colors disabled:opacity-20"
                                  disabled={rows.length <= 1}
                                >
                                  <FiTrash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <button
                      type="button"
                      onClick={() => addArrayRow(varName)}
                      className="mt-2 text-xs text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded transition-colors flex items-center gap-1"
                    >
                      <FiPlus className="w-3 h-3" /> Tambah Baris
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {currentStep === STEPS.STUDENTS && (
          <div className="flex-1 flex flex-col">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Pilih Siswa Penerima</h3>
            
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <div className="relative flex-1 max-w-sm">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Cari nama atau NISN..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-primary focus:border-primary outline-none"
                />
              </div>
              <select
                value={filterGrade}
                onChange={(e) => setFilterGrade(e.target.value)}
                className="border border-slate-300 rounded-lg px-4 py-2 text-sm focus:ring-primary focus:border-primary outline-none"
              >
                <option value="">Semua Kelas</option>
                {[...new Set(students.map(s => s.className || s.grade))].map(cls => (
                  <option key={cls} value={cls}>{cls}</option>
                ))}
              </select>
              <div className="flex gap-2 ml-auto">
                <Button variant="secondary" size="sm" onClick={selectAllFiltered}>Pilih Semua</Button>
                <Button variant="ghost" size="sm" onClick={deselectAll}>Batalkan</Button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto border border-slate-200 rounded-lg max-h-[300px]">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 sticky top-0 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 w-12 text-center">Pilih</th>
                    <th className="px-4 py-3">NISN</th>
                    <th className="px-4 py-3">Nama Siswa</th>
                    <th className="px-4 py-3">Kelas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStudents.map(student => (
                    <tr key={student.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => toggleStudentSelection(student.id)}>
                      <td className="px-4 py-3 text-center">
                        <input 
                          type="checkbox" 
                          checked={selectedStudentIds.includes(student.id)}
                          onChange={() => toggleStudentSelection(student.id)}
                          className="w-4 h-4 text-primary rounded border-slate-300 focus:ring-primary"
                        />
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-700">{student.nisn}</td>
                      <td className="px-4 py-3">{student.name}</td>
                      <td className="px-4 py-3">
                        <span className="bg-slate-100 px-2 py-1 rounded text-xs">{student.className || student.grade}</span>
                      </td>
                    </tr>
                  ))}
                  {filteredStudents.length === 0 && (
                    <tr><td colSpan="4" className="text-center py-8 text-slate-500">Tidak ada data siswa.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="mt-2 flex justify-between text-sm text-slate-500 font-medium">
              <span>{filteredStudents.length} siswa ditemukan</span>
              <span>{selectedStudentIds.length} siswa dipilih</span>
            </div>
          </div>
        )}

        {currentStep === STEPS.OUTPUT && (
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Pilih Mode Output</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              <div 
                onClick={() => setOutputType('PDF_SINGLE')}
                className={`p-6 rounded-xl border-2 cursor-pointer transition-all ${
                  outputType === 'PDF_SINGLE' ? 'border-primary bg-blue-50/50' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded bg-red-100 text-red-600 flex items-center justify-center font-bold text-xs">PDF</div>
                  <div className="font-semibold text-slate-800">Satu File PDF</div>
                </div>
                <p className="text-sm text-slate-500">
                  Semua surat akan digabungkan ke dalam 1 dokumen PDF berisikan banyak halaman. Cocok jika Anda ingin mencetak semuanya sekaligus.
                </p>
              </div>

              <div 
                onClick={() => setOutputType('ZIP_BUNDLE')}
                className={`p-6 rounded-xl border-2 cursor-pointer transition-all ${
                  outputType === 'ZIP_BUNDLE' ? 'border-primary bg-blue-50/50' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded bg-amber-100 text-amber-600 flex items-center justify-center font-bold text-xs">ZIP</div>
                  <div className="font-semibold text-slate-800">Kumpulan PDF (ZIP)</div>
                </div>
                <p className="text-sm text-slate-500">
                  Sistem akan membuat PDF terpisah untuk masing-masing siswa, lalu mengemasnya dalam file .zip. Cocok untuk dibagikan ke siswa secara individu.
                </p>
              </div>

            </div>
          </div>
        )}

        {currentStep === STEPS.CONFIRM && (
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Konfirmasi Pembuatan</h3>
            
            <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 mb-6 space-y-4">
              <div className="grid grid-cols-3 gap-4 pb-4 border-b border-slate-200">
                <div className="text-sm text-slate-500">Template Terpilih</div>
                <div className="col-span-2 font-medium text-slate-800">
                  {templates.find(t => t.id === selectedTemplateId)?.title || '-'}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 pb-4 border-b border-slate-200">
                <div className="text-sm text-slate-500">Jumlah Penerima</div>
                <div className="col-span-2 font-medium text-slate-800">
                  {selectedStudentIds.length} Siswa
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 pb-4 border-b border-slate-200">
                <div className="text-sm text-slate-500">Filter Pencarian</div>
                <div className="col-span-2 font-medium text-slate-800">
                  {filterGrade || 'Semua Kelas'}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 pb-4 border-b border-slate-200">
                <div className="text-sm text-slate-500">Mode Output</div>
                <div className="col-span-2 font-medium text-slate-800">
                  {outputType === 'PDF_SINGLE' ? '1 File PDF Gabungan' : 'File ZIP (Banyak PDF)'}
                </div>
              </div>
              {arrayCustomVars.map(varName => (
                <div key={varName} className="grid grid-cols-3 gap-4 pb-4 border-b border-slate-200 last:border-b-0">
                  <div className="text-sm text-slate-500">{`Data {{#each ${varName}}}`}</div>
                  <div className="col-span-2">
                    <span className="text-sm text-slate-800 font-medium">
                      {Array.isArray(customData[varName]) ? customData[varName].length : 0} baris
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-blue-50 text-blue-800 p-4 rounded-lg text-sm flex gap-3">
              <FiCheckCircle className="w-5 h-5 flex-shrink-0" />
              <p>
                Proses generate membutuhkan waktu beberapa saat tergantung jumlah siswa. Proses ini akan berjalan di latar belakang dan Anda bisa mengecek hasilnya di menu <b>Riwayat</b>.
              </p>
            </div>
          </div>
        )}

        <div className="pt-6 mt-auto flex justify-between border-t border-slate-100">
          <Button 
            variant="ghost" 
            icon={FiChevronLeft} 
            onClick={handlePrev}
            disabled={currentStep === 1 || isLoading}
          >
            Kembali
          </Button>

          {currentStep < MAX_STEP ? (
            <Button 
              variant="primary" 
              onClick={handleNext}
              disabled={
                (currentStep === STEPS.TEMPLATE && !selectedTemplateId) || 
                (currentStep === STEPS.CUSTOM_VARS && requiredCustomVars.some(v => !customData[v]?.trim())) ||
                (currentStep === STEPS.STUDENTS && selectedStudentIds.length === 0)
              }
            >
              Lanjut <FiChevronRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button 
              variant="primary" 
              icon={FiPlay}
              onClick={handleSubmit}
              isLoading={isLoading}
            >
              Mulai Generate
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default GeneratePage;
