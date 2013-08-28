/* globals $, _, console */
/**
 * @library laser.js
 * @author Edward Hotchkiss <edward@candidblend.la>
 * @contributor Lindsey Mysse <lindsey.mysse@gmail.com>
 * @description Laser-precision animation sequencing & timing
 * @license MIT
 */

(function(window, undefined) {

  'use strict';

  /**
   * @method Laser
   * @description constructor fn
   */

  var Laser = window.Laser = function Laser(params) {
    _.extend(this, params);
    this.listeners = {};
    this.state = 'blank';
    this.animations = [];
    this.direction = 'forward';
    this.transition = _isTransition();
    this.DEBUG = this.DEBUG || false;
    this.console = (typeof(window.console) === 'object');
    return this;
  };

  /**
   * @private _cachedElements
   * @description never wrap a selector into a jQuery object more
   * than once per page
   */

  var _cachedElements = {};

  /**
   * @private _div
   * @description div element to pull attributes from based on vendor
   */

  var _div = document.createElement('div');

  /**
   * @private _objList
   * @description list of div style attributes
   */

  var _objList = _div.style;

  /**
   * @private _omPrefixes
   * @description CSSOM prefixes
   */

  var _omPrefixes = [
    '',
    'webkit',
    'Moz',
    'o',
    'ms'
  ];

  /**
   * @private _transitionendEvents
   * @description a hacky and brittle way to assign transition events. because
   * of shitty garbage collection/event overwriting use "setTimeout" instead :/
   * @example $element.on(_transitionendEvents, function) to assign events
   */

  var _transitionend = [
    'webkitTransitionEnd',
    'oTransitionEnd',
    'otransitionend',
    'transitionend',
    'msTransitionEnd'
  ].join(' ');

  /**
   * @private _transformTypes
   * @description list of CSS3 transform types
   */

  var _transformTypes = [
    'matrix',
    'matrix3d',
    'translate',
    'translate3d',
    'translateX',
    'translateY',
    'translateZ',
    'scale',
    'scale3d',
    'scaleX',
    'scaleY',
    'scaleZ',
    'rotate',
    'rotate3d',
    'rotateX',
    'rotateY',
    'rotateZ',
    'skew',
    'skewX',
    'skewY',
    'perspective'
  ];

  var _$head;

  /**
   * @description fallback support for IE9
   */

  if (_isTransition()) {

    /**
     * @extend jQuery CSS3 hooks for "rotate", "rotateY" and "rotateX"
     */

    _.map(['rotate','rotateY','rotateX'], function(key, index) {
      $.cssHooks[key] = {
        get: function(elem, computed, extra) {
            var matrix = _processMatrix($(elem));
            return '(' + matrix.angle + 'deg)';
        },
        set: function(elem, value) {
          $(elem).css(_getPropertyName('Transform').css, value);
        }
      };
    });

    /**
     * @extend jQuery CSS3 hook for "scale"
     */

    $.cssHooks.scale = {
      get: function(elem, computed) {
        return _processMatrix($(elem)).scale;
      },
      set: function(elem, value) {
        $(elem).css(_getPropertyName('Transform').css, value);
      }
    };

  }

  /**
   * @private _processMatrix
   * @description returns values from a matrix
   */

  function _processMatrix($elem) {
    var a, b, c, d, angle, scale, values, matrix;
    matrix = $elem.css(_getPropertyName('Transform').css);
    if (matrix === 'none') {
        return 0;
    }
    values = matrix.split('(')[1].split(')')[0].split(',');
    a = values[0];
    b = values[1];
    c = values[2];
    d = values[3];
    return {
      scale : Math.sqrt((a * a) + (b*b)),
      angle : Math.round(Math.atan2(b, a) * (180/Math.PI))
    };
  }

  /**
   * @private _getCachedElement
   * @param {String} selector CSS selector
   * @description gets cached jQuery element
   * @return {Object} jQuery wrapped element
   */

  function _getCachedElement(selector) {
    return _cachedElements[selector];
  }

  /**
   * @private _setCachedElement
   * @param {String} selector css selector
   * @description first checks for cached jQuery element by selector,
   * otherwise caches reference to the jQuery element
   * @return {Object} jQuery wrapped element
   */

  function _setCachedElement(selector) {
    _cachedElements[selector] = _getCachedElement(selector) || $(selector);
    return _cachedElements[selector];
  }

  /**
   * @private _padMilliseconds
   * @description pads timer with up to six zeroes
   * @param {Number} milliseconds milliseconds to pad
   */

  function _padMilliseconds(milliseconds) {
    var max = '000000';
    return (max + milliseconds).slice(-(max.length));
  }

  /**
   * @private _isTransition
   * @description determine whether jQuery transit is available
   * @return {Boolean} availability
   */

  function _isTransition() {
    return (/(MSIE 9\.0)/.test(navigator.userAgent)) ? false : true;
  }

  /**
   * @private _isValidEasing
   * @description invalid easing method aliases bork .animate/.transition
   * check that the alias exists in the dictionary
   * @param {String} ea easing alias
   * @return {Boolean} exists or doesn't
   */

  function _isValidEasing(alias) {
    if (_isTransition()) {
      return ($.cssEase[alias] !== undefined) ? true : false;
    } else {
      return ($.easing[alias] !== undefined) ? true : false;
    }
  }

  /**
   * @private _getEasingBezier
   * @description gets the value for an aliased CSS3 easing type
   * @param {String} alias easing name alias
   * @return {String} 'cubic-bezier' easing string method
   */

  function _getEasingBezier(alias) {
    return $.cssEase[alias];
  }

  /**
   * @private _formatUnit
   * @description takes an attr value, depending on attr type,
   * returns the type if missing
   * @param {String/Number} val user passed value to parse
   * @param {String} unit example, 'px'/'%'
   */

  function _formatUnit(val, currentVal, unit) {
    var result, relativeUnit;
    if (typeof(val) === 'string') {
        relativeUnit = val.match(/^(-|\+)|(=)|([0-9]+$)/g);
        if (unit === '') {
            result = val;
        } else if (relativeUnit && relativeUnit.length === 3) {
            currentVal = currentVal.replace(/deg|px/, '');
            if (relativeUnit[0] === '-') {
                result = (currentVal - relativeUnit[2]) + unit;
            } else if (relativeUnit[0] === '+') {
                result = (currentVal + relativeUnit[2]) + unit;
            }
        } else if (!/^[0-9]+$/.test(val)) {
            result = val;
        }
    } else {
        result = (val.toString() + unit);
    }
    return result;
  }

  /**
   * @private _id
   * @description generate a unique id, prefixed with "tr_"
   * @return {Number} id
   */

  function _id() {
    return _.uniqueId('laser_tr_');
  }

  /**
   * @private _camelCase
   * @description String to camelCaseFn
   */

  function _camelCase(string) {
    return string.replace( /-([a-z])/ig, function(all, letter) {
      return letter.toUpperCase();
    });
  }

  /**
   * @private _upperCase
   * @description capitalize String's first letter
   */

  function _upperCase(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }

  /**
   * @private _getPrefix
   */

  //-- TODO: Consider using Modernizr.
  function _getPrefix(prop) {
    var prefix, propBrowserTest = _camelCase(prop);
    _.each(_omPrefixes, function(val) {
      if (_objList[(val + _upperCase(propBrowserTest))] === '') {
        prefix = { css : '-' + val.toLowerCase()+'-', om : val };
      }
      if (_objList[prop.toLowerCase()] === '') {
        prefix = { css : '', om : '' };
      }
    });
    return prefix;
  }

  /**
   * @private _getPropertyName
   * @return {object} containing CSS and CSSOM prefix
   */

  function _getPropertyName(prop) {
    return {
      css : _getPrefix(prop).css + prop.toLowerCase(),
      om  : _getPrefix(prop).om + prop
    };
  }

  /**
   * @method _createTransitionCSS
   * @description Generates transition property list
   * @params {Object, jQuery Object} Transition changes, jquery objects
   * @returns {String} Returns string of transition
   */

  function _createTransitionCSS(params, startParams, duration, easing) {
    var css = {};
    var cur, unit, transformString;
    _.each(params, function(val, key) {
      cur = startParams[key];
      if (_.contains(_transformTypes, key)) {
        unit = (key === 'perspective') ? 'px' : 'deg';
        unit = (key === 'scale') ? '' : unit;
        if (transformString === '') {
          transformString += ' ' + key + '(' + _formatUnit(val, cur, unit) + ') ';
        } else {
          transformString = key + '(' + _formatUnit(val, cur, unit) + ') ';
        }
      } else {
        unit = (key === 'opacity') ? '' : 'px';
        css[_getPropertyName(key).css] =  _formatUnit(val, cur, unit);
      }
    });
    css[_getPropertyName('transition-duration').css] = _formatDuration(duration);
    css[_getPropertyName('transition-timing-function').css] = _getEasingBezier(easing);
    if (transformString !== undefined) {
      css[_getPropertyName('Transform').css] =  transformString;
    }
    return css;
  }

  /**
   * @private _formatDuration
   * @description to seconds, then to string with trailing "s"
   * @param {Number} duration time in milliseconds
   * @return {String} css3 animation formated time
   */

  function _formatDuration(val) {
    if (typeof(val) === 'string' && !/^[0-9]+$/.test(val)) {
      return val;
    }
    return (val / 1000) + 's';
  }

  /**
   * @private _isTransform
   */

  function _isTransform(val) {
    return (/(rotate|scale)/).test(val);
  }

  /**
   * @private _getCSSPath
   * @description gets full css path of a jQuery object
   * @param {String} selector
   * @return {String} full path with selector
   */

  function _getCSSPath(selector) {
    var path, elem = $(selector)[0];
    if (elem.id) {
      return "#" + elem.id;
    }
    if (elem.tagName === 'BODY') {
      return '';
    }
    path = _getCSSPath(elem.parentNode);
    if (elem.className) {
      return path + " " + elem.tagName + "." + elem.className;
    }
    return path + " " + elem.tagName;
  }

  /**
   * @private Animation
   * @description constructor fn
   */

  var Animation = function Animation(params) {
    _.extend(this, params);
    this.state = 'ON_STACK';
    this.originalStyle = this.$elem.attr('data-original-style');
    if (this.originalStyle === undefined) {
        this.originalStyle = this.$elem.attr('style');
        this.$elem.attr('data-original-style', this.originalStyle);
    }
    return this;
  };

  /**
   * @description extend Animation
   */

  Animation.prototype = {

    /**
     * @method getCurrentParams
     * @description get current values of animations params
     * to maintain state
     * @return {Object} key/value pairs of animated param keys with
     * their current values
     */

    getCurrentParams: function() {
      var params = {};
      _.forEach(this.params, function(val, key) {
        if (_isTransform(key)) {
          params.transform = this.$elem.css(key);
        }
        params[key] = this.$elem.css(key);
      }, this);
      return params;
    },

    /**
     * @method play
     * @description plays animation, either with jQuery.animate or a
     * CSS3 transition
     */

    play: function() {
      this.startParams = this.getCurrentParams();
      this.state = 'PLAYING';
      this.active = true;
      if (this.sequence.transition) {
        this.transition();
      } else {
        this.animate();
      }
    },

    /**
     * @method complete
     * @description on complete callback
     */

    complete: function() {
      this.sequence.trigger('animation:completed', this);
      this.state = 'COMPLETED';
      this.active = false;
    },

    /**
     * @method pause
     * @description stops/pauses a transition
     */

    pause: function() {
      this.pausedStyle = this.$elem.attr('style');
      _.forEach(this.getCurrentParams(), function(val, key) {
        this.$elem.css(key, this.$elem.css(key));
      }, this);
      this.$elem.removeClass(this.id);
      this.state = 'PAUSED';
    },

    /**
     * @method resume
     * @description resumes a transition from last play state
     */

    resume: function() {
      this.$elem.addClass(this.id);
      _.forEach(this.getCurrentParams(), function(val, key) {
        this.$elem.css(key, '');
      }, this);
      this.completeTimeout = setTimeout(_.bind(function() {
        this.complete();
      }, this), this.options.duration);
      this.state = 'PLAYING';
    },

    /**
     * @method rewind
     * @description returns transition to its original state
     */

    rewind: function() {
      this.$elem.addClass('rewind-shim');
      this.$elem.removeClass(this.id);
      this.completeTimeout = setTimeout(_.bind(function() {
        this.complete();
        this.$elem.removeClass('rewind-shim');
      }, this), this.options.duration);
    },

    /**
     * @method animate
     * @description animates item's properties
     */

    animate: function() {
      var $elem = this.$elem;
      delete this.options.when;
      this.options.queue = false;
      this.options.complete = _.bind(function() {
        this.sequence.trigger('animation:completed', this);
        this.state = 'COMPLETED';
        this.active = false;
      }, this);
      return this.$elem.animate(this.params, this.options);
    },

    /**
     * @method transition
     * @description css3 transition animation
     */

    transition: function() {
      this.$elem.css(_createTransitionCSS(
        this.params,
        this.startParams,
        this.options.duration,
        this.options.easing
      ));
      this.completeTimeout = setTimeout(_.bind(function() {
        this.complete();
      }, this), this.options.duration);
    }

  };

  /**
   * @description extend Laser
   */

  Laser.prototype = {

    /**
     * @method elapsed
     * @description determine elapsed time in ms of sequence playback
     * @return {Number} milliseconds into playback
     */

    elapsed: function() {
      return (new Date().getTime() - this.startedAt);
    },

    /**
     * @method log
     */

    log: function(message) {
      if (!this.console || !this.DEBUG) {
        return;
      }
      var log, args, name;
      name = this.name || 'NO NAME';
      args = Array.prototype.slice.call(arguments);
      args[0] = ('DEBUG [' + _padMilliseconds(this.elapsed()) + '] > ') + message + ' "' + name + '"';
      log = Function.prototype.bind.call(console.log, console);
      log.apply(console, args);
    },

    /**
     * @method get
     * @param {String} attr instance attribute
     * @param {Object} where set of key/values to match
     * @description instance attribute getter
     */

    get: function(attr, where) {
      if (where === undefined) {
        return this[attr];
      } else {
        return _.where(this[attr], where);
      }
    },

    /**
     * @method set
     * @param {String} attr instance attribute
     * @param {Object} where set of key/values to match
     * @param {Object} params set of key/values to set
     * @description instance attribute getter
     */

    set: function(attr, where, params) {
      var item = this.get(attr, where);
      if (item === undefined) {
        return undefined;
      } else {
        _.forEach(params, function(val, key) {
          item[key] = val;
        }, this);
        return item;
      }
    },

    /**
     * @method on
     * @param {String} name event name
     * @param {Function} fn trigger function to store
     * @description bind function to event name
     */

    on: function(name, fn) {
      this.listeners[name] = this.listeners[name] || [];
      this.listeners[name].push(fn);
      return this;
    },

    /**
     * @method off
     * @param {String} name event name
     * @param {Function} fn trigger function to remove
     * @description remove event listener
     */

    off: function(name, fn) {
      if (this.listeners[name]) {
        this.listeners[name].splice(this.listeners[name].indexOf(fn), 1);
      } else {
        this.listeners = {};
        if (_.isArray(this.timers)) {
          _.each(this.timers, function(timeout) {
            clearTimeout(timeout);
          });
        }
      }
      return this;
    },

    /**
     * @method trigger
     * @param {String} name Event name
     * @description trigger event listener
     */

    trigger: function(name) {
      if (this.listeners[name]) {
        var args = Array.prototype.slice.call(arguments, 1);
        _.forEach(this.listeners[name], function(val, index, obj) {
          val.apply(this, args);
        }, this);
      }
      return this;
    },

    /**
     * @method add
     * @description sets up params via arguments for a
     * new Animation object to push onto the sequence stack
     * @param {String} selector css selector for element to animate
     * @param {Object} params jQuery standard animation parameters
     * @param {Object} options animation options,
     * excluding the 'when' attribute
     */

    add: function(selector, params, options) {
      var when, sequence = this, $elem = _setCachedElement(selector);
      when = (options.when || 0);
      options.easing = (options.easing || 'easeOutExpo');
      if (!_isValidEasing(options.easing)) {
        if (!_isValidEasing('easeOutExpo')) {
          throw new Error('Unknown easing method! - ' + options.easing);
        } else {
          options.easing = 'easeOutExpo';
        }
      }
      options.duration = options.duration || 500;
      this.animations.push(
        new Animation({
          id       : _id(),
          when     : when,
          active   : false,
          params   : params,
          options  : options,
          sequence : sequence,
          selector : selector,
          $elem    : $elem
        })
      );
      return this;
    },

    /**
     * @method addEasing
     * @description add either a css3 cubic-bezier ease or a jquery easing fn
     */

    addEasing: function(alias, easing) {
      if (typeof(easing) === 'string') {
        $.cssEase[alias] = easing;
      } else {
        $.easing[alias] = easing;
      }
      return this;
    },

    /**
     * @method onAnimated
     * @description on animations all played out, check for a
     * padded sequence ending, regardless trigger sequence complete
     */

    onAnimated: function() {
      if (this.padTime) {
        setTimeout(_.bind(function() {
          this.trigger('sequence:completed');
        }, this), this.padTime);
      } else {
        this.log('sequence completed');
        this.trigger('sequence:completed');
      }
    },

    /**
     * @method onAnimationComplete
     * @description as animations are completed, trigger user listeners,
     * check remaining and note Animation state
     * @param {Object} animation completed animation instance reference
     */

    onAnimationComplete: function(animation) {
      this.remaining--;
      if (this.remaining === 0) {
        this.trigger('sequence:animated');
      }
    },

    /**
     * @method play
     * @description plays animation sequence
     */

    start: function() {
      if (this.getState() === 'paused') {
        return this.resume();
      }
      var animations = this.get('animations');
      this.startedAt = new Date().getTime();
      this.remaining = animations.length;
      this.trigger('sequence:started', this.remaining);
      this.log('starting sequence');
      _.forEach(animations, function(val, index) {
        val.whenTimeout = setTimeout(_.bind(function() {
          val.play();
        }, this), val.when);
      }, this);
      this.on('sequence:animated', function() {
        this.onAnimated();
      });
      this.on('animation:completed', function(animation) {
        this.onAnimationComplete(animation);
      });
      this.state = 'playing';
      return this;
    },

    /**
     * @method wait
     * @description pad an animation sequences' ending
     * @param {Number} milliseconds length to pad animation ending with
     */

    wait: function(milliseconds) {
      this.padTime = milliseconds;
    },

    /**
     * @method pause
     * @description pause all active animations, retaining state
     */

    pause: function() {
      if (!this.transition) {
        return this;
      }
      if (this.getState() === 'paused') {
        return this;
      }
      this.pausedAt = this.elapsed();
      this.log('pausing');
      _.forEach(this.get('animations'), function(val, index) {
        switch(val.state) {
          case 'STOPPED':
            break;
          case 'ON_STACK':
            val.state = 'ON_STACK_RESET';
            clearTimeout(val.whenTimeout);
            break;
          case 'PLAYING':
            clearTimeout(val.completeTimeout);
            val.pause();
            break;
        }
      }, this);
      this.trigger('sequence:paused');
      this.state = 'paused';
      return this;
    },

    /**
     * @method resume
     * @description resume all paused/on-stack animations
     */

    resume: function() {
      if (!this.transition) {
        return this;
      }
      var PAUSE_OFFSET = this.pausedAt;
      this.log('resuming');
      _.forEach(this.get('animations'), function(val, index) {
        switch(val.state) {
          case 'PAUSED':
            val.resume();
            break;
          case 'ON_STACK_RESET':
            val.whenTimeout = setTimeout(_.bind(function() {
              val.play();
            }, this), val.when - PAUSE_OFFSET);
            this.state = 'ON_STACK';
            break;
        }
      }, this);
      this.trigger('sequence:resuming');
      this.state = 'resuming';
      return this;
    },

    /**
     * @method rewind
     * @description rewind animation sequence based on current
     * state versus rewinding from the initial state
     */

    rewind: function() {
      if (!this.transition) {
        return this;
      }
      var runTime, reversedAnimations, PAUSE_OFFSET;
      this.pause();
      PAUSE_OFFSET = this.pausedAt;
      runTime = this.getRunTime();
      this.log('rewinding');
      reversedAnimations = _.map(this.get('animations'), function(val, index) {
        val.when = (runTime - val.when - val.options.duration);
        return val;
      }, this);
      reversedAnimations.reverse();
      _.forEach(reversedAnimations, function(val, index) {
        val.whenTimeout = setTimeout(_.bind(function() {
          val.rewind();
        }, this), val.when);
      }, this);
      this.direction = 'rewind';
      this.remaining = reversedAnimations.length;
      this.trigger('sequence:rewinding');
      this.state = 'rewinding';
      return this;
    },

    /**
     * @method getRunTime
     * @description determine the total run time of a sequence up until invocation point
     * @return {Number} run time in milliseconds
     */

    getRunTime: function() {
      var last, animations = this.get('animations');
      last = animations[animations.length - 1];
      return last.when + last.options.duration;
    },

    /**
     * @method getState
     * @description simple getter for sequence's (not animation) state
     * @return {String} state current sequence state
     */

    getState: function() {
      return this.state;
    },

    /**
     * @method getName
     * @description gets a sequences "name" attr for debug/logging purposes
     * @return {String} name identifier
     */

    getName: function() {
      return this.name;
    },

    /**
     * @method setName
     * @description sets a sequences "name" attr for debug/logging purposes
     * @param {String} name identifier
     */

    setName: function(name) {
      this.name = name;
      return this;
    }

  };

}(window));
