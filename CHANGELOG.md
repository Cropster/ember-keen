# Changelog

v2.0.0

* Use ember-fetch instead of $.ajax 
  * Make sure to run `ember g ember-keen` after upgrading!
* `query` does not return a DS.PromiseObject anymore (but a plain promise that resolves with a POJO)
* Config has been changed: `ENV.KEEN_PROJECT_ID` -> `ENV.keen.projectId`, `ENV.KEEN_WRITE_KEY` -> `ENV.keen.writeKey`, `ENV.KEEN_READ_KEY` -> `ENV.keen.readKey`. The old forms will still work as a fallback. 
* [INTERNAL] Update dependencies & clean up codebase

Private breaking changes - if you extended the service, these might affect you:

* Rename `_buildSendURL` to `_buildWriteUrl`
* Rename `_buildReadURL` to `_buildReadUrl`
* `_prepareEventData` now returns the merged data instead of mutating the given data
* `_makeRequest` has a different parameter order: `_makeRequest(url, data = {}, apiKey = null, extraOptions = {})`.
  * It uses an `keenFetch` service, which provides a `makeRequest`, `_getFetchOptions` and `_getFetchUrl` method.
  * If you do not want to use ember-fetch, you can overwrite either the `keen-fetch` service or the `_makeRequest` method on the `keen` service. 
* We do not use the 'Authorization' header as that does not work with CORS & the Keen.io API. Instead, we append the api_key as query parameter.

v0.4.1

* Also track the previous page in keen-track-pageview mixin to allow tracking of user flow

v0.4.0

* Add query() method to get data from keen
* Add sendEventImmediately() method
* Deprecate usage of sendInstantly option on sendEvent

v0.3.1

* Add `crossDomain: true` to `$.post` configuration

v0.3.0

* Remove ember-ajax dependency (use Ember.$.ajax instead)
* Fix CORS issues with Keen-API

v0.2.0

* Change `sendEvent` & `sendEvents` methods to return true/false instead of a promise
* Add `mergeData` property to `keen` service to allow easy addition of user/browser data to all events

v0.1.0

* Initial Release
