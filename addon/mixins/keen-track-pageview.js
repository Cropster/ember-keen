import Ember from 'ember';

const {
  get,
  set,
  Mixin,
  inject
} = Ember;

/**
 * A mixin to track page views with Keen.IO.
 *
 * @namespace EmberKeen.Mixin
 * @class KeenTrackPageview
 * @extends Ember.Mixin
 * @public
 */
export default Mixin.create({
  keen: inject.service(),

  /**
   * Call the _trackPageView method on beforeModel.
   *
   * @method beforeModel
   * @param {Transition} transition
   * @override
   * @returns {*}
   * @public
   */
  beforeModel(transition) {
    this._trackPageView(transition);
    return this._super(...arguments);
  },

  /**
   * Track a page view for a given transition with Keen.IO.
   *
   * @method _trackPageView
   * @param {Transition} transition The transition for the page view
   * @private
   */
  _trackPageView(transition = {}) {
    let keen = get(this, 'keen');
    // jscs:disable requireCamelCaseOrUpperCaseIdentifiers
    let keenData = {
      page: get(transition, 'targetName'),
      queryParams: get(transition, 'queryParams'),
      previous_page: get(keen, '_previousPage')
    };
    // jscs:enable requireCamelCaseOrUpperCaseIdentifiers

    set(keen, '_previousPage', {
      page: keenData.page,
      queryParams: keenData.queryParams
    });

    keen.sendEvent('page-view', keenData);
  }

});
