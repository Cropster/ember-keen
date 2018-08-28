# Fetch Configuration

ember-keen uses [ember-fetch](https://github.com/ember-cli/ember-fetch) to talk to the Keen.IO API.

If you want to overwrite this (e.g. to talk to a custom API or similar), there are a few internal hooks you can use:

```js
// app/services/keen.js
import KeenService from 'ember-keen/services/keen';

export default KeenService.extend({

  // This actually make the API request
  _makeRequest(url, data, apiKey , extraOptions) {},
  
  // This calls _makeRequest for write operations
  _post(url, data) {},
  
  // This calls _makeRequest for read operations
  _get(url, data) {},
  
  // Build the base URL for write operations
  _buildWriteUrl(event) {},
  
  // Build the base URL for read operations
  _buildReadUrl(action) {}
  
});
```

By default, the fetch functionality is funneled through a `keen-fetch` service, which is generated on install. If you are upgrading, you can install it by running `ember g ember-keen`. It has three methods that you can overwrite:

```js
import KeenFetchService from 'ember-keen/services/keen-fetch';

export default KeenFetchService.extend({

  // This actually make the API request, and is called by keen._makeRequest
  makeRequest(url, data, apiKey , extraOptions) {},
  
  // This builds the options for _makeRequest
  _getFetchOptions(url, data, apiKey, extraOptions) {},
  
  // This builds the URL for _makeRequest
  _getFetchUrl(url, data, apiKey, extraOptions) {}
  
});
```

If you do not want to use ember-fetch, but something else (e.g. `$.ajax` or ember-ajax), you can achieve this like this:

```js
import KeenService from 'ember-keen/services/keen';
export default KeenService.extend({

 keenFetch: null, // Remove dependency

  _makeRequest(url, data, apiKey, options) {
    return $.ajax(
      assign({
        url: `${url}?api_key=${apiKey}`,
        type: 'POST',
        contentType: 'application/json',
        crossDomain: true,
        data: JSON.stringify(data),
        xhrFields: {
          withCredentials: false
        }
      }, options)
    );
  }

})
```

Don't forget to uninstall ember-fetch from your app. Alternatively, you can also overwrite the `keen-fetch` service.
