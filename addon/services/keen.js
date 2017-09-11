import Ember from 'ember';
import config from 'ember-get-config';
import DS from 'ember-data';
import $ from 'jquery';
import performanceNow from 'ember-keen/utils/performance-now';

const {
  computed,
  get,
  getProperties,
  set,
  RSVP,
  run,
  Service,
  A: array,
  Logger
} = Ember;

const {
  PromiseObject
} = DS;

/**
 * A service to work with the Keen.IO API.
 *
 * @namespace EmberKeen.Service
 * @class Keen
 * @extends Ember.Service
 * @public
 */
export default Service.extend({

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
    return get(config, 'KEEN_PROJECT_ID');
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
    return get(config, 'KEEN_WRITE_KEY');
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
  canWrite: computed.and('projectId', 'writeKey'),

  /**
   * The read key is taken from KEEN_READ_KEY in your config/environment.js
   *
   * @property readKey
   * @type {String}
   * @private
   * @readOnly
   */
  readKey: computed(function() {
    return get(config, 'KEEN_READ_KEY');
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
  canRead: computed.and('projectId', 'readKey'),

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
    this._prepareEventData(data);
    this._logRequest(event, data);

    if (!get(this, 'canWrite')) {
      return false;
    }

    let queue = get(this, '_eventQueue');
    if (get(queue, event)) {
      get(queue, event).pushObject(data);
    } else {
      queue[event] = array([data]);
    }
    run.debounce(this, this._processQueue, get(this, 'queueTime'));
    return true;
  },

  _prepareEventData(data) {
    let mergeData = get(this, 'mergeData') || {};
    $.extend(true, data, {
      keen: {
        timestamp: new Date()
      }
    }, mergeData);
    return data;
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
    this._prepareEventData(data);
    this._logRequest(event, data);

    if (!get(this, 'canWrite')) {
      return RSVP.Promise.reject('You don\'t have write access to Keen.IO.');
    }

    return new RSVP.Promise((resolve, reject) => {
      this._sendEvent(event, data).then(resolve, reject);
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

    let url = this._buildReadURL(action);
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
    let promise = new RSVP.Promise((resolve, reject) => {
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

    return PromiseObject.create({ promise });
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
    let url = this._buildSendURL(event);
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
    let url = this._buildSendURL(null);
    return this._post(url, eventData);
  },

  /**
   * Send the data to the API.
   *
   * @method _post
   * @param {String} url The URL to post to.
   * @param {Object} data The data which should be sent to the API
   * @returns {Ember.RSVP.Promise}
   * @private
   */
  _post(url, data) {
    return $.ajax({
      type: 'POST',
      headers: {
        Authorization: get(this, 'writeKey')
      },
      url,
      contentType: 'application/json',
      crossDomain: true,
      xhrFields: {
        withCredentials: false
      },
      data: JSON.stringify(data),
      dataType: 'json'
    });
  },

  /**
   * Read data from the API.
   *
   * @method _get
   * @param {String} url The URL to get from.
   * @returns {Ember.RSVP.Promise}
   * @private
   */
  _get(url, data = {}) {
    return $.ajax({
      type: 'GET',
      headers: {
        Authorization: get(this, 'readKey')
      },
      url,
      contentType: 'application/json',
      crossDomain: true,
      data,
      xhrFields: {
        withCredentials: false
      }
    });
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
      Logger.info('Keen Track:', event, data);
    }
  },

  /**
   * Build the Keen-URL to post to.
   *
   * @param {String} event If set, post to a single event collection, otherwise post to the general collection
   * @returns {String} The built URIL
   * @private
   */
  _buildSendURL(event) {
    let { projectId, writeKey, baseUrl } = getProperties(this, 'projectId', 'writeKey', 'baseUrl');
    if (!event) {
      return `${baseUrl}/${projectId}/events?api_key=${writeKey}`;
    }
    return `${baseUrl}/${projectId}/events/${event}?api_key=${writeKey}`;
  },

  /**
   * Build the Keen-URL to read from.
   *
   * @method _buildReadURL
   * @param {String} action The action to read, e.g. 'count' or 'sum'
   * @return {String}
   * @private
   */
  _buildReadURL(action = 'count') {
    let { projectId, readKey, baseUrl } = getProperties(this, 'projectId', 'readKey', 'baseUrl');
    return `${baseUrl}/${projectId}/queries/${action}?api_key=${readKey}`;
  }

});
