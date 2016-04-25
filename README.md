# ember-keen

This add-on allows working with Keen.IO without requiring the Keen.IO SDK. 
It provides a service to send events. In the future, reading events will also be supported.
The service also auto-combines your events to avoid multiple unnecessary requests. 

## Installation

* `ember install ember-keen`

## Configuration

You will need to specify your Keen.IO project id and write key.
The recommended way to do this is via [ember-cli-dotenv](https://github.com/fivetanley/ember-cli-dotenv):

In you `ember-cli-build.js` add:

```js
dotEnv: {
  clientAllowedKeys: ['KEEN_PROJECT_ID', 'KEEN_WRITE_KEY']
}
```

And add a file `.env` in your project's root folder with the following content:

```
KEEN_PROJECT_ID: MY-ID
KEEN_WRITE_KEY: MY-WRITE-KEY
```

Alternatively, you can also just specify the keys in your `config/environment.js`:

```js
var ENV = {
  /* ... */
  KEEN_PROJECT_ID: 'MY-ID',
  KEEN_WRITE_KEY: 'MY-WRITE-KEY'
}
```

## Dependencies

By default, ember-keen uses [ember-ajax](https://github.com/ember-cli/ember-ajax) to make requests to the Keen.IO API.
However, if you do not want to include ember-ajax, you are free to overwrite the `_sendEvent` and `_sendEvents` functions
in the keen-service:

```js
import Ember from 'ember';
import KeenService from 'ember-keen/services/keen';

export default KeenService.extend({
  _sendEvent(event, data) {
    let url = this._buildSendURL(event);  
    return Ember.$.post({
      url,
      data
    });
  },
  
  _sendEvents(data) {
      let url = this._buildSendURL(null);  
      return Ember.$.post({
        url,
        data
      });
    },
});
```

## Usage

You can manually track events with methods provided by the `keen`-service:

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
If you want to send an event immediately, you can pass an optional third parameter `true`:

```js
this.get('keen').sendEvent('button-click', { otherData: 1 }, true);
```

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
