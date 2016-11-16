import Ember from 'ember';

const {
  Route,
  inject
} = Ember;

export default Route.extend({
  keen: inject.service(),

  actions: {
    trackSomething() {
      this.get('keen').sendEvent('track-something');
    }
  }
});
