const pdfParse = require('pdf-parse');
const { parseDocx } = require('./docx-parser');

const KNOWN_VARIABLES = [
  'nama_siswa', 'nisn', 'kelas', 'jenis_kelamin',
  'nama_orang_tua', 'no_hp_ortu', 'alamat',
  'tanggal_surat', 'nama_kepala_sekolah', 'nip',
  'jabatan', 'asal_sekolah', 'no_telepon', 'email',
];

const DEFAULT_CSS = `body, .ProseMirror {
  font-family: 'Times New Roman', Times, serif;
  font-size: 12pt;
  line-height: 1.5;
  color: #000;
  margin: 0;
  padding: 0;
}
p {
  margin-bottom: 0.5em;
  margin-top: 0;
  text-align: justify;
}
h1, h2, h3, h4, h5, h6 {
  font-weight: bold;
  margin-bottom: 0.5em;
  margin-top: 0;
}
table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 1em;
}
table, th, td {
  border: 1px solid black;
}
th, td {
  padding: 4px 8px;
  text-align: left;
}
ul, ol {
  margin-bottom: 0.5em;
  padding-left: 24px;
}`;

const importDocx = async (buffer) => {
  try {
    const result = parseDocx(buffer);
    return { html: result.html, warnings: result.warnings };
  } catch (err) {
    throw new Error(`Gagal membaca file DOCX: ${err.message}`);
  }
};

const importPdf = async (buffer) => {
  try {
    const data = await pdfParse(buffer);
    const text = data.text;
    const paragraphs = text
      .split(/\n\s*\n/)
      .map(p => p.replace(/\n/g, ' ').trim())
      .filter(p => p.length > 0);
    if (paragraphs.length === 0) {
      throw new Error('Tidak dapat mengekstrak teks dari file PDF');
    }
    const html = paragraphs.map(p => `<p>${escapeHtml(p)}</p>`).join('\n');
    return { html, warnings: [] };
  } catch (err) {
    throw new Error(`Gagal membaca file PDF: ${err.message}`);
  }
};

const importTxt = (buffer) => {
  const text = buffer.toString('utf-8');
  const paragraphs = text
    .split(/\n\s*\n/)
    .map(p => p.replace(/\n/g, ' ').trim())
    .filter(p => p.length > 0);
  if (paragraphs.length === 0) {
    throw new Error('File teks kosong');
  }
  const html = paragraphs.map(p => `<p>${escapeHtml(p)}</p>`).join('\n');
  return { html, warnings: [] };
};

const escapeHtml = (text) => {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
};

const detectVariables = (html) => {
  const found = [];
  const varRegex = /\{\{([^#\/>][^}]+)\}\}/g;
  const matches = [...html.matchAll(varRegex)];
  for (const m of matches) {
    const v = m[1].trim();
    if (v.startsWith('#') || v.startsWith('/') || v === 'else') continue;
    if (!found.includes(v)) found.push(v);
  }
  for (const key of KNOWN_VARIABLES) {
    const escaped = key.replace(/_/g, '[ _]');
    const regex = new RegExp(`\\b${escaped}\\b`, 'gi');
    const textMatches = [...html.matchAll(regex)];
    for (const m of textMatches) {
      const v = key;
      if (!found.includes(v)) {
        found.push(v);
      }
    }
  }
  return found;
};

const generateImportCss = (warnings) => {
  const hasWarnings = warnings && warnings.length > 0;
  let css = DEFAULT_CSS;

  if (hasWarnings) {
    css += `\n/* Catatan: Beberapa format mungkin tidak sepenuhnya dipertahankan */`;
  }

  return css;
};

const importDocument = async (file) => {
  const ext = (file.originalname || '').toLowerCase().split('.').pop();
  const mime = file.mimetype || '';

  let htmlContent;
  let warnings = [];

  if (ext === 'docx' || mime.includes('word') || mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    const result = await importDocx(file.buffer);
    htmlContent = result.html;
    warnings = result.warnings;
  } else if (ext === 'pdf' || mime === 'application/pdf') {
    const result = await importPdf(file.buffer);
    htmlContent = result.html;
    warnings = result.warnings;
  } else if (ext === 'txt' || mime === 'text/plain') {
    const result = importTxt(file.buffer);
    htmlContent = result.html;
    warnings = result.warnings;
  } else {
    throw new Error('Format file tidak didukung. Gunakan file .docx, .pdf, atau .txt');
  }

  const detectedVars = detectVariables(htmlContent);

  if (!htmlContent || htmlContent.trim().length === 0) {
    throw new Error('Tidak dapat mengekstrak konten dari file');
  }

  const css = generateImportCss(warnings);

  return {
    html: htmlContent,
    css: css,
    fileName: file.originalname,
    detectedVariables: detectedVars,
    warnings: warnings,
  };
};

module.exports = { importDocument };
