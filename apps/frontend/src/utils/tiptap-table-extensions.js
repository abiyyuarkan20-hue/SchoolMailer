import { Table } from '@tiptap/extension-table';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { mergeAttributes } from '@tiptap/core';

export const CustomTableCell = TableCell.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      verticalAlign: {
        default: null,
        parseHTML: element => element.style.verticalAlign || null,
        renderHTML: attributes => {
          if (!attributes.verticalAlign) {
            return {};
          }
          return { style: `vertical-align: ${attributes.verticalAlign}` };
        },
      },
    };
  },
});

export const CustomTableHeader = TableHeader.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      verticalAlign: {
        default: null,
        parseHTML: element => element.style.verticalAlign || null,
        renderHTML: attributes => {
          if (!attributes.verticalAlign) {
            return {};
          }
          return { style: `vertical-align: ${attributes.verticalAlign}` };
        },
      },
    };
  },
});

export const CustomTable = Table.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      position: {
        default: 'relative',
        parseHTML: element => element.style.position || 'relative',
        renderHTML: attributes => {
          if (attributes.position === 'absolute') {
            return {
              style: `position: absolute; left: ${attributes.left || 0}px; top: ${attributes.top || 0}px; z-index: 10;`,
              'data-position': 'absolute',
            };
          }
          return { style: 'position: relative;' };
        },
      },
      left: {
        default: 0,
        parseHTML: element => parseInt(element.style.left) || 0,
      },
      top: {
        default: 0,
        parseHTML: element => parseInt(element.style.top) || 0,
      },
    };
  },
});
