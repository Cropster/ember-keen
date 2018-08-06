import EmberRouter from '@ember/routing/router';
import config from './config/environment';

const Router = EmberRouter.extend({
  location: config.locationType,
  rootURL: config.rootURL
});

Router.map(function() {
  this.route('page-view');

  this.route('nested-route', function() {
    this.route('sub-route');
  });
});

export default Router;
