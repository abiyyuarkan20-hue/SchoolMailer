import React, { useEffect, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { NodeSelection } from 'prosemirror-state';
import { TableBorder } from '../../utils/table-border';
import { TableRow } from '@tiptap/extension-table-row';
import { CustomTableCell, CustomTableHeader, TableRowResize } from '../../utils/table-row-resize';
import TextAlign from '@tiptap/extension-text-align';
import Image from '@tiptap/extension-image';
import { TextStyle } from '@tiptap/extension-text-style';
import Highlight from '@tiptap/extension-highlight';
import FontFamily from '@tiptap/extension-font-family';
import Underline from '@tiptap/extension-underline';
import { FontSize, LineHeight, NoSpacing, TabHandler, TabNode } from '../../utils/tiptap-extensions';
import { 
  FiBold, FiItalic, FiUnderline, FiList, FiAlignLeft, FiAlignCenter, 
  FiAlignRight, FiAlignJustify, FiImage, FiMinus, FiTable, FiTrash2, FiMove
} from 'react-icons/fi';
import ConfirmDialog from './ConfirmDialog';

const RichTextEditor = ({ content, onChange, placeholder = 'Tulis di sini...', compact = false }) => {
  const [showDeleteTableConfirm, setShowDeleteTableConfirm] = useState(false);

  const stripColorStyles = (html) => {
    if (!html || typeof html !== 'string') return html;
    return html.replace(/style="([^"]*?)"/gi, (match, group) => {
      const cleaned = group.replace(/\bcolor:\s*#[0-9a-fA-F]+\s*;?\s*/gi, '').trim();
      if (!cleaned) return '';
      return `style="${cleaned}"`;
    });
  };

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ underline: false }),
      Placeholder.configure({
        placeholder: placeholder,
      }),
      TableBorder.configure({ resizable: true }),
      TableRow,
      CustomTableHeader,
      CustomTableCell,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Image.configure({ inline: true, allowBase64: true }),
      TextStyle,
      Highlight.configure({ multicolor: true }),
      FontFamily,
      Underline,
      FontSize,
      LineHeight,
      TableRowResize,
      NoSpacing,
      TabNode,
      TabHandler
    ],
    content: stripColorStyles(content),
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange(stripColorStyles(html));
    },
    editorProps: {
      attributes: {
        class: `prose prose-sm sm:prose lg:prose-lg xl:prose-2xl focus:outline-none ${compact ? 'min-h-[40px] p-2' : 'min-h-[150px] p-4'} bg-white border border-slate-200 rounded-b-xl shadow-sm max-w-none prose-table:border-collapse prose-td:border-slate-300 prose-th:border-slate-300`,
        style: 'font-family: "Times New Roman", Times, serif; font-size: 14pt; tab-size: 60px; --tw-prose-body:#000; --tw-prose-bold:#000; color:#000;'
      },
    },
  });

  useEffect(() => {
    if (editor) {
      const clean = stripColorStyles(content);
      if (clean !== editor.getHTML()) {
        editor.commands.setContent(clean, false);
      }
    }
  }, [content, editor]);

  const MenuBar = () => {
    if (!editor) return null;

    const addImage = () => {
      const url = window.prompt('URL Gambar (Pastikan gambar dapat diakses publik):');
      if (url) {
        editor.chain().focus().setImage({ src: url }).run();
      }
    };

    const fontFamilies = ['Inter', 'Arial', 'Times New Roman', 'Calibri', 'Courier New', 'Georgia', 'Tahoma', 'Verdana', 'Comic Sans MS'];
    const fontSizes = ['8pt', '9pt', '10pt', '11pt', '12pt', '14pt', '16pt', '18pt', '24pt', '36pt'];
    const lineHeights = ['1', '1.15', '1.5', '2', '2.5'];

    const handleAlign = (align) => {
      const { state } = editor;
      if (state.selection instanceof NodeSelection && state.selection.node.type.name === 'table') {
        editor.chain().focus().setTablePosition(align).run();
      } else {
        editor.chain().focus().setTextAlign(align).run();
      }
    };

    return (
      <div className="flex flex-wrap items-center gap-1 p-2 bg-slate-100 border border-slate-200 rounded-t-xl border-b-0 sticky top-0 z-10 shadow-sm">
        <select 
          onChange={(e) => e.target.value ? editor.chain().focus().setFontFamily(e.target.value).run() : editor.chain().focus().unsetFontFamily().run()}
          className="p-1 border border-slate-300 rounded text-sm bg-white"
          title="Jenis Font"
        >
          <option value="">Default Font</option>
          {fontFamilies.map(font => (
            <option key={font} value={font}>{font}</option>
          ))}
        </select>
        <select 
          onChange={(e) => e.target.value ? editor.chain().focus().setFontSize(e.target.value).run() : editor.chain().focus().unsetFontSize().run()}
          className="p-1 border border-slate-300 rounded text-sm bg-white"
          title="Ukuran Font"
        >
          <option value="">Ukuran</option>
          {fontSizes.map(size => (
            <option key={size} value={size}>{size}</option>
          ))}
        </select>
        <select 
          onChange={(e) => e.target.value ? editor.chain().focus().setLineHeight(e.target.value).run() : editor.chain().focus().unsetLineHeight().run()}
          className="p-1 border border-slate-300 rounded text-sm bg-white"
          title="Spasi Baris"
        >
          <option value="">Spasi</option>
          {lineHeights.map(height => (
            <option key={height} value={height}>{height}</option>
          ))}
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
            <button type="button" onClick={() => editor.chain().focus().selectTable().run()}
              className={`px-2 py-1 rounded transition-colors flex items-center gap-1 ${
                editor.state.selection instanceof NodeSelection && editor.state.selection.node.type.name === 'table'
                  ? 'bg-primary/20 text-primary font-medium'
                  : 'text-slate-600 hover:bg-slate-300'
              }`}
              title="Pilih Seluruh Tabel">
              <FiMove className="w-3 h-3" />
              Pilih
            </button>
            <span className="w-px h-5 bg-slate-300 mx-1 self-center"></span>
            <button type="button" onClick={() => editor.chain().focus().setTablePosition('left').run()}
              className={`px-2 py-1 rounded transition-colors ${
                editor.getAttributes('table').tableAlign === 'left'
                  ? 'bg-primary/20 text-primary font-medium'
                  : 'text-slate-600 hover:bg-slate-300'
              }`}
              title="Rata Kiri">
              <FiAlignLeft className="w-3 h-3" />
            </button>
            <button type="button" onClick={() => editor.chain().focus().setTablePosition('center').run()}
              className={`px-2 py-1 rounded transition-colors ${
                editor.getAttributes('table').tableAlign === 'center'
                  ? 'bg-primary/20 text-primary font-medium'
                  : 'text-slate-600 hover:bg-slate-300'
              }`}
              title="Rata Tengah">
              <FiAlignCenter className="w-3 h-3" />
            </button>
            <button type="button" onClick={() => editor.chain().focus().setTablePosition('right').run()}
              className={`px-2 py-1 rounded transition-colors ${
                editor.getAttributes('table').tableAlign === 'right'
                  ? 'bg-primary/20 text-primary font-medium'
                  : 'text-slate-600 hover:bg-slate-300'
              }`}
              title="Rata Kanan">
              <FiAlignRight className="w-3 h-3" />
            </button>
            <span className="w-px h-5 bg-slate-300 mx-1 self-center"></span>
            <button type="button" onClick={() => editor.chain().focus().toggleTableBorders().run()}
              className={`px-2 py-1 rounded transition-colors flex items-center gap-1 ${
                editor.getAttributes('table').borderless
                  ? 'text-red-600 bg-red-100 hover:bg-red-200'
                  : 'text-slate-600 hover:bg-slate-300'
              }`}
              title={editor.getAttributes('table').borderless ? 'Tampilkan Border Tabel' : 'Sembunyikan Border Tabel'}>
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <rect x="1" y="1" width="14" height="14" rx="1" />
                <line x1="1" y1="5.5" x2="15" y2="5.5" />
                <line x1="1" y1="10.5" x2="15" y2="10.5" />
                <line x1="5.5" y1="1" x2="5.5" y2="15" />
                <line x1="10.5" y1="1" x2="10.5" y2="15" />
              </svg>
              Border
            </button>
            <span className="w-px h-5 bg-slate-300 mx-1 self-center"></span>
            <button type="button" onClick={() => setShowDeleteTableConfirm(true)} className="px-2 py-1 hover:bg-red-200 rounded text-red-600 font-bold flex items-center gap-1" title="Hapus Tabel">
              <FiTrash2 className="w-3 h-3" /> Hapus Tabel
            </button>
          </div>
        )}
        <div className="w-px h-6 bg-slate-300 mx-1"></div>
        <button type="button" onClick={addImage} className="p-2 rounded hover:bg-slate-200 text-slate-600" title="Sisip Gambar URL"><FiImage /></button>
        <button type="button" onClick={() => editor.chain().focus().setHorizontalRule().run()} className="p-2 rounded hover:bg-slate-200 text-slate-600" title="Garis Pembatas"><FiMinus /></button>
      </div>
    );
  };

  return (
    <div className="rich-text-editor-container">
      <MenuBar />
      <EditorContent editor={editor} />
      <style>{`
        .rich-text-editor-container .ProseMirror,
        .rich-text-editor-container .ProseMirror strong {
          color: #000 !important;
        }
      `}</style>

      <ConfirmDialog
        isOpen={showDeleteTableConfirm}
        onClose={() => setShowDeleteTableConfirm(false)}
        onConfirm={() => {
          editor.chain().focus().deleteTable().run();
          setShowDeleteTableConfirm(false);
        }}
        title="Hapus Tabel"
        message="Apakah Anda yakin ingin menghapus tabel ini? Tindakan ini tidak dapat dibatalkan."
        confirmText="Ya, Hapus Tabel"
      />
    </div>
  );
};

export default RichTextEditor;
