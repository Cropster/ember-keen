# ember-keen

[![Build Status](https://travis-ci.org/mydea/ember-keen.svg?branch=master)](https://travis-ci.org/mydea/ember-keen)
[![Ember Observer Score](https://emberobserver.com/badges/ember-keen.svg)](https://emberobserver.com/addons/ember-keen)

This add-on allows working with Keen.IO without requiring the Keen.IO SDK. 
It provides a service to send events. In the future, reading events will also be supported.
The service also auto-combines your events to avoid multiple unnecessary requests. 

This add-on was inspired by [ember-keen-tracking](https://github.com/plyfe/ember-keen-tracking),
and the fact that it should not be necessary to include a library just to make a few Ajax-requests.

## Installation

* `ember install ember-keen`

## Quick Start

For a quick start with tracking page views, you'll need (as a minimum) the following:

In your `config/environment.js`:

```js
let ENV = {
  /* ... */
  keen: {
    projectId: 'MY-ID',
    writeKey: 'MY-WRITE-KEY'
  }
}
```

In the route you want to track:

```js
import Ember from 'ember';
import KeenTrackPageviewMixin from 'ember-keen/mixins/keen-track-pageview';

export default Ember.Route.extend(KeenTrackPageviewMixin, {});
```

That's it! You'll now track each page view, together with key performance indicators (model load time & render time) & query params, for that route. In addition to this, you can easily track custom events, like when a user clicks on a specific button.

For more details on how to configure ember-keen & how to send custom events, as well as for customization options of the page view tracking, see the following in-depth documentation.

## Configuration

You will need to specify your Keen.IO project id and write/read key. 
You only need the write key if you want to record data, and the read key if you want to analyse data.
The recommended way to do this is via [ember-cli-dotenv](https://github.com/fivetanley/ember-cli-dotenv):

Then, you can specify the keys in your `config/environment.js`:

```js
let ENV = {
  /* ... */
  keen: {
    projectId: process.env.KEEN_PROJECT_ID,
    writeKey: process.env.KEEN_WRITE_KEY,
    readKey: process.env.KEEN_READ_KEY
  }
}
```

Also, normally you will not want to have actual logging (to the Keen API) in your development environment. 
For this purpose, you can enable logging requests to your console in your `config/environment.js`:

```js
ENV.keen = {
  logRequests: true
};
```

The service will then log all requests to the console, but only if `environment === 'development'`.

## Usage

You can manually track events with methods provided by the `keen`-service:

### sendEvent(eventName, data)

```js
export default Route.extend({
  keen: service(),
  
  actions: {
    buttonClicked() {
      this.get('keen').sendEvent('button-click', {
        otherData: 1,
        somethingElse: 'foobar'
      });  
    }
  }
});
```

`sendEvent` will debounce sending a request to the Keen.IO API by 5 seconds. 
This means that if you send 10 events in 7 seconds via `sendEvent`, 
only one actual request will be made to the Keen.IO API.

You can also overwrite `mergeData` to return an object which will be merged with the data provided for every event
sent via `sendEvent`:

```js
import KeenService from 'ember-keen/services/keen';

export default KeenService.extend({
  mergeData: computed('userSession', function() {
    return {
      currentUser: this.get('userSession.userId')
    };
  })
});
```

With this configuration, the above request would result in the following data object sent to Keen.IO:

```js
{
  otherData: 1,
  somethingElse: 'foobar',
  currentUser: 193
}
```

Note that this will not work for `sendEvents`.

### sendEventImmediately(event, data)
This will send an event immediately and return a promise, which resolves when the event has been successfully sent, 
or rejects if an error occurs. This can be used to check if a message has actually been sent to the server. 
It takes the same options as `sendEvent()`.

### sendEvents(data)

You can also manually send multiple events add once with `sendEvents`:

```js
this.get('keen').sendEvents({
  'button-click': [
    { otherData: 1 },
    { otherData: 1 },
    { otherData: 2 }
  ],
  'other-collection': [
    {},
    {},
    {}
  ]
});
```

### query(action, event, data)

Query data from Keen.io. This will make a GET request and return a promise, which resolves with the data returned form the API.

* `action` is the action to perform. This can be a simple action like `count` or something more complex like `funnel`.
* `event` is the event collection to query. If this is set, `data.event_collection` will be set to this value.
* `data` is other data that will be included in the query. This should include things like `timeframe`, `target_property` or anything else required by Keen.

For more information about actions & the required data, see the [Keen.IO API Docs](https://keen.io/docs/api/#analyses). 
You can also do things like [multi analyses](https://keen.io/docs/api/#multi-analysis), 
[funnel analyses](https://keen.io/docs/api/#funnels) or [extractions](https://keen.io/docs/api/#extractions) with this method.

Note that this will return a promise that resolves with a POJO. The actual response data is available under `result`, e.g.:

```js
this.get('keen').query('count', 'page-views').then(function(data) {
  console.log(`There have been ${data.result} page views.`); 
});
```

### Mixin

For your convenience, a mixin to track page views is also included. You can use it like this:

```js
import KeenTrackPageviewMixin from 'ember-keen/mixins/keen-track-pageview';

export default Route.extend(KeenTrackPageviewMixin, {
  beforeModel() {
    // If you use beforeModel, don't forget to run this._super(...arguments);
  },
  
  actions: {
    didTransition() {
      // If you happen to use didTransition, you'll also need to run this._super(...arguments)
    }
  }
});
```

The following properties are tracked for a page view:

```js
{
  page: 'route-name.index',
  query_params: {
    myQueryParam: true
  },
  previous_page: {
    page: 'previous-page',
    query_params: {}
  },
  performance: {
    total_time: 200.5,
    model_load_time: 150,
    render_time: 50.5,
    total_time_seconds: 0.2,
    model_load_time_seconds: 0.15,
    render_time_seconds: 0.05
  }
}
```

The mixin has a few methods that you can override. Mainly, you might want to overwrite these two methods - see their default behavior:

```js
// This returns the value for 'query_params"
_getTrackingParams() {
  return this.paramsFor(this.get('routeName'));
},
// This returns the value for 'page'
_getTrackingRouteName() {
  return this.get('routeName');
}
```

In the beforeModel() hook, the mixin calls the following function:

```js
_setLoadTrackStart() {
  get(this, 'keen').startPerformanceTrack('page-view');
}
```

And in the didTransition() event, we call the following:

```js
_trackPageViewWithRender() {
  this._getPageRenderTime().then((renderTime) => this._trackPageView(renderTime));
}
```

See the next chapter for further information about the page load & performance tracking.

### Performance Tracking

The keen-track-pageview uses basic performance tracking.
This includes two things: 

- The time it took to resolve the beforeModel, model & afterModel hooks
- The time it took to render the page (after the afterModel hook)

These properties are tracked (internally) through the following methods of the keen service:

```js
keen.startPerformanceTrack('page-view');
keen.endPerformanceTrack('page-view');
```

These functions can also be used for other purposes. The only important thing to keep in mind is that each key (in the above case, 'page-view') can only be used once at the same time. 

By default, we start the performance track in the beforeModel hook. However, this is not always correct. For example, if you have a nested route structure, where the model is loaded in the parent route, this would not be taken into account.

For these cases, you can start the performance tracking manually. Take the following example:

```js
// app/routes/parent-route.js
export default Route.extend({
  keen: service(),
  
  beforeModel() {
    this.get('keen').startPerformanceTrack('page-view');
  }
});

// app/routes/parent-route/child-route.js
import KeenTrackPageviewMixin from 'ember-keen/mixins/keen-track-pageview';
export default Route.extend(KeenTrackPageviewMixin, {});
```

This works, because calling `startPerformanceTrack()` with a key that is already started and not ended yet will be ignored. So the time that is tracked for the page view of the route `parent-route.child-route` will be based of the time when it started to load the beforeModel of the parent route.

Note that while this functionality is used by the page view mixin, you can also use it yourself for other performance trackings. The render time is also tracked like this.

## Dependencies / Fetch configuration

ember-keen uses [ember-fetch](https://github.com/ember-cli/ember-fetch) to talk to the Keen.IO API.
Other than that, there are no dependencies.

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

By default, the fetch functionality is funneled through a `keen-fetch` service. It has three methods that you can overwrite:

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

If you do not want to use ember-fetch, but something else (e.g. $.ajax or ember-ajax), you can achieve this like this:

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
