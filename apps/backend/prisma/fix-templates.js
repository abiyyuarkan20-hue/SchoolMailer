const { PrismaClient } = require('@prisma/client');
const handlebars = require('handlebars');

const prisma = new PrismaClient();

const fixTemplateSyntax = (html) => {
  let result = html;
  result = result.replace(/\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}(?!\})/g, '{{$1}}');
  result = result.replace(/\{\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}(?!\})/g, '{{{$1}}}');
  return result;
};

const extractVariables = (htmlContent) => {
  const regex = /\{\{([^}]+)\}\}/g;
  const matches = [...htmlContent.matchAll(regex)];
  const raw = [...new Set(matches.map(m => m[1].trim()))];
  return raw.filter(v => {
    if (v.startsWith('#') || v.startsWith('/')) return false;
    if (v === 'else' || v === 'this') return false;
    if (v.includes(' ') || v.includes('(')) return false;
    return true;
  });
};

async function main() {
  const templates = await prisma.template.findMany();
  let fixed = 0;

  for (const t of templates) {
    const fixedHtml = fixTemplateSyntax(t.htmlContent);
    const variables = extractVariables(fixedHtml);

    if (fixedHtml !== t.htmlContent) {
      console.log(`Memperbaiki template: "${t.title}" (${t.id})`);
      console.log(`  Variabel terdeteksi: ${variables.join(', ')}`);

      await prisma.template.update({
        where: { id: t.id },
        data: { htmlContent: fixedHtml, variables },
      });
      fixed++;
    }
  }

  console.log(`\nSelesai! ${fixed} template diperbaiki.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
