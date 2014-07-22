
var when = require('when');
var config = require('./config.json');
var Cache = null;

module.exports = config;

module.exports.exec = function (req, res, collections) {
	if (Cache) {
	  return when(Cache);
	}

  var meetups = new collections.Meetups();

  return meetups.fetchBy('id', {
    limit: 2,
    where: ['created_at', '<', new Date()]
  })
  .then(function (collection) {
    config.collection = collection;
    Cache = config;

    return config;
  });
};