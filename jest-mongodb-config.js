module.exports = {
    mongodbMemoryServerOptions: {
        binary: {
            version: process.env.MONGODB_VERSION || '7.0.15',
        },
        instance: {},
    },
}
