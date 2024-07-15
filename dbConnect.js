const mongoose = require('mongoose');

module.exports = async () => {
    const mongoUrl = 'mongodb+srv://ssahu6244:SBUs03L3JHVGuzed@cluster0.d7ylpyj.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0'
    try {
        const connect = await mongoose.connect(mongoUrl, {});
        console.log(`mongodb connected: ${connect.connection.host}`);
    } catch (error) {
        console.log(error);
        process.exit(1);
    }
}
