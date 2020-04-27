// const server = require('server');

// const {get, post}  = server.router;

// server({port : 3000}, [
//     get('/', ctx => 'Ciao')
// ])

'use strict';

const guido_server = require('./guido_server.js');

guido_server.server();