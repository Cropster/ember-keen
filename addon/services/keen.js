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
   * The keen-ajax service, extending ember-ajax.
   *
   * @property keenAjax
   * @type {EmberKeen.Service.KeenAjax}
   * @private
   */
  keenAjax: Ember.inject.service(),

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
    if (!get(this, 'canWrite')) {
      return false;
    }
    Ember.$.extend(data, {
      keen: {
        timestamp: new Date()
      }
    });
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
  _sendEvent(event, data = {}) {
    let url = this._buildSendURL(event);
    let keenAjax = this.get('keenAjax');

    return keenAjax.post(url, {
      data,
      xhrFields: {
        withCredentials: false
      }
    });
  },

  /**
   * Send multiple events to Keen.IO.
   *
   * @param {Object} data The data to send, where each object key is a collection containing an array of data.
   * @returns {PromiseObject} A promise which resolves with the response JSON
   * @private
   */
  _sendEvents(data) {
    let url = this._buildSendURL(null);
    let keenAjax = this.get('keenAjax');

    return keenAjax.post(url, {
      data,
      xhrFields: {
        withCredentials: false
      }
    });
  },

  /**
   * Build the Keen-URL to post to.
   *
   * @param {String} event If set, post to a single event collection, otherwise post to the general collection
   * @returns {String} The built URIL
   * @private
   */
  _buildSendURL(event) {
    let { projectId, writeKey } = getProperties(this, 'projectId', 'writeKey');
    if (!event) {
      return `/${projectId}/events?api_key=${writeKey}`;
    }
    return `/${projectId}/events/${event}?api_key=${writeKey}`;
  }

});
