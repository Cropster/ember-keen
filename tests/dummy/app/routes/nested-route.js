import Ember from 'ember';
import performanceNow from 'ember-keen/utils/performance-now';

const {
  Route,
  RSVP,
  run,
  inject,
  set
} = Ember;

export default Route.extend({

  keen: inject.service(),

  beforeModel() {
    set(this, 'keen.performanceTrackStart', performanceNow());
  },

  model() {
    return new RSVP.Promise((resolve) => {
      run.later(this, resolve, 500);
    });
  }

});
