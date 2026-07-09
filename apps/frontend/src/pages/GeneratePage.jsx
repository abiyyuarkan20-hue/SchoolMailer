import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiFileText, FiUsers, FiSettings, FiCheckCircle, FiChevronRight, FiChevronLeft, FiList, FiSearch, FiPlus, FiTrash2, FiTable, FiChevronDown, FiChevronUp, FiPlay } from 'react-icons/fi';
import PageHeader from '../components/common/PageHeader';
import Button from '../components/common/Button';
import { useTemplates } from '../hooks/useTemplates';
import { useStudents } from '../hooks/useStudents';
import { useGenerator } from '../hooks/useGenerator';
import api from '../services/api';

const GeneratePage = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [outputType, setOutputType] = useState('PDF_SINGLE');
  const [filterGrade, setFilterGrade] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [globalCustomData, setGlobalCustomData] = useState({});
  const [studentCustomData, setStudentCustomData] = useState({});
  const [expandedStudentId, setExpandedStudentId] = useState(null);
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
  const STANDARD_RESERVED_VARS = [
    'nama_siswa', 'nisn', 'kelas', 'jenis_kelamin', 'nama_orang_tua', 'no_hp_ortu', 'alamat', 'email', 'tanggal_surat',
    'nama_guru', 'nip', 'nik', 'jabatan', 'pangkat', 'mapel', 'nuptk', 'status_pegawai', 'pendidikan', 'unit_kerja', 'instansi', 'tempat_lahir', 'tanggal_lahir',
  ];
  const TABLE_COLUMNS = {
    ranking: [
      { key: 'kelas_program', label: 'Kelas/Program' },
      { key: 'semester', label: 'Semester' },
      { key: 'peringkat_siswa', label: 'Peringkat/Siswa' },
      { key: 'tahun_pelajaran', label: 'Tahun Pelajaran' },
    ],
  };

  const templateCustomVars = selectedTemplate?.variables 
    ? selectedTemplate.variables.filter(v => !STANDARD_RESERVED_VARS.includes(v)) 
    : [];
  const arrayCustomVars = useMemo(() =>
    templateCustomVars.filter(v => eachTargets.includes(v)),
    [templateCustomVars, eachTargets]
  );
  
  const plainCustomVars = useMemo(() => {
    const tableKeys = new Set();
    Object.values(TABLE_COLUMNS).forEach(cols => {
      cols.forEach(c => tableKeys.add(c.key));
    });
    return templateCustomVars.filter(v => 
      !eachTargets.includes(v) && 
      !tableKeys.has(v) && 
      !v.startsWith('@index')
    );
  }, [templateCustomVars, eachTargets]);
  
  const hasCustomVars = plainCustomVars.length > 0 || arrayCustomVars.length > 0;

  // Detect which custom vars exist across ALL selected students
  const availableExtraKeys = useMemo(() => {
    const keys = new Set();
    const selectedStudents = students.filter(s => selectedStudentIds.includes(s.id));
    if (selectedStudents.length === 0) return keys;

    const allPossibleKeys = new Set();
    selectedStudents.forEach(student => {
      if (student.extraData) {
        Object.keys(student.extraData).forEach(key => allPossibleKeys.add(key));
      }
    });

    Array.from(allPossibleKeys).forEach(key => {
      const presentOnAll = selectedStudents.every(student => 
        student.extraData && 
        student.extraData[key] !== undefined && 
        student.extraData[key] !== null && 
        String(student.extraData[key]).trim() !== ''
      );
      if (presentOnAll) {
        keys.add(key);
      }
    });
    return keys;
  }, [students, selectedStudentIds]);

  const requiredCustomVars = useMemo(() => 
    plainCustomVars.filter(v => !availableExtraKeys.has(v)),
    [plainCustomVars, availableExtraKeys]
  );
  const optionalCustomVars = useMemo(() => 
    plainCustomVars.filter(v => availableExtraKeys.has(v)),
    [plainCustomVars, availableExtraKeys]
  );

  const getMissingVarsForStudent = (studentId) => {
    const student = students.find(s => s.id === studentId);
    if (!student) return [];
    return plainCustomVars.filter(v => !(student.extraData && student.extraData[v] !== undefined && String(student.extraData[v]).trim() !== ''));
  };

  const getDefaultRows = (varName) => Array.from({ length: 5 }, () => {
    const cols = TABLE_COLUMNS[varName] || [];
    const row = {};
    cols.forEach(c => { row[c.key] = ''; });
    return row;
  });
  
  const getInitialArrayRows = (studentId, varName) => {
    const student = students.find(s => s.id === studentId);
    const dbRows = student?.extraData?.[varName];
    return Array.isArray(dbRows) && dbRows.length > 0 ? dbRows : getDefaultRows(varName);
  };

  const updateArrayVar = (varName, rowIndex, fieldKey, value, studentId = null) => {
    if (studentId) {
      setStudentCustomData(prev => {
        const sData = prev[studentId] || {};
        const current = Array.isArray(sData[varName]) ? [...sData[varName]] : [...getInitialArrayRows(studentId, varName)];
        current[rowIndex] = { ...current[rowIndex], [fieldKey]: value };
        return { ...prev, [studentId]: { ...sData, [varName]: current } };
      });
    } else {
      setGlobalCustomData(prev => {
        const current = Array.isArray(prev[varName]) ? [...prev[varName]] : getDefaultRows(varName);
        current[rowIndex] = { ...current[rowIndex], [fieldKey]: value };
        return { ...prev, [varName]: current };
      });
    }
  };

  const addArrayRow = (varName, studentId = null) => {
    if (studentId) {
      setStudentCustomData(prev => {
        const sData = prev[studentId] || {};
        const current = Array.isArray(sData[varName]) ? [...sData[varName]] : [...getInitialArrayRows(studentId, varName)];
        const cols = TABLE_COLUMNS[varName] || [];
        const emptyRow = {};
        cols.forEach(c => { emptyRow[c.key] = ''; });
        return { ...prev, [studentId]: { ...sData, [varName]: [...current, emptyRow] } };
      });
    } else {
      setGlobalCustomData(prev => {
        const cols = TABLE_COLUMNS[varName] || [];
        const emptyRow = {};
        cols.forEach(c => { emptyRow[c.key] = ''; });
        return { ...prev, [varName]: [...(Array.isArray(prev[varName]) ? prev[varName] : getDefaultRows(varName)), emptyRow] };
      });
    }
  };

  const removeArrayRow = (varName, rowIndex, studentId = null) => {
    if (studentId) {
      setStudentCustomData(prev => {
        const sData = prev[studentId] || {};
        const current = Array.isArray(sData[varName]) ? [...sData[varName]] : [...getInitialArrayRows(studentId, varName)];
        current.splice(rowIndex, 1);
        return { ...prev, [studentId]: { ...sData, [varName]: current } };
      });
    } else {
      setGlobalCustomData(prev => {
        const current = Array.isArray(prev[varName]) ? [...prev[varName]] : [];
        if(current.length > 0) current.splice(rowIndex, 1);
        return { ...prev, [varName]: current };
      });
    }
  };

  const STEPS = {
    TEMPLATE: 1,
    STUDENTS: 2,
    CUSTOM_VARS: hasCustomVars ? 3 : -1,
    OUTPUT: hasCustomVars ? 4 : 3,
    CONFIRM: hasCustomVars ? 5 : 4,
  };
  const MAX_STEP = hasCustomVars ? 5 : 4;

  const stepsList = [
    { id: STEPS.TEMPLATE, title: 'Pilih Template', icon: FiFileText },
    { id: STEPS.STUDENTS, title: 'Pilih Siswa', icon: FiUsers },
    ...(hasCustomVars ? [{ id: STEPS.CUSTOM_VARS, title: 'Isi Variabel', icon: FiList }] : []),
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
      customData: globalCustomData,
      studentCustomData: studentCustomData
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
                  {filteredStudents.length > 0 ? filteredStudents.map(student => (
                    <tr 
                      key={student.id} 
                      className={`hover:bg-slate-50 cursor-pointer transition-colors ${selectedStudentIds.includes(student.id) ? 'bg-blue-50/50' : ''}`}
                      onClick={() => toggleStudentSelection(student.id)}
                    >
                      <td className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={selectedStudentIds.includes(student.id)}
                          onChange={() => toggleStudentSelection(student.id)}
                          className="w-4 h-4 text-primary rounded border-slate-300 focus:ring-primary"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-700">{student.nisn}</td>
                      <td className="px-4 py-3">{student.name}</td>
                      <td className="px-4 py-3">{student.className || student.grade || '-'}</td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="4" className="px-4 py-8 text-center text-slate-500">Tidak ada siswa ditemukan</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="mt-4 text-sm text-slate-500 text-right">
              {selectedStudentIds.length} siswa dipilih
            </div>
          </div>
        )}

        {currentStep === STEPS.CUSTOM_VARS && (
          <div className="flex-1 flex flex-col">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Isi Variabel Custom</h3>

            <div className="space-y-6">
              {/* --- GLOBAL VARIABLES --- */}
              <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
                <h4 className="text-md font-semibold text-slate-800 mb-3">Variabel Global</h4>
                <p className="text-xs text-slate-500 mb-4">
                  Nilai yang diisi di sini akan bertindak sebagai <strong>fallback utama</strong> dan berlaku ke semua surat secara seragam (kecuali ditimpa di tabel per-siswa).
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {plainCustomVars.map(variable => (
                    <div key={variable}>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Nilai untuk {'{{'}{variable}{'}}'}
                        {requiredCustomVars.includes(variable) && <span className="text-xs text-red-500 ml-1 font-semibold">* Kosong pada bbrp siswa</span>}
                      </label>
                      <input
                        type="text"
                        value={globalCustomData[variable] || ''}
                        onChange={(e) => setGlobalCustomData(prev => ({ ...prev, [variable]: e.target.value }))}
                        placeholder={`Masukkan ${variable.replace(/_/g, ' ')}...`}
                        className={`w-full rounded-lg shadow-sm sm:text-sm border px-3 py-2 outline-none transition-colors ${
                          requiredCustomVars.includes(variable) && !globalCustomData[variable]
                            ? 'border-amber-300 focus:ring-amber-500 focus:border-amber-500' 
                            : 'border-slate-300 focus:ring-primary focus:border-primary'
                        }`}
                      />
                    </div>
                  ))}
                  {plainCustomVars.length === 0 && (
                    <div className="col-span-full text-sm text-slate-400 italic">Tidak ada variabel teks custom.</div>
                  )}
                </div>
              </div>

              {/* --- PER-STUDENT VARIABLES --- */}
              <div>
                <h4 className="text-md font-semibold text-slate-800 mb-3">Isian Per Siswa (Spesifik)</h4>
                <p className="text-xs text-slate-500 mb-4">
                  Siswa yang ditampilkan di bawah ini adalah siswa yang belum memiliki kelengkapan data variabel atau memerlukan tabel data spesifik. Jika Anda mengisi form ini, nilainya akan menimpa Variabel Global.
                </p>
                <div className="space-y-3">
                  {selectedStudentIds.map(studentId => {
                    const student = students.find(s => s.id === studentId);
                    if (!student) return null;
                    const missingVars = getMissingVarsForStudent(studentId);
                    
                    const missingArrayVars = arrayCustomVars.filter(varName => {
                      return !Array.isArray(student.extraData?.[varName]) || student.extraData[varName].length === 0;
                    });
                    
                    // Show accordion if they are missing plain text vars OR if there are missing array table vars
                    if (missingVars.length === 0 && missingArrayVars.length === 0) return null;

                    const isExpanded = expandedStudentId === studentId;

                    return (
                      <div key={studentId} className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                        <button
                          onClick={() => setExpandedStudentId(isExpanded ? null : studentId)}
                          className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-slate-50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                              {student.name.charAt(0)}
                            </div>
                            <div className="text-left">
                              <div className="font-semibold text-slate-800 text-sm">{student.name}</div>
                              <div className="text-xs text-slate-500">{student.nisn} • {student.className || student.grade || '-'}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            {(missingVars.length > 0 || missingArrayVars.length > 0) && (
                              <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-amber-100 text-amber-700">
                                {missingVars.length + missingArrayVars.length} Data Kosong
                              </span>
                            )}
                            {isExpanded ? <FiChevronUp className="text-slate-400" /> : <FiChevronDown className="text-slate-400" />}
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="px-4 py-4 border-t border-slate-100 bg-slate-50/30">
                            {missingVars.length > 0 && (
                              <div className="mb-5">
                                <h5 className="text-xs font-semibold text-slate-600 uppercase mb-3">Teks Variabel yang Kosong</h5>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  {missingVars.map(variable => (
                                    <div key={variable}>
                                      <label className="block text-xs font-medium text-slate-600 mb-1">
                                        {'{{'}{variable}{'}}'}
                                      </label>
                                      <input
                                        type="text"
                                        value={studentCustomData[studentId]?.[variable] || ''}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          setStudentCustomData(prev => ({
                                            ...prev,
                                            [studentId]: { ...prev[studentId], [variable]: val }
                                          }));
                                        }}
                                        placeholder={`Gunakan global / isi manual...`}
                                        className="w-full rounded shadow-sm text-sm border border-slate-300 px-3 py-1.5 outline-none focus:border-primary"
                                      />
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {missingArrayVars.length > 0 && missingArrayVars.map(varName => {
                              const columns = TABLE_COLUMNS[varName] || [];
                              const sData = studentCustomData[studentId] || {};
                              const rows = Array.isArray(sData[varName]) ? sData[varName] : getInitialArrayRows(studentId, varName);
                              
                              
                              return (
                                <div key={varName} className="mt-4 pt-4 border-t border-slate-200">
                                  <h5 className="text-xs font-semibold text-indigo-700 uppercase mb-2 flex items-center gap-1.5">
                                    <FiTable className="w-3.5 h-3.5" /> Data Tabel: {`{{#each ${varName}}}`}
                                  </h5>
                                  <div className="overflow-x-auto rounded-lg border border-slate-200">
                                    <table className="w-full text-sm border-collapse bg-white">
                                      <thead>
                                        <tr className="bg-indigo-50/50">
                                          {columns.map(col => (
                                            <th key={col.key} className="px-2 py-1.5 border-b border-indigo-100 text-left text-xs font-semibold text-indigo-700">
                                              {col.label}
                                            </th>
                                          ))}
                                          <th className="px-2 py-1.5 border-b border-indigo-100 text-center w-8"></th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {rows.map((row, rowIdx) => (
                                          <tr key={rowIdx}>
                                            {columns.map(col => (
                                              <td key={col.key} className="p-1 border-b border-slate-100">
                                                <input
                                                  type="text"
                                                  value={row[col.key] || ''}
                                                  onChange={e => updateArrayVar(varName, rowIdx, col.key, e.target.value, studentId)}
                                                  placeholder={`...`}
                                                  className="w-full border-0 bg-slate-50 hover:bg-slate-100 focus:bg-white focus:ring-1 focus:ring-indigo-400 rounded px-2 py-1.5 text-xs outline-none transition-colors"
                                                />
                                              </td>
                                            ))}
                                            <td className="p-1 border-b border-slate-100 text-center">
                                              <button
                                                type="button"
                                                onClick={() => removeArrayRow(varName, rowIdx, studentId)}
                                                className="p-1 text-slate-300 hover:text-red-500 transition-colors disabled:opacity-30"
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
                                    onClick={() => addArrayRow(varName, studentId)}
                                    className="mt-2 text-[11px] font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                                  >
                                    <FiPlus className="w-3 h-3" /> Tambah Baris
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {currentStep === STEPS.OUTPUT && (
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Mode Output Dokumen</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div 
                onClick={() => setOutputType('PDF_SINGLE')}
                className={`p-5 rounded-xl border-2 cursor-pointer transition-all ${
                  outputType === 'PDF_SINGLE' 
                  ? 'border-primary bg-blue-50/50' 
                  : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className={`p-2 rounded-lg ${outputType === 'PDF_SINGLE' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-500'}`}>
                    <FiFileText className="w-5 h-5" />
                  </div>
                  <div className="font-semibold text-slate-800">Satu File PDF (Digabung)</div>
                </div>
                <p className="text-sm text-slate-500 ml-11">Semua surat siswa akan digabungkan menjadi satu file PDF. Cocok untuk dicetak sekaligus.</p>
              </div>

              <div 
                onClick={() => setOutputType('ZIP_BUNDLE')}
                className={`p-5 rounded-xl border-2 cursor-pointer transition-all ${
                  outputType === 'ZIP_BUNDLE' 
                  ? 'border-primary bg-blue-50/50' 
                  : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className={`p-2 rounded-lg ${outputType === 'ZIP_BUNDLE' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-500'}`}>
                    <FiUsers className="w-5 h-5" />
                  </div>
                  <div className="font-semibold text-slate-800">File PDF Terpisah (ZIP)</div>
                </div>
                <p className="text-sm text-slate-500 ml-11">Setiap siswa mendapatkan satu file PDF terpisah, dikumpulkan dalam satu file ZIP. Cocok untuk dibagikan secara digital per siswa.</p>
              </div>
            </div>
          </div>
        )}

        {currentStep === STEPS.CONFIRM && (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-blue-50 text-primary rounded-full flex items-center justify-center mb-6">
              <FiCheckCircle className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-bold text-slate-800 mb-2">Siap untuk Generate</h3>
            <p className="text-slate-500 max-w-md mb-8">
              Sistem akan memproses {selectedStudentIds.length} surat menggunakan template "{selectedTemplate?.title}" dengan mode output {outputType === 'PDF_SINGLE' ? 'Satu File PDF' : 'File ZIP'}.
            </p>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 max-w-md w-full text-left">
              <h4 className="font-semibold text-slate-700 mb-4 border-b border-slate-200 pb-2">Ringkasan Tugas</h4>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Template:</span>
                  <span className="font-medium text-slate-800">{selectedTemplate?.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Surat:</span>
                  <span className="font-medium text-slate-800">{selectedStudentIds.length} Siswa</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Mode Output:</span>
                  <span className="font-medium text-slate-800">{outputType === 'PDF_SINGLE' ? 'PDF Gabungan' : 'ZIP Bundle'}</span>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      <div className="flex justify-between mt-6">
        <Button 
          variant="secondary" 
          onClick={handlePrev}
          disabled={currentStep === 1 || isLoading}
          icon={FiChevronLeft}
        >
          Kembali
        </Button>

        {currentStep < MAX_STEP ? (
          <Button 
            variant="primary" 
            onClick={handleNext}
            disabled={
              (currentStep === STEPS.TEMPLATE && !selectedTemplateId) ||
              (currentStep === STEPS.STUDENTS && selectedStudentIds.length === 0)
            }
          >
            Lanjut <FiChevronRight className="ml-2" />
          </Button>
        ) : (
          <Button 
            variant="primary" 
            onClick={handleSubmit}
            isLoading={isLoading}
            icon={FiPlay}
          >
            Generate Surat
          </Button>
        )}
      </div>
    </div>
  );
};

export default GeneratePage;
