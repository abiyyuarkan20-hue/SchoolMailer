import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import PageHeader from '../components/common/PageHeader';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import api from '../services/api';
import toast from 'react-hot-toast';
import { FiLock, FiLayout, FiImage, FiSave, FiMaximize, FiEdit3, FiPlus, FiTrash2, FiSettings, FiUpload } from 'react-icons/fi';
import { uploadLogo } from '../services/uploadService';
import RichTextEditor from '../components/common/RichTextEditor';
import { BASE_URL } from '../constants';

const SettingsPage = () => {
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'letterhead');
  
  // Password state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordErrors, setPasswordErrors] = useState({});
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);

  // Letterhead state
  const [letterheadData, setLetterheadData] = useState({
    useGlobalHeader: false,
    headerContentHtml: '',
    headerLogoLeft: '',
    headerLogoRight: '',
    logoSize: 80,
    logoMarginTop: 0,
    logoPaddingX: 0,
    headerLineWidth: 100,
    headerLineAlign: 'center',
    headerLinePosition: 'bottom',
    headerLinePadding: 15
  });
  const [isLetterheadLoading, setIsLetterheadLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const logoLeftRef = useRef(null);
  const logoRightRef = useRef(null);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['letterhead', 'signature', 'password'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  // Signature state
  const [signatureData, setSignatureData] = useState({
    useGlobalSignature: false,
    signatories: [
      { position: '', pangkat: '', name: '', nip: '', side: 'left', signImage: '', stampImage: '', signSize: 100, signOffsetX: 0, signOffsetY: -30, signAlign: 'center', stampSize: 100, stampOffsetX: 20, stampOffsetY: -20, stampAlign: 'center' },
      { position: '', pangkat: '', name: '', nip: '', side: 'right', signImage: '', stampImage: '', signSize: 100, signOffsetX: 0, signOffsetY: -30, signAlign: 'center', stampSize: 100, stampOffsetX: 20, stampOffsetY: -20, stampAlign: 'center' },
    ],
    showDate: true,
    dateAlign: 'right',
    letterCity: 'Medan',
  });
  const [activeSettingsIndex, setActiveSettingsIndex] = useState(null);
  const [isSignatureLoading, setIsSignatureLoading] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await api.get('/settings');
      if (res.data.data) {
        setLetterheadData({
          useGlobalHeader: res.data.data.useGlobalHeader || false,
          headerContentHtml: res.data.data.headerContentHtml || '',
          headerLogoLeft: res.data.data.headerLogoLeft || '',
          headerLogoRight: res.data.data.headerLogoRight || '',
          logoSize: res.data.data.logoSize ?? 80,
          logoMarginTop: res.data.data.logoMarginTop ?? 0,
          logoPaddingX: res.data.data.logoPaddingX ?? 0,
          headerLineWidth: res.data.data.headerLineWidth ?? 100,
          headerLineAlign: res.data.data.headerLineAlign || 'center',
          headerLinePosition: res.data.data.headerLinePosition || 'bottom',
          headerLinePadding: res.data.data.headerLinePadding ?? 15
        });
        if (res.data.data.signatureConfig) {
          setSignatureData({
            useGlobalSignature: res.data.data.useGlobalSignature || false,
            ...res.data.data.signatureConfig,
          });
        }
      }
    } catch (error) {
      toast.error('Gagal memuat pengaturan global');
    }
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
    if (passwordErrors[name]) {
      setPasswordErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleLetterheadChange = (e) => {
    const { name, value, type, checked } = e.target;
    setLetterheadData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleLogoUpload = async (e, side) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Harap unggah file gambar (PNG/JPG)');
      return;
    }

    setIsUploading(true);
    try {
      const url = await uploadLogo(file);
      setLetterheadData(prev => ({ ...prev, [side === 'left' ? 'headerLogoLeft' : 'headerLogoRight']: url }));
      toast.success('Logo berhasil diunggah');
    } catch (error) {
      toast.error('Gagal mengunggah logo');
    } finally {
      setIsUploading(false);
    }
  };

  const validatePassword = () => {
    const newErrors = {};
    if (passwordData.currentPassword.length < 6) newErrors.currentPassword = 'Password lama minimal 6 karakter';
    if (passwordData.newPassword.length < 6) newErrors.newPassword = 'Password baru minimal 6 karakter';
    if (passwordData.newPassword !== passwordData.confirmPassword) newErrors.confirmPassword = 'Konfirmasi password tidak cocok';
    setPasswordErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!validatePassword()) return;

    setIsPasswordLoading(true);
    try {
      await api.put('/users/password', passwordData);
      toast.success('Password berhasil diubah');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Gagal mengubah password');
    } finally {
      setIsPasswordLoading(false);
    }
  };

  const handleSignatureChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSignatureData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSignatoryChange = (index, field, value) => {
    setSignatureData(prev => {
      const signatories = [...prev.signatories];
      signatories[index] = { ...signatories[index], [field]: value };
      return { ...prev, signatories };
    });
  };

  const addSignatory = () => {
    setSignatureData(prev => ({
      ...prev,
      signatories: [...prev.signatories, { position: '', pangkat: '', name: '', nip: '', side: 'center', signImage: '', stampImage: '', signSize: 100, signOffsetX: 0, signOffsetY: -30, signAlign: 'center', stampSize: 100, stampOffsetX: 20, stampOffsetY: -20, stampAlign: 'center' }],
    }));
  };

  const handleSignatoryImageUpload = async (e, index, field) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Harap unggah file gambar (PNG/JPG)');
      return;
    }

    setIsUploading(true);
    try {
      const url = await uploadLogo(file);
      handleSignatoryChange(index, field, url);
      toast.success(field === 'signImage' ? 'Tanda tangan diunggah' : 'Stempel diunggah');
    } catch (error) {
      toast.error('Gagal mengunggah gambar');
    } finally {
      setIsUploading(false);
    }
  };

  const removeSignatory = (index) => {
    setSignatureData(prev => ({
      ...prev,
      signatories: prev.signatories.filter((_, i) => i !== index),
    }));
  };

  const handleSignatureSubmit = async (e) => {
    e.preventDefault();
    setIsSignatureLoading(true);
    try {
      const { useGlobalSignature, ...config } = signatureData;
      await api.put('/settings', {
        useGlobalSignature,
        signatureConfig: config,
      });
      toast.success('Pengaturan Tanda Tangan berhasil disimpan');
    } catch (error) {
      toast.error('Gagal menyimpan pengaturan');
    } finally {
      setIsSignatureLoading(false);
    }
  };

  const handleLetterheadSubmit = async (e) => {
    e.preventDefault();
    setIsLetterheadLoading(true);
    try {
      await api.put('/settings', letterheadData);
      toast.success('Pengaturan Kop Surat Global berhasil disimpan');
    } catch (error) {
      toast.error('Gagal menyimpan pengaturan');
    } finally {
      setIsLetterheadLoading(false);
    }
  };

  const tabLabels = {
    letterhead: { title: 'Kop Surat Global', icon: FiLayout, desc: 'Pengaturan kop surat yang akan diterapkan ke semua template.' },
    signature: { title: 'Tanda Tangan', icon: FiEdit3, desc: 'Pengaturan tanda tangan yang akan muncul di bagian bawah surat.' },
    password: { title: 'Keamanan & Password', icon: FiLock, desc: 'Ubah password akun Anda.' },
  };
  const currentTab = tabLabels[activeTab] || tabLabels.letterhead;

  return (
    <div>
      <PageHeader
        title={currentTab.title}
        description={currentTab.desc}
      />

      <div className="flex flex-col gap-6">
        {/* Content Area */}
        <div className="flex-1">
          {activeTab === 'signature' && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-6 border-b border-slate-200 flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-semibold text-slate-800">Tanda Tangan Surat</h2>
                  <p className="text-sm text-slate-500 mt-1">Pengaturan tanda tangan akan muncul di bagian bawah setiap surat yang dicetak.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" name="useGlobalSignature" className="sr-only peer" checked={signatureData.useGlobalSignature} onChange={handleSignatureChange} />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  <span className="ml-3 text-sm font-medium text-slate-700">Aktifkan</span>
                </label>
              </div>

              <form onSubmit={handleSignatureSubmit}>
                <div className={`p-6 space-y-6 ${!signatureData.useGlobalSignature ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
                    <div className="bg-slate-50 rounded-xl p-5 space-y-4">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-semibold text-slate-700">Tanggal Surat</label>
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <input type="checkbox" checked={signatureData.showDate !== false} onChange={(e) => setSignatureData(prev => ({ ...prev, showDate: e.target.checked }))} className="rounded border-slate-300 text-primary focus:ring-primary" />
                          <span className="text-sm text-slate-600">Tampilkan di surat</span>
                        </label>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1.5">Teks Kota / Tanggal</label>
                        <RichTextEditor 
                          content={signatureData.letterCity && signatureData.letterCity.replace(/<[^>]*>/g, '').trim() ? signatureData.letterCity : '<p>Medan, 3 Juli 2026</p>'} 
                          onChange={(html) => setSignatureData(prev => ({ ...prev, letterCity: html }))} 
                          placeholder="Contoh: Medan, 3 Juli 2026"
                          compact
                        />
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-medium text-slate-500">Perataan:</span>
                        <div className="flex gap-1">
                          {['left', 'center', 'right'].map((align) => (
                            <button
                              key={align}
                              type="button"
                              onClick={() => setSignatureData(prev => ({ ...prev, dateAlign: align }))}
                              className={`px-3 py-1.5 text-xs rounded border transition-colors ${(signatureData.dateAlign || 'right') === align ? 'bg-primary text-white border-primary' : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'}`}
                            >
                              {{ left: 'Kiri', center: 'Tengah', right: 'Kanan' }[align]}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                  <div className="border-t border-slate-200 pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-sm font-semibold text-slate-700">Pejabat / Penanda Tangan</h4>
                      <button type="button" onClick={addSignatory} className="text-xs flex items-center gap-1.5 text-primary hover:text-primary-dark font-medium px-3 py-1.5 rounded-lg border border-primary/30 hover:bg-primary/5 transition-colors">
                        <FiPlus className="w-3.5 h-3.5" /> Tambah Penanda Tangan
                      </button>
                    </div>

                    <div className="space-y-4">
                      {signatureData.signatories.map((signatory, index) => (
                        <div key={index} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                          <div className="flex items-center justify-between px-5 py-3 bg-slate-50 border-b border-slate-200">
                            <div className="flex items-center gap-2.5">
                              <span className="w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">{index + 1}</span>
                              <span className="text-sm font-medium text-slate-700">Penanda Tangan</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <button type="button" onClick={() => setActiveSettingsIndex(activeSettingsIndex === index ? null : index)} className={`text-xs flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-colors ${activeSettingsIndex === index ? 'bg-primary/10 text-primary border-primary/30' : 'text-slate-500 border-slate-200 hover:border-slate-300 hover:bg-slate-100'}`}>
                                <FiSettings className="w-3.5 h-3.5" /> Gambar & Lanjutan
                              </button>
                              {signatureData.signatories.length > 1 && (
                                <button type="button" onClick={() => removeSignatory(index)} className="text-xs flex items-center gap-1.5 text-danger px-2.5 py-1.5 rounded-lg border border-danger/20 hover:bg-red-50 transition-colors">
                                  <FiTrash2 className="w-3.5 h-3.5" /> Hapus
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="p-5 space-y-5">
                            <div className="space-y-3">
                              <h5 className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">Identitas</h5>
                              <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">Jabatan</label>
                                <RichTextEditor 
                                  content={signatory.position} 
                                  onChange={(html) => handleSignatoryChange(index, 'position', html)} 
                                  placeholder="Kepala Sekolah&#10;SMA Negeri 19 Medan"
                                />
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-xs font-medium text-slate-600 mb-1">Nama Lengkap</label>
                                  <RichTextEditor content={signatory.name} onChange={(html) => handleSignatoryChange(index, 'name', html)} placeholder="Drs. H. Nama, M.Pd." compact />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-slate-600 mb-1">NIP</label>
                                  <RichTextEditor content={signatory.nip} onChange={(html) => handleSignatoryChange(index, 'nip', html)} placeholder="197001012000121001" compact />
                                </div>
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">Pangkat/Golongan (Opsional)</label>
                                <RichTextEditor content={signatory.pangkat || ''} onChange={(html) => handleSignatoryChange(index, 'pangkat', html)} placeholder="Pembina Tk. I, IV/b" compact />
                              </div>
                            </div>

                            <div className="border-t border-slate-100 pt-4">
                              <h5 className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-3">Posisi Layout</h5>
                              <div className="flex flex-wrap items-center gap-4">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-slate-500">Perataan:</span>
                                  <div className="flex gap-0.5">
                                    {['left', 'center', 'right'].map((side) => (
                                      <button
                                        key={side}
                                        type="button"
                                        onClick={() => handleSignatoryChange(index, 'side', side)}
                                        className={`px-2.5 py-1 text-xs rounded border transition-colors ${(signatory.side || 'left') === side ? 'bg-primary text-white border-primary' : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'}`}
                                      >
                                        {{ left: 'Kiri', center: 'Tengah', right: 'Kanan' }[side]}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                                  <input type="checkbox" checked={signatory.newRow || false} onChange={(e) => handleSignatoryChange(index, 'newRow', e.target.checked)} className="w-3.5 h-3.5 rounded border-slate-300 text-primary focus:ring-primary" />
                                  <span className="text-xs text-slate-500">Baris baru</span>
                                </label>
                              </div>
                            </div>
                          </div>

                          {activeSettingsIndex === index && (
                            <div className="border-t border-slate-200 bg-slate-50 px-5 py-5">
                              <h5 className="text-xs font-semibold text-slate-700 mb-4">Upload &amp; Pengaturan Gambar</h5>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-white p-4 rounded-xl border border-slate-200">
                                  <div className="flex justify-between items-center mb-3">
                                    <span className="text-sm font-medium text-slate-700">Tanda Tangan</span>
                                    <div className="flex items-center gap-2">
                                      <input type="file" id={`sign-${index}`} className="hidden" accept="image/png, image/jpeg" onChange={(e) => handleSignatoryImageUpload(e, index, 'signImage')} disabled={isUploading} />
                                      <button type="button" onClick={() => document.getElementById(`sign-${index}`).click()} className="text-xs text-primary flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-primary/30 hover:bg-primary/5 transition-colors"><FiUpload /> Upload</button>
                                      {signatory.signImage && <button type="button" onClick={() => handleSignatoryChange(index, 'signImage', '')} className="text-xs text-danger hover:underline">Hapus</button>}
                                    </div>
                                  </div>
                                  {signatory.signImage ? (
                                    <div className="space-y-3">
                                      <div className="flex items-center gap-3">
                                        <span className="text-xs text-slate-500 w-16 shrink-0">Posisi</span>
                                        <select value={signatory.signAlign || 'center'} onChange={(e) => handleSignatoryChange(index, 'signAlign', e.target.value)} className="flex-1 text-xs border border-slate-300 rounded outline-none p-1.5 bg-white">
                                          <option value="left">Kiri</option>
                                          <option value="center">Tengah</option>
                                          <option value="right">Kanan</option>
                                        </select>
                                      </div>
                                      <div className="flex items-center gap-3">
                                        <span className="text-xs text-slate-500 w-16 shrink-0">Ukuran</span>
                                        <div className="flex-1 flex items-center gap-2">
                                          <input type="range" min="30" max="250" value={signatory.signSize ?? 100} onChange={(e) => handleSignatoryChange(index, 'signSize', parseInt(e.target.value))} className="flex-1 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer" />
                                          <span className="text-xs text-slate-500 w-9 text-right font-mono">{signatory.signSize ?? 100}px</span>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-3">
                                        <span className="text-xs text-slate-500 w-16 shrink-0">Geser X</span>
                                        <div className="flex-1 flex items-center gap-2">
                                          <input type="range" min="-500" max="500" value={signatory.signOffsetX ?? 0} onChange={(e) => handleSignatoryChange(index, 'signOffsetX', parseInt(e.target.value))} className="flex-1 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer" />
                                          <span className="text-xs text-slate-500 w-10 text-right font-mono">{signatory.signOffsetX ?? 0}</span>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-3">
                                        <span className="text-xs text-slate-500 w-16 shrink-0">Geser Y</span>
                                        <div className="flex-1 flex items-center gap-2">
                                          <input type="range" min="-500" max="500" value={signatory.signOffsetY ?? -30} onChange={(e) => handleSignatoryChange(index, 'signOffsetY', parseInt(e.target.value))} className="flex-1 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer" />
                                          <span className="text-xs text-slate-500 w-10 text-right font-mono">{signatory.signOffsetY ?? -30}</span>
                                        </div>
                                      </div>
                                    </div>
                                  ) : (
                                    <p className="text-xs text-slate-400 italic">Upload gambar untuk mengatur posisi dan ukuran.</p>
                                  )}
                                </div>

                                <div className="bg-white p-4 rounded-xl border border-slate-200">
                                  <div className="flex justify-between items-center mb-3">
                                    <span className="text-sm font-medium text-slate-700">Stempel / Cap</span>
                                    <div className="flex items-center gap-2">
                                      <input type="file" id={`stamp-${index}`} className="hidden" accept="image/png, image/jpeg" onChange={(e) => handleSignatoryImageUpload(e, index, 'stampImage')} disabled={isUploading} />
                                      <button type="button" onClick={() => document.getElementById(`stamp-${index}`).click()} className="text-xs text-primary flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-primary/30 hover:bg-primary/5 transition-colors"><FiUpload /> Upload</button>
                                      {signatory.stampImage && <button type="button" onClick={() => handleSignatoryChange(index, 'stampImage', '')} className="text-xs text-danger hover:underline">Hapus</button>}
                                    </div>
                                  </div>
                                  {signatory.stampImage ? (
                                    <div className="space-y-3">
                                      <div className="flex items-center gap-3">
                                        <span className="text-xs text-slate-500 w-16 shrink-0">Posisi</span>
                                        <select value={signatory.stampAlign || 'center'} onChange={(e) => handleSignatoryChange(index, 'stampAlign', e.target.value)} className="flex-1 text-xs border border-slate-300 rounded outline-none p-1.5 bg-white">
                                          <option value="left">Kiri</option>
                                          <option value="center">Tengah</option>
                                          <option value="right">Kanan</option>
                                        </select>
                                      </div>
                                      <div className="flex items-center gap-3">
                                        <span className="text-xs text-slate-500 w-16 shrink-0">Ukuran</span>
                                        <div className="flex-1 flex items-center gap-2">
                                          <input type="range" min="30" max="250" value={signatory.stampSize ?? 100} onChange={(e) => handleSignatoryChange(index, 'stampSize', parseInt(e.target.value))} className="flex-1 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer" />
                                          <span className="text-xs text-slate-500 w-9 text-right font-mono">{signatory.stampSize ?? 100}px</span>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-3">
                                        <span className="text-xs text-slate-500 w-16 shrink-0">Geser X</span>
                                        <div className="flex-1 flex items-center gap-2">
                                          <input type="range" min="-500" max="500" value={signatory.stampOffsetX ?? 20} onChange={(e) => handleSignatoryChange(index, 'stampOffsetX', parseInt(e.target.value))} className="flex-1 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer" />
                                          <span className="text-xs text-slate-500 w-10 text-right font-mono">{signatory.stampOffsetX ?? 20}</span>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-3">
                                        <span className="text-xs text-slate-500 w-16 shrink-0">Geser Y</span>
                                        <div className="flex-1 flex items-center gap-2">
                                          <input type="range" min="-500" max="500" value={signatory.stampOffsetY ?? -20} onChange={(e) => handleSignatoryChange(index, 'stampOffsetY', parseInt(e.target.value))} className="flex-1 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer" />
                                          <span className="text-xs text-slate-500 w-10 text-right font-mono">{signatory.stampOffsetY ?? -20}</span>
                                        </div>
                                      </div>
                                    </div>
                                  ) : (
                                    <p className="text-xs text-slate-400 italic">Upload gambar untuk mengatur posisi dan ukuran.</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Live Preview */}
                  <div className="border-t border-slate-200 pt-4 mt-6">
                    <h3 className="text-sm font-semibold text-slate-700 mb-4 uppercase tracking-wider">Live Preview Tanda Tangan</h3>
                    <div className="border border-slate-300 rounded bg-white p-8 overflow-x-auto shadow-inner">
                      <div style={{ minWidth: '600px', fontFamily: '"Times New Roman", Times, serif', fontSize: '14pt', color: '#000' }}>
                        {(() => {
                          const dateEl = signatureData.showDate !== false ? (
                            <div dangerouslySetInnerHTML={{ __html: signatureData.letterCity && signatureData.letterCity.replace(/<[^>]*>/g, '').trim() ? signatureData.letterCity : 'Medan, 3 Juli 2026' }} style={{ margin: 0, fontSize: '12pt' }} />
                          ) : null;

                          const renderPosition = (position) => {
                            if (!position) return '';
                            const cleaned = position.includes('<') ? position.replace(/<\/?p[^>]*>/gi, '') : position;
                            return cleaned.replace(/\n/g, '<br>');
                          };
                          const renderHtml = (val) => val && val.includes('<') ? val.replace(/<\/?p[^>]*>/gi, '') : val;


                          const filtered = signatureData.signatories.filter(s => s.name && renderPosition(s.position));
                          if (filtered.length === 0) return (
                            <p className="text-slate-400 text-sm text-center py-8">Isi data penanda tangan untuk melihat preview</p>
                          );

                          const renderSignatory = (s, key) => (
                            <div key={key} style={{ flex: 1, textAlign: s.side === 'center' ? 'center' : 'left', position: 'relative' }}>
                              <div dangerouslySetInnerHTML={{ __html: renderPosition(s.position) }} style={{ margin: 0, fontSize: '12pt', marginBottom: '4px', minHeight: '18px', lineHeight: 'normal' }} />
                              <div style={{ height: `70px`, position: 'relative' }}>
                                {s.signImage && (
                                  <img src={`${BASE_URL}${s.signImage}`} alt="Tanda Tangan" style={{ position: 'absolute', width: `${s.signSize ?? 100}px`, left: (!s.signAlign || s.signAlign === 'center') ? '50%' : (s.signAlign === 'left' ? '0' : 'auto'), right: s.signAlign === 'right' ? '0' : 'auto', transform: (!s.signAlign || s.signAlign === 'center') ? `translate(calc(-50% + ${s.signOffsetX ?? 0}px), ${s.signOffsetY ?? -30}px)` : `translate(${s.signOffsetX ?? 0}px, ${s.signOffsetY ?? -30}px)`, zIndex: 1 }} />
                                )}
                                {s.stampImage && (
                                  <img src={`${BASE_URL}${s.stampImage}`} alt="Stempel" style={{ position: 'absolute', width: `${s.stampSize ?? 100}px`, left: (!s.stampAlign || s.stampAlign === 'center') ? '50%' : (s.stampAlign === 'left' ? '0' : 'auto'), right: s.stampAlign === 'right' ? '0' : 'auto', transform: (!s.stampAlign || s.stampAlign === 'center') ? `translate(calc(-50% + ${s.stampOffsetX ?? 20}px), ${s.stampOffsetY ?? -20}px)` : `translate(${s.stampOffsetX ?? 20}px, ${s.stampOffsetY ?? -20}px)`, zIndex: 2 }} />
                                )}
                              </div>
                              <div dangerouslySetInnerHTML={{ __html: renderHtml(s.name) }} style={{ margin: 0, fontSize: '12pt', lineHeight: 'normal' }} />
                              {s.pangkat && <div dangerouslySetInnerHTML={{ __html: renderHtml(s.pangkat) }} style={{ margin: 0, fontSize: '11pt', color: '#000', lineHeight: 'normal' }} />}
                              {s.nip && <div style={{ margin: 0, fontSize: '11pt', color: '#000', lineHeight: 'normal' }}><span dangerouslySetInnerHTML={{ __html: renderHtml(s.nip) }} /></div>}
                            </div>
                          );
                            const rows = [];
                          let currentRow = [];
                          filtered.forEach((s) => {
                            if (s.newRow && currentRow.length > 0) {
                              rows.push(currentRow);
                              currentRow = [];
                            }
                            currentRow.push(s);
                          });
                          if (currentRow.length > 0) rows.push(currentRow);

                          if (filtered.length === 1) {
                            const s = filtered[0];
                            const sideStyle = s.side === 'right'
                              ? { marginLeft: 'auto', marginRight: '0' }
                              : s.side === 'center'
                              ? { marginLeft: 'auto', marginRight: 'auto' }
                              : { marginLeft: '0', marginRight: 'auto' };
                            return (
                              <div style={{ ...sideStyle, position: 'relative', width: 'fit-content', maxWidth: '100%' }}>
                                {dateEl && <div style={{ textAlign: signatureData.dateAlign || 'right', marginBottom: '0.25em' }}>{dateEl}</div>}
                                <div style={{ textAlign: s.side === 'center' ? 'center' : 'left' }}>
                                  <div dangerouslySetInnerHTML={{ __html: renderPosition(s.position) }} style={{ margin: 0, fontSize: '12pt', marginBottom: '4px', minHeight: '18px', lineHeight: 'normal' }} />
                                  <div style={{ height: `70px`, position: 'relative' }}>
                                    {s.signImage && (
                                      <img src={`${BASE_URL}${s.signImage}`} alt="Tanda Tangan" style={{ position: 'absolute', width: `${s.signSize ?? 100}px`, left: (!s.signAlign || s.signAlign === 'center') ? '50%' : (s.signAlign === 'left' ? '0' : 'auto'), right: s.signAlign === 'right' ? '0' : 'auto', transform: (!s.signAlign || s.signAlign === 'center') ? `translate(calc(-50% + ${s.signOffsetX ?? 0}px), ${s.signOffsetY ?? -30}px)` : `translate(${s.signOffsetX ?? 0}px, ${s.signOffsetY ?? -30}px)`, zIndex: 1 }} />
                                    )}
                                    {s.stampImage && (
                                      <img src={`${BASE_URL}${s.stampImage}`} alt="Stempel" style={{ position: 'absolute', width: `${s.stampSize ?? 100}px`, left: (!s.stampAlign || s.stampAlign === 'center') ? '50%' : (s.stampAlign === 'left' ? '0' : 'auto'), right: s.stampAlign === 'right' ? '0' : 'auto', transform: (!s.stampAlign || s.stampAlign === 'center') ? `translate(calc(-50% + ${s.stampOffsetX ?? 20}px), ${s.stampOffsetY ?? -20}px)` : `translate(${s.stampOffsetX ?? 20}px, ${s.stampOffsetY ?? -20}px)`, zIndex: 2 }} />
                                    )}
                                  </div>
                                  <div dangerouslySetInnerHTML={{ __html: renderHtml(s.name) }} style={{ margin: 0, fontSize: '12pt', lineHeight: 'normal' }} />
                                  {s.pangkat && <div dangerouslySetInnerHTML={{ __html: renderHtml(s.pangkat) }} style={{ margin: 0, fontSize: '11pt', color: '#000', lineHeight: 'normal' }} />}
                                  {s.nip && <div style={{ margin: 0, fontSize: '11pt', color: '#000', lineHeight: 'normal' }}><span dangerouslySetInnerHTML={{ __html: renderHtml(s.nip) }} /></div>}
                                </div>
                              </div>
                            );
                          }
                          return (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: `30px` }}>
                              {dateEl && <div style={{ textAlign: signatureData.dateAlign || 'right', marginBottom: '0.25em' }}>{dateEl}</div>}
                              {rows.map((row, ri) => {
                                if (row.length === 1) {
                                  const s = row[0];
                                  const sideStyle = s.side === 'right'
                                    ? { marginLeft: 'auto', marginRight: '0' }
                                    : s.side === 'center'
                                    ? { marginLeft: 'auto', marginRight: 'auto' }
                                    : { marginLeft: '0', marginRight: 'auto' };
                                  return (
                                    <div key={ri} style={{ ...sideStyle, textAlign: s.side === 'center' ? 'center' : 'left', position: 'relative', width: 'fit-content', maxWidth: '100%' }}>
                                      <div dangerouslySetInnerHTML={{ __html: renderPosition(s.position) }} style={{ margin: 0, fontSize: '12pt', marginBottom: '4px', minHeight: '18px', lineHeight: 'normal' }} />
                                      <div style={{ height: `70px`, position: 'relative' }}>
                                        {s.signImage && (
                                          <img src={`${BASE_URL}${s.signImage}`} alt="Tanda Tangan" style={{ position: 'absolute', width: `${s.signSize ?? 100}px`, left: (!s.signAlign || s.signAlign === 'center') ? '50%' : (s.signAlign === 'left' ? '0' : 'auto'), right: s.signAlign === 'right' ? '0' : 'auto', transform: (!s.signAlign || s.signAlign === 'center') ? `translate(calc(-50% + ${s.signOffsetX ?? 0}px), ${s.signOffsetY ?? -30}px)` : `translate(${s.signOffsetX ?? 0}px, ${s.signOffsetY ?? -30}px)`, zIndex: 1 }} />
                                        )}
                                        {s.stampImage && (
                                          <img src={`${BASE_URL}${s.stampImage}`} alt="Stempel" style={{ position: 'absolute', width: `${s.stampSize ?? 100}px`, left: (!s.stampAlign || s.stampAlign === 'center') ? '50%' : (s.stampAlign === 'left' ? '0' : 'auto'), right: s.stampAlign === 'right' ? '0' : 'auto', transform: (!s.stampAlign || s.stampAlign === 'center') ? `translate(calc(-50% + ${s.stampOffsetX ?? 20}px), ${s.stampOffsetY ?? -20}px)` : `translate(${s.stampOffsetX ?? 20}px, ${s.stampOffsetY ?? -20}px)`, zIndex: 2 }} />
                                        )}
                                      </div>
                                      <div dangerouslySetInnerHTML={{ __html: renderHtml(s.name) }} style={{ margin: 0, fontSize: '12pt', lineHeight: 'normal' }} />
                                      {s.pangkat && <div dangerouslySetInnerHTML={{ __html: renderHtml(s.pangkat) }} style={{ margin: 0, fontSize: '11pt', color: '#000', lineHeight: 'normal' }} />}
                                      {s.nip && <div style={{ margin: 0, fontSize: '11pt', color: '#000', lineHeight: 'normal' }}><span dangerouslySetInnerHTML={{ __html: renderHtml(s.nip) }} /></div>}
                                    </div>
                                  );
                                }
                                return (
                                  <div key={ri} style={{ display: 'flex', justifyContent: 'space-between', gap: `40px` }}>
                                    {row.map((s, si) => renderSignatory(s, `${ri}-${si}`))}
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-6 border-t border-slate-200 bg-slate-50 flex justify-end">
                  <Button type="submit" isLoading={isSignatureLoading} icon={FiSave} disabled={!signatureData.useGlobalSignature}>
                    Simpan Tanda Tangan
                  </Button>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'password' && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-6 border-b border-slate-200">
                <h2 className="text-lg font-semibold text-slate-800">Ubah Password</h2>
                <p className="text-sm text-slate-500 mt-1">Pastikan akun Anda menggunakan password yang panjang, acak, dan unik.</p>
              </div>
              
              <form onSubmit={handlePasswordSubmit} className="p-6 space-y-6">
                <Input
                  label="Password Saat Ini"
                  type="password"
                  name="currentPassword"
                  value={passwordData.currentPassword}
                  onChange={handlePasswordChange}
                  error={passwordErrors.currentPassword}
                  placeholder="Masukkan password lama Anda"
                  required
                />
                <div className="pt-2 border-t border-slate-100">
                  <div className="space-y-4 mt-4">
                    <Input
                      label="Password Baru"
                      type="password"
                      name="newPassword"
                      value={passwordData.newPassword}
                      onChange={handlePasswordChange}
                      error={passwordErrors.newPassword}
                      placeholder="Minimal 6 karakter"
                      required
                    />
                    <Input
                      label="Konfirmasi Password Baru"
                      type="password"
                      name="confirmPassword"
                      value={passwordData.confirmPassword}
                      onChange={handlePasswordChange}
                      error={passwordErrors.confirmPassword}
                      placeholder="Ulangi password baru"
                      required
                    />
                  </div>
                </div>
                <div className="flex justify-end pt-4">
                  <Button type="submit" isLoading={isPasswordLoading}>
                    Simpan Password
                  </Button>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'letterhead' && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-6 border-b border-slate-200 flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-semibold text-slate-800">Kop Surat Global</h2>
                  <p className="text-sm text-slate-500 mt-1">Pengaturan ini akan diterapkan ke semua template surat yang dicetak.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" name="useGlobalHeader" className="sr-only peer" checked={letterheadData.useGlobalHeader} onChange={handleLetterheadChange} />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  <span className="ml-3 text-sm font-medium text-slate-700">Aktifkan Global</span>
                </label>
              </div>

              <div className={`p-6 space-y-6 ${!letterheadData.useGlobalHeader ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
                <div className="grid grid-cols-2 gap-4">
                  <div className="border border-slate-200 rounded-lg p-4 flex flex-col items-center justify-center bg-slate-50 relative group min-h-[120px]">
                    {letterheadData.headerLogoLeft ? (
                      <>
                        <img src={`${BASE_URL}${letterheadData.headerLogoLeft}`} alt="Logo Kiri" className="absolute inset-0 w-full h-full object-contain p-2" />
                        <button type="button" onClick={() => setLetterheadData(prev => ({ ...prev, headerLogoLeft: '' }))} className="absolute top-1 right-1 bg-danger text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity z-10">×</button>
                      </>
                    ) : (
                      <div className="text-center cursor-pointer" onClick={() => logoLeftRef.current?.click()}>
                        <FiImage className="mx-auto h-8 w-8 text-slate-400" />
                        <span className="mt-2 block text-sm font-medium text-slate-600">Logo Kiri</span>
                      </div>
                    )}
                    <input type="file" ref={logoLeftRef} className="hidden" accept="image/png, image/jpeg" onChange={(e) => handleLogoUpload(e, 'left')} disabled={isUploading} />
                  </div>
                  
                  <div className="border border-slate-200 rounded-lg p-4 flex flex-col items-center justify-center bg-slate-50 relative group min-h-[120px]">
                    {letterheadData.headerLogoRight ? (
                      <>
                        <img src={`${BASE_URL}${letterheadData.headerLogoRight}`} alt="Logo Kanan" className="absolute inset-0 w-full h-full object-contain p-2" />
                        <button type="button" onClick={() => setLetterheadData(prev => ({ ...prev, headerLogoRight: '' }))} className="absolute top-1 right-1 bg-danger text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity z-10">×</button>
                      </>
                    ) : (
                      <div className="text-center cursor-pointer" onClick={() => logoRightRef.current?.click()}>
                        <FiImage className="mx-auto h-8 w-8 text-slate-400" />
                        <span className="mt-2 block text-sm font-medium text-slate-600">Logo Kanan</span>
                      </div>
                    )}
                    <input type="file" ref={logoRightRef} className="hidden" accept="image/png, image/jpeg" onChange={(e) => handleLogoUpload(e, 'right')} disabled={isUploading} />
                  </div>
                </div>

                {/* Logo Size & Position Controls */}
                {(letterheadData.headerLogoLeft || letterheadData.headerLogoRight) && (
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-4">
                    <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      <FiMaximize className="w-4 h-4 text-primary" />
                      Pengaturan Ukuran & Posisi Logo
                      <span className="text-xs font-normal text-slate-400 ml-1">(berlaku mirror untuk kedua logo)</span>
                    </h4>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1.5">Ukuran Logo</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="range"
                            min="40"
                            max="150"
                            value={letterheadData.logoSize}
                            onChange={(e) => setLetterheadData(prev => ({ ...prev, logoSize: parseInt(e.target.value) }))}
                            className="flex-1 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary"
                          />
                          <span className="text-xs font-mono text-slate-500 w-10 text-right">{letterheadData.logoSize}px</span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1.5">Geser Vertikal</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="range"
                            min="-20"
                            max="20"
                            value={letterheadData.logoMarginTop}
                            onChange={(e) => setLetterheadData(prev => ({ ...prev, logoMarginTop: parseInt(e.target.value) }))}
                            className="flex-1 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary"
                          />
                          <span className="text-xs font-mono text-slate-500 w-10 text-right">{letterheadData.logoMarginTop}px</span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1.5">Jarak Horizontal</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="range"
                            min="-50"
                            max="30"
                            value={letterheadData.logoPaddingX}
                            onChange={(e) => setLetterheadData(prev => ({ ...prev, logoPaddingX: parseInt(e.target.value) }))}
                            className="flex-1 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary"
                          />
                          <span className="text-xs font-mono text-slate-500 w-10 text-right">{letterheadData.logoPaddingX}px</span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setLetterheadData(prev => ({ ...prev, logoSize: 80, logoMarginTop: 0, logoPaddingX: 0 }))}
                      className="text-xs text-primary hover:underline"
                    >
                      Reset ke Default
                    </button>
                  </div>
                )}

                {/* Garis Kop Surat */}
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-4">
                  <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <FiLayout className="w-4 h-4 text-primary" />
                    Pengaturan Garis Kop Surat
                  </h4>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1.5">Posisi Garis</label>
                      <select
                        value={letterheadData.headerLinePosition}
                        onChange={(e) => setLetterheadData(prev => ({ ...prev, headerLinePosition: e.target.value }))}
                        className="w-full rounded text-sm px-3 py-1.5 border border-slate-300 outline-none focus:border-primary bg-white"
                      >
                        <option value="bottom">Bawah Kop Surat</option>
                        <option value="top">Atas Kop Surat</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1.5">Lebar Garis</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="range"
                          min="30"
                          max="100"
                          value={letterheadData.headerLineWidth}
                          onChange={(e) => setLetterheadData(prev => ({ ...prev, headerLineWidth: parseInt(e.target.value) }))}
                          className="flex-1 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary"
                        />
                        <span className="text-xs font-mono text-slate-500 w-10 text-right">{letterheadData.headerLineWidth}%</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1.5">Perataan Horizontal</label>
                      <select
                        value={letterheadData.headerLineAlign}
                        onChange={(e) => setLetterheadData(prev => ({ ...prev, headerLineAlign: e.target.value }))}
                        className="w-full rounded text-sm px-3 py-1.5 border border-slate-300 outline-none focus:border-primary bg-white"
                      >
                        <option value="left">Kiri</option>
                        <option value="center">Tengah</option>
                        <option value="right">Kanan</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1.5">Jarak Vertikal</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="range"
                          min="-30"
                          max="50"
                          value={letterheadData.headerLinePadding}
                          onChange={(e) => setLetterheadData(prev => ({ ...prev, headerLinePadding: parseInt(e.target.value) }))}
                          className="flex-1 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary"
                        />
                        <span className="text-xs font-mono text-slate-500 w-10 text-right">{letterheadData.headerLinePadding}px</span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setLetterheadData(prev => ({ ...prev, headerLineWidth: 100, headerLineAlign: 'center', headerLinePosition: 'bottom', headerLinePadding: 15 }))}
                    className="text-xs text-primary hover:underline"
                  >
                    Reset ke Default
                  </button>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700">Teks Kop Surat Tengah</label>
                  <RichTextEditor 
                    content={letterheadData.headerContentHtml} 
                    onChange={(html) => setLetterheadData(prev => ({ ...prev, headerContentHtml: html }))} 
                    placeholder="Ketik isi kop surat di sini..."
                  />
                </div>

                <div className="mt-8">
                  <h3 className="text-sm font-semibold text-slate-700 mb-4 uppercase tracking-wider">Live Preview Kop Surat</h3>
                  <div className="border border-slate-300 rounded bg-white p-8 overflow-x-auto shadow-inner">
                    <div style={{ minWidth: '700px' }}>
                      {(() => {
                        const lineWidth = letterheadData.headerLineWidth ?? 100;
                        const lineAlign = letterheadData.headerLineAlign || 'center';
                        const linePosition = letterheadData.headerLinePosition || 'bottom';
                        const linePadding = letterheadData.headerLinePadding ?? 15;
                        const widthPct = lineWidth >= 100 ? '100%' : `${lineWidth}%`;
                        let lineMargin;
                        if (widthPct === '100%') lineMargin = 'margin:0';
                        else if (lineAlign === 'center') lineMargin = 'margin:0 auto';
                        else if (lineAlign === 'right') lineMargin = 'margin-left:auto;margin-right:0';
                        else lineMargin = 'margin-left:0;margin-right:auto';

                        const lineHtml = `<div style="border-top:3px solid #000;width:${widthPct};${lineMargin};"></div>`;
                        const hasLine = lineWidth > 0;
                        const contentPad = hasLine && linePadding > 0 ? (linePosition === 'bottom' ? `padding-bottom:${linePadding}px;` : `padding-top:${linePadding}px;`) : '';
                        const contentHtml = `
                          <div style="position:relative;min-height:${letterheadData.logoSize}px;${contentPad}">
                            <div style="position:absolute;left:${letterheadData.logoPaddingX}px;top:calc(50% + ${letterheadData.logoMarginTop}px);transform:translateY(-50%);width:${letterheadData.logoSize}px;text-align:center;z-index:1;">
                              ${letterheadData.headerLogoLeft ? `<img src="${BASE_URL}${letterheadData.headerLogoLeft}" style="max-width:100%;max-height:${letterheadData.logoSize}px;width:100%;object-fit:contain;" />` : ''}
                            </div>
                            <div style="padding:0 10px;text-align:center;position:relative;z-index:2;" class="kop-surat-preview text-black">${letterheadData.headerContentHtml}</div>
                            <div style="position:absolute;right:${letterheadData.logoPaddingX}px;top:calc(50% + ${letterheadData.logoMarginTop}px);transform:translateY(-50%);width:${letterheadData.logoSize}px;text-align:center;z-index:1;">
                              ${letterheadData.headerLogoRight ? `<img src="${BASE_URL}${letterheadData.headerLogoRight}" style="max-width:100%;max-height:${letterheadData.logoSize}px;width:100%;object-fit:contain;" />` : ''}
                            </div>
                          </div>
                        `;
                        const lineOffset = hasLine && linePadding < 0 ? (linePosition === 'bottom' ? `bottom:${-linePadding}px;` : `top:${-linePadding}px;`) : (linePosition === 'bottom' ? 'bottom:0;' : 'top:0;');
                        return (
                          <div style={{ marginBottom: '20px' }} dangerouslySetInnerHTML={{
                            __html: hasLine
                              ? `<div style="position:relative;">${contentHtml}<div style="position:absolute;left:0;right:0;${lineOffset}pointer-events:none;z-index:5;">${lineHtml}</div></div>`
                              : contentHtml
                          }} />
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-slate-200 bg-slate-50 flex justify-end">
                <Button onClick={handleLetterheadSubmit} isLoading={isLetterheadLoading} icon={FiSave} disabled={!letterheadData.useGlobalHeader}>
                  Simpan Kop Surat
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
