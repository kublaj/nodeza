
var when = require('when');
var config = require('./config.json');

module.exports.config = config;

module.exports.exec = function (App) {

	if (App.cacheExists('featuredposts')) {
		return when(App.getCache('featuredposts'));
	}

  var posts = App.getCollection('Posts');

  return posts.featured(2, {columns: ['slug', 'title', 'published_at', 'html']})
  .then(function (collection) {
    
    App.setCache('featuredposts', collection);

    return collection;
  });
};
