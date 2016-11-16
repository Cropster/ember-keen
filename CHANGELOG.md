# Changelog

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
