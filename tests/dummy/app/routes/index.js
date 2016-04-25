import Ember from 'ember';

export default Ember.Route.extend({
  keen: Ember.inject.service(),

  actions: {
    trackSomething() {
      this.get('keen').sendEvent('track-something');
    }
  }
});
