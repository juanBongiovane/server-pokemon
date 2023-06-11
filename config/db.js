const config = require('./config');
const {connect} = require("mongoose");
const uri = config.mongodbUri;

async function connectDB() {
    try {
        await connect(uri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log("Connected to MongoDB!");
    } catch (error) {
        console.error("Error connecting to MongoDB:", error);
        process.exit(1);
    }
}

module.exports = connectDB;
