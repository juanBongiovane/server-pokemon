const config = require("../config/config");
const jwt = require("jsonwebtoken");

const authenticateToken = (req, res, next) => {
    const token = req.header('Authorization').replace('Bearer ', '');

    if (!token) {
        return res.status(401).send({ error: 'No token provided' });
    }

    try {
        const decoded = jwt.verify(token, config.jwtSecret);
        req.userId = decoded._id;
        next();
    } catch (err) {
        res.status(401).send({ error: 'Invalid token' });
    }
};



module.exports = { authenticateToken};