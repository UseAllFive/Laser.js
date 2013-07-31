
/**
 * @file demo.js
 * @description works like throttle, but instead of discarding,
 * queues text changes to a future (cur+min)
 */

define(['jquery'], function($) {

  'use strict';

  // return ready to animate sequence
  return {

    cur: 0,
    min: 300,
    futures: [],
    $elem: $('.status p.current'),
    currentTime: (new Date().getTime()),

    cleanup: function() {
      var len = this.futures.length;
      if (len > 3) {
        this.futures.pop();
      } else if (len === 0) {
        this.cur = 0;
      }
    },

    set: function(str, selector, next) {
      this.cleanup();
      if (this.cur <= 0) {
        this.$elem.text(str);
        this.cur += this.min;
      } else {
        next = this.cur + this.min;
        this.futures[this.futures.length] = setTimeout(function() {
          this.min -= this.min;
          this.$elem.text(str);
        }.bind(this), next);
        this.cur += this.min;
      }
    }

  };

});
