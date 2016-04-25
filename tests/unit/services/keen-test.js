import { moduleFor, test } from 'ember-qunit';
import Ember from 'ember';

moduleFor('service:keen', 'Unit | Service | keen', {
  needs: ['service:keen-ajax']
});

const MockAjax = Ember.Object.create({
  post(url, options) {
    return Ember.RSVP.resolve({
      mock: true,
      url,
      options
    });
  }
});

test('it exists', function(assert) {
  let service = this.subject();
  assert.ok(service);
});

test('an error is thrown if projectId is not set', function(assert) {
  assert.expect(1);
  let service = this.subject({
    keenAjax: MockAjax,
    writeKey: 'TEST_WRITE_KEY'
  });

  let response = service.sendEvent('test-event');

  response.then(() => {
  }, (err) => {
    assert.equal(err, 'Cannot write Keen.IO event.');
  });
});

test('an error is thrown if writeKey is not set', function(assert) {
  assert.expect(1);
  let service = this.subject({
    keenAjax: MockAjax,
    projectId: 'TEST_PROJECT_ID'
  });

  let response = service.sendEvent('test-event');

  response.then(() => {
  }, (err) => {
    assert.equal(err, 'Cannot write Keen.IO event.');
  });
});

test('sending an event immediately works', function(assert) {
  assert.expect(2);
  let service = this.subject({
    keenAjax: MockAjax,
    projectId: 'TEST_PROJECT_ID',
    writeKey: 'TEST_WRITE_KEY'
  });

  let response = service.sendEvent('test-event', { myProperty: true }, true);
  response.then((response) => {
    assert.equal(response.url, '/TEST_PROJECT_ID/events/test-event?api_key=TEST_WRITE_KEY', 'Request URL is built correctly.');
    assert.equal(response.options.data.myProperty, true, 'data is correctly passed through');
  });
});

test('sending events via the queue works', function(assert) {
  assert.expect(7);

  let mockAjaxResponse = null;
  let MockAjax = Ember.Object.create({
    post(url, options) {
      mockAjaxResponse = {
        mock: true,
        url,
        options
      };
      return Ember.RSVP.resolve(mockAjaxResponse);
    }
  });

  let service = this.subject({
    keenAjax: MockAjax,
    projectId: 'TEST_PROJECT_ID',
    writeKey: 'TEST_WRITE_KEY',
    queueTime: 1
  });

  service.sendEvent('test-event', { myProperty: 1 });
  service.sendEvent('test-event', { myProperty: 2 });
  service.sendEvent('test-event', { myProperty: 1 });
  service.sendEvent('test-event-2', { myProperty: 3 });

  Ember.run.later(this, () => {
    assert.equal(mockAjaxResponse.url, '/TEST_PROJECT_ID/events?api_key=TEST_WRITE_KEY', 'Request URL is built correctly.');
    assert.equal(mockAjaxResponse.options.data['test-event'].length, 3);
    assert.equal(mockAjaxResponse.options.data['test-event'][0].myProperty, 1);
    assert.equal(mockAjaxResponse.options.data['test-event'][1].myProperty, 2);
    assert.equal(mockAjaxResponse.options.data['test-event'][2].myProperty, 1);
    assert.equal(mockAjaxResponse.options.data['test-event-2'].length, 1);
    assert.equal(mockAjaxResponse.options.data['test-event-2'][0].myProperty, 3);
  }, 1);
});

test('sending multiple events immediately works', function(assert) {
  assert.expect(7);
  let service = this.subject({
    keenAjax: MockAjax,
    projectId: 'TEST_PROJECT_ID',
    writeKey: 'TEST_WRITE_KEY'
  });

  let response = service.sendEvents({
    'test-event': [
      { myProperty: 1 },
      { myProperty: 2 },
      { myProperty: 1 }
    ],
    'test-event-2': [
      { myProperty: 3 }
    ]
  });
  response.then((response) => {
    assert.equal(response.url, '/TEST_PROJECT_ID/events?api_key=TEST_WRITE_KEY', 'Request URL is built correctly.');
    assert.equal(response.options.data['test-event'].length, 3);
    assert.equal(response.options.data['test-event'][0].myProperty, 1);
    assert.equal(response.options.data['test-event'][1].myProperty, 2);
    assert.equal(response.options.data['test-event'][2].myProperty, 1);
    assert.equal(response.options.data['test-event-2'].length, 1);
    assert.equal(response.options.data['test-event-2'][0].myProperty, 3);
  });
});
