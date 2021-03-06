
var should = require('chai').should();
var Event = require('../models/event');
var eventsData = require('../sql/data/events');
var moment = require('moment');


describe('Event', function(){

  var eventData = eventsData[0];
  var event = new Event();


  describe('#set #save', function() {
    it('should create a new event', function(done){

      event.set(eventData);

      event.save()
      .then(function (model) {
         model.get('id').should.above(0);
         model.get('email').should.equal(eventData.email);
         done();
      })
      .otherwise(function (error) {
        done(error);
      });
    });
  });


  describe('#parseDate', function() {
    it('should match dates', function(){
      var dt = event.parseDate('YYYY-MM-DD');
      var dt2 = moment(event.get('dt')).format('YYYY-MM-DD');

      dt.should.be.equal(dt2);
    });
  });


  describe('#parseTime', function() {
    it('should match times', function(){
      var ts = event.parseTime();
      var ts2 = moment(event.get('start_time'), 'HH:mm:ss').format('HH:mm');

      ts.should.be.equal(ts2);
    });
  });


  describe('#destroy', function() {
    it('should delete a user from database', function(done){
      event.destroy()
      .then(function () {
         done();
      })
      .otherwise(function (error) {
        done(error);
      });
    });
  });
});