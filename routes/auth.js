const config = require('../config/config');
const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/Users');
const router = express.Router();

const jwtSecret = config.jwtSecret;



router.post('/register', async (req, res) => {
    try {
        const { name, birthDate, email, password, trainerAvatar } = req.body;

        if (await User.findOne({ email })) {
            return res.status(400).send({ error: 'El correo ya existe' });
        }

        const newUser = {
            name,
            birthDate,
            email,
            password,
            trainerAvatar,
            coin: 10000
        };
        const user = await User.create(newUser);
        const token = jwt.sign({ _id: user._id }, config.jwtSecret, {
            expiresIn: '1h'
        });

        res.status(201).send(token);
    } catch (err) {
        console.log(err);
        res.status(400).send({ error: 'Failed to create user', err });
    }
});


router.post('/login', async (req, res, next) => {

    try {
        console.log(req.body)
        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(400).send({ error: 'Invalid email or password' });
        }

        const isMatch = await user.comparePassword(password);

        if (!isMatch) {
            return res.status(400).send({ error: 'Invalid email or password' });
        }
        const token = jwt.sign({ _id: user._id }, config.jwtSecret, {
            expiresIn: '1h'
        });
        res.send(token);

    } catch (err) {
        res.status(500).send({ error: 'Failed to log in', err });
    }
});

module.exports = router;