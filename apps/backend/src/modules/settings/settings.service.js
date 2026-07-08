const prisma = require('../../config/database');

const getSettings = async () => {
  let settings = await prisma.setting.findUnique({
    where: { id: 'global_settings' }
  });
  if (!settings) {
    settings = await prisma.setting.create({
      data: { id: 'global_settings' }
    });
  }
  return settings;
};

const updateSettings = async (data) => {
  return await prisma.setting.upsert({
    where: { id: 'global_settings' },
    update: data,
    create: {
      id: 'global_settings',
      ...data
    }
  });
};

/**
 * Get custom variables array from Setting model
 * @returns {Promise<string[]>} Array of custom variable names
 */
const getCustomVariables = async () => {
  const settings = await getSettings();
  return settings.customVariables || [];
};

/**
 * Update custom variables array in Setting model
 * @param {string[]} customVariables - Array of custom variable names
 * @returns {Promise<Object>} Updated settings object
 */
const updateCustomVariables = async (customVariables) => {
  return await prisma.setting.upsert({
    where: { id: 'global_settings' },
    update: { customVariables },
    create: {
      id: 'global_settings',
      customVariables
    }
  });
};

module.exports = {
  getSettings,
  updateSettings,
  getCustomVariables,
  updateCustomVariables
};
