//Underscore mixins

/**
 * Get a deeply nested object property without throwing an error
 *
 * Usage:
 *      _.get(obj, 'foo.bar');
 *      _(obj).get('foo.bar');
 *
 * @param {Object} obj
 * @param {String} path   Path e.g.  'foo.bar.baz'
 * @return {Mixed}        Returns undefined if the property is not found
 */
exports.get = function getNested(obj, path, defaultValue) {
    var self = this;

    if (self.isUndefined(obj) || obj === null) return defaultValue;
    
    var fields = path.split(".");
    var result = obj;
    for (var i = 0, n = fields.length; i < n; i++) {
        if (!self.isObject(result) && !self.isArray(result)) {
          return (!self.isUndefined(defaultValue)) ? defaultValue : undefined;
        }      
      
        result = result[fields[i]];
    }
    return (self.isUndefined(result) && !self.isUndefined(defaultValue)) ? defaultValue : result;
};