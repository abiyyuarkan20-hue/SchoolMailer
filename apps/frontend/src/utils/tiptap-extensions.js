import { Extension, Node, mergeAttributes } from '@tiptap/core';

export const FontSize = Extension.create({
  name: 'fontSize',

  addOptions() {
    return {
      types: ['textStyle'],
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: element => element.style.fontSize.replace(/['"]+/g, ''),
            renderHTML: attributes => {
              if (!attributes.fontSize) {
                return {};
              }

              return {
                style: `font-size: ${attributes.fontSize}`,
              };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setFontSize: fontSize => ({ chain }) => {
        return chain()
          .setMark('textStyle', { fontSize })
          .run();
      },
      unsetFontSize: () => ({ chain }) => {
        return chain()
          .setMark('textStyle', { fontSize: null })
          .removeEmptyTextStyle()
          .run();
      },
    };
  },
});

export const LineHeight = Extension.create({
  name: 'lineHeight',

  addOptions() {
    return {
      types: ['textStyle'],
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          lineHeight: {
            default: null,
            parseHTML: element => element.style.lineHeight || null,
            renderHTML: attributes => {
              if (!attributes.lineHeight) {
                return {};
              }

              return {
                style: `line-height: ${attributes.lineHeight};`,
              };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setLineHeight: lineHeight => ({ chain }) => {
        return chain()
          .setMark('textStyle', { lineHeight })
          .run();
      },
      unsetLineHeight: () => ({ chain }) => {
        return chain()
          .setMark('textStyle', { lineHeight: null })
          .removeEmptyTextStyle()
          .run();
      },
    };
  },
});

export const TabNode = Node.create({
  name: 'tab',
  group: 'inline',
  inline: true,
  selectable: false,
  atom: true,

  parseHTML() {
    return [
      {
        tag: 'span[data-tab]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, { 'data-tab': 'true', style: 'white-space: pre;' }), '\t'];
  },
});

export const NoSpacing = Extension.create({
  name: 'noSpacing',

  addGlobalAttributes() {
    return [
      {
        types: ['paragraph'],
        attributes: {
          noSpacing: {
            default: null,
            parseHTML: (element) => {
              const style = element.getAttribute('style') || '';
              const hasNoMargin = /margin\s*:\s*0/i.test(style)
                || /margin-top\s*:\s*0/i.test(style)
                || /margin-bottom\s*:\s*0/i.test(style);
              return hasNoMargin ? 'true' : null;
            },
            renderHTML: (attributes) => {
              if (!attributes.noSpacing) return {};
              return {
                style: 'margin:0 !important;padding:0 !important;line-height:1 !important;',
                'data-no-spacing': 'true',
              };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      toggleNoSpacing: () => ({ editor }) => {
        const { state, view } = editor;
        const { from, to } = state.selection;
        const paragraph = state.schema.nodes.paragraph;

        const positions = [];

        if (from === to) {
          const $pos = state.selection.$from;
          for (let d = $pos.depth; d > 0; d--) {
            const node = $pos.node(d);
            if (node.type === paragraph) {
              positions.push($pos.before(d));
              break;
            }
          }
        } else {
          state.doc.nodesBetween(from, to, (node, pos) => {
            if (node.type === paragraph) {
              positions.push(pos);
            }
          });
        }

        if (positions.length === 0) return false;

        const allActive = positions.every((pos) => {
          const node = state.doc.nodeAt(pos);
          return node && node.attrs.noSpacing === 'true';
        });

        const value = allActive ? null : 'true';

        const tr = state.tr;
        positions.forEach((pos) => {
          const node = state.doc.nodeAt(pos);
          if (node) {
            tr.setNodeMarkup(pos, undefined, {
              ...node.attrs,
              noSpacing: value,
            });
          }
        });

        view.dispatch(tr);
        return true;
      },
    };
  },
});

export const TabHandler = Extension.create({
  name: 'tabHandler',

  addKeyboardShortcuts() {
    return {
      Tab: ({ editor }) => {
        if (editor.isActive('listItem')) {
          return false;
        }

        if (editor.isActive('table')) {
          return false;
        }

        // Insert TabNode which will render as a true tab stop
        return editor.chain().focus().insertContent({
          type: 'tab',
        }).run();
      },
    };
  },
});
