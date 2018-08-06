# Performance Tracking

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
