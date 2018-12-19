import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';

export default Route.extend({
  keen: service(),

  init() {
    this._super(...arguments);

    this.keen.trackAllPageViews();
  }

});
