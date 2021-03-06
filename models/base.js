"use strict";

/**
 * Module dependencies.
 */
var App  = require('../app');
var Bookshelf  = App.bookshelf;
var unidecode  = require('unidecode');
var when  = require('when');
var sanitize   = require('validator').sanitize;
var Databases = require('../sql/schema');


Bookshelf.Model = Bookshelf.Model.extend({

  initialize: function () {
    var self = this;

    self.on('saving', function (model, attributes, options) {
      return self.saving(model, attributes, options);
    });

    self.on('destroying', function (model, attributes, options) {
      self.destroying(model, attributes, options);
    });
  },


  viewed: function () {
    var views = this.get('views');

    return this.save({'views': views + 1}, {patch: true});
  },


  hasPermission: function () {
    var ownerId = this.get('user_id');
    var currentUserId = App.user.get('id');
    var role = App.user.related('role').get('name');

    if (this.tableName === 'users') {
      ownerId = this.get('id');
    }

    // Only owner and super admin can edit this content
    return (ownerId === currentUserId || role === 'Super Administrator');
  },


  getTableName: function () {
    return this.tableName;
  },


  getJSON: function (props) {
    var self = this;
    var json = {};
    
    props.forEach(function (prop) {
      json[prop] = self.get(prop);
    });

    return json;
  },


  saving: function (newObj, attr, options) {
    var self = this;
    var table = self.getTableName();

    // if only updating views field
    if (self.hasChanged('views') && !self.isNew() || self.hasChanged('resetPasswordToken')) {
      return;
    }

    // if user has no access to content
    if (!self.isNew() && !self.hasPermission()) {
      throw new Error('Access restricted');
    }

    // if new entry or updating, clear cache
    if (self.isNew() || !self.hasChanged('views')) {
      App.clearCache();
    }
    
    // if updating and has updated_by feild, set it to current user
    if (!self.isNew() && Databases[table].updated_by) {
      self.set('updated_by', App.user.get('id'));
    }

    // if is new or slug has changed and has slug field - generate new slug
    if (self.hasChanged('slug') || !self.get('slug') && Databases[table].slug) {
      return self.generateSlug(self.get('slug') || self.get('name') || self.get('title'))
        .then(function (slug) {
          self.set({slug: slug});
        });
    }
  },


  destroying: function () {
    var ownerId = this.get('id');
    var currentUserId = App.user.get('id');
    var role = App.user.related('role').get('name');


    // Super user cannot destroy own account
    if (!this.hasPermission() || (this.tableName === 'users' && ownerId === currentUserId && role === 'Super Administrator')) {
      throw new Error('You do not have permission to perform that action');
    }
  },



  sanitize: function (attr) {
    return sanitize(this.get(attr)).xss();
  },



  /**
   * Credit: https://github.com/TryGhost/Ghost
   *
   * ### Generate Slug
   * Create a string to act as the permalink for an object.
   * @param {ghostBookshelf.Model} Model Model type to generate a slug for
   * @param {String} base The string for which to generate a slug, usually a title or name
   * @param {Object} options Options to pass to findOne
   * @return {Promise(String)} Resolves to a unique slug string
  */
  generateSlug: function (base) {
    var self = this;
    var slug;
    var slugTryCount = 1;
    var baseName = self.getTableName().replace(/s$/, '');

    // Look for a post with a matching slug, append an incrementing number if so
    var checkIfSlugExists;

    checkIfSlugExists = function (slugToFind) {
      var args = {slug: slugToFind};

      return self.constructor.forge(args)
        .fetch()
        .then(function (found) {
        var trimSpace;
        
        if (!found) {
          return when.resolve(slugToFind);
        }
        
        slugTryCount += 1;
        
        // If this is the first time through, add the hyphen
        if (slugTryCount === 2) {
          slugToFind += '-';
        } else {
          // Otherwise, trim the number off the end
          trimSpace = -(String(slugTryCount - 1).length);
          slugToFind = slugToFind.slice(0, trimSpace);
        }
        
        slugToFind += slugTryCount;
        
        return checkIfSlugExists(slugToFind);
      });
    };
    
    slug = base.trim();
    
    // Remove non ascii characters
    slug = unidecode(slug);
    
    // Remove URL reserved chars: `:/?#[]@!$&'()*+,;=` as well as `\%<>|^~£"`
    slug = slug.replace(/[:\/\?#\[\]@!$&'()*+,;=\\%<>\|\^~£"]/g, '')
      // Replace dots and spaces with a dash
      .replace(/(\s|\.)/g, '-')
      // Convert 2 or more dashes into a single dash
      .replace(/-+/g, '-')
 
      .toLowerCase();
    
    // Remove trailing hyphen
    slug = slug.charAt(slug.length - 1) === '-' ? slug.substr(0, slug.length - 1) : slug;

    // Check the filtered slug doesn't match any of the reserved keywords
    slug = /^(events|edit|new|devs|meetups|devs|account|admin|blog|companies|jobs|logout|login|signin|signup|signout|register|archive|archives|category|categories|tag|tags|page|pages|post|posts|user|users|rss|feed)$/g
            .test(slug) ? slug + '-' + baseName : slug;

    //if slug is empty after trimming use "post"
    if (!slug) {
      slug = baseName;
    }

    // Test for duplicate slugs.
    return checkIfSlugExists(slug);
  }
});

module.exports = Bookshelf;
