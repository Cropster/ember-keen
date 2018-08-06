import mergeDeep from 'ember-keen/utils/merge-deep';
import { module, test } from 'qunit';
import EmberObject, { set } from '@ember/object';

module('Unit | Utility | mergeDeep', function() {

  test('it works with basic objects', function(assert) {
    let result = mergeDeep({ a: 1, c: 1 }, { b: 2, a: 2 });
    assert.deepEqual(result, { a: 2, b: 2, c: 1 });
  });

  test('it works with nested objects', function(assert) {
    let obj1 = {
      a: 1,
      b: {
        b1: 1,
        b2: 1
      },
      c: {
        c1: 1
      },
      d: {
        d1: 1
      },
      e: {
        e1: 1,
        e2: {
          e21: 1,
          e22: {
            e221: 1
          }
        }
      }
    };

    let obj2 = {
      b: {
        b2: 2,
        b3: 2
      },
      c: 2,
      e: {
        e2: {
          e22: {
            e222: 2
          }
        }
      }
    };

    let result = mergeDeep(obj1, obj2);
    assert.deepEqual(result, {
      a: 1,
      b: {
        b1: 1,
        b2: 2,
        b3: 2
      },
      c: 2,
      d: {
        d1: 1
      },
      e: {
        e1: 1,
        e2: {
          e21: 1,
          e22: {
            e221: 1,
            e222: 2
          }
        }
      }
    });
  });

  test('it works with nested arrays', function(assert) {
    let obj1 = {
      a: 1,
      b: {
        b1: 1,
        b2: 1
      },
      c: [1, 2]
    };

    let obj2 = {
      b: {
        b2: 2,
        b3: 2
      },
      c: [2, 3]
    };

    // Note: It appends arrays, it does not check for equal content
    let result = mergeDeep(obj1, obj2);
    assert.deepEqual(result, {
      a: 1,
      b: {
        b1: 1,
        b2: 2,
        b3: 2
      },
      c: [1, 2, 2, 3]
    });
  });

  test('it works with multiple nested objects', function(assert) {
    let obj1 = {
      a: 1,
      b: {
        b1: 1,
        b2: 1
      },
      c: {
        c1: 1
      },
      d: {
        d1: 1
      },
      e: {
        e1: 1,
        e2: {
          e21: 1,
          e22: {
            e221: 1
          }
        }
      }
    };

    let obj2 = {
      b: {
        b2: 2,
        b3: 2
      },
      c: 2,
      e: {
        e2: {
          e22: {
            e222: 2
          }
        }
      }
    };

    let obj3 = {
      a: 3,
      e: {
        e2: {
          e22: {
            e223: 3
          }
        }
      }
    };

    let result = mergeDeep(obj1, obj2, obj3);
    assert.deepEqual(result, {
      a: 3,
      b: {
        b1: 1,
        b2: 2,
        b3: 2
      },
      c: 2,
      d: {
        d1: 1
      },
      e: {
        e1: 1,
        e2: {
          e21: 1,
          e22: {
            e221: 1,
            e222: 2,
            e223: 3
          }
        }
      }
    });
  });

  test('it does not mutate the given object', function(assert) {
    let obj1 = {
      a: 1,
      b: 1
    };

    let obj2 = {
      a: 2
    };

    let result = mergeDeep(obj1, obj2);
    assert.deepEqual(result, { a: 2, b: 1 });
    assert.deepEqual(obj1, { a: 1, b: 1 });
    assert.deepEqual(obj2, { a: 2 });
  });

  test('it works with one nested object', function(assert) {
    let obj1 = {
      a: 1,
      b: {
        b1: 1,
        b2: 1
      },
      c: {
        c1: 1
      },
      d: {
        d1: 1
      },
      e: {
        e1: 1,
        e2: {
          e21: 1,
          e22: {
            e221: 1
          }
        }
      }
    };

    let result = mergeDeep(obj1);

    obj1.e.e1 = 2;

    assert.deepEqual(result, {
      a: 1,
      b: {
        b1: 1,
        b2: 1
      },
      c: {
        c1: 1
      },
      d: {
        d1: 1
      },
      e: {
        e1: 1,
        e2: {
          e21: 1,
          e22: {
            e221: 1
          }
        }
      }
    });
  });

  test('it works with one array', function(assert) {
    let obj1 = {
      a: 1,
      b: [1, 2]
    };

    let result = mergeDeep(obj1);

    obj1.b.push(3);

    assert.deepEqual(result, {
      a: 1,
      b: [1, 2]
    });
  });

  test('it works with cloneable instances', function(assert) {
    assert.expect(3);

    let DummyClass = EmberObject.extend({
      prop: true,

      clone() {
        assert.ok('clone is called');
        return DummyClass.create({ prop: this.prop });
      }
    });

    let obj1 = {
      a: DummyClass.create()
    };

    let result = mergeDeep(obj1);

    set(obj1.a, 'prop', false);

    assert.notEqual(obj1.a, result.a, 'object instances are not the same');
    assert.equal(result.a.prop, true, 'instance is independent');
  });

  test('it works with non-cloneable instances', function(assert) {
    let DummyClass = EmberObject.extend({
      prop: true
    });

    let obj1 = {
      a: DummyClass.create()
    };

    let result = mergeDeep(obj1);

    set(obj1.a, 'prop', false);

    assert.equal(result.a.prop, false, 'instance is re-used if no clone method is available independent');
  });

});
