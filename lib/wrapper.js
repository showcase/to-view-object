/**
 * Modules
 */
var util = require('util'),
    _ = require('underscore')
    async = require('async');
    
// Add mixins to Underscore
_.mixin(require('./mixins'));

/**
 * Base for Wrappers
 * @api public
 */
var Wrapper = module.exports = function Wrapper() {
}
util.inherits(Wrapper, require('events').EventEmitter);

/**
 * Included in template per default
 */
Wrapper.prototype._viewTemplate = { 
}

/**
 * Any of these can be requested in a template
 */
Wrapper.prototype._viewOps = {
}

/**
 * For defining inheriting objects on subclass prototypes
 */
Wrapper.prototype.__defineViewTemplate__ = function(obj) {
  this.__defineInheritingObject__('_viewTemplate', obj);
}

Wrapper.prototype.__defineViewOps__ = function(obj) {
  this.__defineInheritingObject__('_viewOps', obj);
}

Wrapper.prototype.__defineInheritingObject__ = function(key, obj) {
  var Super = this.constructor.super_;
  
  this[key] = _.extend({}, Super.prototype[key], obj);  
}

/**
 * Recursively converts this wrapper to a view object based on template
 *
 * @param {Object} requestTemplate   template to merge with default template, 
                                     or `null` to just use the default
 * @param {Function} cb(err, viewObject)
 * @api public
 */
Wrapper.prototype.toViewObject = function(requestTemplate, cb) {
  var self = this;

  // Error when called with old signature  
  if (_.isFunction(requestTemplate) || _.isArray(requestTemplate)) throw new Error(self.constructor.name + '.toViewObject called without template');
  if (!_.isFunction(cb)) throw new Error(self.constructor.name + '.toViewObject called without callback');

  // Merge template with defaults
  self._mergedTemplate(requestTemplate, function(err, template) {
    if (err) return cb(err);
    
    var templateKeys = _.keys(template);

    async.map(templateKeys, function(key, done){    
      self._opToViewObject(template[key], key, done);
    }, function(err, results){
      if (err) return cb(err);

      var output = {};

      _.each(results, function(result, i){
        output[templateKeys[i]] = result;
      });

      cb(null, output);    
    });    
  })
}

/**
 * Merges a specified template into the viewTemplate
 *
 *
 * @param {Mixed} template  
 *  - {String}  can be '*' for including all available ops on this item and children
 *  - {Object}  with nested values to include/exclude
 *                key with either '*' = true does same as string
 *                   
 * @return {Object}
 * @api private
 */
Wrapper.prototype._mergedTemplate = function(template, cb) {
  var self = this;
  
  if (_.isObject(template)) {
    if (template['*']) {
      var subTemplate = template['*'];
            
      template = _.extend({}, self._viewTemplate, template);
      delete(template['*']);
            
      _.each(self._opKeys(), function(key){
        if (_.isObject(template[key])) {
          template[key]['*'] = subTemplate;
        } else if (template[key] !== false){
          template[key] = {
            '*': subTemplate
          };
        }
      });
      
      return cb(null, template);
    }
    
    return cb(null, _.extend({}, self._viewTemplate, template));    
  } else if (_.isString(template)) {
    if (template == '*') {
      template = _.extend({}, self._viewTemplate);

      _.each(self._opKeys(), function(key){
        if (_.isObject(template[key])) {
          template[key]['*'] = true;
        } else {
          template[key] = '*';          
        }
      });
            
      return cb(null, template);
    }
  }
  
  return cb(null, _.extend({}, self._viewTemplate));      
}

Wrapper.prototype._opKeys = function(){
  return Object.keys(this._viewOps);
}

Wrapper.prototype._opToViewObject = function(opTemplate, key, cb) {
  var self = this;
  
  var op = self._viewOps[key];

  if (!opTemplate || !op) return cb();
  
  // Strings indicate a path to a value
  if (_.isString(op)) {
    // Get value on self
    return self._valueToViewObject(opTemplate, _.get(self, op), cb);
  }

  // Assume it is a function
  switch (op.length) {
    case 0:
      // Synchronous method
      self._valueToViewObject(opTemplate, op.call(self), cb);
      break;
    case 1:
      // Async using `this` and signature `fn(done) {}`
      op.call(self, done);
      break;
    case 2:
      // Async using signature `fn(self, done)`
      op.call(self, self, done);      
      break;
    default: 
      // Unexpected signature
      cb(new Error('Unexpected view op function signature'));
  }
  
  function done(err, value){
    if (err) return cb(err);
    
    self._valueToViewObject(opTemplate, value, cb);
  }
}

/**
 * Converts the value to a view object based on the template provided
 *
 * @param {Object} requestTemplate
 * @return {Mixed} value
 * @api private
 */
Wrapper.prototype._valueToViewObject = function(requestTemplate, value, cb) {
  var self = this;

  if (value === undefined) return cb();
  
  if (value && value.toViewObject) {
    // Call toViewObject on the value
    value.toViewObject(requestTemplate, cb);
  } else if (_.isArray(value)) {
    // Call self._valueToViewObject with requestTemplate and each item in array
    async.map(value, _.bind(self._valueToViewObject, self, requestTemplate), cb);
  } else {
    // Just return the value
    cb(null, value);
  }  
}