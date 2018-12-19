# Page View Tracking

You can activate page view tracking across your application by calling the `keen.trackAllPageViews()` method of the `keen` service. Usually, you'll want to call this in your application route, like this:

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

Note that this depends on new features of the router service added in ember-source@3.6 - so you'll need to be on at least that version for this feature to work.

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
