import Ember from 'ember';
import config from 'ember-get-config';

const { computed, get, getProperties, set } = Ember;

/**
 * A service to work with the Keen.IO API.
 *
 * @namespace EmberKeen.Service
 * @class Keen
 * @extends Ember.Service
 * @public
 */
export default Ember.Service.extend({

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
   * The queue of events that should be sent.
   *
   * @property _eventQueue
   * @type {Object}
   * @private
   */
  _eventQueue: {},

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
   * Actually send an event to Keen.IO.
   * See https://keen.io/docs/data-collection/
   *
   * @method sendEvent
   * @param {String} event The name of the event collection
   * @param {Object} data JSON data to send together with the event
   * @param {Boolean} sendInstantly If set to true, do not add to queue but send event instantly
   * @returns {Boolean} True if the event was sent/queued, otherwise false
   * @public
   */
  sendEvent(event, data = {}, sendInstantly = false) {
    let mergeData = get(this, 'mergeData') || {};
    Ember.$.extend(data, {
      keen: {
        timestamp: new Date()
      }
    }, mergeData);

    this._logRequest(event, data);

    if (!get(this, 'canWrite')) {
      return false;
    }

    if (sendInstantly) {
      this._sendEvent(event, data);
      return true;
    }

    let queue = get(this, '_eventQueue');
    if (get(queue, event)) {
      get(queue, event).pushObject(data);
    } else {
      queue[event] = Ember.A([data]);
    }
    Ember.run.debounce(this, this._processQueue, get(this, 'queueTime'));
    return true;
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
    return Ember.$.ajax({
      type: 'POST',
      headers: {
        Authorization: get(this, 'writeKey')
      },
      url,
      contentType: 'application/json',
      xhrFields: {
        withCredentials: false
      },
      data: JSON.stringify(data),
      dataType: 'json'
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
      Ember.Logger.info('Keen Track:', event, data);
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
  }

});
