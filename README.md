# ember-keen

[![Build Status](https://travis-ci.org/Cropster/ember-keen.svg?branch=master)](https://travis-ci.org/Cropster/ember-keen)
[![Ember Observer Score](https://emberobserver.com/badges/ember-keen.svg)](https://emberobserver.com/addons/ember-keen)

This add-on allows working with Keen.IO without requiring the Keen.IO SDK. 
It provides a service to send events. In the future, reading events will also be supported.
The service also auto-combines your events to avoid multiple unnecessary requests. 

Compatibility
------------------------------------------------------------------------------

* Ember.js v2.18 or above (3.6 or above if using the automated pageview tracking)
* Ember CLI v2.13 or above
* Node.js v8 or above


Installation
------------------------------------------------------------------------------

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

Now in your application route, add the following code:

```js
import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';

export default Route.extend({
  keen: service(),
  
  init() {
    this._super(...arguments);
    this.keen.trackAllPageViews();
  }
})
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

### sendEventImmediately(event, data)
This will send an event immediately and return a promise, which resolves when the event has been successfully sent, 
or rejects if an error occurs. This can be used to check if a message has actually been sent to the server. 
It takes the same options as `sendEvent()`.

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

### Further information

* [More about the page view tracking](docs/page-view-tracking.md)

## Fetch configuration

ember-keen uses [ember-fetch](https://github.com/ember-cli/ember-fetch) to talk to the Keen.IO API.
Other than that, there are no dependencies. 

* [More information about customizing the API requests](docs/fetch.md)

