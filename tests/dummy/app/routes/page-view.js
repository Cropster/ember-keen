import Ember from 'ember';
import KeenTrackPageviewMixin from 'ember-keen/mixins/keen-track-pageview';

const {
  Route
} = Ember;

export default Route.extend(KeenTrackPageviewMixin, {

  model() {
    let arr = [];
    for (let i = 0; i < 1000; i++) {
      arr.push({ name: `item #${i}` });
    }

    return arr;
  }

});
