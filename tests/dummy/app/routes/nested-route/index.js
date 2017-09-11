import Ember from 'ember';
import KeenTrackPageviewMixin from 'ember-keen/mixins/keen-track-pageview';

const {
  Route
} = Ember;

export default Route.extend(KeenTrackPageviewMixin, {});
