module.exports = {
  description: '',

  normalizeEntityName() {
    // no-op
  },

  afterInstall() {
    return this.addAddonToProject('ember-fetch');
  }
};
