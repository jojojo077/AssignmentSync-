const { ApiError } = require('../middleware/errorHandler');

// TODO: back these with a real user store (e.g. Postgres/Mongo) and
// bcrypt password hashing + jsonwebtoken signing once auth is built.

async function register(req, res, next) {
  try {
    const { email, password, name } = req.body;
    if (!email || !password || !name) {
      throw new ApiError(400, 'email, password, and name are required');
    }
    // TODO: hash password, save user, return created user (without password)
    res.status(501).json({ message: 'Not implemented yet: register()' });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      throw new ApiError(400, 'email and password are required');
    }
    // TODO: verify credentials, sign JWT, return { token, user }
    res.status(501).json({ message: 'Not implemented yet: login()' });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login };
