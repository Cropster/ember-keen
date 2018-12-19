import { module, test } from 'qunit';
import { visit, click } from '@ember/test-helpers';
import { setupApplicationTest } from 'ember-qunit';

module('Acceptance | page view tracking', function(hooks) {
  setupApplicationTest(hooks);

  test('automated page view tracking works', async function(assert) {
    let keen = this.owner.lookup('service:keen');

    /* eslint-disable camelcase */
    let expectedEventPayloads = [
      {
        page: 'index',
        query_params: {},
        previous_page: undefined
      },
      {
        page: 'index',
        query_params: { aa: 'test' },
        previous_page: { page: 'index', query_params: {} }
      },
      {
        page: 'index',
        query_params: { aa: 'test', bb: '1' },
        previous_page: { page: 'index', query_params: { aa: 'test' } }
      },
      {
        page: 'nested-route.index',
        query_params: {},
        previous_page: { page: 'index', query_params: { aa: 'test', bb: '1' } }
      },
      {
        page: 'nested-route.sub-route',
        query_params: {},
        previous_page: { page: 'nested-route.index', query_params: {} }
      },
      {
        page: 'index',
        query_params: {},
        previous_page: { page: 'nested-route.sub-route', query_params: {} }
      },
      {
        page: 'page-view',
        query_params: {},
        previous_page: { page: 'index', query_params: {} }
      }
    ];
    /* eslint-enable camelcase */

    keen.sendEvent = (eventName, eventData) => {
      assert.equal(eventName, 'page-view', 'correct event name is sent');

      let nextEvent = expectedEventPayloads.shift();
      delete eventData.performance;

      assert.deepEqual(eventData, nextEvent, 'correct event data is sent');
    };

    await visit('/');
    await visit('/?aa=test');
    await visit('/?aa=test&bb=1');
    await visit('/nested-route');
    await visit('/nested-route/sub-route');
    await visit('/');
    await click('.page-view-link');

    assert.equal(expectedEventPayloads.length, 0, 'all events were sent');
  });
});
