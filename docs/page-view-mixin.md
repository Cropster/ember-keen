# Page View Mixin

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

See [this page](performance.md) for further information about the page load & performance tracking.
