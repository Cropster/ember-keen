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

## Configuration

You will need to specify your Keen.IO project id and write/read key. 
You only need the write key if you want to record data, and the read key if you want to analyse data.
The recommended way to do this is via [ember-cli-dotenv](https://github.com/fivetanley/ember-cli-dotenv):

In you `ember-cli-build.js` add:

```js
dotEnv: {
  clientAllowedKeys: ['KEEN_PROJECT_ID', 'KEEN_WRITE_KEY', 'KEEN_READ_KEY']
}
```

And add a file `.env` in your project's root folder with the following content:

```
KEEN_PROJECT_ID=MY-ID
KEEN_WRITE_KEY=MY-WRITE-KEY
KEEN_READ_KEY=MY-READ-KEY
```

Alternatively, you can also just specify the keys in your `config/environment.js`:

```js
var ENV = {
  /* ... */
  KEEN_PROJECT_ID: 'MY-ID',
  KEEN_WRITE_KEY: 'MY-WRITE-KEY',
  KEEN_READ_KEY: 'MY-READ-KEY'
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

### sendEvent(eventName, data, sendInstantly = false)

```js
export default Ember.Route.extend({
  keen: Ember.inject.service(),
  
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

By default, `sendEvent` will debounce sending a request to the Keen.IO API by 5 seconds. 
This means that if you send 10 events in 7 seconds via `sendEvent`, 
only one actual request will be made to the Keen.IO API.

**sendInstantly has been deprecated. Please use keen.sendEventImmediately() instead.**

You can also overwrite `mergeData` to return an object which will be merged with the data provided for every event
sent via `sendEvent`:

```js
import KeenService from 'ember-keen/services/keen';

export default KeenService.extend({
  mergeData: Ember.computed('userSession', function() {
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

Note that this will return a `DS.PromiseObject`. The actual response data is available under `result`, e.g.:

```js
this.get('keen').query('count', 'page-views').then(function(data) {
  console.log(`There have been ${data.result} page views.`); 
});
```

### Mixin

For your convenience, a mixin to track page views is also included. You can use it like this:

```js
import Ember from 'ember';
import KeenTrackPageviewMixin from 'ember-keen/mixins/keen-track-pageview';

export default Ember.Route.extend(KeenTrackPageviewMixin, {
  beforeModel() {
    // If you use beforeModel, don't forget to run this._super(...arguments);
  }
});
```

## Dependencies

Because the ember-keen uses `DS.PromiseObject` for querying, it currently depends on ember-data. 
Other than this, there are no dependencies - ember-keen uses `Ember.$.ajax()` under the hood to communicate with Keen.IO.
You can change this behavior by overwriting the `_post()` / `_get()` methods in the `keen`-Service. 
Below, you can see the default functionality for the `_post()` method.

```js
// app/services/keen.js
import Ember from 'ember';
import KeenService from 'ember-keen/services/keen';

export default KeenService.extend({
  _post(url, data) {
    return Ember.$.ajax({
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
  }
});
```
