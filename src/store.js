var _ = require('lodash');
var uriTemplates = require('uri-templates');
var uuidV4 = require('uuid/v4');

function createCollection(Model) {

  var actions = [];
  var methods = {};
  var internalState = [];
  var hasMutated = true;
  var cachedResult;
  var subscribers = [];

  function createRegister(verb) {
    return function(template, action) {
      actions.push({
        verb: verb,
        template: template,
        action: action
      });

    };
  }

  var collectionStore = {
    get: createRegister('GET'),
    delete: createRegister('DELETE'),
    use: function(verbAndTemplate, action) {
      var verb = verbAndTemplate.split(' ').shift().toUpperCase();
      var template = verbAndTemplate.slice(verb.length + 1);
      actions.push({
        verb: verb,
        template: template,
        action: action
      });
    },
    subscribe: function(func) {
      subscribers.push(func);
    },
    getState: function() {
      if (!hasMutated && cachedResult) return cachedResult;

      hasMutated = false;
      cachedResult = internalState;

      return internalState;
    },
    dispatch: dispatch
  };

  function notify() {
    subscribers.forEach(function(func) {
      func();
    });
  }

  function createRepresentation(data, index) {
    // var mod = new Model(data);
    data.links = {
      self: '/' + data.id
    };

    return data;
  }

  function dispatch(request, payload) {
    var verb = request.split(' ').shift().toUpperCase();
    var url = request.slice(verb.length + 1);

    var isGet = verb === 'GET';

    var action = _.find(actions, function(actionObject) {
      return (actionObject.verb === verb) && (!_.isEmpty(uriTemplates(actionObject.template).fromUri(url)) || url === actionObject.template);
    });

    if (action) {
      var result = action.action(internalState, {
        body: payload,
        params: uriTemplates(action.template).fromUri(url)
      });

      if (_.isFunction(result.then)) {
        return result.then(function(res) {
          internalState = res.map(createRepresentation);

          if (!isGet) {
            hasMutated = true;

            notify();
          }
          return internalState;
        });
      }

      internalState = result;
      if (!isGet) {
        hasMutated = true;
        notify();
      }

      return result.map(createRepresentation);
    } else {
      throw new Error('No controller found');
    }
  }


  return collectionStore;
}


function createStore(Model, initialState) {

  var paths = {};
  var mountPoints = {};
  var cache = {};
  var hasMutated = true;
  var subscribers = [];

  var store = {
    mountCollection: function(path, mountPoint, collection) {
      paths[path] = collection;
      mountPoints[path] = mountPoint;
      collection.subscribe(function() {
        notify();
      });
    },
    // mount: function(path, handler) {
    //   paths[path] = handler;
    // },
    getState: function() {
      return _.reduce(paths, function(all, child, path) {
        return _.set(all, mountPoints[path], child.getState());
      }, {});
    },
    subscribe: function(func) {
      subscribers.push(func);
    },
    dispatch: dispatch
  };

  function notify() {
    subscribers.forEach(function(func) {
      func();
    });
  }

  function expandLinks(data, path) {
    data.links.self = path + data.links.self;
    return data;
  }


  function dispatch(request, payload) {
    var verb = request.split(' ').shift().toUpperCase();
    var url = request.slice(verb.length + 1);

    var isGet = verb === 'GET';

    /**
     *Finn path som url starter med
     *Fjern path fra url
     *dispatch til collection
     */

    var path = _.findKey(paths, function(handler, path) {
      return _.startsWith(url, path);
    });

    var controller = paths[path];

    if (!controller) throw new Error('Could not find controller for path ' + path);

    if (_.isFunction(controller)) {
      return controller(request, payload);
    }

    var result = controller.dispatch(request.replace(path, '/'), payload);

    if (!result) throw new Error('No result from the action. Make sure you return something.');

    if (_.isFunction(result.then)) {

      var newRes = result.then(function(res) {
        newRes.isPending = false;
        return res.map(function(data) {
          return expandLinks(data, path);
        });
      });

      newRes.isPending = true;

      return newRes;
    }

    if (Array.isArray(result)) {
      return result.map(function(data) {
        return expandLinks(data, path);
      });

    } else {
      return expandLinks(result, path);
    }

  }

  return store;
}

module.exports = {
  createCollection: createCollection,
  createStore: createStore
}
