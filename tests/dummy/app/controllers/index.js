import Controller from '@ember/controller';

export default Controller.extend({
  queryParams: ['aa', 'bb', { 'cc': 'cc-alias' }]
});
