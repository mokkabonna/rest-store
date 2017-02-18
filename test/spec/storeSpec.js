var Store = require('../../src/store');
var expect = require('chai').expect;
var _ = require('lodash');
var uuidV4 = require('uuid/v4');

describe('store', function() {
  var collection;
  var store;

  describe('getState', function() {

    beforeEach(function() {
      store = Store.createStore();
    });

    it('gets the state', function() {
      expect(store.getState()).to.eql({});
    });
  });

  describe('actions', function() {

    beforeEach(function() {
      collection = Store.createCollection(TodoRep);
      store = Store.createStore();
      store.mountCollection('/todos', 'todos', collection);

      collection.use('CREATE /', function(todos, req) {
        todos.push({
          text: req.body
        });
        return todos.slice(0);
      })
    });

    it('creates a todo', function() {
      store.dispatch('CREATE /todos', 'buy milk');
      expect(store.getState().todos.length).to.eql(1);
    });

  });

});

function Representation() {}

Representation.prototype = {
  addLink: function(type, url) {
    this.links = this.links || {};
    this.links[type] = url;
  }
};

function TodoRep(state) {
  this.id = uuidV4();
  this.text = state.text;
  this.completed = state.completed || false;

  this.addLink('self', '/' + this.id);
}

TodoRep.prototype = Object.create(Representation.prototype);
