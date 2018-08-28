import Service from '@ember/service';
import fetch from 'fetch';
import mergeDeep from 'ember-keen/utils/merge-deep';
import { computed } from '@ember/object';

export default Service.extend({

  _fetch: computed(function() {
    return fetch;
  }),

  /**
   * Primitive method for performing ajax POST requests.
   *
   * @method makeRequest
   * @param {String} url The URL to send POST to.
   * @param {Object} [data={}] Custom request data.
   * @param {String} apiKey The API key to use for authentication
   * @param {Object} [extraOptions={}] Custom request options.
   * @returns {Ember.RSVP.Promise}
   * @private
   */
  makeRequest(url, data = {}, apiKey = null, extraOptions = {}) {
    let options = this._getFetchOptions(url, data, apiKey, extraOptions);
    let fullUrl = this._getFetchUrl(url, data, apiKey, extraOptions);

    return this._fetch(fullUrl, options).then(function(response) {
      return response.json();
    });
  },

  _getFetchOptions(url, data, apiKey, extraOptions = {}) {
    // Note: The Authentication header does not work with CORS, as keen.io sends a wildcard Accept-Origin header
    // This is not allowed by fetch, so we need to add the api key to the URL (in _getFetchUrl)
    return mergeDeep({
      method: 'POST',
      mode: 'cors',
      body: JSON.stringify(data),
      headers: {
        'Content-Type': 'application/json; charset=utf-8'
      }
    }, extraOptions);
  },

  _getFetchUrl(url, data, apiKey) {
    return `${url}?api_key=${apiKey}`;
  }

});
