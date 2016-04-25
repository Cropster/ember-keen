import Ember from 'ember';

const { get } = Ember;

export default Ember.Mixin.create({
  keen: Ember.inject.service(),

  beforeModel(transition) {
    let keenData = {
      page: get(transition, 'targetName'),
      queryParams: get(transition, 'queryParams')
    };

    this.get('keen').sendEvent('page-view', keenData);
    return this._super(...arguments);
  }

});
