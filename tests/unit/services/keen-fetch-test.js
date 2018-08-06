import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';
import { set } from '@ember/object';
import { Promise } from 'rsvp';

module('Unit | Service | keen-fetch', function(hooks) {
  setupTest(hooks);

  test('_getFetchOptions works', function(assert) {
    let service = this.owner.lookup('service:keen-fetch');

    let result = service._getFetchOptions('https://test.com', { data: true }, 'TEST-KEY', {
      test: 1,
      sub: {
        test: 2
      },
      headers: {
        other: true
      }
    });
    assert.deepEqual(result, {
      method: 'POST',
      mode: 'cors',
      body: JSON.stringify({ data: true }),
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        other: true
      },
      test: 1,
      sub: {
        test: 2
      }
    });
  });

  test('_getFetchUrl works', function(assert) {
    let service = this.owner.lookup('service:keen-fetch');

    let result = service._getFetchUrl('https://test.com', { data: true }, 'TEST-KEY', {
      test: 1,
      sub: {
        test: 2
      },
      headers: {
        other: true
      }
    });
    assert.equal(result, 'https://test.com?api_key=TEST-KEY');
  });

  test('makeRequest works', async function(assert) {
    let service = this.owner.lookup('service:keen-fetch');
    set(service, '_fetch', function() {
      return new Promise((resolve) => {
        resolve({
          json() {
            return { created: true };
          }
        });
      });
    });

    let result = await service.makeRequest('https://test.com', { data: true }, 'TEST-KEY');
    assert.deepEqual(result, { created: true });
  });

  test('makeRequest works with a rejecting promise', async function(assert) {
    let service = this.owner.lookup('service:keen-fetch');
    set(service, '_fetch', function() {
      return new Promise((resolve, reject) => {
        reject('test error');
      });
    });

    try {
      await service.makeRequest('https://test.com', { data: true }, 'TEST-KEY');
    } catch(e) {
      assert.equal(e, 'test error');
    }
  });

});

