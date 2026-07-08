import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { Extension } from '@tiptap/core';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';

const rowResizeKey = new PluginKey('tableRowResize');

function createRowResizePlugin() {
  let dragging = null;

  return new Plugin({
    key: rowResizeKey,

    props: {
      decorations(state) {
        const { doc } = state;
        const decorations = [];

        doc.descendants((node, pos) => {
          if (node.type.name === 'table') {
            // Find all rows in this table
            node.forEach((row, rowOffset, rowIndex) => {
              if (row.type.name === 'tableRow') {
                const rowStart = pos + 1 + rowOffset;
                const rowEnd = rowStart + row.nodeSize;
                // Add a widget decoration at the end of each row
                decorations.push(
                  Decoration.widget(rowEnd, (view) => {
                    const handle = document.createElement('div');
                    handle.className = 'row-resize-handle';
                    handle.dataset.rowIndex = rowIndex;
                    handle.dataset.rowPos = rowStart;
                    return handle;
                  }, { side: -1, key: `row-resize-${rowIndex}-${rowStart}` })
                );
              }
            });
          }
        });

        return DecorationSet.create(doc, decorations);
      },

      handleDOMEvents: {
        mousedown(view, event) {
          const handle = event.target;
          if (!handle.classList || !handle.classList.contains('row-resize-handle')) {
            return false;
          }

          event.preventDefault();
          const rowPos = parseInt(handle.dataset.rowPos, 10);
          const startY = event.clientY;

          // Find the row node and get current height
          const rowNode = view.state.doc.nodeAt(rowPos);
          if (!rowNode) return false;

          // Get the DOM element for height measurement
          const rowDom = view.nodeDOM(rowPos);
          const startHeight = rowDom ? rowDom.offsetHeight : 30;

          dragging = { rowPos, startY, startHeight };

          const onMouseMove = (moveEvent) => {
            if (!dragging) return;
            const diff = moveEvent.clientY - dragging.startY;
            const newHeight = Math.max(10, dragging.startHeight + diff);

            // Apply height visually during drag
            const currentRowDom = view.nodeDOM(dragging.rowPos);
            if (currentRowDom) {
              currentRowDom.style.height = `${newHeight}px`;
              const cells = currentRowDom.querySelectorAll('td, th');
              cells.forEach(cell => {
                cell.style.height = `${newHeight}px`;
                cell.style.overflow = 'hidden';
              });
            }
          };

          const onMouseUp = (upEvent) => {
            if (!dragging) return;
            const diff = upEvent.clientY - dragging.startY;
            const newHeight = Math.max(10, dragging.startHeight + diff);

            // Apply the height as an attribute on all cells in the row via transaction
            const { state, dispatch } = view;
            const tr = state.tr;
            const rowNode = state.doc.nodeAt(dragging.rowPos);

            if (rowNode) {
              let cellOffset = 0;
              rowNode.forEach((cell, offset) => {
                const cellPos = dragging.rowPos + 1 + offset;
                tr.setNodeMarkup(cellPos, null, {
                  ...cell.attrs,
                  height: newHeight,
                });
              });
              dispatch(tr);
            }

            dragging = null;
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            document.body.style.cursor = '';
          };

          document.addEventListener('mousemove', onMouseMove);
          document.addEventListener('mouseup', onMouseUp);
          document.body.style.cursor = 'row-resize';

          return true;
        },
      },
    },
  });
}

// Extended TableCell with height attribute
export const CustomTableCell = TableCell.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      height: {
        default: null,
        parseHTML: element => {
          const height = element.style.height || element.getAttribute('height');
          return height ? parseInt(height, 10) : null;
        },
        renderHTML: attributes => {
          if (!attributes.height) {
            return {};
          }
          return {
            style: `height: ${attributes.height}px; overflow: hidden;`,
          };
        },
      },
    };
  },
});

// Extended TableHeader with height attribute
export const CustomTableHeader = TableHeader.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      height: {
        default: null,
        parseHTML: element => {
          const height = element.style.height || element.getAttribute('height');
          return height ? parseInt(height, 10) : null;
        },
        renderHTML: attributes => {
          if (!attributes.height) {
            return {};
          }
          return {
            style: `height: ${attributes.height}px; overflow: hidden;`,
          };
        },
      },
    };
  },
});

// Extension to register the plugin
export const TableRowResize = Extension.create({
  name: 'tableRowResize',

  addProseMirrorPlugins() {
    return [createRowResizePlugin()];
  },
});
