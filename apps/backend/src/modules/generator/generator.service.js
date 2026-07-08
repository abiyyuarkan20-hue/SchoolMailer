const prisma = require('../../config/database');
const puppeteer = require('puppeteer');
const handlebars = require('handlebars');
const archiver = require('archiver');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const DOWNLOADS_DIR = path.join(__dirname, '../../../../public/downloads');

if (!fs.existsSync(DOWNLOADS_DIR)) {
  fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });
}

/**
 * Normalize variable name for case-insensitive matching
 * @param {string} name - Variable name
 * @returns {string} - Normalized name (lowercase, underscores only)
 */
const normalizeVariableName = (name) => {
  return String(name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
};

/**
 * Map teacher data to template variables
 * @param {string|null} teacherId - Optional specific teacher ID
 * @returns {Promise<Object>} - Teacher variables object
 */
const mapTeacherVariables = async (teacherId) => {
  let teacher;
  if (teacherId) {
    teacher = await prisma.teacher.findUnique({ where: { id: teacherId } });
  }
  if (!teacher) {
    teacher = await prisma.teacher.findFirst({ where: { isActive: true }, orderBy: { createdAt: 'asc' } });
  }
  if (!teacher) return {};

  const formatDate = (d) => {
    if (!d) return '-';
    try {
      return new Date(d).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch { return '-'; }
  };

  return {
    nama_guru: teacher.name || '-',
    nip: teacher.nip || '-',
    jabatan: teacher.position || '-',
    pangkat: teacher.pangkat || '-',
    mapel: teacher.subject || '-',
    nuptk: teacher.nuptk || '-',
    status_pegawai: teacher.status || '-',
    pendidikan: teacher.education || '-',
    tempat_lahir: teacher.birthPlace || '-',
    tanggal_lahir: formatDate(teacher.birthDate),
    no_telp: teacher.phone || '-',
    email_guru: teacher.email || '-',
    alamat_guru: teacher.address || '-',
    jenis_kelamin_guru: teacher.gender === 'MALE' ? 'Laki-laki' : (teacher.gender === 'FEMALE' ? 'Perempuan' : teacher.gender || '-'),
  };
};

/**
 * Map student and custom data to template variables
 * Handles case-insensitive matching and data type formatting
 * @param {Object} student - Student record with extraData
 * @param {Object} globalData - Global template data (custom data from form)
 * @returns {Object} - Merged data object for template
 */
const mapStudentVariables = (student, globalData = {}) => {
  // Standard fields with proper formatting
  const standardFields = {
    nisn: student.nisn,
    nama_siswa: student.name,
    kelas: student.className || student.grade,
    jenis_kelamin: student.gender === 'MALE' ? 'Laki-laki' : (student.gender === 'FEMALE' ? 'Perempuan' : student.gender),
    nama_orang_tua: student.parentName,
    no_hp_ortu: student.parentPhone || '-',
    alamat: student.address || '-',
    email: student.email || '-',
    tanggal_surat: new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })
  };

  // Custom fields from extraData
  const customFields = student.extraData || {};

  // Merge: user input (globalData) takes highest priority,
  // then standard fields, then custom extraData, then raw student fields
  const mergedData = {
    ...student,        // raw Prisma fields (lowest priority)
    ...standardFields, // mapped standard fields like nama_siswa, kelas
    ...customFields,   // student extraData 
    ...globalData,     // user input from form (highest priority)
  };

  return mergedData;
};

/**
 * Auto-fix common Handlebars syntax errors in template HTML.
 * Fixes patterns like {{variable} -> {{variable}} (missing closing brace)
 */
const fixTemplateSyntax = (html) => {
  let result = html;
  // Fix {{variable} -> {{variable}} (single closing brace instead of double)
  result = result.replace(/\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}(?!\})/g, '{{$1}}');
  // Fix {{{variable} -> {{{variable}}} (triple braces with single closing)
  result = result.replace(/\{\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}(?!\})/g, '{{{$1}}}');
  return result;
};

handlebars.registerHelper('formatDate', (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
});

const queueGeneration = async (data, userId) => {
  const log = await prisma.generationLog.create({
    data: {
      templateId: data.templateId,
      generatedBy: userId,
      studentIds: data.studentIds,
      studentCount: data.studentIds.length,
      filterClass: data.filterClass,
      outputType: data.outputType,
      status: 'PENDING',
    }
  });

  processGeneration(log.id, data).catch(err => {
    console.error(`Error processing job ${log.id}:`, err);
  });

  return log;
};

const processGeneration = async (logId, data) => {
  let browser = null;
  
  try {
    await prisma.generationLog.update({
      where: { id: logId },
      data: { status: 'PROCESSING', startedAt: new Date() }
    });

    const template = await prisma.template.findUnique({ where: { id: data.templateId } });
    if (!template) throw new Error('Template tidak ditemukan');

    const students = await prisma.student.findMany({
      where: { id: { in: data.studentIds } }
    });

    const settings = await prisma.setting.findUnique({ where: { id: 'global_settings' } });
    
    let headerHtml = '';
    const useGlobal = settings && settings.useGlobalHeader;
    const config = useGlobal ? {
      enabled: true,
      headerContentHtml: settings.headerContentHtml,
      logoLeft: settings.headerLogoLeft,
      logoRight: settings.headerLogoRight,
    } : (template.headerConfig && template.headerConfig.enabled ? template.headerConfig : null);

    if (config && config.enabled) {
      const getBase64Image = (imagePath) => {
        if (!imagePath) return '';
        try {
          const fullPath = path.join(__dirname, '../../../../public', imagePath);
          if (fs.existsSync(fullPath)) {
            const ext = path.extname(fullPath).toLowerCase().replace('.', '');
            const base64Data = fs.readFileSync(fullPath, { encoding: 'base64' });
            return `data:image/${ext || 'png'};base64,${base64Data}`;
          }
        } catch (e) {
           console.error('Error reading logo:', e);
        }
        return '';
      };

      const logoLeftBase64 = getBase64Image(config.logoLeft);
      const logoRightBase64 = getBase64Image(config.logoRight);

      const logoSize = settings?.logoSize || 80;
      const logoMarginTop = settings?.logoMarginTop || 0;
      const logoPaddingX = settings?.logoPaddingX || 0;

      const contentInner = `<div style="position:absolute;left:${logoPaddingX}px;top:calc(50% + ${logoMarginTop}px);transform:translateY(-50%);width:${logoSize}px;text-align:center;z-index:1;">${logoLeftBase64 ? `<img src="${logoLeftBase64}" style="max-width:100%;max-height:${logoSize}px;width:100%;object-fit:contain;" />` : ''}</div><div class="kop-surat-content" style="padding:0 10px;text-align:center;position:relative;z-index:2;">${config.headerContentHtml || ''}</div><div style="position:absolute;right:${logoPaddingX}px;top:calc(50% + ${logoMarginTop}px);transform:translateY(-50%);width:${logoSize}px;text-align:center;z-index:1;">${logoRightBase64 ? `<img src="${logoRightBase64}" style="max-width:100%;max-height:${logoSize}px;width:100%;object-fit:contain;" />` : ''}</div>`;

      const linePosition = settings?.headerLinePosition || 'bottom';
      const linePadding = settings?.headerLinePadding ?? 15;
      const lineHtml = buildHeaderLineHtml(settings);

      let contentDiv;
      if (lineHtml) {
        const contentPad = linePadding > 0 ? (linePosition === 'bottom' ? `padding-bottom:${linePadding}px;` : `padding-top:${linePadding}px;`) : '';
        contentDiv = `<div style="position:relative;min-height:${logoSize}px;${contentPad}">${contentInner}</div>`;
        const lineOffset = linePadding < 0
          ? (linePosition === 'bottom' ? `bottom:${-linePadding}px;` : `top:${-linePadding}px;`)
          : (linePosition === 'bottom' ? 'bottom:0;' : 'top:0;');
        headerHtml = `<div style="position:relative;margin-bottom:20px;">${contentDiv}<div style="position:absolute;left:0;right:0;${lineOffset}pointer-events:none;z-index:5;">${lineHtml}</div></div>`;
      } else {
        contentDiv = `<div style="position:relative;min-height:${logoSize}px;">${contentInner}</div>`;
        headerHtml = contentDiv;
      }
    }

    // Auto-fix common syntax errors in template (e.g. {{nip} -> {{nip}})
    const fixedHtmlContent = fixTemplateSyntax(template.htmlContent);

    // Calculate page dimensions
    const pageSize = (template.pageSize || 'A4').toUpperCase();
    const dim = PAGE_DIMENSIONS[pageSize] || PAGE_DIMENSIONS.A4;

    const margins = {
      marginTop: template.marginTop ?? 25,
      marginRight: template.marginRight ?? 25,
      marginBottom: template.marginBottom ?? 25,
      marginLeft: template.marginLeft ?? 30,
    };

    let compiledTemplate;
    try {
      compiledTemplate = handlebars.compile(fixedHtmlContent);
    } catch (compileErr) {
      throw new Error(`Gagal mengkompilasi template: ${compileErr.message}`);
    }

    // Build shared CSS from template (same as buildPageHtml will add the standard CSS)
    const studentPageCss = `
      .student-page { page-break-after: always; }
      .student-page:last-child { page-break-after: auto; }
    `;

    browser = await puppeteer.launch({
      headless: "new",
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const pdfOptions = {
      format: template.pageSize || 'A4',
      printBackground: true,
    };

    const fileNameId = uuidv4();
    let finalFilePath = '';

    if (data.outputType === 'PDF_SINGLE') {
      let combinedHtmlContent = '';
      
      const teacherData = await mapTeacherVariables(data.teacherId);
      students.forEach((student, index) => {
        const templateData = { ...teacherData, ...mapStudentVariables(student, data.customData) };
        
        let htmlBody;
        try {
          htmlBody = compiledTemplate(templateData);
        } catch (renderErr) {
          throw new Error(`Gagal render data siswa ${student.name} (${student.nisn}): ${renderErr.message}`);
        }
        const signatureHtml = buildSignatureHtml(settings);
      const pageBody = `<div class="page-body"><div class="content">${htmlBody}</div>${signatureHtml}</div>`;
      const pageContent = `<div class="page">${headerHtml ? `<div class="page-header">${headerHtml}</div>` : ''}${pageBody}</div>`;
        combinedHtmlContent += `<div class="student-page">${pageContent}</div>`;
      });

      const cssWithBreaks = `${template.cssStyles || ''}${studentPageCss}`;
      const finalHtml = buildPageHtml(combinedHtmlContent, cssWithBreaks, dim, margins);
      
      const page = await browser.newPage();
      await page.setViewport({ width: Math.round(dim.width * 3.7795), height: Math.round(dim.height * 3.7795) });
      await page.setContent(finalHtml, { waitUntil: 'networkidle0', timeout: 30000 });
      
      finalFilePath = path.join(DOWNLOADS_DIR, `${fileNameId}.pdf`);
      await page.pdf({ ...pdfOptions, path: finalFilePath });
      await page.close();
      
    } else if (data.outputType === 'ZIP_BUNDLE') {
      const zipFilePath = path.join(DOWNLOADS_DIR, `${fileNameId}.zip`);
      finalFilePath = zipFilePath;
      
      const output = fs.createWriteStream(zipFilePath);
      const archive = archiver('zip', { zlib: { level: 9 } });
      
      // Prevent unhandled 'error' event from crashing the process
      archive.on('error', (err) => { throw err; });
      
      archive.pipe(output);

      const CONCURRENCY_LIMIT = 10;
      for (let i = 0; i < students.length; i += CONCURRENCY_LIMIT) {
        const batch = students.slice(i, i + CONCURRENCY_LIMIT);
        
        const pdfResults = await Promise.all(batch.map(async (student) => {
          const page = await browser.newPage();
          try {
            const templateData = { ...teacherData, ...mapStudentVariables(student, data.customData) };
            
            let htmlBody;
            try {
              htmlBody = compiledTemplate(templateData);
            } catch (renderErr) {
              throw new Error(`Gagal render data siswa ${student.name} (${student.nisn}): ${renderErr.message}`);
            }
            const signatureHtml = buildSignatureHtml(settings);
            const pageBody = `<div class="page-body"><div class="content">${htmlBody}</div>${signatureHtml}</div>`;
            const innerHtml = `<div class="page">${headerHtml ? `<div class="page-header">${headerHtml}</div>` : ''}${pageBody}</div>`;
            const finalHtml = buildPageHtml(innerHtml, template.cssStyles || '', dim, margins);
            
            await page.setViewport({ width: Math.round(dim.width * 3.7795), height: Math.round(dim.height * 3.7795) });
            await page.setContent(finalHtml, { waitUntil: 'networkidle0', timeout: 30000 });
            const pdfBuffer = await page.pdf(pdfOptions);
            
            const safeName = student.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            return { name: `${student.nisn}_${safeName}.pdf`, buffer: Buffer.from(pdfBuffer) };
          } finally {
            await page.close();
          }
        }));

        // Append all PDFs from this batch sequentially (archiver requires sequential appends)
        for (const result of pdfResults) {
          archive.append(result.buffer, { name: result.name });
        }
      }

      await archive.finalize();
      await new Promise((resolve) => output.on('close', resolve));
    }

    const stats = fs.statSync(finalFilePath);
    
    await prisma.generationLog.update({
      where: { id: logId },
      data: { 
        status: 'COMPLETED', 
        completedAt: new Date(),
        filePath: finalFilePath,
        fileSize: stats.size
      }
    });

  } catch (error) {
    const msg = error.message || 'Unknown error occurred';
    console.error(`Generation Job ${logId} Failed:`, msg, error.stack || '');
    // Provide a friendlier message for common Handlebars errors
    const friendly = msg.includes('each') && msg.includes('array')
      ? `Variabel di template menggunakan #each tetapi datanya bukan berupa daftar (array). Periksa variabel yang menggunakan #each di template.`
      : msg;
    await prisma.generationLog.update({
      where: { id: logId },
      data: { 
        status: 'FAILED', 
        completedAt: new Date(),
        errorMessage: friendly
      }
    });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};

/**
 * Build HTML for a single signatory block (name, position, NIP, signature/stamp images)
 * @param {Object} s - Signatory config
 * @param {string} side - Alignment side: left, center, right
 * @returns {string} HTML string
 */
const buildSignatoryBlock = (s, side) => {
  const textAlign = side === 'center' ? 'center' : 'left';

  const getBase64Image = (imagePath) => {
    if (!imagePath) return '';
    try {
      const fullPath = path.join(__dirname, '../../../../public', imagePath);
      if (fs.existsSync(fullPath)) {
        const ext = path.extname(fullPath).toLowerCase().replace('.', '');
        const base64Data = fs.readFileSync(fullPath, { encoding: 'base64' });
        return `data:image/${ext || 'png'};base64,${base64Data}`;
      }
    } catch (e) {
      console.error('Error reading signatory image:', e);
    }
    return '';
  };

  const renderHtml = (val) => val && val.includes('<') ? val.replace(/<\/?p[^>]*>/gi, '') : val;
  const renderPosition = (position) => {
    if (!position) return '';
    const cleaned = position.includes('<') ? position.replace(/<\/?p[^>]*>/gi, '') : position;
    return cleaned.replace(/\n/g, '<br>');
  };

  const signImageBase64 = getBase64Image(s.signImage);
  const stampImageBase64 = getBase64Image(s.stampImage);
  const hasImages = signImageBase64 || stampImageBase64;

  const getImageStyle = (align, offsetX, offsetY, defaultOffsetY = -30) => {
    const y = offsetY ?? defaultOffsetY;
    if (!align || align === 'center') {
      return `left:50%;transform:translate(calc(-50% + ${offsetX || 0}px), ${y}px)`;
    } else if (align === 'left') {
      return `left:0;transform:translate(${offsetX || 0}px, ${y}px)`;
    }
    return `right:0;transform:translate(${offsetX || 0}px, ${y}px)`;
  };

  return `
    <div style="text-align:${textAlign};position:relative;">
      <div style="margin:0;font-size:12pt;margin-bottom:4px;min-height:18px;line-height:normal;">${renderPosition(s.position)}</div>
      <div style="height:70px;position:relative;">
        ${signImageBase64 ? `<img src="${signImageBase64}" alt="Tanda Tangan" style="position:absolute;width:${s.signSize || 100}px;${getImageStyle(s.signAlign, s.signOffsetX, s.signOffsetY, -30)};z-index:1;" />` : ''}
        ${stampImageBase64 ? `<img src="${stampImageBase64}" alt="Stempel" style="position:absolute;width:${s.stampSize || 100}px;${getImageStyle(s.stampAlign, s.stampOffsetX, s.stampOffsetY, -20)};z-index:2;" />` : ''}
      </div>
      <div style="margin:0;font-size:12pt;line-height:normal;">${renderHtml(s.name)}</div>
      ${s.pangkat ? `<div style="margin:0;font-size:11pt;color:#000;line-height:normal;">${renderHtml(s.pangkat)}</div>` : ''}
      ${s.nip ? `<div style="margin:0;font-size:11pt;color:#000;line-height:normal;"><span>${renderHtml(s.nip)}</span></div>` : ''}
    </div>`;
};

/**
 * Build HTML for the kop surat header separator line.
 * Returns empty string when width is 0 (no line).
 * @param {Object} settings - Global settings
 * @returns {string} HTML string for the line
 */
const buildHeaderLineHtml = (settings) => {
  if (!settings) return '';
  const lineWidth = settings.headerLineWidth ?? 100;
  const lineAlign = settings.headerLineAlign || 'center';
  if (lineWidth <= 0) return '';

  const widthPct = lineWidth >= 100 ? '100%' : `${lineWidth}%`;

  let marginStyle;
  if (widthPct === '100%') {
    marginStyle = 'margin:0';
  } else if (lineAlign === 'center') {
    marginStyle = 'margin:0 auto';
  } else if (lineAlign === 'right') {
    marginStyle = 'margin-left:auto;margin-right:0';
  } else {
    marginStyle = 'margin-left:0;margin-right:auto';
  }

  return `<div style="border-top:3px solid #000;width:${widthPct};${marginStyle};"></div>`;
};

const buildSignatureHtml = (settings) => {
  if (!settings || !settings.useGlobalSignature) return '';
  
  const config = settings.signatureConfig;
  if (!config || !config.signatories || !config.signatories.length) return '';

  const city = config.letterCity || 'Medan';
  const stripped = city.replace(/<[^>]*>/g, '').trim();
  const date = stripped ? city : 'Medan, 3 Juli 2026';

  const showDate = config.showDate !== false;
  const dateHtml = showDate
    ? `<div style="margin:0;font-size:12pt;">${date}</div>`
    : '';

  const filteredSignatories = config.signatories.filter(s => s.name && s.position);

  const buildRows = () => {
    if (filteredSignatories.length === 0) return '';

    if (filteredSignatories.length === 1) {
      const s = filteredSignatories[0];
      const side = s.side || 'center';
      const textAlignStyle = side === 'center' ? 'center' : 'left';
      const alignStyle = side === 'right'
        ? 'margin-left:auto;margin-right:0'
        : side === 'center'
        ? 'margin-left:auto;margin-right:auto'
        : 'margin-left:0;margin-right:auto';
      return `
        <div style="${alignStyle};position:relative;width:fit-content;max-width:100%;">
          ${dateHtml ? `<div style="text-align:${config.dateAlign || 'right'};margin-bottom:0.25em;">${dateHtml}</div>` : ''}
          <div style="text-align:${textAlignStyle};">
            ${buildSignatoryBlock(s, side)}
          </div>
        </div>`;
    }

    const rows = [];
    let currentRow = [];
    filteredSignatories.forEach((s) => {
      if (s.newRow && currentRow.length > 0) {
        rows.push(currentRow);
        currentRow = [];
      }
      currentRow.push(s);
    });
    if (currentRow.length > 0) rows.push(currentRow);

    const rowsHtml = rows.map((row) => {
      if (row.length === 1) {
        const s = row[0];
        const side = s.side || 'center';
        const alignStyle = side === 'right'
          ? 'margin-left:auto;margin-right:0'
          : side === 'center'
          ? 'margin-left:auto;margin-right:auto'
          : 'margin-left:0;margin-right:auto';
        return `
        <div style="${alignStyle};text-align:${side === 'center' ? 'center' : 'left'};position:relative;width:fit-content;max-width:100%;">
          ${buildSignatoryBlock(s, side)}
        </div>`;
      }
      const items = row.map((s, i) => {
        const textAlign = i === 0 ? 'left' : (i === row.length - 1 ? 'right' : 'center');
        const side = s.side || textAlign;
        return `
        <div style="flex:1;text-align:${side === 'center' ? 'center' : 'left'};position:relative;">
          ${buildSignatoryBlock(s, side)}
        </div>`;
      }).join('');
      return `<div style="display:flex;justify-content:space-between;gap:40px;">${items}</div>`;
    }).join('');

    return `
      ${dateHtml ? `<div style="text-align:${config.dateAlign || 'right'};margin-bottom:0.25em;">${dateHtml}</div>` : ''}
      <div style="display:flex;flex-direction:column;gap:30px;">
        ${rowsHtml}
      </div>`;
  };

  const signatoriesHtml = buildRows();
  
  return `
    <div style="margin-top:40px;">
      ${signatoriesHtml}
    </div>`;
};

const getLogs = async (pagination = { page: 1, limit: 10 }) => {
  const page = Number(pagination.page) || 1;
  const limit = Number(pagination.limit) || 10;
  const skip = (page - 1) * limit;

  const [total, rawData] = await Promise.all([
    prisma.generationLog.count(),
    prisma.generationLog.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        template: { select: { title: true } },
        generatedByUser: { select: { name: true } }
      }
    })
  ]);

  // Convert BigInt fileSize to Number for JSON serialization
  const data = rawData.map(log => ({
    ...log,
    fileSize: log.fileSize ? Number(log.fileSize) : null
  }));

  return {
    data,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  };
};

const deleteLog = async (id) => {
  const log = await prisma.generationLog.findUnique({ where: { id } });
  if (!log) throw new Error('Log tidak ditemukan');

  if (log.filePath && fs.existsSync(log.filePath)) {
    fs.unlinkSync(log.filePath);
  }

  return await prisma.generationLog.delete({ where: { id } });
};

/**
 * Generate HTML preview for a single student
 * @param {string} templateId - Template ID
 * @param {string} studentId - Student ID
 * @param {Object} customData - Custom data from form
 * @returns {Promise<Object>} - Preview result with HTML and variable info
 */
const generatePreview = async (templateId, studentId, customData = {}) => {
  // Fetch template
  const template = await prisma.template.findUnique({ where: { id: templateId } });
  if (!template) {
    const error = new Error('Template tidak ditemukan');
    error.statusCode = 404;
    throw error;
  }

  // Fetch student
  const student = await prisma.student.findUnique({ where: { id: studentId } });
  if (!student) {
    const error = new Error('Siswa tidak ditemukan');
    error.statusCode = 404;
    throw error;
  }

  // Get settings for header
  const settings = await prisma.setting.findUnique({ where: { id: 'global_settings' } });
  
  let headerHtml = '';
  const useGlobal = settings && settings.useGlobalHeader;
  const config = useGlobal ? {
    enabled: true,
    headerContentHtml: settings.headerContentHtml,
    logoLeft: settings.headerLogoLeft,
    logoRight: settings.headerLogoRight,
  } : (template.headerConfig && template.headerConfig.enabled ? template.headerConfig : null);

  if (config && config.enabled) {
    const getBase64Image = (imagePath) => {
      if (!imagePath) return '';
      try {
        const fullPath = path.join(__dirname, '../../../../public', imagePath);
        if (fs.existsSync(fullPath)) {
          const ext = path.extname(fullPath).toLowerCase().replace('.', '');
          const base64Data = fs.readFileSync(fullPath, { encoding: 'base64' });
          return `data:image/${ext || 'png'};base64,${base64Data}`;
        }
      } catch (e) {
        console.error('Error reading logo:', e);
      }
      return '';
    };

    const logoLeftBase64 = getBase64Image(config.logoLeft);
    const logoRightBase64 = getBase64Image(config.logoRight);

    const linePosition = settings?.headerLinePosition || 'bottom';
    const linePadding = settings?.headerLinePadding ?? 15;
    const lineHtml = buildHeaderLineHtml(settings);

    const contentPad = lineHtml && linePadding > 0 ? (linePosition === 'bottom' ? `padding-bottom:${linePadding}px;` : `padding-top:${linePadding}px;`) : '';
    const contentInner = `
      <div style="display: flex; align-items: center; justify-content: space-between;${contentPad}">
        <div style="width: 80px; text-align: center;">
          ${logoLeftBase64 ? `<img src="${logoLeftBase64}" style="max-width: 80px; max-height: 80px;" />` : ''}
        </div>
        <div class="kop-surat-content" style="flex: 1; padding: 0 15px; text-align: center;">${config.headerContentHtml || ''}</div>
        <div style="width: 80px; text-align: center;">
          ${logoRightBase64 ? `<img src="${logoRightBase64}" style="max-width: 80px; max-height: 80px;" />` : ''}
        </div>
      </div>
    `;

    if (lineHtml) {
      const lineOffset = linePadding < 0
        ? (linePosition === 'bottom' ? `bottom:${-linePadding}px;` : `top:${-linePadding}px;`)
        : (linePosition === 'bottom' ? 'bottom:0;' : 'top:0;');
      headerHtml = `<div style="position:relative;margin-bottom:20px;">${contentInner}<div style="position:absolute;left:0;right:0;${lineOffset}pointer-events:none;z-index:5;">${lineHtml}</div></div>`;
    } else {
      headerHtml = contentInner;
    }
  }

  // Map student + teacher variables (teacher data lower priority)
  const teacherData = await mapTeacherVariables();
  const templateData = { ...teacherData, ...mapStudentVariables(student, customData) };

  // Compile template (auto-fix syntax errors first)
  const fixedHtmlContent = fixTemplateSyntax(template.htmlContent);
  const compiledTemplate = handlebars.compile(fixedHtmlContent);
  const htmlBody = compiledTemplate(templateData);

  // Use shared buildPageHtml for pixel-perfect consistency with PDF
  const pageSize = (template.pageSize || 'A4').toUpperCase();
  const dim = PAGE_DIMENSIONS[pageSize] || PAGE_DIMENSIONS.A4;
  const margins = {
    marginTop: template.marginTop ?? 25,
    marginRight: template.marginRight ?? 25,
    marginBottom: template.marginBottom ?? 25,
    marginLeft: template.marginLeft ?? 30,
  };
  const pageBody = `<div class="page-body"><div class="content">${htmlBody}</div>${buildSignatureHtml(settings)}</div>`;
  const innerHtml = `<div class="page">${headerHtml ? `<div class="page-header">${headerHtml}</div>` : ''}${pageBody}</div>`;
  const fullHtml = buildPageHtml(innerHtml, template.cssStyles || '', dim, margins);

  // Extract variables from template to check availability
  const variableRegex = /\{\{([^}]+)\}\}/g;
  const matches = [...template.htmlContent.matchAll(variableRegex)];
  const requiredVariables = matches.map(match => match[1].trim());
  
  const cleanVariableName = (raw) => {
    const cleaned = raw.replace(/^#|^\//, '').trim();
    // Extract variable name from #each <var> pattern
    if (cleaned.startsWith('each ')) return cleaned.replace('each ', '').trim();
    return cleaned;
  };

  const variableStatus = requiredVariables.map(varName => {
    const cleanVarName = cleanVariableName(varName);
    const hasValue = templateData[cleanVarName] !== undefined && templateData[cleanVarName] !== null && templateData[cleanVarName] !== '';
    return {
      variable: cleanVarName,
      available: hasValue,
      value: hasValue ? String(templateData[cleanVarName]).substring(0, 50) : null
    };
  });

  return {
    html: fullHtml,
    variables: variableStatus,
    missingVariables: variableStatus.filter(v => !v.available).map(v => v.variable),
    studentName: student.name,
    studentNisn: student.nisn
  };
};

const PAGE_DIMENSIONS = {
  A4: { width: 210, height: 297, label: 'A4' },
  F4: { width: 215, height: 330, label: 'F4' },
  LETTER: { width: 216, height: 279, label: 'Letter' },
};

/**
 * Build a complete HTML page with consistent CSS and structure.
 * Shared between preview and PDF generation so both render identically.
 * @param {string} innerHtml - The rendered content (header + body)
 * @param {string} cssStyles - Additional custom CSS
 * @param {Object} dim - Page dimensions { width, height }
 * @returns {string} Full HTML document
 */
const buildPageHtml = (innerHtml, cssStyles, dim, margins = {}) => {
  const mt = margins.marginTop ?? 25;
  const mr = (margins.marginRight ?? 25) + 'mm';
  const mb = (margins.marginBottom ?? 25) + 'mm';
  const ml = (margins.marginLeft ?? 30) + 'mm';
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  body { font-family:'Times New Roman',Times,serif; margin:0; padding:0; color:#000; line-height:1.5; font-size:14pt; tab-size:60px; }
  p { margin-bottom:0.5em; margin-top:0; }
  .content { white-space:pre-wrap; }
  .kop-surat-content, .kop-surat-content p { margin:0; white-space:pre-wrap; }
  p:empty::before { content:'\\00a0'; }
  h1,h2,h3,h4,h5,h6 { margin-bottom:0.5em; margin-top:0; font-weight:bold; }
  ul,ol { margin-bottom:1em; padding-left:20px; }
  table { width:100%; border-collapse:collapse; margin-bottom:1em; table-layout:fixed; }
  table,th,td { border:1px solid black; }
  th,td { padding:2px 6px; text-align:left; }
  table[data-borderless="true"],
  table[data-borderless="true"] th,
  table[data-borderless="true"] td {
    border:none !important;
  }
  table[data-table-align="center"] { margin-left:auto; margin-right:auto; width:auto; }
  table[data-table-align="right"] { margin-left:auto; margin-right:0; width:auto; }
  th p, td p { margin:0; }
  .avoid-break { page-break-inside: avoid; }
  html, body { width: ${dim.width}mm; margin:0 auto; background:white; }
  .page { padding: 0; }
  .page-header { padding: 40px 40px 0 40px; }
  .page-body { padding: ${mt}mm ${mr} ${mb} ${ml}; }
  ${cssStyles}
</style>
</head>
<body>${innerHtml}</body>
</html>`;
};

/**
 * Render template HTML with dummy or real student data for editor preview.
 * Does NOT require a saved template — takes raw HTML content.
 * Uses the exact same rendering pipeline as PDF generation (kop surat, CSS, etc.)
 * @param {string} htmlContent - Raw template HTML
 * @param {string} cssStyles - Optional custom CSS
 * @param {Object} options
 * @param {string} [options.studentId] - Optional student ID for real data
 * @param {Object} [options.customData] - Sample values for custom variables
 * @param {string} [options.pageSize] - Page size: A4, F4, LETTER (default A4)
 * @returns {Promise<Object>} - Rendered HTML, page dimensions, and variable info
 */
const previewEditorHtml = async (htmlContent, cssStyles = '', options = {}) => {
  const settings = await prisma.setting.findUnique({ where: { id: 'global_settings' } });

  const margins = {
    marginTop: options.marginTop ?? 25,
    marginRight: options.marginRight ?? 25,
    marginBottom: options.marginBottom ?? 25,
    marginLeft: options.marginLeft ?? 30,
  };

  // Build header (kop surat) — identical to processGeneration
  let headerHtml = '';
  const useGlobal = settings && settings.useGlobalHeader;
  const config = useGlobal ? {
    enabled: true,
    headerContentHtml: settings.headerContentHtml,
    logoLeft: settings.headerLogoLeft,
    logoRight: settings.headerLogoRight,
  } : null;

  if (config && config.enabled) {
    const getBase64Image = (imagePath) => {
      if (!imagePath) return '';
      try {
        const fullPath = path.join(__dirname, '../../../../public', imagePath);
        if (fs.existsSync(fullPath)) {
          const ext = path.extname(fullPath).toLowerCase().replace('.', '');
          const base64Data = fs.readFileSync(fullPath, { encoding: 'base64' });
          return `data:image/${ext || 'png'};base64,${base64Data}`;
        }
      } catch (e) { /* ignore */ }
      return '';
    };
    const logoLeftBase64 = getBase64Image(config.logoLeft);
    const logoRightBase64 = getBase64Image(config.logoRight);
    const logoSize = settings.logoSize || 80;
    const logoMarginTop = settings.logoMarginTop || 0;
    const logoPaddingX = settings.logoPaddingX || 0;

    const contentInner = `<div style="position:absolute;left:${logoPaddingX}px;top:calc(50% + ${logoMarginTop}px);transform:translateY(-50%);width:${logoSize}px;text-align:center;z-index:1;">${logoLeftBase64 ? `<img src="${logoLeftBase64}" style="max-width:100%;max-height:${logoSize}px;width:100%;object-fit:contain;" />` : ''}</div><div class="kop-surat-content" style="padding:0 10px;text-align:center;position:relative;z-index:2;">${config.headerContentHtml || ''}</div><div style="position:absolute;right:${logoPaddingX}px;top:calc(50% + ${logoMarginTop}px);transform:translateY(-50%);width:${logoSize}px;text-align:center;z-index:1;">${logoRightBase64 ? `<img src="${logoRightBase64}" style="max-width:100%;max-height:${logoSize}px;width:100%;object-fit:contain;" />` : ''}</div>`;

    const linePosition = settings.headerLinePosition || 'bottom';
    const linePadding = settings.headerLinePadding ?? 15;
    const lineHtml = buildHeaderLineHtml(settings);

    let contentDiv;
    if (lineHtml) {
      const contentPad = linePadding > 0 ? (linePosition === 'bottom' ? `padding-bottom:${linePadding}px;` : `padding-top:${linePadding}px;`) : '';
      contentDiv = `<div style="position:relative;min-height:${logoSize}px;${contentPad}">${contentInner}</div>`;
      const lineOffset = linePadding < 0
        ? (linePosition === 'bottom' ? `bottom:${-linePadding}px;` : `top:${-linePadding}px;`)
        : (linePosition === 'bottom' ? 'bottom:0;' : 'top:0;');
      headerHtml = `<div style="position:relative;margin-bottom:20px;">${contentDiv}<div style="position:absolute;left:0;right:0;${lineOffset}pointer-events:none;z-index:5;">${lineHtml}</div></div>`;
    } else {
      contentDiv = `<div style="position:relative;min-height:${logoSize}px;">${contentInner}</div>`;
      headerHtml = contentDiv;
    }
  }

  // Build template data
  let templateData;

  if (options.studentId) {
    const student = await prisma.student.findUnique({ where: { id: options.studentId } });
    if (student) {
      const teacherData = await mapTeacherVariables(options.teacherId);
      templateData = { ...teacherData, ...mapStudentVariables(student, options.customData || {}) };
    }
  }

  if (!templateData) {
    const varRegex = /\{\{([^#\/>][^}]+)\}\}/g;
    const detected = [...new Set([...htmlContent.matchAll(varRegex)].map(m => m[1].trim()))];
    const dummyData = {};
    const date = new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
    for (const v of detected) {
      const clean = v.replace(/^#|^\//, '').trim();
      if (clean in dummyData) continue;
      if (clean === 'tanggal_surat') { dummyData[clean] = date; continue; }
      if (clean === 'nama_siswa') { dummyData[clean] = 'Nama Siswa'; continue; }
      if (clean === 'nisn') { dummyData[clean] = '1234567890'; continue; }
      if (clean === 'kelas') { dummyData[clean] = 'XI-IPA-1'; continue; }
      if (clean === 'jenis_kelamin') { dummyData[clean] = 'Laki-laki'; continue; }
      if (clean === 'nama_orang_tua') { dummyData[clean] = 'Nama Orang Tua'; continue; }
      if (clean === 'no_hp_ortu') { dummyData[clean] = '081234567890'; continue; }
      if (clean === 'alamat') { dummyData[clean] = 'Jl. Contoh No. 123, Medan'; continue; }
      if (clean === 'email') { dummyData[clean] = 'email@contoh.com'; continue; }
      if (clean === 'nip') { dummyData[clean] = '197001012000121001'; continue; }
      if (clean === 'nama_kepala_sekolah') { dummyData[clean] = 'Drs. H. Kepala Sekolah, M.Pd.'; continue; }
      if (clean === 'jabatan') { dummyData[clean] = 'Kepala SMA Negeri 19 Medan'; continue; }
      if (clean === 'asal_sekolah') { dummyData[clean] = 'SMA Negeri 19 Medan'; continue; }
      if (clean === 'no_telepon') { dummyData[clean] = '(061) 1234567'; continue; }
      if (clean === 'nama_guru') { dummyData[clean] = 'Drs. H. Ahmad S.Pd., M.Pd.'; continue; }
      if (clean === 'pangkat') { dummyData[clean] = 'Pembina, IV/a'; continue; }
      if (clean === 'mapel') { dummyData[clean] = 'Matematika'; continue; }
      if (clean === 'nuptk') { dummyData[clean] = '1234567890123456'; continue; }
      if (clean === 'status_pegawai') { dummyData[clean] = 'PNS'; continue; }
      if (clean === 'pendidikan') { dummyData[clean] = 'S2 Pendidikan Matematika'; continue; }
      if (clean === 'tempat_lahir') { dummyData[clean] = 'Medan'; continue; }
      if (clean === 'tanggal_lahir') { dummyData[clean] = '15 Januari 1980'; continue; }
      if (clean === 'no_telp') { dummyData[clean] = '081276543210'; continue; }
      if (clean === 'email_guru') { dummyData[clean] = 'guru@sekolah.sch.id'; continue; }
      if (clean === 'alamat_guru') { dummyData[clean] = 'Jl. Pendidikan No. 1, Medan'; continue; }
      if (clean === 'jenis_kelamin_guru') { dummyData[clean] = 'Laki-laki'; continue; }
      dummyData[clean] = `[${clean.replace(/_/g, ' ')}]`;
    }
    const rankingDummy = [
      { kelas_program: 'X-1 IPA', semester: '1', peringkat_siswa: '1 / 36', tahun_pelajaran: '2023/2024' },
      { kelas_program: 'XI-2 IPA', semester: '3', peringkat_siswa: '3 / 37', tahun_pelajaran: '2024/2025' },
      { kelas_program: 'XII-1 IPS', semester: '3', peringkat_siswa: '5 / 35', tahun_pelajaran: '2024/2025' },
      { kelas_program: 'XI-1 IPA', semester: '1', peringkat_siswa: '2 / 36', tahun_pelajaran: '2024/2025' },
      { kelas_program: 'XII-2 IPA', semester: '4', peringkat_siswa: '7 / 34', tahun_pelajaran: '2025/2026' },
    ];

    const standardDummy = {
      nisn: '1234567890', nama_siswa: 'Nama Siswa', kelas: 'XI-IPA-1',
      jenis_kelamin: 'Laki-laki', nama_orang_tua: 'Nama Orang Tua',
      no_hp_ortu: '081234567890', alamat: 'Jl. Contoh No. 123, Medan',
      email: 'email@contoh.com', tanggal_surat: date,
      nama_guru: 'Drs. H. Ahmad S.Pd., M.Pd.', nip: '197001012000121001',
      jabatan: 'Kepala SMA Negeri 19 Medan', pangkat: 'Pembina, IV/a',
      mapel: 'Matematika', nuptk: '1234567890123456',
      status_pegawai: 'PNS', pendidikan: 'S2 Pendidikan Matematika',
      tempat_lahir: 'Medan', tanggal_lahir: '15 Januari 1980',
      no_telp: '081276543210', email_guru: 'guru@sekolah.sch.id',
      alamat_guru: 'Jl. Pendidikan No. 1, Medan', jenis_kelamin_guru: 'Laki-laki',
      ranking: rankingDummy,
    };
    templateData = { ...options.customData, ...dummyData, ...standardDummy };
  }

  // Compile and render
  const fixedHtml = fixTemplateSyntax(htmlContent);
  const compiled = handlebars.compile(fixedHtml);
  let renderedBody;
  try {
    renderedBody = compiled(templateData);
  } catch (renderErr) {
    throw new Error(`Gagal me-render preview: ${renderErr.message}`);
  }

  const pageSize = (options.pageSize || 'A4').toUpperCase();
  const dim = PAGE_DIMENSIONS[pageSize] || PAGE_DIMENSIONS.A4;

  // Use shared buildPageHtml for pixel-perfect consistency with PDF
  const signatureHtml = buildSignatureHtml(settings);
  const pageBody = `<div class="page-body"><div class="content">${renderedBody}</div>${signatureHtml}</div>`;
  const innerHtml = `<div class="page">${headerHtml ? `<div class="page-header">${headerHtml}</div>` : ''}${pageBody}</div>`;
  const fullHtml = buildPageHtml(innerHtml, cssStyles, dim, margins);

  return {
    html: fullHtml,
    pageWidth: dim.width,
    pageHeight: dim.height,
    pageSize: dim.label,
  };
};

module.exports = {
  queueGeneration,
  getLogs,
  deleteLog,
  generatePreview,
  previewEditorHtml,
};
