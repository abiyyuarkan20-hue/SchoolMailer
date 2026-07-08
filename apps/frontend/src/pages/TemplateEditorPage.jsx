import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { NodeSelection } from 'prosemirror-state';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import TextAlign from '@tiptap/extension-text-align';
import Image from '@tiptap/extension-image';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import FontFamily from '@tiptap/extension-font-family';
import Underline from '@tiptap/extension-underline';
import { FontSize, LineHeight, NoSpacing, TabHandler, TabNode } from '../utils/tiptap-extensions';
import { 
  FiSave, FiArrowLeft, FiBold, FiItalic, FiUnderline, FiList, FiAlignLeft, FiAlignCenter, 
  FiAlignRight, FiAlignJustify, FiImage, FiMinus, FiTable,
  FiFileText, FiPlus, FiEye, FiX, FiRefreshCw, FiAlertTriangle, FiZoomIn, FiZoomOut,
  FiChevronLeft, FiChevronRight, FiTrash2, FiRotateCcw, FiMove, FiBarChart2
} from 'react-icons/fi';
import PageHeader from '../components/common/PageHeader';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import { useTemplates } from '../hooks/useTemplates';
import api from '../services/api';
import ConfirmDialog from '../components/common/ConfirmDialog';
import toast from 'react-hot-toast';
import unsavedTemplateStore from '../store/unsavedTemplateStore';

const DRAFT_ID = 'unsaved-new';

const STANDARD_RESERVED_VARS = [
  'nama_siswa','nisn','kelas','jenis_kelamin','nama_orang_tua','no_hp_ortu','alamat','email','tanggal_surat',
  'nama_guru','nip','jabatan','pangkat','mapel','nuptk','status_pegawai','pendidikan','tempat_lahir','tanggal_lahir',
];

const saveDraft = (data) => {
  unsavedTemplateStore.save({ draftId: DRAFT_ID, ...data });
};

const loadDraft = () => {
  return unsavedTemplateStore.get(DRAFT_ID);
};

const clearDraft = () => {
  unsavedTemplateStore.remove(DRAFT_ID);
};

const PAGE_SIZES = {
  A4: { width: 210, height: 297, label: 'A4 (210 x 297 mm)' },
  F4: { width: 215, height: 330, label: 'F4 / Folio (215 x 330 mm)' },
  LETTER: { width: 216, height: 279, label: 'Letter (216 x 279 mm)' },
};

const templateSchema = z.object({
  title: z.string().min(3, 'Judul minimal 3 karakter').max(255),
  description: z.string().optional(),
  letterType: z.string().min(1, 'Tipe surat wajib diisi'),
  pageSize: z.enum(['A4', 'F4', 'LETTER']).default('A4'),
  marginTop: z.coerce.number().int().min(0).max(100).default(25),
  marginRight: z.coerce.number().int().min(0).max(100).default(25),
  marginBottom: z.coerce.number().int().min(0).max(100).default(25),
  marginLeft: z.coerce.number().int().min(0).max(100).default(30),
});

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

const FullScreenPreview = ({ htmlContent, cssStyles, pageSize, marginTop, marginRight, marginBottom, marginLeft, onClose }) => {
  const iframeRef = useRef(null);
  const containerRef = useRef(null);
  const [previewHtml, setPreviewHtml] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [zoom, setZoom] = useState(null); // null = auto-fit on first render
  const [students, setStudents] = useState([]);
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedPageSize, setSelectedPageSize] = useState(pageSize || 'A4');
  const [sampleVars, setSampleVars] = useState({});
  const [sampleKeys, setSampleKeys] = useState([]);
  const [showVarPanel, setShowVarPanel] = useState(false);

  const debouncedHtml = useDebounce(htmlContent, 600);
  const debouncedCss = useDebounce(cssStyles, 600);

  const dim = PAGE_SIZES[selectedPageSize] || PAGE_SIZES.A4;

  useEffect(() => {
    const vars = [...debouncedHtml.matchAll(/\{\{([^#\/>][^}]+)\}\}/g)];
    const keys = [...new Set(vars.map(m => m[1].trim()).filter(v => !v.startsWith('#') && !v.startsWith('/') && v !== 'else'))];
    setSampleKeys(prev => [...new Set([...prev, ...keys])]);
  }, [debouncedHtml]);

  useEffect(() => {
    api.get('/students?limit=200').then(res => {
      if (res.data?.data) setStudents(res.data.data);
    }).catch(() => {});
  }, []);

  const fetchPreview = useCallback(async () => {
    if (!debouncedHtml || debouncedHtml === '<p></p>') {
      setPreviewHtml('');
      setError('');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/generate/preview-editor', {
        htmlContent: debouncedHtml,
        cssStyles: debouncedCss || '',
        studentId: selectedStudentId || undefined,
        customData: sampleVars,
        pageSize: selectedPageSize,
        marginTop: marginTop ?? 25,
        marginRight: marginRight ?? 25,
        marginBottom: marginBottom ?? 25,
        marginLeft: marginLeft ?? 30,
      });
      setPreviewHtml(res.data.data.html);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Gagal memuat preview';
      setError(msg);
      setPreviewHtml('');
    } finally {
      setLoading(false);
    }
  }, [debouncedHtml, debouncedCss, selectedStudentId, selectedPageSize, sampleVars, marginTop, marginRight, marginBottom, marginLeft]);

  useEffect(() => {
    fetchPreview();
  }, [fetchPreview]);

  // Fit-to-viewport: recalculate zoom when page size or container changes
  const fitZoom = useCallback(() => {
    if (!containerRef.current) return 0.7;
    const containerW = containerRef.current.clientWidth - 48;
    const containerH = containerRef.current.clientHeight - 80;
    const scaleW = containerW / (dim.width * 0.0393701);
    const scaleH = containerH / (dim.height * 0.0393701);
    return Math.min(scaleW, scaleH, 1.2);
  }, [dim]);

  useEffect(() => {
    const calc = () => {
      if (containerRef.current) {
        setContainerSize({ w: containerRef.current.clientWidth, h: containerRef.current.clientHeight });
      }
    };
    calc();
    window.addEventListener('resize', calc);
    return () => window.removeEventListener('resize', calc);
  }, []);

  // Auto-fit zoom when page size changes or on mount
  useEffect(() => {
    setZoom(fitZoom());
  }, [dim, containerSize, fitZoom]);

  useEffect(() => {
    if (iframeRef.current && previewHtml) {
      iframeRef.current.srcdoc = previewHtml;
    }
  }, [previewHtml]);

  const updateSampleVar = (key, value) => {
    setSampleVars(prev => ({ ...prev, [key]: value }));
  };

  const customSampleKeys = sampleKeys.filter(k => !STANDARD_RESERVED_VARS.includes(k));

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-900">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-800 text-white text-sm shrink-0">
        <div className="flex items-center gap-3">
          <button type="button" onClick={onClose} className="p-1.5 hover:bg-slate-700 rounded transition-colors" title="Tutup Preview">
            <FiX className="w-5 h-5" />
          </button>
          <span className="font-medium">Preview Surat</span>
          {loading && <FiRefreshCw className="w-4 h-4 animate-spin text-slate-400" />}
        </div>

        <div className="flex items-center gap-3">
          {/* Student selector */}
          <select
            value={selectedStudentId}
            onChange={e => setSelectedStudentId(e.target.value)}
            className="bg-slate-700 text-white border border-slate-600 rounded px-2 py-1 text-xs outline-none"
          >
            <option value="">— Data dummy —</option>
            {students.map(s => (
              <option key={s.id} value={s.id}>{s.name} ({s.nisn})</option>
            ))}
          </select>

          {/* Page size selector */}
          <select
            value={selectedPageSize}
            onChange={e => setSelectedPageSize(e.target.value)}
            className="bg-slate-700 text-white border border-slate-600 rounded px-2 py-1 text-xs outline-none"
          >
            {Object.entries(PAGE_SIZES).map(([key, val]) => (
              <option key={key} value={key}>{val.label}</option>
            ))}
          </select>

          {/* Zoom controls */}
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => setZoom(z => Math.max(0.3, (z || 1) - 0.1))} className="p-1 hover:bg-slate-700 rounded disabled:opacity-30" title="Perkecil" disabled={!zoom || zoom <= 0.3}>
              <FiZoomOut className="w-4 h-4" />
            </button>
            <span className="text-xs w-10 text-center">{zoom ? Math.round(zoom * 100) : 0}%</span>
            <button type="button" onClick={() => setZoom(z => Math.min(1.5, (z || 0.7) + 0.1))} className="p-1 hover:bg-slate-700 rounded disabled:opacity-30" title="Perbesar" disabled={zoom >= 1.5}>
              <FiZoomIn className="w-4 h-4" />
            </button>
            <button type="button" onClick={() => setZoom(fitZoom())} className="p-1 hover:bg-slate-700 rounded text-xs ml-1" title="Fit to Screen">
              Fit
            </button>
          </div>

          {/* Refresh */}
          <button type="button" onClick={fetchPreview} className="p-1.5 hover:bg-slate-700 rounded" title="Refresh Preview">
            <FiRefreshCw className="w-4 h-4" />
          </button>

          {/* Toggle variable panel */}
          {customSampleKeys.length > 0 && (
            <button
              type="button"
              onClick={() => setShowVarPanel(p => !p)}
              className={`px-2 py-1 rounded text-xs transition-colors ${showVarPanel ? 'bg-primary' : 'bg-slate-700 hover:bg-slate-600'}`}
            >
              Variabel
            </button>
          )}
        </div>
      </div>

      {/* Variable panel (slide-down) */}
      {showVarPanel && customSampleKeys.length > 0 && (
        <div className="bg-slate-700 border-b border-slate-600 px-4 py-2 flex flex-wrap gap-3 shrink-0">
          {customSampleKeys.map(key => (
            <div key={key} className="flex items-center gap-1.5">
              <label className="text-xs text-slate-300 whitespace-nowrap">{`{{${key}}}`}</label>
              <input
                type="text"
                value={sampleVars[key] || ''}
                onChange={e => updateSampleVar(key, e.target.value)}
                placeholder={`[${key.replace(/_/g, ' ')}]`}
                className="bg-slate-600 text-white border border-slate-500 rounded px-2 py-1 text-xs outline-none focus:border-primary w-36"
              />
            </div>
          ))}
        </div>
      )}

      {/* Preview area */}
      <div ref={containerRef} className="flex-1 overflow-auto bg-slate-800 flex justify-start p-4">
        {error ? (
          <div className="flex items-start gap-2 mt-8 p-4 bg-red-900/50 rounded-lg text-red-200 text-sm max-w-xl h-fit mx-auto">
            <FiAlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        ) : previewHtml ? (
          <div className="mx-auto" style={{ paddingBottom: '40px' }}>
            <div
              className="shadow-2xl overflow-hidden"
              style={{
                width: `${dim.width * (zoom || 1)}mm`,
                minHeight: `${dim.height * (zoom || 1)}mm`,
                background: 'white',
              }}
            >
              <iframe
                ref={iframeRef}
                title="Preview Surat"
                className="bg-white"
                style={{
                  width: `${dim.width}mm`,
                  height: `${dim.height}mm`,
                  border: 'none',
                  transform: `scale(${zoom || 1})`,
                  transformOrigin: 'top left',
                  display: 'block',
                }}
                sandbox="allow-same-origin allow-scripts"
              />
            </div>
          </div>
        ) : (
          <div className="text-slate-400 text-sm mt-16 text-center w-full">
            <FiEye className="w-12 h-12 mx-auto mb-3 opacity-50" />
            Preview akan muncul saat template memiliki konten
          </div>
        )}
      </div>
    </div>
  );
};

const TemplateEditorPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isEdit = id !== undefined && id !== 'new';
  const { fetchTemplateById, createTemplate, updateTemplate, isLoading } = useTemplates();
  
  const importedHtml = location.state?.importedHtml;
  const importedFileName = location.state?.importedFileName;
  const importedVariables = location.state?.importedVariables;
  const importedCss = location.state?.importedCss || '';
  
  const [editorContent, setEditorContent] = useState(importedHtml || '');
  const [htmlError, setHtmlError] = useState('');
  const [customVariables, setCustomVariables] = useState([]);
  const [newVarName, setNewVarName] = useState('');
  const [isAddingVar, setIsAddingVar] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showDeleteTableConfirm, setShowDeleteTableConfirm] = useState(false);
  const [previewPageSize, setPreviewPageSize] = useState('A4');
  const [templateCss, setTemplateCss] = useState(importedCss);
  const [showDraftBanner, setShowDraftBanner] = useState(false);

  const { register, handleSubmit, reset, watch, getValues, formState: { errors } } = useForm({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      pageSize: 'A4',
      letterType: '',
      marginTop: 25,
      marginRight: 25,
      marginBottom: 25,
      marginLeft: 30,
    }
  });

  const watchedPageSize = watch('pageSize');
  const watchedMarginTop = watch('marginTop');
  const watchedMarginRight = watch('marginRight');
  const watchedMarginBottom = watch('marginBottom');
  const watchedMarginLeft = watch('marginLeft');

  const mmToPx = (mm) => Math.round(mm * 3.7795);
  const editorMarginStyle = {
    padding: `${mmToPx(watchedMarginTop)}px ${mmToPx(watchedMarginRight)}px ${mmToPx(watchedMarginBottom)}px ${mmToPx(watchedMarginLeft)}px`,
  };

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ underline: false }),
      Placeholder.configure({
        placeholder: 'Tulis isi template di sini... (tekan / untuk melihat menu)',
      }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Image.configure({ inline: true, allowBase64: true }),
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      FontFamily,
      Underline,
      FontSize,
      LineHeight,
      NoSpacing,
      TabNode,
      TabHandler
    ],
    content: editorContent,
    onUpdate: ({ editor }) => {
      setEditorContent(editor.getHTML());
      if (htmlError) setHtmlError('');
    },
    editorProps: {
      attributes: {
        class: 'prose focus:outline-none min-h-[1050px] bg-white shadow-sm max-w-none prose-p:my-2 prose-table:border-collapse prose-td:border-slate-300 prose-th:border-slate-300',
        style: 'font-family: "Times New Roman", Times, serif; font-size: 14pt; tab-size: 60px;'
      },
    },
  });

  useEffect(() => {
    if (!isEdit && !importedHtml) {
      const draft = loadDraft();
      if (draft && draft.htmlContent) {
        if (location.state?.restoreDraft) {
          restoreDraft();
        } else {
          setShowDraftBanner(true);
        }
      }
    }
  }, []);

  useEffect(() => {
    if (isEdit || showDraftBanner) return;
    const timer = setTimeout(() => {
      const form = getValues();
      saveDraft({
        htmlContent: editorContent,
        cssStyles: templateCss,
        title: form.title,
        description: form.description,
        letterType: form.letterType,
        pageSize: form.pageSize,
        marginTop: form.marginTop,
        marginRight: form.marginRight,
        marginBottom: form.marginBottom,
        marginLeft: form.marginLeft,
      });
    }, 2000);
    return () => clearTimeout(timer);
  }, [editorContent, templateCss]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (!isEdit && editorContent && editorContent !== '<p></p>') {
        const form = getValues();
        saveDraft({
          htmlContent: editorContent,
          cssStyles: templateCss,
          title: form.title,
          description: form.description,
          letterType: form.letterType,
          pageSize: form.pageSize,
          marginTop: form.marginTop,
          marginRight: form.marginRight,
          marginBottom: form.marginBottom,
          marginLeft: form.marginLeft,
        });
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isEdit, editorContent, templateCss]);

  useEffect(() => {
    if (isEdit) {
      fetchTemplateById(id).then(data => {
        if (data) {
          reset({
            title: data.title,
            description: data.description || '',
            letterType: data.letterType,
            pageSize: data.pageSize,
            marginTop: data.marginTop ?? 25,
            marginRight: data.marginRight ?? 25,
            marginBottom: data.marginBottom ?? 25,
            marginLeft: data.marginLeft ?? 30,
          });
          if (editor) {
            editor.commands.setContent(data.htmlContent);
            setEditorContent(data.htmlContent);
          }
          if (data.cssStyles) {
            setTemplateCss(data.cssStyles);
          }
        }
      });
    }

    const fetchSettings = async () => {
      try {
        const res = await api.get('/settings');
        if (res.data.data && res.data.data.customVariables) {
          setCustomVariables(res.data.data.customVariables);
        }
      } catch (error) {
        console.error('Failed to fetch settings', error);
      }
    };
    fetchSettings();
  }, [id, isEdit, fetchTemplateById, reset, editor]);

  const handleAddCustomVar = async () => {
    if (!newVarName.trim()) return;
    const cleanName = newVarName.trim().toLowerCase().replace(/[^a-z0-9]/gi, '_');
    if (customVariables.includes(cleanName) || STANDARD_RESERVED_VARS.includes(cleanName)) {
      toast.error('Variabel dengan nama ini sudah ada!');
      return;
    }
    const updatedVars = [...customVariables, cleanName];
    try {
      await api.put('/settings', { customVariables: updatedVars });
      setCustomVariables(updatedVars);
      setNewVarName('');
      setIsAddingVar(false);
      toast.success(`Variabel {{${cleanName}}} ditambahkan!`);
    } catch (error) {
      toast.error('Gagal menambahkan variabel');
    }
  };

  const insertVariable = (variable) => {
    if (editor) {
      editor.chain().focus().insertContent(variable).run();
    }
  };

  const insertRankingTable = () => {
    if (!editor) return;

    const dataTexts = ['{{#each ranking}}{{@index_1}}', '{{kelas_program}}', '{{semester}}', '{{peringkat_siswa}}', '{{tahun_pelajaran}}{{/each}}'];

    editor.chain().focus().insertTable({ rows: 7, cols: 5, withHeaderRow: true }).run();
    editor.commands.insertContent('No');
    editor.commands.goToNextCell();
    editor.commands.insertContent('Kelas/Program');
    editor.commands.goToNextCell();
    editor.commands.insertContent('Semester');
    editor.commands.goToNextCell();
    editor.commands.insertContent('Peringkat/Siswa');
    editor.commands.goToNextCell();
    editor.commands.insertContent('Tahun Pelajaran');
    editor.commands.goToNextCell();
    dataTexts.forEach((text) => {
      editor.commands.insertContent(text);
      editor.commands.goToNextCell();
    });
    toast.success('Tabel ranking berhasil ditambahkan!');
  };

  const openPreview = () => {
    setPreviewPageSize(watchedPageSize || 'A4');
    setShowPreview(true);
  };

  const restoreDraft = () => {
    const draft = loadDraft();
    if (!draft) return;
    if (draft.htmlContent) {
      setEditorContent(draft.htmlContent);
      if (editor) editor.commands.setContent(draft.htmlContent);
    }
    if (draft.cssStyles) setTemplateCss(draft.cssStyles);
    reset({
      title: draft.title || '',
      description: draft.description || '',
      letterType: draft.letterType || '',
      pageSize: draft.pageSize || 'A4',
      marginTop: draft.marginTop ?? 25,
      marginRight: draft.marginRight ?? 25,
      marginBottom: draft.marginBottom ?? 25,
      marginLeft: draft.marginLeft ?? 30,
    });
    setShowDraftBanner(false);
    toast.success('Draft berhasil dipulihkan');
  };

  const discardDraft = () => {
    clearDraft();
    setShowDraftBanner(false);
    toast('Draft dibuang', { icon: '🗑️' });
  };

  const onSubmit = async (data) => {
    if (!editorContent || editorContent === '<p></p>') {
      setHtmlError('Konten template tidak boleh kosong');
      return;
    }
    const payload = {
      ...data,
      htmlContent: editorContent,
      cssStyles: templateCss,
      marginTop: data.marginTop ?? 25,
      marginRight: data.marginRight ?? 25,
      marginBottom: data.marginBottom ?? 25,
      marginLeft: data.marginLeft ?? 30,
    };
    let success;
    if (isEdit) success = await updateTemplate(id, payload);
    else success = await createTemplate(payload);
    if (success) {
      clearDraft();
      navigate('/templates');
    }
  };

  if (isLoading && isEdit && !editorContent) {
    return <div className="p-8 text-center text-slate-500">Memuat template...</div>;
  }

  const MenuBar = () => {
    if (!editor) return null;
    const addImage = () => {
      const url = window.prompt('URL Gambar (Pastikan gambar dapat diakses publik):');
      if (url) editor.chain().focus().setImage({ src: url }).run();
    };
    const fontFamilies = ['Inter', 'Arial', 'Times New Roman', 'Calibri', 'Courier New', 'Georgia', 'Tahoma', 'Verdana', 'Comic Sans MS'];
    const fontSizes = ['8pt','9pt','10pt','11pt','12pt','14pt','16pt','18pt','24pt','36pt'];
    const lineHeights = ['1','1.15','1.5','2','2.5'];

    const handleAlign = (align) => {
      editor.chain().focus().setTextAlign(align).run();
    };

    return (
      <div className="flex flex-wrap items-center gap-1 p-2 bg-slate-100 border border-slate-200 rounded-t-xl border-b-0 sticky top-0 z-10 shadow-sm">
        <select onChange={e => e.target.value ? editor.chain().focus().setFontFamily(e.target.value).run() : editor.chain().focus().unsetFontFamily().run()}
          className="p-1 border border-slate-300 rounded text-sm bg-white" title="Jenis Font">
          <option value="">Default Font</option>
          {fontFamilies.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
        <select onChange={e => e.target.value ? editor.chain().focus().setFontSize(e.target.value).run() : editor.chain().focus().unsetFontSize().run()}
          className="p-1 border border-slate-300 rounded text-sm bg-white" title="Ukuran Font">
          <option value="">Ukuran</option>
          {fontSizes.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select onChange={e => e.target.value ? editor.chain().focus().setLineHeight(e.target.value).run() : editor.chain().focus().unsetLineHeight().run()}
          className="p-1 border border-slate-300 rounded text-sm bg-white" title="Spasi Baris">
          <option value="">Spasi</option>
          {lineHeights.map(h => <option key={h} value={h}>{h}</option>)}
        </select>
        <button type="button" onClick={() => editor.chain().focus().toggleNoSpacing().run()}
          className={`px-2 py-1 rounded text-xs font-medium hover:bg-slate-200 ${editor.isActive('paragraph', { noSpacing: 'true' }) ? 'bg-primary/10 text-primary border border-primary/30' : 'text-slate-600'}`}
          title="No Spacing (Hilangkan spasi paragraf)">
          No Spacing
        </button>
        <div className="w-px h-6 bg-slate-300 mx-1"></div>
        <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={`p-2 rounded hover:bg-slate-200 ${editor.isActive('bold') ? 'bg-slate-300 text-slate-900' : 'text-slate-600'}`} title="Bold"><FiBold /></button>
        <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={`p-2 rounded hover:bg-slate-200 ${editor.isActive('italic') ? 'bg-slate-300 text-slate-900' : 'text-slate-600'}`} title="Italic"><FiItalic /></button>
        <button type="button" onClick={() => editor.chain().focus().toggleUnderline().run()} className={`p-2 rounded hover:bg-slate-200 ${editor.isActive('underline') ? 'bg-slate-300 text-slate-900' : 'text-slate-600'}`} title="Underline"><FiUnderline /></button>
        <div className="w-px h-6 bg-slate-300 mx-1"></div>
        <button type="button" onClick={() => handleAlign('left')} className={`p-2 rounded hover:bg-slate-200 ${editor.isActive({ textAlign: 'left' }) ? 'bg-slate-300 text-slate-900' : 'text-slate-600'}`}><FiAlignLeft /></button>
        <button type="button" onClick={() => handleAlign('center')} className={`p-2 rounded hover:bg-slate-200 ${editor.isActive({ textAlign: 'center' }) ? 'bg-slate-300 text-slate-900' : 'text-slate-600'}`}><FiAlignCenter /></button>
        <button type="button" onClick={() => handleAlign('right')} className={`p-2 rounded hover:bg-slate-200 ${editor.isActive({ textAlign: 'right' }) ? 'bg-slate-300 text-slate-900' : 'text-slate-600'}`}><FiAlignRight /></button>
        <button type="button" onClick={() => handleAlign('justify')} className={`p-2 rounded hover:bg-slate-200 ${editor.isActive({ textAlign: 'justify' }) ? 'bg-slate-300 text-slate-900' : 'text-slate-600'}`}><FiAlignJustify /></button>
        <div className="w-px h-6 bg-slate-300 mx-1"></div>
        <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} className={`p-2 rounded hover:bg-slate-200 ${editor.isActive('bulletList') ? 'bg-slate-300 text-slate-900' : 'text-slate-600'}`}><FiList /></button>
        <div className="w-px h-6 bg-slate-300 mx-1"></div>
        <button type="button" onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} className="p-2 rounded hover:bg-slate-200 text-slate-600" title="Sisip Tabel"><FiTable /></button>
        {(editor.isActive('table') || (editor.state.selection instanceof NodeSelection && editor.state.selection.node.type.name === 'table')) && (
          <div className="flex bg-slate-200 rounded p-1 text-xs">
            <button type="button" onClick={() => editor.chain().focus().addColumnAfter().run()} className="px-2 py-1 hover:bg-slate-300 rounded">Col+</button>
            <button type="button" onClick={() => editor.chain().focus().addRowAfter().run()} className="px-2 py-1 hover:bg-slate-300 rounded">Row+</button>
            <button type="button" onClick={() => editor.chain().focus().deleteColumn().run()} className="px-2 py-1 hover:bg-slate-300 rounded text-danger">Del Col</button>
            <button type="button" onClick={() => editor.chain().focus().deleteRow().run()} className="px-2 py-1 hover:bg-slate-300 rounded text-danger">Del Row</button>
            <span className="w-px h-5 bg-slate-300 mx-1 self-center"></span>
            <span className="px-2 py-1 text-xs text-slate-400">Tabel aktif</span>
            <span className="w-px h-5 bg-slate-300 mx-1 self-center"></span>
            <button type="button" onClick={() => setShowDeleteTableConfirm(true)} className="px-2 py-1 hover:bg-red-200 rounded text-red-600 font-bold flex items-center gap-1" title="Hapus Tabel">
              <FiTrash2 className="w-3 h-3" /> Hapus Tabel
            </button>
          </div>
        )}
        <div className="w-px h-6 bg-slate-300 mx-1"></div>
        <button type="button" onClick={addImage} className="p-2 rounded hover:bg-slate-200 text-slate-600" title="Sisip Gambar URL"><FiImage /></button>
        <button type="button" onClick={() => editor.chain().focus().setHorizontalRule().run()} className="p-2 rounded hover:bg-slate-200 text-slate-600" title="Garis Pembatas"><FiMinus /></button>
        <button type="button" onClick={insertRankingTable} className="p-2 rounded hover:bg-indigo-100 text-indigo-600 font-semibold flex items-center gap-1 text-xs" title="Sisip Tabel Ranking Siswa (dengan #each)">
          <FiBarChart2 className="w-3.5 h-3.5" /> Ranking
        </button>
        <div className="w-px h-6 bg-slate-300 mx-1"></div>
        <button type="button" onClick={openPreview} className="p-2 rounded text-slate-600 hover:bg-slate-200 transition-colors" title="Preview Fullscreen">
          <FiEye className="w-4 h-4" />
        </button>
      </div>
    );
  };

  return (
    <>
    <form onSubmit={handleSubmit(onSubmit)} className="pb-12">
      <PageHeader
        title={isEdit ? 'Edit Template' : 'Desainer Template Baru'}
        actions={
          <>
            <Button variant="ghost" icon={FiArrowLeft} onClick={() => navigate('/templates')}>
              Kembali
            </Button>
            <Button variant="secondary" icon={FiEye} onClick={openPreview} type="button">
              Preview
            </Button>
            <Button type="submit" variant="primary" icon={FiSave} isLoading={isLoading}>
              Simpan Template
            </Button>
          </>
        }
      />

      {!isEdit && showDraftBanner && (
        <div className="mb-4 flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
          <FiRotateCcw className="w-4 h-4 flex-shrink-0" />
          <span className="flex-1">Ditemukan draft template yang belum disimpan. <span className="text-amber-500 text-xs">({new Date(loadDraft()?.savedAt).toLocaleString('id-ID')})</span></span>
          <button type="button" onClick={restoreDraft} className="bg-amber-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-amber-600 transition-colors">
            Pulihkan
          </button>
          <button type="button" onClick={discardDraft} className="text-amber-600 px-2 py-1.5 rounded-lg text-xs hover:bg-amber-100 transition-colors">
            Buang
          </button>
        </div>
      )}

      {!isEdit && importedFileName && (
        <div className="mb-4 flex items-center gap-2 bg-primary/5 border border-primary/20 rounded-lg px-4 py-2.5 text-sm text-primary-dark">
          <FiFileText className="w-4 h-4 flex-shrink-0" />
          <span>Template dari file: <strong>{importedFileName}</strong> &mdash; gaya huruf (Times New Roman, 12pt) sudah disesuaikan.</span>
          {importedVariables && importedVariables.length > 0 && (
            <span className="ml-auto text-xs text-slate-500">
              {importedVariables.length} variabel terdeteksi
            </span>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* SIDEBAR */}
        <div className="xl:col-span-1 space-y-6">
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
            <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2 border-b border-slate-100 pb-2"><FiFileText /> Info Surat</h3>
            <div className="space-y-4">
              <Input label="Judul Template" id="title" placeholder="cth: Surat Keterangan Siswa" {...register('title')} error={errors.title?.message} />
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tipe Surat</label>
                <select {...register('letterType')} className={`w-full rounded-lg shadow-sm focus:ring-primary focus:border-primary sm:text-sm border outline-none px-3 py-2 bg-white ${errors.letterType ? 'border-danger' : 'border-slate-300'}`}>
                  <option value="">Pilih Tipe...</option>
                  <option value="CERTIFICATE">Surat Keterangan</option>
                  <option value="PARENT_SUMMON">Panggilan Orang Tua</option>
                  <option value="CIRCULAR">Surat Edaran</option>
                  <option value="CUSTOM">Lainnya</option>
                </select>
                {errors.letterType && <p className="mt-1 text-sm text-danger">{errors.letterType.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Ukuran Kertas</label>
                <select {...register('pageSize')} className="w-full rounded-lg shadow-sm focus:ring-primary focus:border-primary sm:text-sm border border-slate-300 px-3 py-2 bg-white outline-none">
                  <option value="A4">A4 (210 x 297 mm)</option>
                  <option value="F4">F4 / Folio (215 x 330 mm)</option>
                  <option value="LETTER">Letter (216 x 279 mm)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Margin Kertas (mm)</label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-slate-500 mb-0.5">Atas</label>
                    <input type="number" {...register('marginTop', { valueAsNumber: true })}
                      className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-primary"
                      min="0" max="100" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-0.5">Kanan</label>
                    <input type="number" {...register('marginRight', { valueAsNumber: true })}
                      className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-primary"
                      min="0" max="100" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-0.5">Bawah</label>
                    <input type="number" {...register('marginBottom', { valueAsNumber: true })}
                      className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-primary"
                      min="0" max="100" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-0.5">Kiri</label>
                    <input type="number" {...register('marginLeft', { valueAsNumber: true })}
                      className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-primary"
                      min="0" max="100" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 p-5 rounded-xl border border-blue-100">
            <h4 className="font-semibold text-blue-800 mb-2 text-sm flex items-center justify-between">
              <span className="flex items-center gap-2"><FiPlus /> Variabel Standar</span>
            </h4>
            <p className="text-xs text-blue-700 mb-3">Otomatis diisi dari data siswa.</p>
            <div className="flex flex-wrap gap-2 mb-4">
              {['nama_siswa', 'kelas', 'nisn', 'jenis_kelamin', 'nama_orang_tua', 'no_hp_ortu', 'alamat', 'tanggal_surat'].map(v => (
                <button type="button" key={v} onClick={() => insertVariable(`{{${v}}}`)} className="text-xs bg-white border border-blue-200 text-blue-700 px-2 py-1 rounded hover:bg-blue-100 transition-colors">
                  {`{{${v}}}`}
                </button>
              ))}
            </div>
            <h4 className="font-semibold text-indigo-800 mb-2 text-sm flex items-center justify-between">
              <span className="flex items-center gap-2"><FiPlus /> Variabel Guru</span>
            </h4>
            <p className="text-xs text-indigo-700 mb-3">Otomatis diisi dari data guru (menu Guru).</p>
            <div className="flex flex-wrap gap-2 mb-6">
              {[
                { v: 'nama_guru', l: 'Nama' },
                { v: 'nip', l: 'NIP' },
                { v: 'jabatan', l: 'Jabatan' },
                { v: 'pangkat', l: 'Pangkat/Gol' },
                { v: 'mapel', l: 'Mapel' },
                { v: 'nuptk', l: 'NUPTK' },
                { v: 'status_pegawai', l: 'Status' },
                { v: 'pendidikan', l: 'Pendidikan' },
                { v: 'tempat_lahir', l: 'Tempat Lahir' },
                { v: 'tanggal_lahir', l: 'Tgl Lahir' },
              ].map(({ v }) => (
                <button type="button" key={v} onClick={() => insertVariable(`{{${v}}}`)} className="text-xs bg-white border border-indigo-200 text-indigo-700 px-2 py-1 rounded hover:bg-indigo-100 transition-colors">
                  {`{{${v}}}`}
                </button>
              ))}
            </div>
            <h4 className="font-semibold text-amber-800 mb-2 text-sm flex items-center justify-between">
              <span className="flex items-center gap-2"><FiPlus /> Variabel Custom</span>
            </h4>
            <p className="text-xs text-amber-700 mb-3">Akan diminta isiannya saat Generate.</p>
            <div className="flex flex-wrap gap-2 mb-3">
              {customVariables.map(v => (
                <button type="button" key={v} onClick={() => insertVariable(`{{${v}}}`)} className="text-xs bg-white border border-amber-200 text-amber-700 px-2 py-1 rounded hover:bg-amber-100 transition-colors">
                  {`{{${v}}}`}
                </button>
              ))}
            </div>
            {isAddingVar ? (
              <div className="flex gap-2">
                <input type="text" value={newVarName} onChange={e => setNewVarName(e.target.value)}
                  placeholder="nama_variabel"
                  className="w-full rounded text-sm px-2 py-1 border border-slate-300 outline-none focus:border-amber-400"
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddCustomVar())} />
                <button type="button" onClick={handleAddCustomVar} className="bg-amber-500 text-white px-2 py-1 rounded text-xs hover:bg-amber-600">Simpan</button>
                <button type="button" onClick={() => setIsAddingVar(false)} className="bg-slate-300 text-slate-700 px-2 py-1 rounded text-xs hover:bg-slate-400">Batal</button>
              </div>
            ) : (
              <button type="button" onClick={() => setIsAddingVar(true)} className="text-xs w-full border border-dashed border-amber-400 text-amber-700 py-1.5 rounded hover:bg-amber-100 transition-colors">
                + Buat Variabel Baru
              </button>
            )}
          </div>
        </div>

        {/* EDITOR */}
        <div className="xl:col-span-3">
          <div className="shadow-lg rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
            <MenuBar />
            <div className="bg-slate-200 p-4 lg:p-8 overflow-y-auto overflow-x-auto flex justify-center">
              <div className="shadow-2xl bg-white border border-slate-300" style={{ width: '800px', minHeight: '1131px' }}>
                <div style={editorMarginStyle}>
                  <EditorContent editor={editor} />
                </div>
              </div>
            </div>
          </div>
          {htmlError && <p className="mt-2 text-sm text-danger font-medium">{htmlError}</p>}
        </div>
      </div>
    </form>

    {showPreview && (
      <FullScreenPreview
        htmlContent={editorContent}
        cssStyles={templateCss}
        pageSize={previewPageSize}
        marginTop={watchedMarginTop}
        marginRight={watchedMarginRight}
        marginBottom={watchedMarginBottom}
        marginLeft={watchedMarginLeft}
        onClose={() => setShowPreview(false)}
      />
    )}

    <ConfirmDialog
      isOpen={showDeleteTableConfirm}
      onClose={() => setShowDeleteTableConfirm(false)}
      onConfirm={() => {
        editor.chain().focus().deleteTable().run();
        setShowDeleteTableConfirm(false);
        toast.success('Tabel berhasil dihapus');
      }}
      title="Hapus Tabel"
      message="Apakah Anda yakin ingin menghapus tabel ini? Tindakan ini tidak dapat dibatalkan."
      confirmText="Ya, Hapus Tabel"
    />
    </>
  );
};

export default TemplateEditorPage;