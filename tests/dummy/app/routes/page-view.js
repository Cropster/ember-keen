import Route from '@ember/routing/route';
import KeenTrackPageviewMixin from 'ember-keen/mixins/keen-track-pageview';

export default Route.extend(KeenTrackPageviewMixin, {

  model() {
    let arr = [];
    for (let i = 0; i < 1000; i++) {
      arr.push({ name: `item #${i}` });
    }

    return arr;
  }

});
