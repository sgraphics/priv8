const express = require('express');
const axios = require('axios');
const FormData = require('form-data');
const path = require('path');

const app = express();
const port = 8080;
const API_BASE_URL = 'http://localhost:8000';

// Serve static files from the dist directory
app.use('/dist', express.static('dist'));

// Serve 'index.html' at the root URL
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Helper function for API requests
async function apiRequest(method, endpoint, data = null) {
    console.log(`Making ${method} request to: ${endpoint}`);
    if (data) {
        console.log('Request data:', data);
    }
    
    try {
        const response = await axios({
            method,
            url: `${API_BASE_URL}${endpoint}`,
            data,
        });
        console.log(`✅ ${method} request successful`);
        console.log('Response:', response.data);
        return response.data;
    } catch (error) {
        console.error(`❌ ${method} request failed`);
        console.error(error.response ? error.response.data : error.message);
        throw error;
    }
}

// Test Akave API functions
async function testAkaveAPI() {
    try {
        // Create a unique bucket name
        const bucketName = 'test-bucket-' + Math.random().toString(36).substring(7);
        console.log(`\n🚀 Creating bucket: ${bucketName}\n`);
        
        // 1. Create a bucket
        await apiRequest('POST', '/buckets', { bucketName });
        
        // 2. Create a JSON object (at least 127 bytes)
        const testData = {
            message: 'This is a test JSON file for Akave storage'.repeat(3),
            timestamp: new Date().toISOString(),
            randomData: Array(50).fill(0).map(() => Math.random()),
        };

        // Convert JSON to Buffer and create form data
        const form = new FormData();
        const jsonBuffer = Buffer.from(JSON.stringify(testData));
        form.append('file', jsonBuffer, {
            filename: 'test.json',
            contentType: 'application/json',
        });
        
        // Upload JSON
        console.log('\n📤 Uploading JSON file...');
        const uploadResponse = await axios.post(
            `${API_BASE_URL}/buckets/${bucketName}/files`,
            form,
            {
                headers: {
                    ...form.getHeaders()
                }
            }
        );
        console.log('✅ File uploaded:', uploadResponse.data);

        // List files in bucket
        console.log('\n📋 Listing bucket files...');
        await apiRequest('GET', `/buckets/${bucketName}/files`);

    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

// Start server and run tests
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
    console.log('Testing Akave API...');
    //testAkaveAPI();
}); 