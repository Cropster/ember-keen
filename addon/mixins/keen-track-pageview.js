import Ember from 'ember';

const {
  get,
  set,
  Mixin,
  inject,
  typeOf: getTypeOf,
  run,
  RSVP
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
   * This property is set to true when the performance tracking has already started before this route is entered.
   * This means that the model_load_time will include time from the parent route.
   *
   * @property _wasAlreadyTracking
   * @type {Boolean}
   * @default false
   * @protected
   */
  _wasAlreadyTracking: false,

  /**
   * Setup a listener to check how long the page view took.
   *
   * @method beforeModel
   * @param {Transition} transition
   * @override
   * @return {*}
   * @public
   */
  beforeModel() {
    this._setLoadTrackStart();
    return this._super(...arguments);
  },

  /**
   * Set the start time of the page load on the keen service.
   *
   * @method _setLoadTrackStart
   * @protected
   */
  _setLoadTrackStart() {
    let keen = get(this, 'keen');

    if (keen.isPerformanceTracking('page-view')) {
      set(this, '_wasAlreadyTracking', true);
    }

    keen.startPerformanceTrack('page-view');
  },

  /**
   * Get the query params for tracking the page view.
   *
   * @method _getTrackingParams
   * @return {Object}
   * @protected
   */
  _getTrackingParams() {
    return this.paramsFor(get(this, 'routeName')) || {};
  },

  /**
   * Get the route name of the page to track.
   *
   * @method _getTrackingRouteName
   * @return {String}
   * @protected
   */
  _getTrackingRouteName() {
    // In engines, fullRouteName will give you the full path
    return get(this, 'fullRouteName') || get(this, 'routeName');
  },

  /**
   * Get the time it took to enter the route
   *
   * @method _getPageLoadTime
   * @return {Number}
   * @protected
   */
  _getPageLoadTime() {
    return get(this, 'keen').endPerformanceTrack('page-view');
  },

  /**
   * Get the render time.
   * This returns a promise that resolves after rendering.
   *
   * @method _getPageRenderTime
   * @return {RSVP.Promise<Number>}
   * @protected
   */
  _getPageRenderTime() {
    let keen = get(this, 'keen');
    keen.startPerformanceTrack('page-view-render-time');

    return new RSVP.Promise((resolve) => {
      run.schedule('afterRender', this, function() {
        let timeDiff = keen.endPerformanceTrack('page-view-render-time');
        resolve(timeDiff);
      });
    });
  },

  /**
   * Get the render time, and then track the page view.
   *
   * @method _trackPageViewWithRender
   * @private
   */
  _trackPageViewWithRender() {
    this._getPageRenderTime().then(this._trackPageView.bind(this));
  },

  /**
   * Track a page view for a given transition with Keen.IO.
   *
   * @method _trackPageView
   * @protected
   */
  _trackPageView(renderTime = 0) {
    let keen = get(this, 'keen');

    if (!renderTime || getTypeOf(renderTime) !== 'number') {
      renderTime = 0;
    }

    let queryParams = this._getTrackingParams();
    let routeName = this._getTrackingRouteName();
    let modelLoadTime = this._getPageLoadTime();

    // If the performance tracking started before this route, it means that it includes load time from it's parent
    // This can have an effect on the model load time, and thus can be used to further drill down into load times
    let wasAlreadyTracking = get(this, '_wasAlreadyTracking');
    set(this, '_wasAlreadyTracking', false);

    let totalTime = renderTime + (modelLoadTime || 0);

    /* eslint-disable camelcase */
    let keenData = {
      page: routeName,
      query_params: queryParams,
      previous_page: get(keen, '_previousPage'),
      performance: {
        total_time: totalTime,
        model_load_time: modelLoadTime,
        render_time: renderTime,
        total_time_seconds: (totalTime / 1000).toFixed(2) * 1,
        model_load_time_seconds: (modelLoadTime / 1000).toFixed(2) * 1,
        render_time_seconds: (renderTime / 1000).toFixed(2) * 1,
        model_load_time_includes_parent: wasAlreadyTracking
      }
    };

    set(keen, '_previousPage', {
      page: keenData.page,
      query_params: keenData.query_params
    });
    /* eslint-enable camelcase */

    keen.sendEvent('page-view', keenData);
  },

  actions: {
    didTransition() {
      this._trackPageViewWithRender();

      return this._super(...arguments);
    }
  }

});
