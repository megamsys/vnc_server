/* global Screen, Client */
(function () {
  'use strict';

  var client;

  var canvas = document.getElementById('screen');
  var screen = new Screen(canvas);
  client = new Client(screen);
  client.connect1().then(function () {
    //document.getElementById('form-wrapper').style.display = 'none';
    document.getElementById('screen-wrapper').style.display = 'block';
  });

}());
