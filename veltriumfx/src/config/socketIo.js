/**
 * Shared Socket.IO instance accessor.
 * The server registers the io instance once during startup via setIo().
 * Controllers and services can then call getIo() to emit real-time events
 * without requiring the full server module (which would cause circular deps).
 */
let _io = null;

const setIo = (io) => {
  _io = io;
};

const getIo = () => _io;

module.exports = { setIo, getIo };
