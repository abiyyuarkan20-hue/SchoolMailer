import { Table } from '@tiptap/extension-table';
import { NodeSelection } from 'prosemirror-state';
import { Plugin, PluginKey } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';

const findTablePos = (selection) => {
  const { $from } = selection;
  for (let d = $from.depth; d > 0; d--) {
    if ($from.node(d).type.name === 'table') {
      return $from.before(d);
    }
  }
  if (selection instanceof NodeSelection && selection.node.type.name === 'table') {
    return selection.from;
  }
  return null;
};

const selectTableAtPos = (view, event) => {
  const coords = { left: event.clientX, top: event.clientY };
  const pos = view.posAtCoords(coords);
  if (!pos) return false;
  const $pos = view.state.doc.resolve(pos.pos);
  for (let d = $pos.depth; d > 0; d--) {
    if ($pos.node(d).type.name === 'table') {
      const tablePos = $pos.before(d);
      view.dispatch(
        view.state.tr.setSelection(NodeSelection.create(view.state.doc, tablePos))
      );
      return true;
    }
  }
  return false;
};

const setNodeMarkupSafe = (tr, pos, type, attrs) => {
  try {
    return tr.setNodeMarkup(pos, type, attrs);
  } catch {
    return tr;
  }
};

const syncTableAttrs = (view) => {
  if (!view?.dom) return;
  const tables = view.dom.querySelectorAll('table');
  tables.forEach((table) => {
    const pos = view.posAtDOM(table, 0);
    if (pos === null || pos === undefined) return;
    const resolved = view.state.doc.resolve(pos);
    for (let d = resolved.depth; d > 0; d--) {
      if (resolved.node(d).type.name === 'table') {
        const node = resolved.node(d);
        if (node.attrs.borderless) {
          table.setAttribute('data-borderless', 'true');
        } else {
          table.removeAttribute('data-borderless');
        }
        const align = node.attrs.tableAlign;
        if (align && align !== 'left') {
          table.setAttribute('data-table-align', align);
        } else {
          table.removeAttribute('data-table-align');
        }
        break;
      }
    }
  });
};

export const TableBorder = Table.extend({
  addAttributes() {
    return {
      ...(this.parent?.() || {}),
      borderless: {
        default: false,
        parseHTML: element => element.getAttribute('data-borderless') === 'true',
        renderHTML: attributes => ({
          'data-borderless': attributes.borderless ? 'true' : null,
        }),
      },
      tableAlign: {
        default: 'left',
        parseHTML: element => element.getAttribute('data-table-align') || 'left',
        renderHTML: attributes => ({
          'data-table-align': attributes.tableAlign !== 'left' ? attributes.tableAlign : null,
        }),
      },
    };
  },

  addProseMirrorPlugins() {
    const parentPlugins = this.parent?.() || [];

    const attrPlugin = new Plugin({
      key: new PluginKey('table-attr-sync'),
      view: () => ({
        update: (view) => {
          syncTableAttrs(view);
        },
      }),
    });

    let visibleHandle = null;

    const dragPlugin = new Plugin({
      key: new PluginKey('table-drag'),
      props: {
        decorations(state) {
          const decos = [];
          state.doc.descendants((node, pos) => {
            if (node.type.name === 'table') {
              decos.push(
                Decoration.widget(pos, () => {
                  const handle = document.createElement('div');
                  handle.className = 'table-drag-handle';
                  handle.draggable = true;
                  handle.contentEditable = false;
                  handle.textContent = '⠿';
                  return handle;
                }, { side: -1 })
              );
            }
          });
          return DecorationSet.create(state.doc, decos);
        },
        handleDOMEvents: {
          mousedown: (view, event) => {
            if (!event.target.closest('.table-drag-handle')) return false;
            event.preventDefault();
            return true;
          },
          click: (view, event) => {
            if (!event.target.closest('.table-drag-handle')) return false;
            selectTableAtPos(view, event);
            return true;
          },
          dragstart: (view, event) => {
            if (!event.target.closest('.table-drag-handle')) return false;
            const { state } = view;
            const isTableSelected = state.selection instanceof NodeSelection
              && state.selection.node.type.name === 'table';
            if (!isTableSelected) {
              selectTableAtPos(view, event);
            }
            return false;
          },
          mouseover: (view, event) => {
            const target = event.target;
            const handle = target.closest('.table-drag-handle');
            const table = target.closest('.ProseMirror table');
            let next = null;
            if (table) {
              const prev = table.previousElementSibling;
              if (prev && prev.classList.contains('table-drag-handle')) {
                next = prev;
              }
            } else if (handle) {
              next = handle;
            }
            if (next !== visibleHandle) {
              if (visibleHandle) visibleHandle.classList.remove('table-drag-handle-visible');
              if (next) next.classList.add('table-drag-handle-visible');
              visibleHandle = next;
            }
            return false;
          },
        },
      },
    });

    return [...parentPlugins, attrPlugin, dragPlugin];
  },

  addCommands() {
    return {
      ...(this.parent?.() || {}),

      toggleTableBorders:
        () =>
        ({ state, dispatch }) => {
          const tablePos = findTablePos(state.selection);
          if (tablePos === null) return false;

          const tableNode = state.doc.nodeAt(tablePos);
          if (!tableNode) return false;

          const current = tableNode.attrs.borderless || false;
          const newAttrs = { ...tableNode.attrs, borderless: !current };
          const tr = state.tr.setNodeMarkup(tablePos, null, newAttrs);
          if (dispatch) dispatch(tr);
          return true;
        },

      selectTable:
        () =>
        ({ state, dispatch }) => {
          const tablePos = findTablePos(state.selection);
          if (tablePos === null) return false;

          const tr = state.tr.setSelection(
            NodeSelection.create(state.doc, tablePos)
          );
          if (dispatch) dispatch(tr);
          return true;
        },

      setTableAlign:
        (alignment) =>
        ({ state, dispatch }) => {
          const tablePos = findTablePos(state.selection);
          if (tablePos === null) return false;

          const tableNode = state.doc.nodeAt(tablePos);
          if (!tableNode) return false;

          let tr = state.tr;
          let modified = false;

          tableNode.descendants((node, pos) => {
            if (node.type.name === 'paragraph' || node.type.name === 'heading') {
              const absPos = tablePos + 1 + pos;
              const newAttrs = { ...node.attrs, textAlign: alignment === 'default' ? null : alignment };
              tr = setNodeMarkupSafe(tr, absPos, null, newAttrs);
              modified = true;
            }
          });

          if (modified && dispatch) dispatch(tr);
          return modified;
        },

      setTablePosition:
        (position) =>
        ({ state, dispatch }) => {
          const tablePos = findTablePos(state.selection);
          if (tablePos === null) return false;

          const tableNode = state.doc.nodeAt(tablePos);
          if (!tableNode) return false;

          const newAttrs = { ...tableNode.attrs, tableAlign: position };
          const tr = state.tr.setNodeMarkup(tablePos, null, newAttrs);
          if (dispatch) dispatch(tr);
          return true;
        },
    };
  },
});
