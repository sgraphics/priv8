const { uploadTestJson, getLastUpload } = require('./src/index.js');

async function runTest() {
    try {
        await uploadTestJson();
        await getLastUpload();
    } catch (error) {
        console.error('Test failed:', error);
    }
}

runTest(); 