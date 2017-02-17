var Store = require('../../src/store');
var expect = require('chai').expect;
var _ = require('lodash');

describe('store', function() {

  describe('getState', function() {
    var collection;
    var store;

    beforeEach(function() {
      collection = Store.createCollection(Todo);
      store = Store.createStore();
      store.mountCollection('/todos', 'todos', collection);
    });

    it('gets the state', function() {
      expect(store.getState()).to.eql({
        todos: []
      });
    });
  });

});

function Todo(state) {
  this.id = uuidV4();
  this.text = state.text;
  this.completed = state.completed || false;
}
