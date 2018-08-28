import Service from '@ember/service';
import { assert } from '@ember/debug';

export default Service.extend({

  init() {
    this._super(...arguments);
    assert('You need to run `ember g ember-keen` to generate the keen-fetch service.', false);
  }

});
