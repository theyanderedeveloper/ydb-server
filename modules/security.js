const path = require('path');
const helmet = require('helmet');
const { contentSecurityPolicy } = require('helmet');


const helmetMiddleware = helmet({
    // contentSecurityPolicy: {
    //     directives: {
    //         "script-src": ["'self'", "'unsafe-inline'"],
    //         "script-src-attr": ["'unsafe-inline'"],
    //     },
    //     crossOriginResourcePolicy: false,
    //     frameguard: false,
    // },
    contentSecurityPolicy: false
});

module.exports = { helmetMiddleware };