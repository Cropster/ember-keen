import { and } from '@ember/object/computed';
import { set, getProperties, get, computed } from '@ember/object';
import { Promise } from 'rsvp';
import { debounce, schedule } from '@ember/runloop';
import Service, { inject as service } from '@ember/service';
import config from 'ember-get-config';
import performanceNow from 'ember-keen/utils/performance-now';
import mergeDeep from 'ember-keen/utils/merge-deep';
import { assert } from '@ember/debug';

/**
 * A service to work with the Keen.IO API.
 *
 * @namespace EmberKeen.Service
 * @class Keen
 * @extends Ember.Service
 * @public
 */
export default Service.extend({

  keenFetch: service(),
  router: service(),

  /**
   * The base URL of the Keen API.
   *
   * @property baseUrl
   * @type {String}
   * @public
   */
  baseUrl: 'https://api.keen.io/3.0/projects',

  /**
   * The time in ms to wait until the queue should be sent.
   * Basically, the app will wait until this time passes (via debounce),
   * and send all data captured so far at the same time.
   * This helps to save unecessary requests.
   *
   * @property queueTime
   * @type {Number}
   * @default 5000
   * @public
   */
  queueTime: 5000,

  /**
   * The project ID is taken from KEEN_PROJECT_ID in your config/environment.js
   *
   * @property projectId
   * @type {String}
   * @private
   * @readOnly
   */
  projectId: computed(function() {
    return get(config, 'keen.projectId') || get(config, 'KEEN_PROJECT_ID');
  }),

  /**
   * The write key is taken from KEEN_WRITE_KEY in your config/environment.js
   *
   * @property writeKey
   * @type {String}
   * @private
   * @readOnly
   */
  writeKey: computed(function() {
    return get(config, 'keen.writeKey') || get(config, 'KEEN_WRITE_KEY');
  }),

  /**
   * If writing to keen is possible.
   * Is false if either projectId or writeKey are not set.
   *
   * @property canWrite
   * @type {Boolean}
   * @readOnly
   * @public
   */
  canWrite: and('projectId', 'writeKey'),

  /**
   * The read key is taken from KEEN_READ_KEY in your config/environment.js
   *
   * @property readKey
   * @type {String}
   * @private
   * @readOnly
   */
  readKey: computed(function() {
    return get(config, 'keen.readKey') || get(config, 'KEEN_READ_KEY');
  }),

  /**
   * If reading from keen is possible.
   * Is false if either projectId or readKey are not set.
   *
   * @property canWrite
   * @type {Boolean}
   * @readOnly
   * @public
   */
  canRead: and('projectId', 'readKey'),

  /**
   * The queue of events that should be sent.
   *
   * @property _eventQueue
   * @type {Object}
   * @private
   */
  _eventQueue: computed(function() {
    return {};
  }),

  /**
   * If requests should be logged to the console.
   * This is true if environment is development & keen.logRequests = true in config/environment.js
   *
   * @property _shouldLogRequests
   * @type {Boolean}
   * @readOnly
   * @private
   */
  _shouldLogRequests: computed(function() {
    return get(config, 'environment') === 'development' && get(config, 'keen.logRequests');
  }),

  /**
   * Overwrite this to add commonly used data to all events.
   * The content of this will always be merged into the data sent to the event.
   * This can be used for things like user id, ...
   *
   * @property mergeData
   * @type {Object}
   * @public
   */
  mergeData: computed(function() {
    return {};
  }),

  /**
   * A property that can be used for performance tracking.
   * This is used by the keen-track-pageview mixin to get the load times of pages.
   *
   * @property _performanceTrack
   * @type {Object}
   * @protected
   */
  _performanceTrack: computed(function() {
    return {};
  }),

  /**
   * If the automatic page view tracking has been activated.
   *
   * @property  _isTrackingPageViews
   * @type {Boolean}
   * @default false
   * @protected
   */
  _isTrackingPageViews: false,

  /**
   * Actually send an event to Keen.IO.
   * See https://keen.io/docs/data-collection/
   *
   * @method sendEvent
   * @param {String} event The name of the event collection
   * @param {Object} data JSON data to send together with the event
   * @returns {Boolean} True if the event was sent/queued, otherwise false
   * @public
   */
  sendEvent(event, data = {}) {
    let parsedData = this._prepareEventData(data);
    this._logRequest(event, parsedData);

    if (!get(this, 'canWrite')) {
      return false;
    }

    let queue = get(this, '_eventQueue');
    if (get(queue, event)) {
      get(queue, event).push(parsedData);
    } else {
      queue[event] = [parsedData];
    }
    debounce(this, this._processQueue, get(this, 'queueTime'));
    return true;
  },

  /**
   * Send an event immediately & return a promise.
   *
   * @method sendEventImmediately
   * @param {String} event The name of the event collection
   * @param {Object} data JSON data to send together with the event
   * @return {RSVP.Promise}
   * @public
   */
  sendEventImmediately(event, data = {}) {
    let parsedData = this._prepareEventData(data);
    this._logRequest(event, parsedData);

    if (!get(this, 'canWrite')) {
      return Promise.reject('You don\'t have write access to Keen.IO.');
    }

    return new Promise((resolve, reject) => {
      this._sendEvent(event, parsedData).then(resolve, reject);
    });
  },

  /**
   * Start tracking all page views.
   * This relies on new features of the router service added in ember-source@3.6, and makes it easy to
   * capture all page views automatically.
   *
   * Usually, you'll want to call this in your application-route's `init()` hook, or similar.
   *
   * @method trackAllPageViews
   * @public
   */
  trackAllPageViews() {
    assert('You can only use `trackAllPageViews()` on ember-source >= 3.6', get(this, 'router.on'));
    assert('You should only call `trackAllPageViews()` once.', !get(this, '_isTrackingPageViews'));

    set(this, '_isTrackingPageViews', true);

    this.router.on('routeWillChange', () => {
      this.startPerformanceTrack('page-view');
    });

    this.router.on('routeDidChange', (transition) => {
      let { to: toRouteInfo } = transition;
      let modelLoadTime = this.endPerformanceTrack('page-view') || 0;

      this.startPerformanceTrack('page-view-render-time');

      schedule('afterRender', () => {
        let renderTime = this.endPerformanceTrack('page-view-render-time') || 0;

        let { name: routeName, queryParams } = toRouteInfo;

        this._trackPageView({ routeName, queryParams, renderTime, modelLoadTime });
      });
    });
  },

  /**
   * Send multiple events at once.
   * Data has to be an object where each key is a collection, containing an array of data objects to send.
   * See https://keen.io/docs/data-collection/ --> Record multiple events
   *
   * @method sendEvents
   * @param {Object} data The data to send
   * @return {Boolean} Returns true if the events were sent, otherwise false
   * @public
   */
  sendEvents(data) {
    this._logRequest(null, data);
    if (!get(this, 'canWrite')) {
      return false;
    }
    this._sendEvents(data);
    return true;
  },

  /**
   * Make a query to the Keen-API.
   *
   * @method query
   * @param {String} action The query action to perform, e.g. count or sum
   * @param {String} event The event collection to query from
   * @param {Object} data Additional data for the query, e.g. timeframe
   * @return {Ember.RSVP.Promise}
   * @public
   */
  query(action = 'count', event = null, data = {}) {
    if (!get(this, 'canRead')) {
      return false;
    }

    let url = this._buildReadUrl(action);
    if (event) {
      /* eslint-disable camelcase */
      data.event_collection = event;
      /* eslint-enable camelcase */
    }

    if (!get(data, 'timeframe')) {
      data.timeframe = 'this_1_month';
    }

    let ajax = this._get(url, data);

    /* eslint-disable no-console */
    return new Promise((resolve, reject) => {
      ajax.then((d) => {
        if (d && get(d, 'result')) {
          return resolve(d);
        } else {
          console.error(d);
          return reject(new Error('Error when querying Keen.'));
        }
      }, (e) => {
        if (e.responseJSON) {
          e = e.responseJSON;
        }
        console.error(e);
        return reject(new Error('Error when querying Keen.'));
      });
    });
    /* eslint-enable no-console */
  },

  /**
   * Start tracking time for a performance check.
   * You can pass in a key to track multiple times at once.
   * Use the same key for this.endPerformanceTrack to get the corresponding time and re-set the timer.
   *
   * @method startPerformanceTrack
   * @param {string} trackKey
   * @return {Number}
   * @public
   */
  startPerformanceTrack(trackKey = 'general') {
    let start = performanceNow();

    let performanceTrack = get(this, '_performanceTrack');
    if (performanceTrack[trackKey]) {
      return;
    }

    performanceTrack[trackKey] = start;
    return start;
  },

  /**
   * Stop tracking time for a performance check.
   * Use the same key as you used for this.startPerformanceTrack.
   * The timer will automatically be cleared for this key.
   *
   * @method endPerformanceTrack
   * @param {string} trackKey
   * @return {Number}
   * @public
   */
  endPerformanceTrack(trackKey = 'general') {
    let performanceTrack = get(this, '_performanceTrack');
    let start = performanceTrack[trackKey];
    let end = performanceNow();

    this._clearPerformanceTrack(trackKey);

    if (!start) {
      return null;
    }
    return end - start;
  },

  /**
   * If performance is currently being tracked for a given key.
   *
   * @method isPerformanceTracking
   * @param {String} trackKey
   * @return {Boolean}
   * @public
   */
  isPerformanceTracking(trackKey = 'general') {
    let performanceTrack = get(this, '_performanceTrack');
    return !!performanceTrack[trackKey];
  },

  _prepareEventData(data) {
    let mergeData = get(this, 'mergeData') || {};
    let baseData = {
      keen: {
        timestamp: new Date()
      }
    };
    return mergeDeep(baseData, data, mergeData);
  },

  /**
   * Clear a tracking start time.
   * You will usually not need to call this manually, as it's automatically be called by endPerformanceTrack
   *
   * @method _clearPerformanceTrack
   * @param {string} trackKey
   * @protected
   */
  _clearPerformanceTrack(trackKey = 'general') {
    let performanceTrack = get(this, '_performanceTrack');
    delete performanceTrack[trackKey];
  },

  /**
   * Process the queue and send all queued events to Keen.IO.
   *
   * @method _processQueue
   * @private
   */
  _processQueue() {
    let queue = get(this, '_eventQueue');
    this._sendEvents(queue);
    set(this, '_eventQueue', {});
  },

  /**
   * Send a single event to Keen.IO.
   *
   * @param {String} event The name of the event collection
   * @param {Object} data The data to send to the collection
   * @returns {PromiseObject} A promise which resolves with the response JSON
   * @private
   */
  _sendEvent(event, eventData = {}) {
    let url = this._buildWriteUrl(event);
    return this._post(url, eventData);
  },

  /**
   * Send multiple events to Keen.IO.
   *
   * @param {Object} data The data to send, where each object key is a collection containing an array of data.
   * @returns {PromiseObject} A promise which resolves with the response JSON
   * @private
   */
  _sendEvents(eventData) {
    let url = this._buildWriteUrl(null);
    return this._post(url, eventData);
  },

  /**
   * Send the data to the API.
   *
   * @method _post
   * @param {String} url The URL to post to.
   * @param {Object} data The data which should be sent to the API.
   * @returns {Ember.RSVP.Promise}
   * @private
   */
  _post(url, data) {
    return this._makeRequest(url, data, get(this, 'writeKey'), {});
  },

  /**
   * Read data from the API.
   *
   * @method _get
   * @param {String} url The URL to get from.
   * @param {Object} [data={}] Optional query configuration for API.
   * @returns {Ember.RSVP.Promise}
   * @private
   */
  _get(url, data = {}) {
    return this._makeRequest(url, data, get(this, 'readKey'), {});
  },

  /**
   * Primitive method for performing ajax POST requests.
   * This calls `keenFetch.makeRequest` by default.
   *
   * @method _makeRequest
   * @param {String} url The URL to send POST to.
   * @param {Object} [data={}] Custom request data.
   * @param {String} apiKey The API key to use for authentication
   * @param {Object} [extraOptions={}] Custom request options.
   * @returns {Ember.RSVP.Promise}
   * @private
   */
  _makeRequest() {
    return get(this, 'keenFetch').makeRequest(...arguments);
  },

  /**
   * Log a request to the console.
   * A request will only be logged if environment === development & keen.logRequests = true in config/environment.js
   *
   * @method _logRequest
   * @param {String} event The event name to log, or null if multiple events are logged
   * @param {Object} data
   * @private
   */
  _logRequest(event, data) {
    if (get(this, '_shouldLogRequests')) {
      console.info('Keen Track:', event, data); // eslint-disable-line
    }
  },

  /**
   * Build the Keen-URL to post to.
   *
   * @param {String} event If set, post to a single event collection, otherwise post to the general collection
   * @returns {String} The built URL
   * @private
   */
  _buildWriteUrl(event) {
    let { projectId, baseUrl } = getProperties(this, 'projectId', 'baseUrl');
    if (!event) {
      return `${baseUrl}/${projectId}/events`;
    }
    return `${baseUrl}/${projectId}/events/${event}`;
  },

  /**
   * Build the Keen-URL to read from.
   *
   * @method _buildReadURL
   * @param {String} action The action to read, e.g. 'count' or 'sum'
   * @return {String}
   * @private
   */
  _buildReadUrl(action = 'count') {
    let { projectId, baseUrl } = getProperties(this, 'projectId', 'baseUrl');
    return `${baseUrl}/${projectId}/queries/${action}`;
  },

  _trackPageView({ routeName, queryParams, renderTime = 0, modelLoadTime = 0 }) {
    let totalTime = renderTime + modelLoadTime;

    /* eslint-disable camelcase */
    let keenData = {
      page: routeName,
      query_params: queryParams,
      previous_page: this._previousPage,
      performance: {
        total_time: totalTime,
        model_load_time: modelLoadTime,
        render_time: renderTime,
        total_time_seconds: (totalTime / 1000).toFixed(2) * 1,
        model_load_time_seconds: (modelLoadTime / 1000).toFixed(2) * 1,
        render_time_seconds: (renderTime / 1000).toFixed(2) * 1
      }
    };

    set(this, '_previousPage', {
      page: keenData.page,
      query_params: keenData.query_params
    });
    /* eslint-enable camelcase */

    this.sendEvent('page-view', keenData);
  }

});
