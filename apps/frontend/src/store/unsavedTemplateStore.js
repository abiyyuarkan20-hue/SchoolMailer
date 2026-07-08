const STORAGE_KEY = 'schoolmailer_unsaved_templates';

const unsavedTemplateStore = {
  getAll: () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  save: (data) => {
    try {
      const drafts = unsavedTemplateStore.getAll();
      const draftId = data.draftId || 'unsaved-new';
      const existingIndex = drafts.findIndex(d => d.draftId === draftId);
      const entry = { ...data, draftId, savedAt: Date.now() };
      if (existingIndex >= 0) {
        drafts[existingIndex] = entry;
      } else {
        drafts.push(entry);
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
    } catch {}
  },

  get: (draftId) => {
    const drafts = unsavedTemplateStore.getAll();
    return drafts.find(d => d.draftId === draftId) || null;
  },

  remove: (draftId) => {
    try {
      const drafts = unsavedTemplateStore.getAll().filter(d => d.draftId !== draftId);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
    } catch {}
  },

  clear: () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  },

  getCount: () => {
    return unsavedTemplateStore.getAll().length;
  },
};

export default unsavedTemplateStore;
