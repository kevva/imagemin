'use strict';
const fs = require('fs');
const path = require('path');
const globby = require('globby');
const mkdirp = require('mkdirp');
const pify = require('pify');
const promisePipe = require('promise.pipe');
const fsP = pify(fs);

const handleFile = (input, output, opts) => fsP.readFile(input).then(data => {
	const dest = output ? path.resolve(output, input) : null;

	return promisePipe(opts.use)(data, opts).then(buf => {
		buf = buf.length < data.length ? buf : data;

		const ret = {
			data: buf,
			path: dest
		};

		if (!dest) {
			return ret;
		}

		return pify(mkdirp)(path.dirname(dest))
			.then(() => fsP.writeFile(dest, buf))
			.then(() => ret);
	});
});

module.exports = (input, output, opts) => {
	if (!Array.isArray(input)) {
		return Promise.reject(new TypeError('Expected an array'));
	}

	if (typeof output === 'object') {
		opts = output;
		output = null;
	}

	opts = Object.assign({use: []}, opts);

	return globby(input).then(paths => Promise.all(paths.map(x => handleFile(x, output, opts))));
};

module.exports.buffer = (input, opts) => {
	if (!Buffer.isBuffer(input)) {
		return Promise.reject(new TypeError('Expected a buffer'));
	}

	opts = Object.assign({use: []}, opts);
	return promisePipe(opts.use)(input, opts);
};
