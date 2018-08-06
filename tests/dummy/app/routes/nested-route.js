import { inject as service } from '@ember/service';
import Route from '@ember/routing/route';
import RSVP from 'rsvp';
import { run } from '@ember/runloop';
import { get } from '@ember/object';

export default Route.extend({

  keen: service(),

  beforeModel() {
    get(this, 'keen').startPerformanceTrack('page-view');
  },

  model() {
    return new RSVP.Promise((resolve) => {
      run.later(this, resolve, 500);
    });
  }

});
