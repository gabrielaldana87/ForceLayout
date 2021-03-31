//Creation of Containers, leftDiv, RightDiv, selection box,
//This code is dependent on D3.js
//http://d3js.org/d3.v3.min.js

var
  body = document.querySelector("body"),
  container = document.createElement("div"),
  leftdiv = document.createElement("div"),
  rightdiv = document.createElement("div"),
  selection = d3.select('.inputs').append('select'),
  calendar = d3.select('.inputs').append('input').attr('type', 'date').attr('id', 'calendar'),
  calEndDate = d3.select('.inputs').append('input').attr('type', 'date').attr('id', 'calEndDate'),
  button = d3.select('.inputs').append('button').attr('class','button-init').text('Submit'),
  ul = d3.select('.inputs').append('ul'),
  option = d3.select('.inputs').append('select')
;

//Appending of elements to body, etc.
container.id = "container";
body.appendChild(container);
leftdiv.id = "leftdiv";
container.appendChild(leftdiv);
rightdiv.id = "rightdiv";
container.appendChild(rightdiv);


// Name the Visualization
d3.select('#header-first').append('h5').text('Disease Network Analysis');

