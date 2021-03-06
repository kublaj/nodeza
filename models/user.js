"use strict";

/**
 * Module dependencies.
**/
var Base  = require('./base');
var bcrypt = require('bcrypt-nodejs');
var crypto = require('crypto');
var when = require('when');
var node = require('when/node');
var _ = require('lodash');
var Tokens = require('./token');


var User = Base.Model.extend({

  tableName: 'users',
  

  hasTimestamps: true,


  tokens: function() {
    return this.hasMany('Token');
  },


  role: function() {
    return this.belongsTo('Role');
  },


  events: function() {
    return this.hasMany('Events');
  },


  posts: function() {
    return this.hasMany('Posts');
  },



  generatePasswordHash: function (password) {
    var deferred = when.defer();
  
    bcrypt.genSalt(5, function(err, salt) {
      if (err) {
        deferred.reject(err);
      }
  
      bcrypt.hash(password, salt, null, function(err, hash) {
        if (err) {
          deferred.reject(err);
        }
        
        deferred.resolve(hash);
      });
    });
  
    return deferred.promise;
  },


  comparePassword: function(candidatePassword) {
    var deferred = when.defer();

    bcrypt.compare(candidatePassword, this.get('password'), function(err, isMatch) {
      if (err) {
        deferred.reject(err);
      }

      deferred.resolve(isMatch);
    });

    return deferred.promise;
  },


  gravatar: function(size, defaults) {
    size = size || 32;
    defaults = defaults || 'retro';
  
    if (!this.get('email')) {
      return 'https://gravatar.com/avatar/?s=' + size + '&d=' + defaults;
    }
  
    var md5 = crypto.createHash('md5').update(this.get('email'));
    
    return 'https://gravatar.com/avatar/' + md5.digest('hex').toString() + '?s=' + size + '&d=' + defaults;
  },


  saving: function (newObj, attr, options) {
    var self = this;

    if (self.isNew() || self.hasChanged('password')) {
      return self.generatePasswordHash(self.get('password'))
      .then(function (hash) {
        self.set({password: hash});

        return Base.Model.prototype.saving.apply(self, _.toArray(arguments));
      });
    }

    return Base.Model.prototype.saving.apply(self, _.toArray(arguments));      
  },



  /*
   * delete post
  **/
  deleteAccount: function(userId) {
    var deferred = when.defer();

    User.forge({id: userId})
    .fetch({withRelated: ['tokens']})
    .then(function (user) {
      var tokens = user.related('tokens');

      if (tokens.length > 0) {
        tokens.detach()
        .then(function () {
          user.destroy()
          .then(function () {
            deferred.resolve();
          })
          .otherwise(function (error) {
            deferred.reject('Action not permitted');
          });
        })
        .otherwise(function (error) {
          deferred.reject('Action failed');
        });
      }
      else {
        user.destroy()
        .then(function () {
          deferred.resolve();
        })
        .otherwise(function (error) {
          deferred.reject('Action not permitted');
        });       
      }
    })
    .otherwise(function (error) {
      deferred.reject('Action not permitted');
    });

    return deferred.promise;
  },


  /**
   * GET /account/unlink/:provider
   * Unlink an auth account
   */
  unlink: function(provider) {
    var deferred = when.defer();
    var tokens = this.related('tokens').toJSON();
    var token = _.findWhere(tokens, {kind: provider});
    
    if (token) {
      if (token.kind === 'github') {
        this.set({'github': null});
      }
      if (token.kind === 'twitter') {
        this.set({'twitter': null});
      }
      if (token.kind === 'google') {
        this.set({'google': null});
      }

      this.save()
      .then(function (user) {
        Tokens.forge()
        .remove(token.id)
        .then(function(msg) {
          deferred.resolve(msg); 
        })
        .otherwise(function (msg) {
          deferred.reject(msg);
        });
      })
      .otherwise(function () {
        deferred.reject('Database error. Failed to update user ' + provider + ' id.');
      });
    }
    else {
      deferred.reject('Could not find ' + provider + ' token.'); 
    }

    return deferred.promise;
  }
});


module.exports = Base.model('User', User);