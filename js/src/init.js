
/**
 * @file init.js
 * @description setup dependencies and available
 * module interface(s), with a "DemoSequence" laser.js
 * instance to play
 */

require.config({

  baseUrl: 'js/',
  optimize: 'none',
  inlineText: true,

  paths: {
    'jquery' : 'vendor/jquery-2.0.3.min',
    'laser'  : 'vendor/laser-1.0.0.min',
    'ttext'  : 'src/ttext',
    'demo'   : 'src/demo'
  },

  shim: {
    laser: {
      exports: 'Laser',
      deps: ['jquery']
    }
  },

  deps: ['jquery']

});

// demo handler - start on ready
require(['src/demo','ttext'], function(DemoSequence, ThrottleText) {
  
  'use strict';

  $(function() {

    // display event trigger status in view
    DemoSequence.on('sequence:started', function() {
      ThrottleText.set('started');
    })

    .on('sequence:completed', function() {
      ThrottleText.set('completed');
    })

    .on('sequence:rewinding', function() {
      ThrottleText.set('rewinding');
    })
    
    .on('sequence:paused', function() {
      ThrottleText.set('paused');
    })

    .on('animation:completed', function(animation) {
      ThrottleText.set('animation completed: ' + animation.id);
    })

    // play sequence
    .play();

  });
    
});
