import { typeOf as getTypeOf } from '@ember/utils';

function isObject(obj) {
  return getTypeOf(obj) === 'object';
}

function isArray(obj) {
  return getTypeOf(obj) === 'array';
}

function isCloneableInstance(obj) {
  return getTypeOf(obj) === 'instance' && getTypeOf(obj.clone) === 'function';
}

/**
 * Deep-merge objects without mutating them.
 * In contrast to e.g. $.extend(), this will NOT mutate the first given parameter, but just return the merged object.
 *
 * @namespace EmberCropsterCommon.Util
 * @method mergeDeep
 * @param {...Object} objects A list of objects to merge
 * @return {Object} The merged object
 * @public
 */
export default function mergeDeep(...objects) {
  return objects.reduce((prev, obj) => {
    Object.keys(obj).forEach((key) => {
      let pVal = prev[key];
      let oVal = obj[key];

      prev[key] = mergeValues(pVal, oVal);
    });

    return prev;
  }, {});
}

function mergeValues(pVal, oVal) {
  if (isArray(oVal)) {
    return mergeArrays(pVal, oVal);
  }
  if (isObject(oVal)) {
    return mergeObjects(pVal, oVal);
  }
  if (isCloneableInstance(oVal)) {
    return oVal.clone();
  }
  return oVal;
}

function mergeArrays(pVal, oVal) {
  let arr = [];
  if (isArray(pVal)) {
    arr = arr.concat(...pVal);
  }

  if (isArray(oVal)) {
    arr = arr.concat(...oVal);
  }
  return arr;
}

function mergeObjects(pVal, oVal) {
  if (isObject(pVal)) {
    return mergeDeep(pVal, oVal);
  }

  return mergeDeep(oVal);
}
