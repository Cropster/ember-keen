import { inject as service } from '@ember/service';
import Route from '@ember/routing/route';

export default Route.extend({
  keen: service(),

  actions: {
    trackSomething() {
      this.get('keen').sendEvent('track-something');
    }
  }
});
