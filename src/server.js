const fs = require('fs');
const http = require('http');
const url = require('url');

const port = process.env.PORT || process.env.NODE_PORT || 3000;

const index = fs.readFileSync(`${__dirname}/../client/client.html`);
const style = fs.readFileSync(`${__dirname}/../client/style.css`);

const respond = (request, response, code, type, data) => {
  response.writeHead(code, (type) ? { 'content-type': type } : undefined);
  response.end(data);
};

const getIndex = (request, response) => {
  respond(request, response, 200, 'text/html', index);
};

const getStyle = (request, response) => {
  respond(request, response, 200, 'text/css', style);
};

const codeToId = [];
codeToId[400] = 'badRequest';
codeToId[401] = 'unauthorized';
codeToId[500] = 'internalError';
codeToId[501] = 'notImplemented';
codeToId[404] = 'notFound';
codeToId[403] = 'forbidden';

const createResponse = (request, response, code, types, message) => {
  for (let c = 0; c < types.length; c++) {
    const type = types[c];

    if (type === 'text/xml') {
      const idString = (codeToId[code]) ? `<id>${codeToId[code]}</id>` : '';
      const xmlText = `<response><message>${message}</message>${idString}</response>`;
      respond(request, response, code, 'text/xml', xmlText);
      return;
    }
  }

  const responseObject = { message };
  if (codeToId[code]) {
    responseObject.id = codeToId[code];
  }
  respond(request, response, code, 'application/json', JSON.stringify(responseObject));
};

const urls = {
  '/': getIndex,
  '/style.css': getStyle,
};

const splitUrls = {
  '/success': (req, res, types) => createResponse(req, res, 200, types, 'This is a successful response'),
  '/badRequest': (req, res, types, params) => {
    console.log(params);
    if (params.valid === 'true') { createResponse(req, res, 200, types, 'This request contains the required parameters'); } else { createResponse(req, res, 400, types, 'Missing valid query parameter set to true'); }
  },
  '/unauthorized': (req, res, types, params) => {
    if (params.loggedIn === 'yes') { createResponse(req, res, 200, types, 'You have successfully viewed the content'); } else { createResponse(req, res, 401, types, 'Missing loggedIn query parameter set to yes'); }
  },
  '/forbidden': (req, res, types) => createResponse(req, res, 403, types, 'You do not have access to this content'),
  '/internal': (req, res, types) => createResponse(req, res, 500, types, 'An internal server error has occurred'),
  '/notImplemented': (req, res, types) => createResponse(req, res, 501, types, 'A GET request for this page has not yet been implemented'),
};

const getQueryParams = reqUrl => url.parse(reqUrl, true).query;

const stripQueryParams = (reqUrl) => {
  const queryIndex = reqUrl.indexOf('?');
  if (queryIndex !== -1) {
    return reqUrl.substring(0, queryIndex);
  }
  return reqUrl;
};

const onRequest = (request, response) => {
  const reqUrl = stripQueryParams(request.url);
  console.log(request.url);

  if (urls[request.url]) {
    urls[request.url](request, response);
  } else if (splitUrls[reqUrl]) {
    const types = request.headers.accept.split(',');
    splitUrls[reqUrl](request, response, types, getQueryParams(request.url));
  } else {
    createResponse(request, response, 404, ['application/json'], 'The page you are looking for was not found');
  }
};

http.createServer(onRequest).listen(port);
console.log(`Listening on ${port}`);
