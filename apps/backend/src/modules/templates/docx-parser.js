const AdmZip = require('adm-zip');
const { XMLParser } = require('fast-xml-parser');

class DocxParser {
  constructor(buffer) {
    this.zip = new AdmZip(buffer);
    this.rels = {};
    this.media = {};
    this.html = '';
    this.warnings = [];
  }

  parse() {
    this.parseRels();
    this.extractMedia();

    const docEntry = this.zip.getEntry('word/document.xml');
    if (!docEntry) throw new Error('File DOCX tidak valid: document.xml tidak ditemukan');

    const parser = new XMLParser({
      preserveOrder: true,
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      textNodeName: '#text',
    });
    
    let parsed;
    try {
      parsed = parser.parse(this.zip.readAsText(docEntry));
    } catch (e) {
      throw new Error(`Gagal membaca XML: ${e.message}`);
    }
    
    // Find w:document > w:body
    const documentNode = parsed.find(n => n['w:document']);
    if (documentNode) {
      const bodyNode = documentNode['w:document'].find(n => n['w:body']);
      if (bodyNode) {
        this.html = this.parseBody(bodyNode['w:body']);
      }
    }
    
    return {
      html: this.html,
      warnings: this.warnings
    };
  }

  parseRels() {
    const entry = this.zip.getEntry('word/_rels/document.xml.rels');
    if (!entry) return;
    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
    const parsed = parser.parse(this.zip.readAsText(entry));
    const rels = parsed.Relationships?.Relationship || [];
    const relArr = Array.isArray(rels) ? rels : [rels];
    relArr.forEach(r => {
      this.rels[r['@_Id']] = r['@_Target'];
    });
  }

  extractMedia() {
    this.zip.getEntries().forEach(entry => {
      if (entry.entryName.startsWith('word/media/')) {
        const ext = entry.entryName.split('.').pop().toLowerCase();
        let mime = 'image/png';
        if (ext === 'jpg' || ext === 'jpeg') mime = 'image/jpeg';
        else if (ext === 'gif') mime = 'image/gif';
        else if (ext === 'svg') mime = 'image/svg+xml';
        
        const b64 = entry.getData().toString('base64');
        this.media[entry.entryName.replace('word/', '')] = `data:${mime};base64,${b64}`;
      }
    });
  }

  parseBody(elements) {
    return elements.map(el => this.parseElement(el)).filter(html => html).join('\n');
  }

  parseElement(el) {
    if (el['w:p']) return this.parseParagraph(el['w:p']);
    if (el['w:tbl']) return this.parseTable(el['w:tbl']);
    // if inside a structured document tag, parse its content
    if (el['w:sdt']) {
      const sdtContent = el['w:sdt'].find(e => e['w:sdtContent']);
      if (sdtContent) {
        return sdtContent['w:sdtContent'].map(e => this.parseElement(e)).join('\n');
      }
    }
    return '';
  }

  parseParagraph(pElements) {
    let pStyle = '';
    let jc = '';
    
    const pPr = pElements.find(e => e['w:pPr']);
    if (pPr) {
      const jcNode = pPr['w:pPr'].find(e => e['w:jc']);
      if (jcNode) {
        jc = jcNode[':@']?.['@_w:val'] || '';
        if (jc === 'both') jc = 'justify';
      }
    }
    
    if (jc) pStyle += `text-align: ${jc};`;
    
    let innerHtml = pElements.map(e => this.parseRun(e)).join('');
    
    // Fallback for empty paragraphs
    if (!innerHtml || innerHtml.trim() === '') innerHtml = '<br/>';

    return `<p style="${pStyle}">${innerHtml}</p>`;
  }

  parseRun(el) {
    if (el['w:r']) {
      let rStyle = '';
      let isBold = false;
      let isItalic = false;
      let isUnderline = false;
      
      const rPr = el['w:r'].find(e => e['w:rPr']);
      if (rPr) {
        const prElems = rPr['w:rPr'];
        if (prElems.find(e => e['w:b'])) isBold = true;
        if (prElems.find(e => e['w:i'])) isItalic = true;
        if (prElems.find(e => e['w:u'])) isUnderline = true;
        
        const color = prElems.find(e => e['w:color']);
        if (color && color[':@']?.['@_w:val']) {
          const c = color[':@']['@_w:val'];
          if (c !== 'auto') rStyle += `color: #${c};`;
        }
        
        const sz = prElems.find(e => e['w:sz']);
        if (sz && sz[':@']?.['@_w:val']) {
          const pt = parseInt(sz[':@']['@_w:val']) / 2;
          rStyle += `font-size: ${pt}pt;`;
        }

        const rFonts = prElems.find(e => e['w:rFonts']);
        if (rFonts && rFonts[':@']?.['@_w:ascii']) {
           rStyle += `font-family: '${rFonts[':@']['@_w:ascii']}';`;
        }
      }

      let htmlParts = [];
      const traverseNodes = (nodes) => {
        nodes.forEach(e => {
            if (e['w:t']) {
               let tText = '';
               const tElems = Array.isArray(e['w:t']) ? e['w:t'] : [e['w:t']];
               tElems.forEach(t => {
                   if (typeof t === 'object') tText += (t['#text'] || '');
                   else tText += t;
               });
               htmlParts.push(this.escapeHtml(tText));
            }
            if (e['w:tab']) htmlParts.push('&nbsp;&nbsp;&nbsp;&nbsp;');
            if (e['w:br']) htmlParts.push('<br/>');
            if (e['w:drawing']) htmlParts.push(this.parseDrawing(e['w:drawing']));
            if (e['w:pict']) htmlParts.push(this.parseDrawing(e['w:pict']));
        });
      };
      
      traverseNodes(el['w:r']);
      let text = htmlParts.join('');

      if (!text) return '';

      if (isBold) text = `<strong>${text}</strong>`;
      if (isItalic) text = `<em>${text}</em>`;
      if (isUnderline) text = `<u>${text}</u>`;
      
      if (rStyle) {
        return `<span style="${rStyle}">${text}</span>`;
      }
      return text;
    }
    
    // Handle hyperlinks
    if (el['w:hyperlink']) {
        return el['w:hyperlink'].map(e => this.parseRun(e)).join('');
    }
    
    return '';
  }

  parseDrawing(drawingElements) {
    let blipId = null;
    let width = 'auto';
    let height = 'auto';

    const findBlip = (nodes) => {
      for (const node of nodes) {
        if (node['a:blip']) {
           blipId = node['a:blip'][0]?.[':@']?.['@_r:embed'];
           break;
        }
        if (node['v:imagedata']) {
           blipId = node['v:imagedata'][0]?.[':@']?.['@_r:id'];
           break;
        }
        // deep search
        const values = Object.values(node).find(v => Array.isArray(v));
        if (values) findBlip(values);
      }
    };
    
    findBlip(drawingElements);

    // Approximate sizing (EMUs to px) - 9525 EMUs per px
    const wpExtent = drawingElements.flatMap(d => d['wp:inline'] || d['wp:anchor'] || [])
                                    .find(e => e['wp:extent']);
    if (wpExtent && wpExtent[':@']) {
       const cx = wpExtent[':@']['@_cx'];
       const cy = wpExtent[':@']['@_cy'];
       if (cx) width = `${Math.round(parseInt(cx) / 9525)}px`;
       if (cy) height = `${Math.round(parseInt(cy) / 9525)}px`;
    } else {
        // v:shape fallback (pict)
        const vShape = drawingElements.find(e => e['v:shape']);
        if (vShape && vShape[':@']?.['@_style']) {
            const style = vShape[':@']['@_style'];
            const wMatch = style.match(/width:([0-9.]+)pt/);
            const hMatch = style.match(/height:([0-9.]+)pt/);
            if (wMatch) width = `${Math.round(parseFloat(wMatch[1]) * 1.33)}px`;
            if (hMatch) height = `${Math.round(parseFloat(hMatch[1]) * 1.33)}px`;
        }
    }

    if (blipId && this.rels[blipId]) {
      const target = this.rels[blipId];
      const src = this.media[target];
      if (src) {
        return `<img src="${src}" style="width: ${width}; height: ${height}; max-width: 100%;" />`;
      }
    }
    return '';
  }

  getBorderVal(borderEl) {
    const key = Object.keys(borderEl)[0];
    const children = borderEl[key];
    if (!Array.isArray(children)) return null;
    for (const child of children) {
      if (child && child[':@'] && child[':@']['@_w:val']) {
        return child[':@']['@_w:val'];
      }
    }
    return null;
  }

  hasVisibleBorder(borders) {
    for (const b of borders) {
      const val = this.getBorderVal(b);
      if (val && val !== 'none' && val !== 'nil') return true;
    }
    return false;
  }

  parseTable(tblElements) {
    let hasBorder = false;
    const tblPr = tblElements.find(e => e['w:tblPr']);
    if (tblPr) {
      const tblBorders = tblPr['w:tblPr'].find(e => e['w:tblBorders']);
      if (tblBorders) {
        const borders = tblBorders['w:tblBorders'];
        if (this.hasVisibleBorder(borders)) hasBorder = true;
      }
    }

    let rows = tblElements.filter(e => e['w:tr']).map(e => this.parseRow(e['w:tr'], hasBorder));
    
    let tableStyle = 'width: 100%; border-collapse: collapse; margin-bottom: 1em;';
    if (!hasBorder) {
      tableStyle += ' border: none;';
    } else {
      tableStyle += ' border: 1px solid black;';
    }

    return `<table style="${tableStyle}">
      <tbody>
        ${rows.join('\n')}
      </tbody>
    </table>`;
  }

  parseRow(trElements, tableHasBorder) {
    let cells = trElements.filter(e => e['w:tc']).map(e => this.parseCell(e['w:tc'], tableHasBorder));
    return `<tr>${cells.join('\n')}</tr>`;
  }

  parseCell(tcElements, tableHasBorder) {
    let html = tcElements.map(e => this.parseElement(e)).filter(h => h).join('');
    
    let colspan = 1;
    let hasCellBorder = tableHasBorder;
    
    const tcPr = tcElements.find(e => e['w:tcPr']);
    let vAlignStyle = '';
    
    if (tcPr) {
        const gridSpan = tcPr['w:tcPr'].find(e => e['w:gridSpan']);
        if (gridSpan && gridSpan[':@']?.['@_w:val']) {
            colspan = gridSpan[':@']['@_w:val'];
        }
        
        const tcBorders = tcPr['w:tcPr'].find(e => e['w:tcBorders']);
        if (tcBorders) {
           const borders = tcBorders['w:tcBorders'];
           hasCellBorder = this.hasVisibleBorder(borders);
        }

        const vAlign = tcPr['w:tcPr'].find(e => e['w:vAlign']);
        if (vAlign && vAlign[':@']?.['@_w:val']) {
            const val = vAlign[':@']['@_w:val'];
            if (val === 'center') vAlignStyle = ' vertical-align: middle;';
            if (val === 'bottom') vAlignStyle = ' vertical-align: bottom;';
        }
    }

    let tcStyle = 'padding: 4px 8px;';
    if (hasCellBorder) {
       tcStyle += ' border: 1px solid black;';
    } else {
       tcStyle += ' border: none;';
    }
    tcStyle += vAlignStyle;

    let attr = `style="${tcStyle}"`;
    if (colspan > 1) attr += ` colspan="${colspan}"`;
    return `<td ${attr}>${html}</td>`;
  }

  escapeHtml(text) {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}

const parseDocx = (buffer) => {
  const parser = new DocxParser(buffer);
  return parser.parse();
};

module.exports = { parseDocx, DocxParser };
