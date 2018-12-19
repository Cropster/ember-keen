import Route from '@ember/routing/route';

export default Route.extend({

  model() {
    let arr = [];
    for (let i = 0; i < 1000; i++) {
      arr.push({ name: `item #${i}` });
    }

    return arr;
  }

});
