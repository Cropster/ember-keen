import { moduleFor, test } from 'ember-qunit';
import Ember from 'ember';

moduleFor('service:keen', 'Unit | Service | keen', {});

test('it exists', function(assert) {
  let service = this.subject();
  assert.ok(service);
});

test('an error is thrown if projectId is not set', function(assert) {
  assert.expect(1);

  let mockAjaxResponse = null;
  let service = this.subject({
    _post(url, data) {
      mockAjaxResponse = {
        mock: true,
        url,
        data
      };
      return Ember.RSVP.resolve(mockAjaxResponse);
    },
    writeKey: 'TEST_WRITE_KEY'
  });

  let response = service.sendEvent('test-event');
  assert.equal(response, false);
});

test('an error is thrown if writeKey is not set', function(assert) {
  assert.expect(1);

  let mockAjaxResponse = null;
  let service = this.subject({
    _post(url, data) {
      mockAjaxResponse = {
        mock: true,
        url,
        data
      };
      return Ember.RSVP.resolve(mockAjaxResponse);
    },
    projectId: 'TEST_PROJECT_ID'
  });

  let response = service.sendEvent('test-event');
  assert.equal(response, false);
});

test('sending an event immediately works', function(assert) {
  assert.expect(3);

  let mockAjaxResponse = null;
  let service = this.subject({
    _post(url, data) {
      mockAjaxResponse = {
        mock: true,
        url,
        data
      };
      return Ember.RSVP.resolve(mockAjaxResponse);
    },
    projectId: 'TEST_PROJECT_ID',
    writeKey: 'TEST_WRITE_KEY'
  });

  let response = service.sendEvent('test-event', { myProperty: true }, true);
  assert.equal(response, true, 'method returns true');

  Ember.run.later(this, () => {
    assert.equal(mockAjaxResponse.url, 'https://api.keen.io/3.0/projects/TEST_PROJECT_ID/events/test-event?api_key=TEST_WRITE_KEY', 'Request URL is built correctly.');
    assert.equal(mockAjaxResponse.data.myProperty, true, 'data is correctly passed through');
  }, 1);
});

test('sending events via the queue works', function(assert) {
  assert.expect(7);

  let mockAjaxResponse = null;
  let service = this.subject({
    _post(url, data) {
      mockAjaxResponse = {
        mock: true,
        url,
        data
      };
      return Ember.RSVP.resolve(mockAjaxResponse);
    },
    projectId: 'TEST_PROJECT_ID',
    writeKey: 'TEST_WRITE_KEY',
    queueTime: 1
  });

  service.sendEvent('test-event', { myProperty: 1 });
  service.sendEvent('test-event', { myProperty: 2 });
  service.sendEvent('test-event', { myProperty: 1 });
  service.sendEvent('test-event-2', { myProperty: 3 });

  Ember.run.later(this, () => {
    assert.equal(mockAjaxResponse.url, 'https://api.keen.io/3.0/projects/TEST_PROJECT_ID/events?api_key=TEST_WRITE_KEY', 'Request URL is built correctly.');
    assert.equal(mockAjaxResponse.data['test-event'].length, 3);
    assert.equal(mockAjaxResponse.data['test-event'][0].myProperty, 1);
    assert.equal(mockAjaxResponse.data['test-event'][1].myProperty, 2);
    assert.equal(mockAjaxResponse.data['test-event'][2].myProperty, 1);
    assert.equal(mockAjaxResponse.data['test-event-2'].length, 1);
    assert.equal(mockAjaxResponse.data['test-event-2'][0].myProperty, 3);
  }, 1);
});

test('sending multiple events immediately works', function(assert) {
  assert.expect(8);

  let mockAjaxResponse = null;
  let service = this.subject({
    _post(url, data) {
      mockAjaxResponse = {
        mock: true,
        url,
        data
      };
      return Ember.RSVP.resolve(mockAjaxResponse);
    },
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

  assert.equal(response, true, 'method returns true');

  Ember.run.later(() => {
    assert.equal(mockAjaxResponse.url, 'https://api.keen.io/3.0/projects/TEST_PROJECT_ID/events?api_key=TEST_WRITE_KEY', 'Request URL is built correctly.');
    assert.equal(mockAjaxResponse.data['test-event'].length, 3);
    assert.equal(mockAjaxResponse.data['test-event'][0].myProperty, 1);
    assert.equal(mockAjaxResponse.data['test-event'][1].myProperty, 2);
    assert.equal(mockAjaxResponse.data['test-event'][2].myProperty, 1);
    assert.equal(mockAjaxResponse.data['test-event-2'].length, 1);
    assert.equal(mockAjaxResponse.data['test-event-2'][0].myProperty, 3);
  }, 1);
});
