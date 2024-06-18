const axios = require('axios');
require('dotenv').config();

async function getFileId(name) {
    try {
        const imageKitUrl = `https://api.imagekit.io/v1/files?searchQuery=name = "${name}"`;

        const response = await axios.get(imageKitUrl, {
          headers: {
            'Authorization': `Basic ${Buffer.from(`${process.env.IMAGEKIT_PRIVATE_KEY}:`).toString('base64')}`,
        }
        });
    
        if (response.status === 200) {
          const fileId = response.data[0].fileId;
          return fileId
        } else {
          return 'Error fetching fileId:', response.statusText;
        }
    } catch (error) {
        return null;
    }    
}

module.exports = getFileId;