const {Router} = require('express');
const userRoute = Router();
const userController = require('../controllers/userController');

userRoute.get('/', userController.loadIndex);

module.exports = userRoute;