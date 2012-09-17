/**
 * Module dependencies
 */
var util = require('util'),
    _ = require('underscore'),
    mocker = require('./utils/mocker');

/**
 * Wrapper Model Tests: Base
 */
var Wrapper = require('../lib/wrapper');

exports['a wrapper can be converted to a view object'] = {
  setUp: function(done){
    var self = this;
    
    var test = self;
    
    self.mocks = {};
    
    function NewWrapper() {  
    }

    NewWrapper.prototype = new Wrapper();    
    
    NewWrapper.prototype._viewTemplate = {
      defaultTopItem: true,
      anotherDefaultTopItem: true      
    }
    
    var viewOpsFunctions = {
      defaultTopItem: function(){
        return self.defaultTopItem;
      },
      
      anotherDefaultTopItem: function(self, done){
        return done(null, test.anotherDefaultTopItem);
      },
      
      nonDefaultTopItem: function(done){
        return done(null, test.nonDefaultTopItem);
      }
    }
    
    NewWrapper.prototype._viewOps = {
      defaultTopItem: function(){
        // Signature for synchronous
        return viewOpsFunctions.defaultTopItem.apply(this, arguments);
      },
      
      anotherDefaultTopItem: function(self, done){
        // Signature for async with self
        return viewOpsFunctions.anotherDefaultTopItem.apply(this, arguments);        
      },
      
      nonDefaultTopItem: function(done){
        // Signature for async without self
        return viewOpsFunctions.nonDefaultTopItem.apply(this, arguments);         
      }      
    }  

    self.defaultTopItem = 1;
    self.anotherDefaultTopItem = 2;
    self.nonDefaultTopItem = 3;
    
    self.NewWrapper = NewWrapper;
    
    self.mocks.defaultTopItem = mocker.mock(viewOpsFunctions, 'defaultTopItem');
    self.mocks.anotherDefaultTopItem = mocker.mock(viewOpsFunctions, 'anotherDefaultTopItem');
    self.mocks.nonDefaultTopItem = mocker.mock(viewOpsFunctions, 'nonDefaultTopItem');

    self.mocks._mergedTemplate = mocker.mock(NewWrapper.prototype, '_mergedTemplate');
    self.mocks._valueToViewObject = mocker.mock(NewWrapper.prototype, '_valueToViewObject');
    
    done();
  },
  
  tearDown: function(done) {
    var self = this;

    _.invoke(self.mocks, 'restore');

    done();
  },
  
  'using default request template': function(test){
    var self = this;
  
    var newInstance = new self.NewWrapper();
    
    newInstance.toViewObject(null, function(err, viewObject){
      if (err) return test.done(err);

      test.same(viewObject.defaultTopItem, 1);
      test.same(viewObject.anotherDefaultTopItem, 2);
      test.same(viewObject.nonDefaultTopItem, undefined);
      
      test.ok(self.mocks.defaultTopItem.calledOn(newInstance));
      test.ok(self.mocks.anotherDefaultTopItem.calledOn(newInstance));
      test.ok(!self.mocks.nonDefaultTopItem.called);
      
      test.same(self.mocks._mergedTemplate.callCount, 1);
      test.ok(self.mocks._mergedTemplate.calledWith(null));
      
      test.ok(self.mocks._valueToViewObject.alwaysCalledOn(newInstance));
      test.ok(self.mocks._valueToViewObject.calledWith(true, self.defaultTopItem));      
      test.ok(self.mocks._valueToViewObject.calledWith(true, self.anotherDefaultTopItem));      
      
      test.done();
    });
  },
  
  'including non-default in request template, excluding default': function(test) {
    var self = this;
    
    var newInstance = new self.NewWrapper();

    var template = {
      defaultTopItem: false,
      nonDefaultTopItem: {}
    };

    newInstance.toViewObject(template, function(err, viewObject){
      if (err) return test.done(err);

      test.same(viewObject.defaultTopItem, undefined);
      test.same(viewObject.anotherDefaultTopItem, 2);
      test.same(viewObject.nonDefaultTopItem, 3);

      test.ok(!self.mocks.defaultTopItem.called);      
      test.ok(self.mocks.anotherDefaultTopItem.calledOn(newInstance));
      test.ok(self.mocks.nonDefaultTopItem.calledOn(newInstance));
      
      test.same(self.mocks._mergedTemplate.callCount, 1);
      test.ok(self.mocks._mergedTemplate.calledWith(template));      
      
      test.ok(self.mocks._valueToViewObject.alwaysCalledOn(newInstance));
      test.ok(self.mocks._valueToViewObject.calledWith(true, self.anotherDefaultTopItem));      
      test.ok(self.mocks._valueToViewObject.calledWith({}, self.nonDefaultTopItem));
      
      test.done();
    });
  },
  
  '_mergedTemplate': {    
    'outputs a new object, with false passed': function(test){
      var self = this;
      
      var newInstance = new self.NewWrapper();      
      
      var _viewTemplate = newInstance._viewTemplate = {
        first: 'other'
      };
      
      newInstance._mergedTemplate(false, function(err, mergedTemplate){
        if (err) return test.done(err);
        
        test.notEqual(_viewTemplate, mergedTemplate);
        test.done();
      });
    },
    
    'outputs a new object, with true passed': function(test){
      var self = this;
      
      var newInstance = new self.NewWrapper();      
      
      var _viewTemplate = newInstance._viewTemplate = {
        first: 'other'
      };
      
      newInstance._mergedTemplate(true, function(err, outputSame){
        if (err) return test.done(err);
        
        test.notEqual(_viewTemplate, outputSame);      
        test.same(_viewTemplate, outputSame);
        test.done();
      });
    },
    
    'outputs a new object, with template passed': function(test){
      var self = this;
      
      var newInstance = new self.NewWrapper();      
      
      var toMerge = {
        second: 'other'
      };      
      
      var _viewTemplate = newInstance._viewTemplate = {
        first: 'other'
      };
      
      newInstance._mergedTemplate(toMerge, function(err, outputMerged){
        if (err) return test.done(err);
        
        var expectedMerged = {
          first: 'other',
          second: 'other'
        };

        test.same(expectedMerged, outputMerged);
        test.done();
      });
    },    
    
    'includes all ops when passed a wildcard': {
      setUp: function(done){
        var self = this;

        var newInstance = self.newInstance = new self.NewWrapper();      

        var _viewTemplate = newInstance._viewTemplate = {
          first: true,
          second: {
            id: false
          }
        };

        var _viewOps = newInstance._viewOps = {
          first: function(done){ done() },
          second: function(done){ done() },
          another: function(done){ done() }
        };
        
        var expectedMerged = self.expectedMerged = {
          first: true,
          second: {
            id: false
          }
        };        
        
        done();        
      },
      
      'as string': function(test){
        var self = this;
        
        self.newInstance._mergedTemplate('*', function(err, outputMerged){
          if (err) return test.done(err);

          self.expectedMerged.first = '*';
          self.expectedMerged.another = '*';
          self.expectedMerged.second['*'] = true;

          test.same(self.expectedMerged, outputMerged);

          test.done();          
        });
      },
      
      'as object property': function(test){
        var self = this;
        
        var mergedTemplate = {
              first: false,
              '*': true
            };
            
        self.newInstance._mergedTemplate(mergedTemplate, function(err, outputMerged){
          if (err) return test.done(err);
          
          self.expectedMerged.first = false;
          self.expectedMerged.another = {
            '*': true
          };
          self.expectedMerged.second['*'] = true;        

          test.same(self.expectedMerged, outputMerged);

          test.done();          
        });
      }
    }
  },
  
  '_opToViewObject': {
    'can map using op as path': function(test) {
      var self = this;
      
      var newInstance = new self.NewWrapper();
      
      newInstance.specialObj = {
        forMapping: 'values'
      };
      
      newInstance._viewOps = {
        something: 'specialObj.forMapping'
      };
      
      var opTemplate = {};
      
      newInstance._opToViewObject(opTemplate, 'something', function(err, viewObject){
        if (err) return test.done(err);

        var expectedViewObject = 'values';
        
        test.same(expectedViewObject, viewObject);
        
        test.ok(self.mocks._valueToViewObject.alwaysCalledOn(newInstance));
        test.ok(self.mocks._valueToViewObject.calledWith(opTemplate, expectedViewObject));        

        test.done();
      });      
    },
  }
}

exports['a wrapper can define inheriting object'] = {
  setUp: function(done) {
    var self = this;
    
    self.mocks = {};
    
    var NewParent = self.NewParent = function NewParent(){};
    
    util.inherits(NewParent, Wrapper);    
    
    var NewWrapper = self.NewWrapper = function NewWrapper(){};
    
    util.inherits(NewWrapper, NewParent);
        
    done();
  },
  
  tearDown: function(done) {
    var self = this;

    _.invoke(self.mocks, 'restore');

    done();
  },  
  
  'using __defineInheritingObject__': function(test) {
    var self = this;

    var key = '_specialKey';

    var NewParent = self.NewParent;

    var parentViewOps = {
      firstOne: 'first.mapping',      
      toOverride: 'override.parent'
    };
    NewParent.prototype.__defineInheritingObject__(key, parentViewOps);
    
    var NewWrapper = self.NewWrapper;

    var childViewOps = {
      newOne: 'another.mapping',
      toOverride: 'override.child'
    };
    NewWrapper.prototype.__defineInheritingObject__(key, childViewOps);
    
    var instance = new NewWrapper();
    
    test.notEqual(instance[key], parentViewOps);
    test.same(instance[key].firstOne, parentViewOps.firstOne);
    test.same(instance[key].newOne, childViewOps.newOne);
    test.same(instance[key].toOverride, childViewOps.toOverride);
    
    test.done();
  },

  'user': {
    setUp: function(done) {
      var self = this;
      
      self.mocks.__defineInheritingObject__ = mocker.mock(Wrapper.prototype, '__defineInheritingObject__', function(){});
      
      done();      
    },
    
    '__defineViewOps__': function(test) {
      var self = this;
      
      var NewWrapper = self.NewWrapper;

      var viewOps = {
        newOne: 'another.mapping'
      };
      NewWrapper.prototype.__defineViewOps__(viewOps);
      
      test.ok(self.mocks.__defineInheritingObject__.calledWith('_viewOps', viewOps));
      
      test.done();
    },
    
    '__defineViewTemplate__': function(test) {
      var self = this;
      
      var NewWrapper = self.NewWrapper;

      var viewTemplate = {
        newOne: true
      };
      NewWrapper.prototype.__defineViewTemplate__(viewTemplate);
      
      test.ok(self.mocks.__defineInheritingObject__.calledWith('_viewTemplate', viewTemplate));
      
      test.done();
    },       
  }
}