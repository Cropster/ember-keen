import Ember from 'ember';

const {
  Route,
  RSVP,
  run,
  get,
  inject
} = Ember;

export default Route.extend({

  keen: inject.service(),

  beforeModel() {
    get(this, 'keen').startPerformanceTrack('page-view');
  },

  model() {
    return new RSVP.Promise((resolve) => {
      run.later(this, resolve, 500);
    });
  }

});
