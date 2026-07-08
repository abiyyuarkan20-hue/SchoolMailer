const prisma = require('../../config/database');
const handlebars = require('handlebars');

/**
 * Auto-fix common Handlebars syntax errors in template HTML.
 */
const fixTemplateSyntax = (html) => {
  let result = html;
  result = result.replace(/\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}(?!\})/g, '{{$1}}');
  result = result.replace(/\{\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}(?!\})/g, '{{{$1}}}');
  return result;
};

/**
 * Validate Handlebars syntax, throws on error
 */
const validateHandlebars = (htmlContent) => {
  try {
    handlebars.compile(fixTemplateSyntax(htmlContent));
  } catch (e) {
    throw new Error(`Syntax error pada template: ${e.message}`);
  }
};

const extractVariables = (htmlContent) => {
  const regex = /\{\{([^}]+)\}\}/g;
  const matches = [...htmlContent.matchAll(regex)];
  const raw = [...new Set(matches.map(m => m[1].trim()))];

  const regularVars = raw.filter(v => {
    if (v.startsWith('#') || v.startsWith('/')) return false;
    if (v === 'else' || v === 'this') return false;
    if (v.includes(' ') || v.includes('(')) return false;
    return true;
  });

  const eachTargets = raw
    .filter(v => v.startsWith('#each '))
    .map(v => v.replace('#each ', '').trim())
    .filter(v => v && !v.includes(' '));

  return [...new Set([...regularVars, ...eachTargets])];
};

// Peta untuk menormalisasi letterType dari frontend ke Prisma Enum
const LETTER_TYPE_MAP = {
  'Panggilan Orang Tua': 'PARENT_SUMMON',
  'Surat Edaran': 'CIRCULAR',
  'Surat Keterangan': 'CERTIFICATE',
  'Surat Izin': 'PERMISSION',
  'Surat Rekomendasi': 'RECOMMENDATION',
  'Lainnya': 'CUSTOM',
  // Enum values map to themselves
  'PARENT_SUMMON': 'PARENT_SUMMON',
  'CIRCULAR': 'CIRCULAR',
  'CERTIFICATE': 'CERTIFICATE',
  'PERMISSION': 'PERMISSION',
  'RECOMMENDATION': 'RECOMMENDATION',
  'CUSTOM': 'CUSTOM',
};

const normalizeLetterType = (type) => LETTER_TYPE_MAP[type] || 'CUSTOM';

const createTemplate = async (data, userId) => {
  const fixedHtml = fixTemplateSyntax(data.htmlContent);
  validateHandlebars(fixedHtml);
  const variables = extractVariables(fixedHtml);
  
  return await prisma.template.create({
    data: {
      title: data.title,
      description: data.description || null,
      letterType: normalizeLetterType(data.letterType),
      htmlContent: fixedHtml,
      variables: variables,
      pageSize: data.pageSize || 'A4',
      marginTop: data.marginTop ?? 25,
      marginRight: data.marginRight ?? 25,
      marginBottom: data.marginBottom ?? 25,
      marginLeft: data.marginLeft ?? 30,
      headerConfig: data.headerConfig || null,
      createdBy: userId,
    }
  });
};

const getAllTemplates = async (filters = {}) => {
  const where = { isActive: true };
  
  if (filters.search) {
    where.title = { contains: filters.search, mode: 'insensitive' };
  }
  if (filters.letterType) {
    where.letterType = normalizeLetterType(filters.letterType);
  }

  return await prisma.template.findMany({
    where,
    orderBy: { updatedAt: 'desc' }
  });
};

const getTemplateById = async (id) => {
  const template = await prisma.template.findFirst({
    where: { id, isActive: true }
  });

  if (!template) {
    const error = new Error('Template tidak ditemukan');
    error.statusCode = 404;
    throw error;
  }

  return template;
};

const updateTemplate = async (id, data) => {
  await getTemplateById(id);

  const updateData = { ...data };
  if (updateData.htmlContent) {
    const fixedHtml = fixTemplateSyntax(updateData.htmlContent);
    validateHandlebars(fixedHtml);
    updateData.htmlContent = fixedHtml;
    updateData.variables = extractVariables(fixedHtml);
  }
  if (updateData.letterType) updateData.letterType = normalizeLetterType(updateData.letterType);
  if (updateData.description === '' || updateData.description === undefined) updateData.description = null;
  if (updateData.cssStyles === undefined) updateData.cssStyles = null;

  Object.keys(updateData).forEach(k => {
    if (updateData[k] === undefined) delete updateData[k];
  });

  return await prisma.template.update({
    where: { id },
    data: updateData
  });
};

const deleteTemplate = async (id) => {
  await getTemplateById(id);
  
  return await prisma.template.update({
    where: { id },
    data: { isActive: false }
  });
};

module.exports = {
  createTemplate,
  getAllTemplates,
  getTemplateById,
  updateTemplate,
  deleteTemplate,
};
